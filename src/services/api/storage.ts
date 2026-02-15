import { supabase, supabaseUrl } from '../../lib/supabase';

/**
 * Convert a data URL (e.g. from canvas or file input) to a File for upload.
 */
export function dataURLToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png';
  const bstr = atob(arr[1] || '');
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], filename, { type: mime });
}

/**
 * Upload an image to Supabase Storage
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (default: 'closet-images')
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(file: File, bucket: string = 'closet-images'): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('Image must be less than 5MB');
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = fileName;

  const doUpload = () =>
    supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

  let result = await doUpload();
  const isAbortError =
    result.error &&
    (result.error.message?.toLowerCase().includes('abort') ||
      result.error.message?.toLowerCase().includes('aborted'));

  if (result.error && isAbortError) {
    result = await doUpload();
  }

  if (result.error) {
    const msg = result.error.message || '';
    if (msg.toLowerCase().includes('bucket') && msg.toLowerCase().includes('not found')) {
      throw new Error(
        "Upload failed: Storage bucket 'closet-images' not found. Create it in Supabase: Storage → New bucket → name 'closet-images', set to Public. See BACKEND_SETUP.md Step 6."
      );
    }
    if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('violates')) {
      throw new Error(
        "Upload failed: Storage policy missing. In Supabase SQL Editor, run the statements in supabase/storage-policies.sql (see BACKEND_SETUP.md Step 6.2)."
      );
    }
    throw new Error(`Upload failed: ${msg}`);
  }

  // Build public URL (must be absolute so OpenAI and browsers can load it)
  const base = (supabaseUrl || '').replace(/\/$/, '');
  const publicUrl = base ? `${base}/storage/v1/object/public/${bucket}/${filePath}` : `/${bucket}/${filePath}`;
  return publicUrl;
}

/**
 * Upload an image to Supabase Storage at a specific path (e.g. segment crops for wardrobe).
 * @param file - The image file to upload
 * @param path - Full object path (e.g. 'segment-crops/userId/requestId/0.jpg'), no leading slash
 * @param bucket - The storage bucket name (default: 'closet-images')
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToPath(
  file: File,
  path: string,
  bucket: string = 'closet-images'
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image must be less than 5MB');
  }
  const cleanPath = path.replace(/^\/+/, '');
  const { error } = await supabase.storage.from(bucket).upload(cleanPath, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) {
    const msg = error.message || '';
    if (msg.toLowerCase().includes('bucket') && msg.toLowerCase().includes('not found')) {
      throw new Error(
        "Upload failed: Storage bucket 'closet-images' not found. Create it in Supabase: Storage → New bucket → name 'closet-images', set to Public."
      );
    }
    if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('violates')) {
      throw new Error(
        "Upload failed: Storage policy missing. Run supabase/storage-policies.sql for segment-crops paths."
      );
    }
    throw new Error(`Upload failed: ${msg}`);
  }
  const base = (supabaseUrl || '').replace(/\/$/, '');
  return base ? `${base}/storage/v1/object/public/${bucket}/${cleanPath}` : `/${bucket}/${cleanPath}`;
}

/**
 * Delete an image from Supabase Storage
 * @param url - The public URL of the image to delete
 * @param bucket - The storage bucket name
 */
export async function deleteImage(url: string, bucket: string = 'closet-images'): Promise<void> {
  // Extract file path from URL
  const urlParts = url.split('/');
  const filePath = urlParts[urlParts.length - 1];

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Compress and resize image before upload
 * @param file - The original image file
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Compressed image as File
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image with compression
 * @param file - The image file to upload
 * @param bucket - The storage bucket name
 * @returns Public URL of the uploaded image
 */
export async function uploadImageWithCompression(
  file: File,
  bucket: string = 'closet-images'
): Promise<string> {
  // Compress image first
  const compressedFile = await compressImage(file);

  // Upload compressed image
  return uploadImage(compressedFile, bucket);
}