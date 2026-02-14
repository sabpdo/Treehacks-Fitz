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
