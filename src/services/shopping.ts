/**
 * Shopping service for fetching items from web retailers using Bright Data
 */
import { searchBrightData } from "./api/bright-data";

export interface ShoppingItem {
  id: string;
  title: string;
  brand: string;
  imageUrl: string;
  price: string;
  priceValue?: number;
  url: string;
  retailer: "hm" | "google" | "zara" | "asos" | "nordstrom" | "other";
  description?: string;
  rating?: number;
  inStock?: boolean;
}

// Bright Data API configuration
// Note: Variable names match what's in .env file
const BRIGHT_DATA_API_KEY = import.meta.env.VITE_BRIGHTDATA_API_KEY || import.meta.env.VITE_BRIGHT_DATA_API_KEY;
const BRIGHT_DATA_DATASET_ID = import.meta.env.VITE_BRIGHTDATA_HM_DATASET_ID || import.meta.env.VITE_BRIGHT_DATA_DATASET_ID;
const BRIGHT_DATA_ENABLED = !!BRIGHT_DATA_API_KEY && !!BRIGHT_DATA_DATASET_ID;

// Debug logging on module load
console.log("[Shopping Service] Environment check on load:", {
  hasApiKey: !!BRIGHT_DATA_API_KEY,
  hasDatasetId: !!BRIGHT_DATA_DATASET_ID,
  apiKeyLength: BRIGHT_DATA_API_KEY?.length || 0,
  datasetIdValue: BRIGHT_DATA_DATASET_ID || "not set",
  enabled: BRIGHT_DATA_ENABLED,
  rawEnv: {
    VITE_BRIGHTDATA_API_KEY: !!import.meta.env.VITE_BRIGHTDATA_API_KEY,
    VITE_BRIGHT_DATA_API_KEY: !!import.meta.env.VITE_BRIGHT_DATA_API_KEY,
    VITE_BRIGHTDATA_HM_DATASET_ID: !!import.meta.env.VITE_BRIGHTDATA_HM_DATASET_ID,
    VITE_BRIGHT_DATA_DATASET_ID: !!import.meta.env.VITE_BRIGHT_DATA_DATASET_ID,
  }
});

// Bright Data API response type (flexible to handle various response structures)
interface BrightDataProduct {
  title?: string;
  name?: string;
  product_title?: string;
  price?: string;
  price_value?: number;
  currency?: string;
  image?: string;
  image_url?: string;
  imageUrl?: string;
  url?: string;
  link?: string;
  product_url?: string;
  brand?: string;
  retailer?: string;
  store?: string;
  description?: string;
  rating?: number;
  in_stock?: boolean;
  inStock?: boolean;
  id?: string;
  product_id?: string;
  [key: string]: any; // Allow additional fields
}

const MOCK_HM_ITEMS: ShoppingItem[] = [
  {
    id: "hm-1",
    title: "Oversized White Shirt",
    brand: "H&M",
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400",
    price: "$29.99",
    priceValue: 29.99,
    url: "https://www2.hm.com/en_us/productpage.123456.html",
    retailer: "hm",
    description: "Classic oversized white shirt in organic cotton",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "hm-2",
    title: "High-Waisted Wide-Leg Jeans",
    brand: "H&M",
    imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
    price: "$39.99",
    priceValue: 39.99,
    url: "https://www2.hm.com/en_us/productpage.123457.html",
    retailer: "hm",
    description: "Sustainable denim with a relaxed fit",
    rating: 4.3,
    inStock: true,
  },
  {
    id: "hm-3",
    title: "Knit Cardigan",
    brand: "H&M",
    imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400",
    price: "$34.99",
    priceValue: 34.99,
    url: "https://www2.hm.com/en_us/productpage.123458.html",
    retailer: "hm",
    description: "Soft cardigan in beige",
    rating: 4.6,
    inStock: true,
  },
];

const MOCK_GOOGLE_SHOPPING_ITEMS: ShoppingItem[] = [
  {
    id: "gs-1",
    title: "Minimalist White T-Shirt",
    brand: "Everlane",
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
    price: "$18.00",
    priceValue: 18.0,
    url: "https://www.everlane.com/products/tshirt-white",
    retailer: "google",
    description: "100% organic cotton tee",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "gs-2",
    title: "Tailored Blazer",
    brand: "Mango",
    imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
    price: "$89.99",
    priceValue: 89.99,
    url: "https://shop.mango.com/us/blazer",
    retailer: "google",
    description: "Classic blazer in navy",
    rating: 4.4,
    inStock: true,
  },
  {
    id: "gs-3",
    title: "Leather Ankle Boots",
    brand: "Steve Madden",
    imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400",
    price: "$79.99",
    priceValue: 79.99,
    url: "https://www.stevemadden.com/boots",
    retailer: "google",
    description: "Classic black ankle boots",
    rating: 4.5,
    inStock: true,
  },
];

const MOCK_ZARA_ITEMS: ShoppingItem[] = [
  {
    id: "zara-1",
    title: "Oversized Blazer",
    brand: "Zara",
    imageUrl: "https://images.unsplash.com/photo-1594938291221-94f18b46d0af?w=400",
    price: "$79.90",
    priceValue: 79.9,
    url: "https://www.zara.com/us/en/blazer",
    retailer: "zara",
    description: "Structured blazer in camel",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "zara-2",
    title: "Wide-Leg Trousers",
    brand: "Zara",
    imageUrl: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
    price: "$49.90",
    priceValue: 49.9,
    url: "https://www.zara.com/us/en/trousers",
    retailer: "zara",
    description: "High-waisted trousers in beige",
    rating: 4.4,
    inStock: true,
  },
];

const MOCK_ASOS_ITEMS: ShoppingItem[] = [
  {
    id: "asos-1",
    title: "Midi Dress",
    brand: "ASOS Design",
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
    price: "$45.00",
    priceValue: 45.0,
    url: "https://www.asos.com/us/dress",
    retailer: "asos",
    description: "Floral midi dress",
    rating: 4.3,
    inStock: true,
  },
];

const ALL_MOCK_ITEMS = [
  ...MOCK_HM_ITEMS,
  ...MOCK_GOOGLE_SHOPPING_ITEMS,
  ...MOCK_ZARA_ITEMS,
  ...MOCK_ASOS_ITEMS,
];

/**
 * Map Bright Data product to ShoppingItem
 */
function mapBrightDataProduct(product: BrightDataProduct, index: number): ShoppingItem {
  console.log(`[Shopping Service] Mapping product ${index}:`, product);
  
  // Extract title (try multiple possible fields)
  const title = product.title || product.name || product.product_title || "Untitled Item";
  console.log(`[Shopping Service] Product ${index} title:`, title);
  
  // Extract price
  const priceValue = product.price_value || 
    (product.price ? parseFloat(product.price.replace(/[^0-9.]/g, "")) : undefined);
  const currency = product.currency || "$";
  const price = priceValue ? `${currency}${priceValue.toFixed(2)}` : product.price || "Price unavailable";
  console.log(`[Shopping Service] Product ${index} price:`, price);
  
  // Extract image URL
  const imageUrl = product.image_url || product.imageUrl || product.image || "";
  console.log(`[Shopping Service] Product ${index} imageUrl:`, imageUrl);
  
  // Extract product URL
  const url = product.url || product.link || product.product_url || "#";
  console.log(`[Shopping Service] Product ${index} url:`, url);
  
  // Extract brand/retailer
  const brand = product.brand || product.retailer || product.store || "Unknown Brand";
  console.log(`[Shopping Service] Product ${index} brand:`, brand);
  
  // Determine retailer type from URL or brand
  let retailer: ShoppingItem["retailer"] = "other";
  const urlLower = url.toLowerCase();
  const brandLower = brand.toLowerCase();
  if (urlLower.includes("hm.com") || brandLower.includes("h&m") || brandLower.includes("hm")) {
    retailer = "hm";
  } else if (urlLower.includes("zara.com") || brandLower.includes("zara")) {
    retailer = "zara";
  } else if (urlLower.includes("asos.com") || brandLower.includes("asos")) {
    retailer = "asos";
  } else if (urlLower.includes("nordstrom.com") || brandLower.includes("nordstrom")) {
    retailer = "nordstrom";
  } else if (urlLower.includes("google") || urlLower.includes("shopping")) {
    retailer = "google";
  }
  
  // Extract ID
  const id = product.id || product.product_id || `bd-${index}-${Date.now()}`;
  
  const mappedItem = {
    id,
    title,
    brand,
    imageUrl: imageUrl || "https://via.placeholder.com/400?text=No+Image",
    price,
    priceValue,
    url,
    retailer,
    description: product.description,
    rating: product.rating,
    inStock: product.in_stock !== undefined ? product.in_stock : product.inStock !== undefined ? product.inStock : true,
  };
  
  console.log(`[Shopping Service] Product ${index} mapped to:`, mappedItem);
  return mappedItem;
}

/**
 * Search for shopping items from web retailers using Bright Data
 * Falls back to mock data if API is not configured
 * @param query Search query
 * @param limit Maximum number of results to return
 * @returns Array of shopping items matching the query
 */
export async function searchShoppingItems(
  query: string,
  limit: number = 10
): Promise<ShoppingItem[]> {
  // This function ALWAYS returns results - never throws
  // It tries Bright Data first, then falls back to mock data
  console.log("[Shopping Service] searchShoppingItems called:", { query, limit });
  
  if (!query.trim()) {
    console.log("[Shopping Service] Empty query, returning empty array");
    return [];
  }

  // Try Bright Data API via Edge Function (avoids CORS)
  // If it fails, we'll fall through to mock data below
  if (BRIGHT_DATA_ENABLED) {
    console.log("[Shopping Service] Bright Data is ENABLED - attempting API call");
    
    try {
      console.log("[Shopping Service] Calling Bright Data via Edge Function:", { query, limit });
      
      const products = await searchBrightData(query, limit);
      
      console.log("[Shopping Service] Bright Data raw response:", products);
      console.log("[Shopping Service] Response type:", Array.isArray(products) ? "array" : typeof products);
      
      // Handle different response structures
      // Bright Data might return an array directly or wrapped in a data property
      let productArray: BrightDataProduct[] = [];
      if (Array.isArray(products)) {
        productArray = products;
        console.log("[Shopping Service] Response is array, length:", productArray.length);
      } else if (products.data && Array.isArray(products.data)) {
        productArray = products.data;
        console.log("[Shopping Service] Response has data array, length:", productArray.length);
      } else if (products.results && Array.isArray(products.results)) {
        productArray = products.results;
        console.log("[Shopping Service] Response has results array, length:", productArray.length);
      } else if (products.products && Array.isArray(products.products)) {
        productArray = products.products;
        console.log("[Shopping Service] Response has products array, length:", productArray.length);
      } else {
        // If it's a single object, try to extract products from it
        console.warn("[Shopping Service] Unexpected Bright Data response structure:", products);
        console.warn("[Shopping Service] Response keys:", Object.keys(products));
        productArray = [];
      }
      
      console.log("[Shopping Service] Product array length:", productArray.length);
      if (productArray.length > 0) {
        console.log("[Shopping Service] First product sample:", productArray[0]);
      }
      
      // Map to ShoppingItem format
      const mappedItems = productArray
        .slice(0, limit)
        .map((product, index) => mapBrightDataProduct(product, index))
        .filter((item) => item.title && item.title !== "Untitled Item"); // Filter out invalid items
      
      console.log("[Shopping Service] Mapped items count:", mappedItems.length);
      if (mappedItems.length > 0) {
        console.log("[Shopping Service] First mapped item:", mappedItems[0]);
        console.log("[Shopping Service] Returning Bright Data results");
        return mappedItems;
      }
      
      // If no valid items, fall through to mock data
      console.warn("[Shopping Service] Bright Data returned no valid products, falling back to mock data");
    } catch (error) {
      // Silently fall back to mock data - don't show errors to user
      console.log("[Shopping Service] Bright Data unavailable (Edge Function not deployed), using mock data");
      if (error instanceof Error) {
        console.log("[Shopping Service] Reason:", error.message);
      }
      // Fall through to mock data - don't throw
    }
  } else {
    console.log("[Shopping Service] Bright Data is DISABLED - using mock data");
    console.log("[Shopping Service] API Key present:", !!BRIGHT_DATA_API_KEY);
    console.log("[Shopping Service] Dataset ID present:", !!BRIGHT_DATA_DATASET_ID);
  }
  
  // Fallback to mock data if API is not configured or if there was an error
  // This always runs and always returns results (never throws)
  console.log("[Shopping Service] Using mock data fallback");
  const lowerQuery = query.toLowerCase();
  
  // Filter items that match the query
  const matched = ALL_MOCK_ITEMS.filter((item) => {
    const searchableText = `${item.title} ${item.brand} ${item.description || ""}`.toLowerCase();
    return searchableText.includes(lowerQuery);
  });

  console.log("[Shopping Service] Mock items matched:", matched.length);
  if (matched.length === 0) {
    console.log("[Shopping Service] No mock items matched query:", query);
    console.log("[Shopping Service] Available mock items:", ALL_MOCK_ITEMS.map(i => i.title));
  }

  // Sort by relevance (exact matches first, then partial)
  const sorted = matched.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aExact = aTitle === lowerQuery || aTitle.startsWith(lowerQuery);
    const bExact = bTitle === lowerQuery || bTitle.startsWith(lowerQuery);
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });

  const result = sorted.slice(0, limit);
  console.log("[Shopping Service] Returning mock results, count:", result.length);
  return result;
}

/**
 * Get retailer display name
 */
export function getRetailerName(retailer: ShoppingItem["retailer"]): string {
  const names: Record<ShoppingItem["retailer"], string> = {
    hm: "H&M",
    google: "Google Shopping",
    zara: "Zara",
    asos: "ASOS",
    nordstrom: "Nordstrom",
    other: "Other",
  };
  return names[retailer];
}

