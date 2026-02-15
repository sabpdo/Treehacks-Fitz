# Shopping Items Population Script

This script populates the `shopping_items` table in Supabase from a JSON file.

## Prerequisites

1. **Run the migration first**: Make sure you've run the migration file:
   ```
   supabase/migrations/20250215000000_create_shopping_items.sql
   ```
   You can run this in the Supabase Dashboard → SQL Editor.

2. **Get your Service Role Key**:
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key (NOT the anon key)
   - This key bypasses Row Level Security (RLS) and is needed to insert data

3. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

## Usage

### Option 1: Using npm script (recommended)

```bash
SUPABASE_URL=your_supabase_url \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npm run populate:shopping path/to/products.json
```

### Option 2: Direct execution

```bash
SUPABASE_URL=your_supabase_url \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npx tsx scripts/populate-shopping-items.ts path/to/products.json
```

## JSON File Format

The script expects a JSON file containing an array of product objects. Example:

```json
[
  {
    "product_name": "Elenzga Blusa ribete con fruncido manga tulipán",
    "description": "Devoluciones Gratis ✓ Envíos Gratis✓...",
    "final_price": 9.51,
    "currency": "USD",
    "color": "Rosa",
    "main_image": "https://img.ltwebstatic.com/...",
    "url": "https://us.shein.com/...",
    "brand": "Elenzga",
    "domain": "https://us.shein.com",
    "product_id": "14383950"
  }
]
```

### Required Fields
- `product_name` or `name` - Product name
- `main_image` or `image_urls[0]` - Main product image
- `url` - Product URL

### Optional Fields
- `description` - Product description
- `final_price` or `final_price_usd` - Price
- `currency` - Currency code (defaults to USD)
- `brand` - Brand name
- `color` - Color
- `domain` - Store domain (used to extract store name)
- `product_id` - Store's product ID
- `in_stock` - Stock status
- `rating` - Product rating
- `reviews_count` - Number of reviews
- `category` - Product category
- `root_category` - Root category
- `category_tree` - Array of category objects
- `image_urls` - Array of additional image URLs

## Environment Variables

You can set these in your `.env` file or pass them as environment variables:

- `SUPABASE_URL` or `VITE_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## Example

```bash
# Create a products.json file with your data
cat > products.json << 'EOF'
[
  {
    "product_name": "White T-Shirt",
    "final_price": 19.99,
    "main_image": "https://example.com/shirt.jpg",
    "url": "https://store.com/shirt",
    "brand": "Brand Name",
    "color": "White"
  }
]
EOF

# Run the script
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npm run populate:shopping products.json
```

## Output

The script will:
1. Read and parse the JSON file
2. Validate each item (skips items missing required fields)
3. Insert items in batches of 50
4. Display progress and summary statistics

Example output:
```
📦 Starting shopping items population...

📄 Loaded 100 items from JSON file

✅ Converted 98 valid items (skipped 2)

📤 Inserting batch 1/2 (50 items)...
   ✅ Inserted 50 items
📤 Inserting batch 2/2 (48 items)...
   ✅ Inserted 48 items

==================================================
📊 Summary:
   Total items in JSON: 100
   Valid items: 98
   Successfully inserted: 98
   Errors: 0
==================================================

✅ Population complete!
```

## Troubleshooting

### "Missing required environment variables"
- Make sure you've set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Use the service role key, not the anon key

### "relation 'shopping_items' does not exist"
- Run the migration file first in Supabase SQL Editor

### "permission denied for table shopping_items"
- Make sure you're using the service role key, not the anon key
- The service role key bypasses RLS policies

### Items are being skipped
- Check the console output for warnings about missing fields
- Ensure your JSON has `product_name`/`name`, `main_image`/`image_urls`, and `url` fields

