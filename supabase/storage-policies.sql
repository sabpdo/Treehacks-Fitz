-- Storage policies for closet-images bucket
-- Run this in Supabase SQL Editor after creating the bucket (Step 6 in BACKEND_SETUP.md).
-- Required when you see: "Upload failed: new row violates row-level security policy"

-- Allow authenticated users to upload (INSERT) to closet-images
CREATE POLICY "Authenticated users can upload to closet-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'closet-images');

-- Allow public read (SELECT) so post images can be displayed
CREATE POLICY "Public read for closet-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'closet-images');

-- ============================================================
-- Profile bucket (profile pictures)
-- Create bucket "profile" in Storage, set to Public, then run:
-- ============================================================

-- Allow authenticated users to upload to profile
CREATE POLICY "Authenticated users can upload to profile"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile');

-- Allow public read for profile pictures
CREATE POLICY "Public read for profile"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile');
