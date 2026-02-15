/**
 * Google Shopping search via SerpAPI (proxied in dev to avoid CORS and hide API key).
 * For production, host a serverless function that calls SerpAPI and call it from here.
 */

export interface ShoppingSearchResult {
  title: string;
  product_link: string;
  thumbnail: string | null;
  price: string | null;
  source: string | null;
}

const getApiBase = (): string => {
  const env = (import.meta as unknown as { env?: { VITE_SERPAPI_PROXY?: string } }).env;
  return env?.VITE_SERPAPI_PROXY ?? '/api/shopping-search';
};

/**
 * Search Google Shopping and return results with title, link, thumbnail, price.
 * Requires SerpAPI key: in dev, set VITE_SERPAPI_KEY and use the Vite proxy (see vite.config).
 * @param limit Max number of results (default 5). Use a higher value (e.g. 24) for the Shop page.
 */
export async function searchGoogleShopping(query: string, limit: number = 5): Promise<ShoppingSearchResult[]> {
  const base = getApiBase();
  const url = `${base}?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Shopping search failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data.shopping_results ?? [];
  return raw.slice(0, limit).map((r: Record<string, unknown>) => ({
    title: String(r.title ?? ''),
    product_link: String(r.product_link ?? ''),
    thumbnail: r.thumbnail ? String(r.thumbnail) : null,
    price: r.price != null ? String(r.price) : null,
    source: r.source != null ? String(r.source) : null,
  }));
}
