// Supabase Edge Function: segment an outfit image for "tag your items" flow.
// Two modes (no Replicate cost):
// 1. OpenAI-only: if OPENAI_API_KEY is set and REPLICATE_API_TOKEN is not, one Vision call
//    returns items (category + description); crop_url = same image for each.
// 2. Replicate + optional OpenAI: if REPLICATE_API_TOKEN is set, run mask-clothing, upload
//    crops to Storage, optionally label with OpenAI. Requires Replicate billing.

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
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

export type SegmentResult = {
  crop_url: string;
  category: string;
  description: string;
  color?: string;
  fabric?: string;
  silhouette?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let userId: string = "anonymous";
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user?.id) userId = user.id;
    }

    const { image_url } = await req.json();
    if (!image_url || typeof image_url !== "string" || !image_url.startsWith("http")) {
      return new Response(
        JSON.stringify({ error: "image_url (public URL) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- OpenAI-only path (no Replicate cost): one Vision call, return segments with same image as crop ---
    if (!REPLICATE_API_TOKEN && OPENAI_API_KEY) {
      const prompt = `Look at this outfit photo. List each visible clothing or accessory item. Return a JSON array with one object per item. Each object must have:
- "category": one of exactly: shirts, pants, skirts_dresses, jackets_outerwear, shoes, bags
- "description": short label (e.g. "white crew tee", "blue jeans")
- "color": primary color (e.g. "White", "Navy", "Beige") or "—" if unclear
- "fabric": fabric or material if visible (e.g. "Cotton", "Linen", "Denim") or omit
- "silhouette": fit or shape (e.g. "Relaxed", "Slim", "Wide leg") or omit

Return ONLY the JSON array, no markdown.`;

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
              content: [
                { type: "text", text: prompt },
                { type: "image_url" as const, image_url: { url: image_url } },
              ],
            },
          ],
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        return new Response(
          JSON.stringify({ error: "OpenAI Vision failed", details: errText.slice(0, 300) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const openaiData = await openaiRes.json();
      const raw = openaiData.choices?.[0]?.message?.content?.trim() || "[]";
      type ItemLabel = { category: string; description: string; color?: string; fabric?: string; silhouette?: string };
      let items: ItemLabel[] = [];
      try {
        const parsed = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, ""));
        if (Array.isArray(parsed)) {
          items = parsed.map((p: unknown) => {
            const o = p as { category?: string; description?: string; color?: string; fabric?: string; silhouette?: string };
            return {
              category: typeof o?.category === "string" ? o.category : "shirts",
              description: typeof o?.description === "string" ? o.description : "Item",
              color: typeof o?.color === "string" ? o.color : undefined,
              fabric: typeof o?.fabric === "string" ? o.fabric : undefined,
              silhouette: typeof o?.silhouette === "string" ? o.silhouette : undefined,
            };
          });
        }
      } catch {
        // ignore parse error
      }

      const segments: SegmentResult[] = items.map((label) => ({
        crop_url: image_url,
        category: normalizeCategory(label.category),
        description: (label.description || "Item").slice(0, 100),
        color: label.color?.slice(0, 30),
        fabric: label.fabric?.slice(0, 30),
        silhouette: label.silhouette?.slice(0, 30),
      }));

      return new Response(JSON.stringify({ segments }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Replicate path (costs money): mask-clothing + Storage upload + optional OpenAI labels ---
    if (!REPLICATE_API_TOKEN) {
      return new Response(
        JSON.stringify({
          error: "Set OPENAI_API_KEY (free path) or REPLICATE_API_TOKEN in Edge Function Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Run Replicate mask-clothing
    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        Prefer: "wait",
      },
      body: JSON.stringify({
        version: REPLICATE_MASK_CLOTHING_VERSION,
        input: { image: image_url },
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
        JSON.stringify({ segments: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Download each crop and upload to Storage (segment-temp for tagging UI)
    const bucket = "closet-images";
    const requestId = crypto.randomUUID();
    const basePath = `segment-temp/${userId}/${requestId}`;
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
        JSON.stringify({ segments: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Optional: label each crop with OpenAI (category, description, color, fabric, silhouette)
    type Label = { category: string; description: string; color?: string; fabric?: string; silhouette?: string };
    let labels: Label[] = storedUrls.map(() => ({ category: "shirts", description: "Item" }));

    const maxImagesForLabel = 10;
    const urlsToLabel = storedUrls.slice(0, maxImagesForLabel);

    if (OPENAI_API_KEY && urlsToLabel.length > 0) {
      const prompt = `You are given ${urlsToLabel.length} images, each showing a single clothing or accessory item (cropped from an outfit photo). Return a JSON array with exactly one object per image, in the same order. Each object must have:
- "category": one of exactly: shirts, pants, skirts_dresses, jackets_outerwear, shoes, bags
- "description": short label (e.g. "white crew tee", "blue jeans")
- "color": primary color (e.g. "White", "Navy", "Beige") or "—" if unclear
- "fabric": fabric or material if visible (e.g. "Cotton", "Linen", "Denim") or omit
- "silhouette": fit or shape (e.g. "Relaxed", "Slim", "Wide leg") or omit

Return ONLY the JSON array, no markdown.`;

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
            const fromApi = parsed.slice(0, urlsToLabel.length).map((p: unknown) => {
              const o = p as { category?: string; description?: string; color?: string; fabric?: string; silhouette?: string };
              return {
                category: typeof o?.category === "string" ? o.category : "shirts",
                description: typeof o?.description === "string" ? o.description : "",
                color: typeof o?.color === "string" ? o.color : undefined,
                fabric: typeof o?.fabric === "string" ? o.fabric : undefined,
                silhouette: typeof o?.silhouette === "string" ? o.silhouette : undefined,
              };
            });
            labels = fromApi.concat(
              storedUrls.slice(urlsToLabel.length).map(() => ({ category: "shirts", description: "Item" }))
            );
          }
        } catch {
          // keep defaults
        }
      }
    }

    const segments: SegmentResult[] = storedUrls.map((crop_url, i) => {
      const label = labels[i] ?? { category: "shirts", description: "Item" };
      return {
        crop_url,
        category: normalizeCategory(label.category),
        description: (label.description || "Item").slice(0, 100),
        color: label.color?.slice(0, 30),
        fabric: label.fabric?.slice(0, 30),
        silhouette: label.silhouette?.slice(0, 30),
      };
    });

    return new Response(JSON.stringify({ segments }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
