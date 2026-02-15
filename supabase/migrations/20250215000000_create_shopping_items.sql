-- Create shopping_items table for storing products from different stores
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run multiple times; skips table if it already exists.

-- =====================================================
-- SHOPPING_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Product Information
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  color TEXT,
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  
  -- Media & Links
  image_url TEXT NOT NULL,
  url TEXT NOT NULL,
  
  -- Store Information
  store TEXT NOT NULL, -- 'SHEIN', 'H&M', 'Zara', etc.
  store_domain TEXT, -- e.g., 'us.shein.com'
  
  -- Additional Metadata
  product_id TEXT, -- Store's product ID
  in_stock BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2), -- 0-5 rating
  reviews_count INTEGER DEFAULT 0,
  
  -- Category Information (from category_tree)
  category TEXT,
  root_category TEXT,
  
  -- Additional Images
  image_urls TEXT[] DEFAULT '{}',
  
  -- Full JSON data for reference
  raw_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shopping_items_store ON shopping_items(store);
CREATE INDEX IF NOT EXISTS idx_shopping_items_brand ON shopping_items(brand);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category);
CREATE INDEX IF NOT EXISTS idx_shopping_items_price ON shopping_items(price);
CREATE INDEX IF NOT EXISTS idx_shopping_items_name ON shopping_items USING GIN(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_shopping_items_created_at ON shopping_items(created_at DESC);

-- Index for full-text search on name and description
CREATE INDEX IF NOT EXISTS idx_shopping_items_search ON shopping_items USING GIN(
  to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

-- Shopping items are viewable by everyone (public catalog)
CREATE POLICY "Shopping items viewable by everyone"
  ON shopping_items FOR SELECT USING (true);

-- Only service role can insert/update/delete (via script)
-- Regular users cannot modify shopping items directly
CREATE POLICY "Service role can manage shopping items"
  ON shopping_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- TRIGGER for updated_at
-- =====================================================
CREATE TRIGGER set_shopping_items_updated_at BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

