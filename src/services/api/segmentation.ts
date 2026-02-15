/**
 * Segment an outfit image via Supabase Edge Function (OpenAI Vision, clothing-tailored).
 * Returns one segment per detected item; optional bbox (0-100%) lets the client crop per-item thumbnails.
 * Used by OOTDCapture "tag your items" flow to auto-generate tags for user confirmation.
 *
 * In dev we call via Vite proxy (/api/supabase-functions) to avoid CORS. In production
 * we use supabase.functions.invoke. Deploy: supabase functions deploy segment-outfit-image
 */
import { supabase } from "../../lib/supabase";

export type SegmentResult = {
  crop_url: string;
  category: string;
  description: string;
  color?: string;
  fabric?: string;
  silhouette?: string;
  /** Bounding box as percentages (0-100); client crops the full image to get per-item thumbnail. */
  bbox?: { x_min: number; y_min: number; x_max: number; y_max: number };
  /** Base64 mask from Hugging Face; client derives bbox and crops when present. */
  mask?: string;
};

const env = (import.meta as unknown as { env?: { VITE_SUPABASE_ANON_KEY?: string; DEV?: boolean } }).env;

export async function segmentOutfitImage(imageUrl: string): Promise<{ segments: SegmentResult[] }> {
  const anonKey = env?.VITE_SUPABASE_ANON_KEY ?? "";

  if (env?.DEV && typeof window !== "undefined") {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${window.location.origin}/api/supabase-functions/segment-outfit-image`;
    // Supabase gateway accepts anon key; send Bearer for user JWT when signed in, else anon so request is allowed
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: session?.access_token
        ? `Bearer ${session.access_token}`
        : `Bearer ${anonKey}`,
    };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ image_url: imageUrl }),
    });
    const data = await res.json().catch(() => ({}));
    // 401 = auth required by gateway; 502 = function/Replicate error or timeout — fall back without throwing
    if (res.status === 401 || res.status === 502) {
      if (env?.DEV && res.status === 502) {
        console.warn("Segmentation 502 (function/Replicate failed):", data?.error ?? data?.details ?? res.status);
      }
      return { segments: [] };
    }
    if (!res.ok) {
      throw new Error(
        typeof data?.error === "string" ? data.error : data?.details ?? `Segmentation failed (${res.status})`
      );
    }
    const segments = Array.isArray(data?.segments) ? data.segments : [];
    return { segments };
  }

  const { data, error } = await supabase.functions.invoke<{ segments: SegmentResult[]; error?: string }>(
    "segment-outfit-image",
    { body: { image_url: imageUrl } }
  );

  if (error) {
    if (error.message?.includes("401") || (error as { status?: number })?.status === 401) {
      return { segments: [] };
    }
    throw new Error(error.message || "Segmentation request failed");
  }

  if (data?.error) {
    throw new Error(typeof data.error === "string" ? data.error : "Segmentation failed");
  }

  const segments = Array.isArray(data?.segments) ? data.segments : [];
  return { segments };
}
