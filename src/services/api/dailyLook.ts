import { supabase } from "../../lib/supabase";

export interface CachedDailyLookItem {
  id: string;
  imageUrl: string;
  displayDescription?: string | null;
  style: string;
  brand?: string | null;
}

export interface CachedDailyLook {
  weatherHighF: number;
  weatherLowF: number;
  description: string;
  items: CachedDailyLookItem[];
}

/**
 * Get cached "Today's Generated Look" for a user and date (YYYY-MM-DD).
 * Returns null if no cache for that day.
 */
export async function getDailyLook(
  userId: string,
  dateStr: string
): Promise<CachedDailyLook | null> {
  const { data, error } = await supabase
    .from("daily_look_cache")
    .select("weather_high_f, weather_low_f, description, items")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const items = (data.items as unknown[]) || [];
  return {
    weatherHighF: Number(data.weather_high_f),
    weatherLowF: Number(data.weather_low_f),
    description: String(data.description ?? ""),
    items: items.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      imageUrl: String(row.image_url ?? ""),
      displayDescription: row.display_description != null ? String(row.display_description) : null,
      style: String(row.style ?? ""),
      brand: row.brand != null ? String(row.brand) : null,
    })),
  };
}

/**
 * Store or replace "Today's Generated Look" for a user and date.
 * Items should be the display snapshot (id, imageUrl, displayDescription, style, brand).
 */
export async function setDailyLook(
  userId: string,
  dateStr: string,
  payload: {
    weatherHighF: number;
    weatherLowF: number;
    description: string;
    items: CachedDailyLookItem[];
  }
): Promise<void> {
  const rows = payload.items.map((item) => ({
    id: item.id,
    image_url: item.imageUrl,
    display_description: item.displayDescription ?? null,
    style: item.style,
    brand: item.brand ?? null,
  }));

  const { error } = await supabase.from("daily_look_cache").upsert(
    {
      user_id: userId,
      date: dateStr,
      weather_high_f: payload.weatherHighF,
      weather_low_f: payload.weatherLowF,
      description: payload.description,
      items: rows,
    },
    { onConflict: "user_id,date" }
  );

  if (error) throw error;
}
