/**
 * Script to populate shopping_items table from JSON file
 * 
 * Usage:
 *   npx tsx scripts/populate-shopping-items.ts path/to/products.json
 * 
 * Or with environment variables:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/populate-shopping-items.ts products.json
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

// Load environment variables from .env file
config();

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Error: Missing required environment variables");
  console.error("   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Or: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  console.error("\n   You can get the service role key from:");
  console.error("   Supabase Dashboard → Settings → API → service_role key");
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface ShoppingItemJson {
  product_name?: string;
  name?: string;
  description?: string;
  initial_price?: number;
  final_price?: number;
  currency?: string;
  in_stock?: boolean;
  color?: string;
  reviews_count?: number;
  main_image?: string;
  image_urls?: string[];
  url?: string;
  category_url?: string;
  category_tree?: Array<{ name: string; url: string }>;
  country_code?: string;
  domain?: string;
  brand?: string;
  product_id?: string;
  rating?: number;
  root_category?: string;
  category?: string;
  [key: string]: any; // Allow additional fields
}

interface ShoppingItemRow {
  name: string;
  description?: string;
  brand?: string;
  color?: string;
  price?: number;
  currency?: string;
  image_url: string;
  url: string;
  store: string;
  store_domain?: string;
  product_id?: string;
  in_stock?: boolean;
  rating?: number;
  reviews_count?: number;
  category?: string;
  root_category?: string;
  image_urls?: string[];
  raw_data?: any;
}

/**
 * Extract store name from domain or URL
 */
function extractStore(domain?: string, url?: string): string {
  if (domain) {
    // Extract store from domain (e.g., "us.shein.com" -> "SHEIN")
    const domainParts = domain.replace(/^https?:\/\//, "").split(".");
    if (domainParts.length >= 2) {
      const storePart = domainParts[domainParts.length - 2]; // Second to last part
      return storePart.toUpperCase();
    }
  }
  
  if (url) {
    // Try to extract from URL
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const parts = hostname.split(".");
      if (parts.length >= 2) {
        const storePart = parts[parts.length - 2];
        // Handle common patterns
        if (storePart === "shein") return "SHEIN";
        if (storePart === "hm") return "H&M";
        if (storePart === "zara") return "Zara";
        if (storePart === "uniqlo") return "Uniqlo";
        return storePart.toUpperCase();
      }
    } catch (e) {
      // Invalid URL, continue
    }
  }
  
  return "Unknown";
}

/**
 * Extract category from category_tree or category field
 */
function extractCategory(item: ShoppingItemJson): string | undefined {
  // Try category field first
  if (item.category) {
    return item.category;
  }
  
  // Try to get from category_tree (last item is usually the most specific)
  if (item.category_tree && Array.isArray(item.category_tree) && item.category_tree.length > 0) {
    const lastCategory = item.category_tree[item.category_tree.length - 1];
    return lastCategory.name;
  }
  
  return undefined;
}

/**
 * Convert JSON item to database row
 */
function convertToRow(item: ShoppingItemJson): ShoppingItemRow | null {
  // Skip error items (from Bright Data error responses)
  if (item.error || item.error_code) {
    console.warn(`⚠️  Skipping error item: ${item.error || item.error_code}`);
    return null;
  }

  // Required fields
  const name = item.product_name || item.name;
  if (!name) {
    console.warn("⚠️  Skipping item: missing product_name/name");
    // Show available fields for debugging
    const availableFields = Object.keys(item).slice(0, 5).join(", ");
    console.warn(`   Available fields: ${availableFields}${Object.keys(item).length > 5 ? "..." : ""}`);
    return null;
  }

  const imageUrl = item.main_image || (item.image_urls && item.image_urls[0]);
  if (!imageUrl) {
    console.warn(`⚠️  Skipping item "${name}": missing main_image/image_urls`);
    return null;
  }

  const url = item.url;
  if (!url) {
    console.warn(`⚠️  Skipping item "${name}": missing url`);
    return null;
  }

  const store = extractStore(item.domain, item.url);
  const price = item.final_price || item.final_price_usd || item.initial_price || item.initial_price_usd;

  return {
    name: name.trim(),
    description: item.description?.trim(),
    brand: item.brand?.trim(),
    color: item.color?.trim(),
    price: price ? Number(price) : undefined,
    currency: item.currency || "USD",
    image_url: imageUrl,
    url: url,
    store: store,
    store_domain: item.domain,
    product_id: item.product_id?.toString(),
    in_stock: item.in_stock !== undefined ? item.in_stock : true,
    rating: item.rating ? Number(item.rating) : undefined,
    reviews_count: item.reviews_count || 0,
    category: extractCategory(item),
    root_category: item.root_category,
    image_urls: item.image_urls && Array.isArray(item.image_urls) ? item.image_urls : undefined,
    raw_data: item, // Store full JSON for reference
  };
}

/**
 * Main function to populate database
 */
async function populateShoppingItems(jsonFilePath: string) {
  console.log("📦 Starting shopping items population...\n");

  // Read JSON file
  let jsonData: ShoppingItemJson[];
  try {
    const filePath = jsonFilePath.startsWith("/") 
      ? jsonFilePath 
      : join(process.cwd(), jsonFilePath);
    const fileContent = readFileSync(filePath, "utf-8");
    jsonData = JSON.parse(fileContent);
    
    if (!Array.isArray(jsonData)) {
      throw new Error("JSON file must contain an array of products");
    }
  } catch (error) {
    console.error("❌ Error reading JSON file:", error);
    process.exit(1);
  }

  console.log(`📄 Loaded ${jsonData.length} items from JSON file\n`);

  // Check for error items
  const errorItems = jsonData.filter((item: any) => item.error || item.error_code);
  if (errorItems.length > 0) {
    console.log(`⚠️  Found ${errorItems.length} error item(s) that will be skipped\n`);
  }

  // Convert to database rows
  const rows: ShoppingItemRow[] = [];
  for (const item of jsonData) {
    const row = convertToRow(item);
    if (row) {
      rows.push(row);
    }
  }

  console.log(`✅ Converted ${rows.length} valid items (skipped ${jsonData.length - rows.length})\n`);

  if (rows.length === 0) {
    console.error("❌ No valid items to insert");
    console.error("\n💡 This usually means:");
    console.error("   - The JSON file contains error responses (not product data)");
    console.error("   - The JSON structure doesn't match the expected format");
    console.error("   - Required fields (product_name/name, main_image/image_urls, url) are missing");
    console.error("\n📋 Expected format:");
    console.error('   [{"product_name": "...", "main_image": "...", "url": "...", ...}]');
    process.exit(1);
  }

  // Insert in batches to avoid overwhelming the database
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    console.log(`📤 Inserting batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .insert(batch)
        .select("id");

      if (error) {
        console.error(`❌ Error inserting batch ${batchNum}:`, error.message);
        errors += batch.length;
      } else {
        inserted += data?.length || 0;
        console.log(`   ✅ Inserted ${data?.length || 0} items`);
      }
    } catch (error: any) {
      console.error(`❌ Unexpected error in batch ${batchNum}:`, error.message);
      errors += batch.length;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log(`   Total items in JSON: ${jsonData.length}`);
  console.log(`   Valid items: ${rows.length}`);
  console.log(`   Successfully inserted: ${inserted}`);
  console.log(`   Errors: ${errors}`);
  console.log("=".repeat(50) + "\n");

  if (inserted > 0) {
    console.log("✅ Population complete!");
  } else {
    console.error("❌ No items were inserted. Please check the errors above.");
    process.exit(1);
  }
}

// Run script
const jsonFilePath = process.argv[2];
if (!jsonFilePath) {
  console.error("❌ Error: Please provide a JSON file path");
  console.error("\nUsage:");
  console.error("  npx tsx scripts/populate-shopping-items.ts path/to/products.json");
  console.error("\nExample:");
  console.error("  npx tsx scripts/populate-shopping-items.ts data/shein-products.json");
  process.exit(1);
}

populateShoppingItems(jsonFilePath).catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

