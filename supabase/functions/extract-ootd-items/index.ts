// Supabase Edge Function: extract clothing items from an OOTD post using SEGMENTATION.
// 1. Replicate (mask-clothing) segments the image and returns one image per clothing region.
// 2. Each crop is uploaded to Supabase Storage and a closet_item is created with that image_url.
// No text-based dedup; each segment becomes one closet item (or add visual dedup later with embeddings).
// Deno globals: this file runs in Supabase Edge Runtime (Deno). Declare for IDE/TS when not in a Deno workspace.
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

// Deno resolves URL imports at runtime; TypeScript in this workspace doesn't. Suppress for IDE.
// @ts-expect-error - esm.sh URL import is valid in Supabase Edge Runtime (Deno)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REPLICATE_MASK_CLOTHING_VERSION =
  "324eb47adad4b6311f7caac00bcd988c71a38bf156c617b96633d66ec3c8fa14";

const CATEGORIES = [
  "shirts",
  "pants",
  "skirts_dresses",
  "jackets_outerwear",
  "shoes",
  "bags",
] as const;
type Category = (typeof CATEGORIES)[number];

function normalizeCategory(s: string): Category {
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  if (CATEGORIES.includes(lower as Category)) return lower as Category;
  if (lower.includes("shirt") || lower.includes("top") || lower.includes("tee")) return "shirts";
  if (lower.includes("pant") || lower.includes("jean") || lower.includes("trouser")) return "pants";
  if (lower.includes("skirt") || lower.includes("dress")) return "skirts_dresses";
  if (lower.includes("jacket") || lower.includes("coat") || lower.includes("outerwear")) return "jackets_outerwear";
  if (lower.includes("shoe") || lower.includes("sneaker") || lower.includes("boot")) return "shoes";
  if (lower.includes("bag") || lower.includes("purse")) return "bags";
  return "shirts";
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (!REPLICATE_API_TOKEN) {
      return new Response(
        JSON.stringify({
          error:
            "REPLICATE_API_TOKEN not set. Add it in Supabase Dashboard → Edge Functions → Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { post_id } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, image_url, user_id")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (post.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You can only extract items from your own posts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageUrl = post.image_url;
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return new Response(
        JSON.stringify({ error: "Post has no valid image URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Run segmentation (Replicate mask-clothing) to get one image per clothing region
    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        Prefer: "wait",
      },
      body: JSON.stringify({
        version: REPLICATE_MASK_CLOTHING_VERSION,
        input: { image: imageUrl },
      }),
    });

    if (!replicateRes.ok) {
      const errText = await replicateRes.text();
      console.error("Replicate error:", replicateRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Segmentation failed", details: errText.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const replicateData = await replicateRes.json();
    const output = replicateData.output;
    const cropUrls: string[] = Array.isArray(output) ? output : output?.items ? output.items : [];
    const urls = cropUrls.filter((u: unknown) => typeof u === "string" && u.startsWith("http"));

    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ extracted_count: 0, item_ids: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Download each crop and upload to our Storage (permanent URLs)
    const bucket = "closet-images";
    const basePath = `ootd-extracted/${post_id}`;
    const storedUrls: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      try {
        const cropRes = await fetch(urls[i]);
        if (!cropRes.ok) continue;
        const blob = await cropRes.blob();
        const ext = blob.type?.includes("png") ? "png" : "jpg";
        const path = `${basePath}/${i}.${ext}`;

        const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: true,
        });

        if (uploadErr) {
          console.error("Upload crop failed:", uploadErr);
          continue;
        }

        const publicUrl = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
        storedUrls.push(publicUrl);
      } catch (e) {
        console.error("Fetch/upload crop failed:", e);
      }
    }

    if (storedUrls.length === 0) {
      return new Response(
        JSON.stringify({ extracted_count: 0, item_ids: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store mapping: full OOTD → segmentation URLs and optional location (bbox) per segment
    // Replicate mask-clothing returns only image URLs; bbox is null until we have a source (e.g. another API)
    const segmentationData = storedUrls.map((url) => ({ url, bbox: null as { x: number; y: number; width: number; height: number } | null }));
    await supabase
      .from("posts")
      .update({
        segmentation_urls: storedUrls,
        segmentation_data: segmentationData,
      })
      .eq("id", post.id);

    // 3. Optional: label each crop with category + description via OpenAI (one call, multiple images)
    type Label = { category: string; description: string };
    let labels: Label[] = storedUrls.map(() => ({ category: "shirts", description: "" }));

    const maxImagesForLabel = 10;
    const urlsToLabel = storedUrls.slice(0, maxImagesForLabel);

    if (OPENAI_API_KEY && urlsToLabel.length > 0) {
      const prompt = `You are given ${urlsToLabel.length} images, each showing a single clothing or accessory item (cropped from an outfit photo). Return a JSON array with exactly one object per image, in the same order. Each object must have:
- "category": one of exactly: shirts, pants, skirts_dresses, jackets_outerwear, shoes, bags
- "description": short label (e.g. "white crew tee", "blue jeans")

Return ONLY the JSON array, no markdown. Example: [{"category":"shirts","description":"white tee"},{"category":"pants","description":"dark jeans"}]`;

      const imageParts = urlsToLabel.map((url) => ({
        type: "image_url" as const,
        image_url: { url },
      }));

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: prompt }, ...imageParts],
            },
          ],
        }),
      });

      if (openaiRes.ok) {
        const openaiData = await openaiRes.json();
        const raw = openaiData.choices?.[0]?.message?.content?.trim() || "[]";
        try {
          const parsed = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, ""));
          if (Array.isArray(parsed) && parsed.length >= urlsToLabel.length) {
            const fromApi = parsed.slice(0, urlsToLabel.length).map((p: unknown) => ({
              category: typeof (p as any)?.category === "string" ? (p as any).category : "shirts",
              description: typeof (p as any)?.description === "string" ? (p as any).description : "",
            }));
            labels = fromApi.concat(
              storedUrls.slice(urlsToLabel.length).map(() => ({ category: "shirts", description: "" }))
            );
          }
        } catch {
          // keep defaults
        }
      }
    }

    // 4. Create one closet_item per crop (no text-based dedup)
    const insertedIds: string[] = [];

    for (let i = 0; i < storedUrls.length; i++) {
      const label = labels[i] ?? { category: "shirts", description: "" };
      const category = normalizeCategory(label.category);
      const subcategory = (label.description || "").slice(0, 100) || null;

      const { data: inserted, error: insertErr } = await supabase
        .from("closet_items")
        .insert({
          user_id: post.user_id,
          image_url: storedUrls[i],
          brand: null,
          category,
          vibe_tags: [],
          subcategory,
          times_worn: 1,
          last_worn_at: new Date().toISOString(),
          source_post_id: post.id,
          extraction_source: "ootd_ai",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Insert closet_item failed:", insertErr);
        continue;
      }
      if (inserted?.id) insertedIds.push(inserted.id);
    }

    if (insertedIds.length > 0) {
      await supabase.from("post_items").insert(
        insertedIds.map((closet_item_id) => ({
          post_id: post.id,
          closet_item_id,
        }))
      );
    }

    return new Response(
      JSON.stringify({ extracted_count: insertedIds.length, item_ids: insertedIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
