import OpenAI from 'openai';
import { AIImageAnalysis, Category, Silhouette, VibeTag } from '../types/database';

// Check if OpenAI is enabled
const OPENAI_ENABLED = !!import.meta.env.VITE_OPENAI_API_KEY;

const openai = OPENAI_ENABLED
  ? new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true, // Note: In production, call this from a backend API
  })
  : null;

export async function analyzeClothingImage(imageUrl: string): Promise<AIImageAnalysis> {
  if (!OPENAI_ENABLED || !openai) {
    throw new Error('OpenAI API is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this clothing item image and provide detailed information in JSON format with these exact fields:
              {
                "category": one of ["shirts", "pants", "skirts_dresses", "jackets_outerwear", "shoes", "bags"],
                "subcategory": specific type (e.g., "t-shirt", "jeans", "dress", "sweater", "sneakers", "backpack"),
                "colors": array of main colors present (e.g., ["black", "white"]),
                "silhouette": one of ["fitted", "oversized", "loose", "tailored", "relaxed"],
                "fabric": material/fabric type (e.g., "cotton", "denim", "leather"),
                "vibe_tags": array of 1-2 occasion tags from ["date night", "casual", "workout", "office"],
                "description": brief description of the item (1-2 sentences),
                "short_label": a 3-8 word product-style name for display (e.g. "Beige leather crossbody bag", "High-waisted dark wash jeans"). Do NOT use generic words like "bottoms" or "accessories"—use the specific type and details.
                "detected_shopping_link": If you see any visible product URL, webpage link, or shopping link in the image (e.g. on a tag, label, receipt, or a screenshot of a product page), output the exact full URL as a string. Otherwise use null. Only include real URLs (http/https); do not make up or guess URLs.
              }

              CATEGORY RULES:
              - "shirts" = all tops, t-shirts, blouses, button-ups, tank tops, crop tops
              - "pants" = jeans, trousers, shorts, leggings, joggers, sweatpants
              - "skirts_dresses" = all dresses and skirts
              - "jackets_outerwear" = jackets, coats, sweaters, hoodies, cardigans, blazers
              - "shoes" = all footwear (sneakers, boots, heels, sandals, etc.)
              - "bags" = handbags, backpacks, totes, purses, messenger bags

              VIBE RULES:
              - "date night" = dressy, elegant, going out
              - "casual" = everyday wear, relaxed
              - "workout" = athletic, activewear, gym
              - "office" = professional, business attire

              Be accurate and simple. List 2-3 dominant colors max.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = (response.choices[0]?.message?.content ?? '').trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Model may return plain text (e.g. "I'm unable to analyze this image") instead of JSON
    if (!content.startsWith('{') && !content.includes('```')) {
      throw new Error(`OpenAI returned non-JSON: ${content.slice(0, 80)}`);
    }

    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/```json\n?(.*?)\n?```/s) || content.match(/(\{[\s\S]*\})/);
    const jsonString = (jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : content).trim();

    if (!jsonString.startsWith('{')) {
      throw new Error(`OpenAI returned no valid JSON: ${content.slice(0, 80)}`);
    }

    let analysis: AIImageAnalysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch (parseErr) {
      throw new Error(`OpenAI response was not valid JSON: ${content.slice(0, 80)}`);
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing image with OpenAI:', error);
    throw error;
  }
}

/** Heuristic: string looks like a product/shopping URL we can store */
export function looksLikeShoppingUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  return t.length > 10 && (t.startsWith('http://') || t.startsWith('https://'));
}

/**
 * Try to extract a single shopping/product URL visible in an image (e.g. screenshot, tag).
 * Use when you only need the link and don't want to run full clothing analysis.
 */
export async function extractShoppingLinkFromImage(imageUrl: string): Promise<string | null> {
  if (!OPENAI_ENABLED || !openai) {
    return null;
  }
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Look at this image. If you see any visible URL or link that looks like a product page, shopping page, or store link (e.g. https://...), respond with ONLY that exact URL, nothing else. If you see no such link, respond with exactly: NONE',
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 200,
    });
    const raw = (response.choices[0]?.message?.content ?? '').trim();
    if (!raw || raw.toUpperCase() === 'NONE') return null;
    // Model might return URL with backticks or extra text
    const urlMatch = raw.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
    const url = urlMatch ? urlMatch[0] : raw;
    return looksLikeShoppingUrl(url) ? url : null;
  } catch (err) {
    console.warn('extractShoppingLinkFromImage failed:', err);
    return null;
  }
}

/**
 * Generate a short Google Shopping search query from an item image (e.g. "women's black leather jacket").
 * Used to power the "Suggest" shopping link flow.
 */
export async function getShoppingSearchQueryFromImage(imageUrl: string): Promise<string> {
  if (!OPENAI_ENABLED || !openai) {
    throw new Error('OpenAI API is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
  }
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Look at this clothing/item image. Reply with a single short phrase (3–8 words) that would work well as a Google Shopping search query to find similar products to buy. Examples: "women black leather jacket", "high waisted blue jeans", "white leather sneakers". No quotes, no punctuation, just the search words.',
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 60,
  });
  const raw = (response.choices[0]?.message?.content ?? '').trim();
  return raw || 'clothing';
}

export async function analyzeOutfitImage(imageUrl: string): Promise<{
  items: AIImageAnalysis[];
  overall_vibe: VibeTag[];
  description: string;
}> {
  if (!OPENAI_ENABLED || !openai) {
    throw new Error('OpenAI API is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this outfit photo and identify ALL visible clothing items separately. Return JSON with:
              {
                "items": array of objects, each with:
                  {
                    "category": one of ["shirts", "pants", "skirts_dresses", "jackets_outerwear", "shoes", "bags"],
                    "subcategory": specific type (e.g., "t-shirt", "jeans", "dress", "sweater", "sneakers", "backpack"),
                    "colors": array of main colors for this specific item,
                    "silhouette": one of ["fitted", "oversized", "loose", "tailored", "relaxed"],
                    "fabric": material/fabric type,
                    "vibe_tags": array of 1-2 occasion tags from ["date night", "casual", "workout", "office"],
                    "description": brief description of this specific item
                  },
                "overall_vibe": array of 1-2 occasion tags from ["date night", "casual", "workout", "office"],
                "description": brief description of the overall outfit
              }

              IMPORTANT: Detect EACH item separately. For example:
              - If photo shows jacket + pants, create 2 items (one "jackets_outerwear", one "pants")
              - If photo shows shirt + skirt + shoes, create 3 items
              - Only include items that are CLEARLY visible
              - Always use a specific subcategory and description for each item (e.g. "t-shirt", "high-waisted jeans", "white sneakers"). Do NOT use "unknown" for subcategory or description.

              CATEGORY RULES:
              - "shirts" = all tops, t-shirts, blouses, button-ups, tank tops, crop tops
              - "pants" = jeans, trousers, shorts, leggings, joggers, sweatpants
              - "skirts_dresses" = all dresses and skirts
              - "jackets_outerwear" = jackets, coats, sweaters, hoodies, cardigans, blazers
              - "shoes" = all footwear (sneakers, boots, heels, sandals, etc.)
              - "bags" = handbags, backpacks, totes, purses, messenger bags

              VIBE RULES (for overall_vibe AND each item's vibe_tags):
              - "date night" = dressy, elegant, going out
              - "casual" = everyday wear, relaxed
              - "workout" = athletic, activewear, gym
              - "office" = professional, business attire`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const jsonMatch = content.match(/```json\n?(.*?)\n?```/s) || content.match(/(\{.*\})/s);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    return JSON.parse(jsonString);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err?.status === 429 || (typeof err?.message === 'string' && err.message.includes('429'))) {
      const msg = 'Rate limit reached. Please wait a minute and try again, or add a payment method at platform.openai.com for higher limits.';
      console.warn(msg);
      throw new Error(msg);
    }
    console.error('Error analyzing outfit with OpenAI:', error);
    throw error;
  }
}

/** Result of body-type analysis for fit recommendations */
export interface BodyTypeAnalysis {
  /** Colors that tend to flatter this body type */
  suggestedColors: string[];
  /** Silhouettes/fits that work well (e.g. fitted, high-waist, A-line) */
  suggestedSilhouettes: string[];
  /** Colors to use sparingly or avoid */
  avoidColors?: string[];
  /** Silhouettes that may not flatter */
  avoidSilhouettes?: string[];
  /** Short label e.g. "balanced", "pear", "athletic" (optional) */
  bodyTypeLabel?: string;
  /** Brief styling tips */
  tips?: string[];
}

/**
 * Analyze body type from dimensions and/or photos; returns color + silhouette suggestions for best fits.
 * Pass either dimensions (object or string) or imageUrls (data URLs or public URLs), or both.
 */
export async function analyzeBodyType(options: {
  dimensions?: Record<string, number> | string;
  imageUrls?: string[];
}): Promise<BodyTypeAnalysis> {
  if (!OPENAI_ENABLED || !openai) {
    throw new Error('OpenAI API is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
  }

  const { dimensions, imageUrls } = options;
  if (!dimensions && (!imageUrls || imageUrls.length === 0)) {
    throw new Error('Provide either dimensions or at least one photo.');
  }

  const dimensionsText =
    typeof dimensions === 'string'
      ? dimensions
      : dimensions
        ? `Measurements (inches/lbs): ${JSON.stringify(dimensions)}`
        : '';

  const prompt = `You are a fashion stylist. Based on the following body information, suggest which clothing colors and silhouettes will be most flattering. Be encouraging and specific.

${dimensionsText ? `DIMENSIONS:\n${dimensionsText}\n\n` : ''}
${dimensionsText && imageUrls?.length ? 'The user also provided photos below for context.\n\n' : ''}
Return ONLY valid JSON with this exact structure (no markdown):
{
  "suggestedColors": array of 4-6 color names that tend to flatter (e.g. "Navy", "Burgundy", "Olive", "Cream"),
  "suggestedSilhouettes": array of 4-6 silhouettes/fits (e.g. "fitted", "high-waist", "A-line", "tailored", "relaxed", "wide-leg"),
  "avoidColors": array of 0-3 colors to use sparingly (optional),
  "avoidSilhouettes": array of 0-3 silhouettes that may not flatter (optional),
  "bodyTypeLabel": short label like "balanced", "pear", "athletic", "rectangle" (optional),
  "tips": array of 2-4 short styling tips (optional)
}

Use lowercase for silhouettes so we can match to our app (fitted, oversized, loose, tailored, relaxed, high-waist, wide-leg, a-line, etc.).`;

  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
    { type: 'text', text: prompt },
  ];
  if (imageUrls?.length) {
    for (const url of imageUrls.slice(0, 4)) {
      content.push({ type: 'image_url', image_url: { url } });
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content }],
    max_tokens: 600,
  });

  const raw = (response.choices[0]?.message?.content ?? '').trim();
  if (!raw.startsWith('{') && !raw.includes('```')) {
    throw new Error(`OpenAI returned non-JSON: ${raw.slice(0, 80)}`);
  }
  const jsonMatch = raw.match(/```json\n?(.*?)\n?```/s) || raw.match(/(\{[\s\S]*\})/);
  const jsonString = (jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw).trim();
  const parsed = JSON.parse(jsonString) as BodyTypeAnalysis;
  if (!Array.isArray(parsed.suggestedColors)) parsed.suggestedColors = [];
  if (!Array.isArray(parsed.suggestedSilhouettes)) parsed.suggestedSilhouettes = [];
  return parsed;
}

/** Input for pairing: main item (with image) and candidates (metadata only) */
export interface PairingMainItem {
  imageUrl: string;
  category?: string;
  brand?: string;
  color?: string;
  fabric?: string;
  silhouette?: string;
}
export interface PairingCandidate {
  id: string;
  category?: string;
  brand?: string;
  color?: string;
  fabric?: string;
  silhouette?: string;
  /** If set, use as the shortDescription (stored AI label from upload) */
  display_description?: string | null;
}
export interface PairingResultItem {
  id: string;
  shortDescription: string;
  pairingScore: number;
  /** Short reason why this item pairs well with the main item (e.g. "Complements the neutral palette") */
  pairingReason?: string;
}

/**
 * Get short, specific product-style descriptions for candidate items and rank how well they pair with the main item.
 * Returns candidates with shortDescription (e.g. "High-waisted dark wash jeans") and pairingScore 1-5, sorted best first.
 */
export async function getPairingDescriptionsAndRanking(
  mainItem: PairingMainItem,
  candidates: PairingCandidate[]
): Promise<PairingResultItem[]> {
  if (!OPENAI_ENABLED || !openai) {
    return candidates.map((c) => ({
      id: c.id,
      shortDescription: c.display_description?.trim() || [c.brand, c.category, c.color].filter(Boolean).join(' ') || c.category || 'Item',
      pairingScore: 3,
      pairingReason: undefined,
    }));
  }
  if (candidates.length === 0) return [];

  const candidateList = candidates
    .map(
      (c, i) =>
        `Candidate ${i + 1} (id: ${c.id}): ${c.display_description ? `display_label: "${c.display_description}"` : ''} category ${c.category || 'unknown'}, brand ${c.brand || '—'}, color ${c.color || '—'}, fabric ${c.fabric || '—'}, silhouette ${c.silhouette || '—'}`
    )
    .join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a stylist. The user has one main clothing item (see image) and a list of other items from their wardrobe that could pair with it.

For each candidate below, do three things:
1. shortDescription: If the candidate has a "display_label", use it exactly as the shortDescription. Otherwise write a short, specific product-style description (3–8 words), e.g. "High-waisted dark wash jeans", "White leather sneakers". Do NOT use generic words like "bottoms" or "accessories".
2. Rate how well it pairs with the main item from 1 (poor fit) to 5 (perfect).
3. Write a one-line pairingReason that either (a) explains WHY it pairs well (e.g. "Same neutral tone so the outfit feels cohesive", "Adds structure and balances the loose top") or (b) suggests HOW to wear it (e.g. "Tuck the top in and wear with these for a polished look", "Wear together for a smart-casual weekend outfit"). Be specific—mention color, silhouette, occasion, or a concrete styling tip. Do NOT use generic phrases like "Pairs well with this look".

Return a JSON object: { "items": [ { "id": "<candidate id>", "shortDescription": "...", "pairingScore": number, "pairingReason": "..." } ] }
Sort the array by pairingScore descending (best pairs first). Include every candidate.

Candidates:
${candidateList}`,
            },
            {
              type: 'image_url',
              image_url: { url: mainItem.imageUrl },
            },
          ],
        },
      ],
      max_tokens: 800,
    });
    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    const jsonString = (jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw).trim();
    const parsed = JSON.parse(jsonString) as { items: PairingResultItem[] };
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return items.filter((i) => i.id && i.shortDescription);
  } catch (e) {
    console.error('getPairingDescriptionsAndRanking failed', e);
    return candidates.map((c) => ({
      id: c.id,
      shortDescription: c.display_description?.trim() || [c.brand, c.category, c.color].filter(Boolean).join(' ') || c.category || 'Item',
      pairingScore: 3,
      pairingReason: undefined,
    }));
  }
}

/**
 * Suggest specific things to buy that would pair well with the given item. Returns 4–6 concrete product ideas.
 */
export async function getThingsToBuySuggestions(mainItem: PairingMainItem): Promise<string[]> {
  if (!OPENAI_ENABLED || !openai) {
    const fallbacks: Record<string, string[]> = {
      tops: ['Structured blazer', 'White tee', 'Oversized sweater', 'Silk blouse'],
      bottoms: ['High-waisted jeans', 'Tailored trousers', 'Midi skirt', 'Wide-leg pants'],
      outerwear: ['Neutral coat', 'Denim jacket', 'Trench', 'Cardigan'],
      shoes: ['White sneakers', 'Ankle boots', 'Loafers', 'Heeled sandals'],
      accessories: ['Leather belt', 'Minimal watch', 'Tote bag', 'Gold hoops'],
    };
    const cat = (mainItem.category || 'tops').toLowerCase();
    return fallbacks[cat] ?? fallbacks.tops;
  }
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a stylist. Suggest 5–6 specific clothing items or accessories the user could BUY to pair well with the item in the image. Be concrete and product-specific (e.g. "Tan leather belt", "Gold hoop earrings", "High-waisted wide-leg trousers"). Do not use generic category names like "bottoms" or "accessories"—use short, descriptive phrases. Return JSON only: { "suggestions": ["...", "..."] }`,
            },
            {
              type: 'image_url',
              image_url: { url: mainItem.imageUrl },
            },
          ],
        },
      ],
      max_tokens: 300,
    });
    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    const jsonString = (jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw).trim();
    const parsed = JSON.parse(jsonString) as { suggestions?: string[] };
    const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
    return list.filter((s) => typeof s === 'string' && s.length > 0).slice(0, 6);
  } catch (e) {
    console.error('getThingsToBuySuggestions failed', e);
    const fallbacks: Record<string, string[]> = {
      tops: ['Structured blazer', 'White tee', 'Oversized sweater', 'Silk blouse'],
      bottoms: ['High-waisted jeans', 'Tailored trousers', 'Midi skirt', 'Wide-leg pants'],
      outerwear: ['Neutral coat', 'Denim jacket', 'Trench', 'Cardigan'],
      shoes: ['White sneakers', 'Ankle boots', 'Loafers', 'Heeled sandals'],
      accessories: ['Leather belt', 'Minimal watch', 'Tote bag', 'Gold hoops'],
    };
    const cat = (mainItem.category || 'tops').toLowerCase();
    return fallbacks[cat] ?? fallbacks.tops;
  }
}

// Generate search embeddings for semantic search
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_ENABLED || !openai) {
    throw new Error('OpenAI API is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/** Optional body-type context to personalize the daily look description */
export interface BodyAnalysisContext {
  suggestedColors?: string[];
  suggestedSilhouettes?: string[];
  bodyTypeLabel?: string;
}

/**
 * Generate a short, informed description or reasoning for a suggested outfit
 * based on today's weather and the specific items. If bodyAnalysis is provided,
 * can mention fit/flatter in terms of the user's body-type suggestions.
 */
export async function generateDailyLookDescription(
  weatherHighF: number,
  weatherLowF: number,
  itemLabels: string[],
  bodyAnalysis?: BodyAnalysisContext | null
): Promise<string> {
  if (!OPENAI_ENABLED || !openai) {
    throw new Error('OpenAI API is not configured.');
  }

  const itemList = itemLabels.length ? itemLabels.map((l) => `- ${l}`).join('\n') : 'A few pieces from your closet';
  const bodySection =
    bodyAnalysis &&
      (bodyAnalysis.suggestedColors?.length || bodyAnalysis.suggestedSilhouettes?.length || bodyAnalysis.bodyTypeLabel)
      ? `

The user has done a body-type analysis. Styling that tends to flatter them:${bodyAnalysis.bodyTypeLabel ? ` body type "${bodyAnalysis.bodyTypeLabel}"` : ''}${bodyAnalysis.suggestedColors?.length ? `; colors: ${bodyAnalysis.suggestedColors.slice(0, 5).join(', ')}` : ''}${bodyAnalysis.suggestedSilhouettes?.length ? `; silhouettes: ${bodyAnalysis.suggestedSilhouettes.slice(0, 5).join(', ')}` : ''}. If this outfit aligns with those, briefly mention it (e.g. "in your flattering colors" or "fits that work for you").`
      : '';

  const prompt = `Today's weather: high ${weatherHighF}°F, low ${weatherLowF}°F.

Suggested outfit items:
${itemList}
${bodySection || ''}

Write exactly 1-2 short sentences (under 25 words) explaining why this outfit works for today. Be specific to the items and the weather—mention fabrics, layers, or comfort. No generic phrases like "comfortable and stylish." Tone: friendly and helpful.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 80,
    });
    const text = (response.choices[0]?.message?.content ?? '').trim();
    return text || 'This combo works well for today’s forecast.';
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 429) {
      throw new Error('Rate limit reached. Try again in a moment.');
    }
    console.error('Error generating daily look description:', error);
    throw error;
  }
}