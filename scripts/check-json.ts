/**
 * Quick script to check if a JSON file contains valid product data
 * Usage: npx tsx scripts/check-json.ts path/to/file.json
 */

import { readFileSync } from "fs";
import { join } from "path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("❌ Please provide a JSON file path");
  process.exit(1);
}

try {
  const fullPath = filePath.startsWith("/") ? filePath : join(process.cwd(), filePath);
  const content = readFileSync(fullPath, "utf-8");
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    console.error("❌ JSON file must be an array");
    process.exit(1);
  }

  console.log(`📄 File: ${filePath}`);
  console.log(`📊 Total items: ${data.length}\n`);

  // Analyze items
  const validProducts = data.filter((item: any) => {
    const hasName = item.product_name || item.name;
    const hasImage = item.main_image || (item.image_urls && item.image_urls[0]);
    const hasUrl = item.url;
    return hasName && hasImage && hasUrl && !item.error && !item.error_code;
  });

  const errorItems = data.filter((item: any) => item.error || item.error_code);
  const invalidItems = data.filter((item: any) => {
    if (item.error || item.error_code) return false;
    const hasName = item.product_name || item.name;
    const hasImage = item.main_image || (item.image_urls && item.image_urls[0]);
    const hasUrl = item.url;
    return !hasName || !hasImage || !hasUrl;
  });

  console.log("📊 Analysis:");
  console.log(`   ✅ Valid products: ${validProducts.length}`);
  console.log(`   ❌ Error items: ${errorItems.length}`);
  console.log(`   ⚠️  Invalid items (missing fields): ${invalidItems.length}\n`);

  if (validProducts.length > 0) {
    console.log("✅ Found valid products! Sample:");
    const sample = validProducts[0];
    console.log(`   Name: ${sample.product_name || sample.name}`);
    console.log(`   URL: ${sample.url}`);
    console.log(`   Price: ${sample.final_price || sample.initial_price || "N/A"}`);
    console.log(`   Brand: ${sample.brand || "N/A"}`);
  }

  if (errorItems.length > 0) {
    console.log("\n❌ Error items found:");
    errorItems.slice(0, 3).forEach((item: any, i: number) => {
      console.log(`   ${i + 1}. ${item.error || item.error_code}`);
      if (item.input?.url) {
        console.log(`      URL: ${item.input.url}`);
      }
    });
    if (errorItems.length > 3) {
      console.log(`   ... and ${errorItems.length - 3} more`);
    }
  }

  if (invalidItems.length > 0 && invalidItems.length <= 5) {
    console.log("\n⚠️  Invalid items (missing required fields):");
    invalidItems.forEach((item: any, i: number) => {
      const missing = [];
      if (!item.product_name && !item.name) missing.push("name");
      if (!item.main_image && !item.image_urls?.[0]) missing.push("image");
      if (!item.url) missing.push("url");
      console.log(`   ${i + 1}. Missing: ${missing.join(", ")}`);
    });
  }

  console.log("\n" + "=".repeat(50));
  if (validProducts.length > 0) {
    console.log("✅ This file can be used with populate-shopping-items.ts");
  } else {
    console.log("❌ This file has no valid products to insert");
    console.log("\n💡 To get valid product data:");
    console.log("   1. Use product page URLs (not search pages)");
    console.log("   2. Use category URLs with Bright Data discovery mode");
    console.log("   3. Check your Bright Data dataset configuration");
  }
  console.log("=".repeat(50));

} catch (error: any) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}

