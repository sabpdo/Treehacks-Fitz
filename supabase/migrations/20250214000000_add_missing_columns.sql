-- fitz: add missing columns and tables (idempotent)
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run multiple times; skips columns/tables that already exist.

-- =====================================================
-- CLOSET_ITEMS: ranking and extraction columns
-- =====================================================
ALTER TABLE closet_items
  ADD COLUMN IF NOT EXISTS rating DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elo_rating DECIMAL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extraction_source TEXT;

-- Backfill elo_rating for rows that have NULL (e.g. created before column existed)
UPDATE closet_items SET elo_rating = 1500 WHERE elo_rating IS NULL;
UPDATE closet_items SET rating = 0 WHERE rating IS NULL;

-- =====================================================
-- POSTS: segmentation columns (for extract-ootd-items) + tags (OOTDCapture)
-- =====================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS segmentation_urls TEXT[],
  ADD COLUMN IF NOT EXISTS segmentation_data JSONB,
  ADD COLUMN IF NOT EXISTS tags JSONB,
  ADD COLUMN IF NOT EXISTS outfit_items JSONB DEFAULT '[]';

-- =====================================================
-- SAVES table (if you don't have it yet)
-- =====================================================
CREATE TABLE IF NOT EXISTS saves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_post_id ON saves(post_id);

ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Saves viewable by everyone" ON saves;
CREATE POLICY "Saves viewable by everyone"
  ON saves FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own saves" ON saves;
CREATE POLICY "Users can insert own saves"
  ON saves FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saves" ON saves;
CREATE POLICY "Users can delete own saves"
  ON saves FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Index for closet_items ranking queries
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_closet_items_elo_rating ON closet_items(elo_rating DESC);
