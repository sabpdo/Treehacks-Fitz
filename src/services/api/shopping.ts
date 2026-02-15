/**
 * Shopping API service - searches for products using Bright Data
 */
import { searchShoppingItems, type ShoppingItem } from "../shopping";
import type { ScrapedProduct } from "../../types/shopping";
import type { Category } from "../../types/database";

/**
 * Map ShoppingItem to ScrapedProduct format
 */
function mapToScrapedProduct(item: ShoppingItem): ScrapedProduct {
  // Map retailer to store name
  const storeMap: Record<string, string> = {
    hm: "H&M",
    zara: "Zara",
    asos: "ASOS",
    nordstrom: "Nordstrom",
    google: "Google Shopping",
    other: "Other",
  };

  // Try to infer category from title/description
  const inferCategory = (title: string, description?: string): Category | undefined => {
    const text = `${title} ${description || ""}`.toLowerCase();
    if (text.includes("shirt") || text.includes("top") || text.includes("blouse") || text.includes("tee")) {
      return "shirts";
    }
    if (text.includes("pant") || text.includes("jean") || text.includes("trouser") || text.includes("short")) {
      return "pants";
    }
    if (text.includes("dress") || text.includes("skirt")) {
      return "skirts_dresses";
    }
    if (text.includes("jacket") || text.includes("coat") || text.includes("blazer") || text.includes("sweater") || text.includes("cardigan")) {
      return "jackets_outerwear";
    }
    if (text.includes("shoe") || text.includes("boot") || text.includes("sneaker") || text.includes("heel")) {
      return "shoes";
    }
    if (text.includes("bag") || text.includes("backpack") || text.includes("tote")) {
      return "bags";
    }
    return undefined;
  };

  return {
    name: item.title,
    price: item.price,
    image: item.imageUrl || null,
    url: item.url,
    store: storeMap[item.retailer] || item.brand,
    category: inferCategory(item.title, item.description),
    description: item.description,
  };
}

/**
 * Search for products using Bright Data
 * Always returns results (falls back to mock data if Bright Data fails)
 */
export async function searchProducts(query: string): Promise<ScrapedProduct[]> {
  console.log("[Shopping API] Searching for products:", query);
  
  // searchShoppingItems always returns results (never throws - falls back to mock data)
  const items = await searchShoppingItems(query, 20);
  console.log("[Shopping API] Found items:", items.length);
  
  const products = items.map(mapToScrapedProduct);
  console.log("[Shopping API] Mapped to products:", products.length);
  
  return products;
}

