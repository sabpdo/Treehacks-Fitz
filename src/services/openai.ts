import OpenAI from 'openai';
import { AIImageAnalysis, Category, Silhouette, VibeTag } from '../types/database';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, call this from a backend API
});

export async function analyzeClothingImage(imageUrl: string): Promise<AIImageAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this clothing item image and provide detailed information in JSON format with these exact fields:
              {
                "category": one of ["tops", "bottoms", "outerwear", "dresses_skirts", "shoes", "bags", "accessories"],
                "subcategory": specific type based on category:
                  - For tops: "t-shirt", "tank top", "blouse", "button-up shirt", "polo", "crop top", "tube top", "henley", or "other top"
                  - For bottoms: "jeans", "trousers", "chinos", "leggings", "joggers", "cargo pants", "shorts", "sweatpants", or "other bottom"
                  - For outerwear: "sweater", "cardigan", "hoodie", "sweatshirt", "blazer", "jacket", "coat", "vest", or "other outerwear"
                  - For dresses_skirts: "mini dress", "midi dress", "maxi dress", "mini skirt", "midi skirt", "maxi skirt", or "other dress/skirt"
                  - For shoes: "sneakers", "boots", "sandals", "heels", "flats", "loafers", "slippers", or "other shoes"
                  - For bags: "tote", "crossbody", "shoulder bag", "backpack", "clutch", "satchel", "messenger bag", or "other bag"
                  - For accessories: "hat", "scarf", "belt", "sunglasses", "jewelry", "watch", "tie", or "other accessory"
                "colors": array of main colors present (e.g., ["black", "white", "navy"]),
                "silhouette": one of ["fitted", "oversized", "loose", "tailored", "relaxed"],
                "fabric": material/fabric type (e.g., "cotton", "denim", "leather", "wool", "silk"),
                "vibe_tags": array of 2-4 style vibes from ["date night", "casual", "grunge", "preppy", "streetwear", "formal", "athleisure", "business casual", "bohemian", "minimalist"],
                "description": brief description of the item (1-2 sentences)
              }

              IMPORTANT:
              - Use "tops" not "top", "bottoms" not "bottom", "outerwear" (includes sweaters, jackets, coats)
              - Dresses and skirts go in "dresses_skirts" category
              - Handbags, purses, backpacks go in "bags" category
              - Jewelry, hats, scarves, belts go in "accessories" category
              - Be specific and accurate with subcategories
              - List dominant colors only (2-4 max)`,
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
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this outfit photo and identify all visible clothing items. Return JSON with:
              {
                "items": array of objects, each with {category, subcategory, colors, silhouette, fabric},
                "overall_vibe": array of 2-4 style tags from ["date night", "casual", "grunge", "preppy", "streetwear", "formal", "athleisure", "business casual", "bohemian", "minimalist"],
                "description": brief description of the overall outfit and styling
              }`,
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
      max_tokens: 700,
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