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
                "description": brief description of the item (1-2 sentences)
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
  } catch (error) {
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