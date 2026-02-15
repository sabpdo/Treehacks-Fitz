/**
 * Fetch today's high/low temperature for a location using Open-Meteo (free, no API key).
 * Requires user location from navigator.geolocation.
 */
export interface WeatherToday {
  highF: number;
  lowF: number;
  highC: number;
  lowC: number;
}

export async function getWeatherForLocation(lat: number, lon: number): Promise<WeatherToday> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Weather fetch failed");
  const data = (await res.json()) as {
    daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
  };
  const maxC = data.daily?.temperature_2m_max?.[0] ?? 20;
  const minC = data.daily?.temperature_2m_min?.[0] ?? 10;
  const highF = Math.round((maxC * 9) / 5 + 32);
  const lowF = Math.round((minC * 9) / 5 + 32);
  return { highF, lowF, highC: Math.round(maxC), lowC: Math.round(minC) };
}

/** Get user position; rejects if denied or unavailable. */
export function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}
