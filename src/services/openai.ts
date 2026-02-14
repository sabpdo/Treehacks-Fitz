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

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/```json\n?(.*?)\n?```/s) || content.match(/(\{.*\})/s);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const analysis: AIImageAnalysis = JSON.parse(jsonString);

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