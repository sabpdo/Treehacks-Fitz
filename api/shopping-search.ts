/**
 * Vercel serverless function: proxy to SerpAPI Google Shopping.
 * Keeps SERPAPI_KEY server-side so it works in production (Vite dev proxy only runs locally).
 *
 * Env in Vercel: set SERPAPI_KEY in Project Settings → Environment Variables.
 */

export default async function handler(
  req: { method?: string; query?: { q?: string } },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { end: () => void; json: (x: unknown) => void }; json: (x: unknown) => void }
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.SERPAPI_KEY ?? process.env.VITE_SERPAPI_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "SERPAPI_KEY not configured. Add it in Vercel → Project Settings → Environment Variables.",
    });
    return;
  }

  const q = req.query?.q;
  if (!q || typeof q !== "string" || !q.trim()) {
    res.status(400).json({ error: "Missing query parameter: q" });
    return;
  }

  const serpUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(q.trim())}&api_key=${encodeURIComponent(apiKey)}`;
  const fetchRes = await fetch(serpUrl);
  const data = await fetchRes.json().catch(() => ({}));

  if (!fetchRes.ok) {
    res.status(502).json({ error: "SerpAPI request failed", details: (data as { error?: string })?.error ?? fetchRes.statusText });
    return;
  }

  res.status(200).json(data);
}
