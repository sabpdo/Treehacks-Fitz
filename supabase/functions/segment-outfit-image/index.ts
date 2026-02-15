// Supabase Edge Function: segment an outfit image for "tag your items" flow.
// 1. Hugging Face (no OpenAI): if HUGGINGFACE_TOKEN is set, use clothing model (segformer_b2_clothes).
//    Returns segments with mask (base64); client derives bbox from mask and crops.
// 2. OpenAI fallback: if OPENAI_API_KEY is set, one Vision call returns items + bbox for client cropping.

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

// Deno resolves URL imports at runtime; TypeScript in this workspace doesn't. Suppress for IDE.
// @ts-expect-error - esm.sh URL import is valid in Supabase Edge Runtime (Deno)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HUGGINGFACE_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const HF_CLOTHES_MODEL = "mattmdjaga/segformer_b2_clothes";

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
  /** Bounding box as percentages (0-100) so client can crop the full image to this item. */
  bbox?: { x_min: number; y_min: number; x_max: number; y_max: number };
  /** Base64 mask image from Hugging Face; client derives bbox and crops when present. */
  mask?: string;
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

    // --- Hugging Face path (no OpenAI): clothing segmentation model returns masks; client crops from masks ---
    if (HUGGINGFACE_TOKEN) {
      try {
        const imgRes = await fetch(image_url);
        if (!imgRes.ok) throw new Error("Failed to fetch image");
        const imgBytes = await imgRes.arrayBuffer();
        const hfRes = await fetch(`https://api-inference.huggingface.co/models/${HF_CLOTHES_MODEL}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
            "Content-Type": "application/octet-stream",
          },
          body: imgBytes,
        });
        if (!hfRes.ok) {
          const errText = await hfRes.text();
          console.warn("HF segmentation failed:", hfRes.status, errText.slice(0, 200));
          throw new Error("HF request failed");
        }
        const hfData = (await hfRes.json()) as Array<{ label?: string; mask?: string; score?: number }>;
        if (!Array.isArray(hfData) || hfData.length === 0) throw new Error("No segments");

        const skipLabels = new Set([
          "background", "face", "hair", "left-leg", "right-leg", "left-arm", "right-arm",
        ]);
        function hfLabelToCategory(label: string): Category {
          const l = label.toLowerCase().replace(/\s+/g, "_");
          if (l.includes("upper") || l.includes("clothes")) return "shirts";
          if (l.includes("pant")) return "pants";
          if (l.includes("skirt")) return "skirts_dresses";
          if (l.includes("dress")) return "skirts_dresses";
          if (l.includes("belt")) return "shirts";
          if (l.includes("hat")) return "jackets_outerwear";
          if (l.includes("bag")) return "bags";
          if (l.includes("scarf")) return "jackets_outerwear";
          if (l.includes("shoe")) return "shoes";
          if (l.includes("sunglass")) return "bags";
          return "shirts";
        }

        const segments: SegmentResult[] = [];
        for (const item of hfData) {
          const label = (item.label || "").trim();
          if (!label || skipLabels.has(label.toLowerCase()) || !item.mask) continue;
          segments.push({
            crop_url: image_url,
            category: normalizeCategory(hfLabelToCategory(label)),
            description: label.replace(/-/g, " "),
            mask: item.mask,
          });
        }
        if (segments.length > 0) {
          return new Response(JSON.stringify({ segments }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.warn("Hugging Face segmentation failed, falling back:", e);
      }
    }

    // --- OpenAI fallback: one Vision call for outfit items + bbox for client cropping ---
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Set HUGGINGFACE_TOKEN or OPENAI_API_KEY in Edge Function Secrets for segmentation.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are analyzing an outfit photo. List each visible clothing or accessory item. Return a JSON array with one object per item. Each object MUST have:

- "category": one of exactly: shirts, pants, skirts_dresses, jackets_outerwear, shoes, bags
- "description": short label (e.g. "white crew tee", "blue jeans")
- "color": primary color or "—" if unclear
- "fabric": material if visible or omit
- "silhouette": fit or shape or omit
- "bbox": REQUIRED. Object with "x_min", "y_min", "x_max", "y_max" as numbers 0-100 (percent of image width/height). This must be a TIGHT bounding box around ONLY that single garment—so we can crop the image to show just that item. Do not use the full image; each item gets its own small box. Example: a shirt might be x_min:20, y_min:15, x_max:55, y_max:65.

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
    type ItemLabel = {
      category: string;
      description: string;
      color?: string;
      fabric?: string;
      silhouette?: string;
      bbox?: { x_min?: number; y_min?: number; x_max?: number; y_max?: number };
    };
    let items: ItemLabel[] = [];
    try {
      const parsed = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, ""));
      if (Array.isArray(parsed)) {
        items = parsed.map((p: unknown) => {
          const o = p as ItemLabel & Record<string, unknown>;
          const bbox = o.bbox;
          const hasBbox =
            bbox &&
            typeof bbox.x_min === "number" &&
            typeof bbox.y_min === "number" &&
            typeof bbox.x_max === "number" &&
            typeof bbox.y_max === "number";
          return {
            category: typeof o?.category === "string" ? o.category : "shirts",
            description: typeof o?.description === "string" ? o.description : "Item",
            color: typeof o?.color === "string" ? o.color : undefined,
            fabric: typeof o?.fabric === "string" ? o.fabric : undefined,
            silhouette: typeof o?.silhouette === "string" ? o.silhouette : undefined,
            bbox: hasBbox
              ? {
                x_min: Math.max(0, Math.min(100, (bbox as { x_min: number }).x_min)),
                y_min: Math.max(0, Math.min(100, (bbox as { y_min: number }).y_min)),
                x_max: Math.max(0, Math.min(100, (bbox as { x_max: number }).x_max)),
                y_max: Math.max(0, Math.min(100, (bbox as { y_max: number }).y_max)),
              }
              : undefined,
          };
        });
      }
    } catch {
      // ignore parse error
    }

    const segments: SegmentResult[] = items.map((label) => {
      const seg: SegmentResult = {
        crop_url: image_url,
        category: normalizeCategory(label.category),
        description: (label.description || "Item").slice(0, 100),
        color: label.color?.slice(0, 30),
        fabric: label.fabric?.slice(0, 30),
        silhouette: label.silhouette?.slice(0, 30),
      };
      if (
        label.bbox &&
        typeof label.bbox.x_min === "number" &&
        typeof label.bbox.y_min === "number" &&
        typeof label.bbox.x_max === "number" &&
        typeof label.bbox.y_max === "number"
      ) {
        seg.bbox = {
          x_min: label.bbox.x_min,
          y_min: label.bbox.y_min,
          x_max: label.bbox.x_max,
          y_max: label.bbox.y_max,
        };
      }
      return seg;
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
