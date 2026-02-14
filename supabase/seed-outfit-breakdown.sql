-- Seed mock data for testing Outfit Breakdown on Post Detail
-- Run this in Supabase SQL Editor after you have at least one user (Auth).
--
-- 1. Get your user ID: Supabase Dashboard → Authentication → Users → copy your user's UUID
-- 2. Find and replace: change YOUR_USER_ID to your actual UUID (keep the quotes), e.g. 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- 3. Run this entire script in SQL Editor

DO $$
DECLARE
  uid UUID := 'c77bb693-7287-43f1-a04a-6c18cb0b8968'::uuid;
  c1_id UUID;
  c2_id UUID;
  c3_id UUID;
  post_id UUID;
BEGIN
  -- Ensure profile exists / update display name
  INSERT INTO profiles (id, username, display_name, avatar_url, bio, followers, following, streak, closet_utilization, created_at, updated_at)
  VALUES (uid, 'seed_user', 'Outfit Tester', NULL, 'Testing outfit breakdown', 0, 0, 0, 0, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(profiles.display_name, 'Outfit Tester'),
    updated_at = NOW();

  -- Closet item 1 (top): silhouette, fabric, subcategory
  INSERT INTO closet_items (id, user_id, image_url, brand, category, vibe_tags, colors, silhouette, fabric, subcategory, times_worn, rating, elo_rating, created_at, updated_at)
  VALUES (uuid_generate_v4(), uid, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400', 'Everlane', 'shirts', ARRAY['casual','office'], ARRAY['white'], 'fitted', 'cotton', 'Cotton Shirt', 0, 0, 1500, NOW(), NOW())
  RETURNING id INTO c1_id;

  -- Closet item 2 (bottom)
  INSERT INTO closet_items (id, user_id, image_url, brand, category, vibe_tags, colors, silhouette, fabric, subcategory, times_worn, rating, elo_rating, created_at, updated_at)
  VALUES (uuid_generate_v4(), uid, 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400', 'Aritzia', 'pants', ARRAY['casual'], ARRAY['beige'], 'relaxed', 'cotton', 'Wide-Leg Trousers', 0, 0, 1500, NOW(), NOW())
  RETURNING id INTO c2_id;

  -- Closet item 3 (shoes)
  INSERT INTO closet_items (id, user_id, image_url, brand, category, vibe_tags, colors, silhouette, fabric, subcategory, times_worn, rating, elo_rating, created_at, updated_at)
  VALUES (uuid_generate_v4(), uid, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', 'Veja', 'shoes', ARRAY['casual'], ARRAY['white'], NULL, NULL, 'Sneakers', 0, 0, 1500, NOW(), NOW())
  RETURNING id INTO c3_id;

  -- One post with outfit image
  INSERT INTO posts (id, user_id, image_url, caption, likes_count, comments_count, created_at, updated_at)
  VALUES (uuid_generate_v4(), uid, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1080', 'Cozy neutral fit for testing the outfit breakdown', 0, 0, NOW(), NOW())
  RETURNING id INTO post_id;

  -- Link all 3 closet items to the post (outfit breakdown)
  INSERT INTO post_items (post_id, closet_item_id) VALUES (post_id, c1_id), (post_id, c2_id), (post_id, c3_id);

  RAISE NOTICE 'Seed done. Open the app and go to post/% to see the outfit breakdown.', post_id;
END $$;
