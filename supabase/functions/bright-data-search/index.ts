// Supabase Edge Function: Proxy Bright Data API calls to avoid CORS issues
// This function makes server-side requests to Bright Data and returns the results

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Get Bright Data credentials from environment
    const BRIGHT_DATA_API_KEY = Deno.env.get("BRIGHT_DATA_API_KEY");
    const BRIGHT_DATA_DATASET_ID = Deno.env.get("BRIGHT_DATA_DATASET_ID");

    if (!BRIGHT_DATA_API_KEY || !BRIGHT_DATA_DATASET_ID) {
      return new Response(
        JSON.stringify({
          error: "Bright Data credentials not configured. Add BRIGHT_DATA_API_KEY and BRIGHT_DATA_DATASET_ID to Edge Function secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { query, limit = 10 } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return new Response(
        JSON.stringify({ error: "query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Make request to Bright Data API
    const url = "https://api.brightdata.com/datasets/v3/scrape";
    const params = new URLSearchParams({
      dataset_id: BRIGHT_DATA_DATASET_ID,
      format: "json",
    });

    const payload = [
      {
        keyword: query.trim(),
        country: "US",
        limit: Math.min(limit, 20), // Cap at 20 for safety
      },
    ];

    console.log("[Bright Data Proxy] Making API call:", { query, limit, datasetId: BRIGHT_DATA_DATASET_ID });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Bright Data Proxy] API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Bright Data API error",
          status: response.status,
          details: errorText.slice(0, 500),
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const products = await response.json();
    console.log("[Bright Data Proxy] Received response, type:", Array.isArray(products) ? "array" : typeof products);

    // Return the products directly (let frontend handle mapping)
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Bright Data Proxy] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

