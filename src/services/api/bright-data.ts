/**
 * Call Bright Data search via Supabase Edge Function to avoid CORS issues.
 * The Edge Function proxies requests to Bright Data API server-side.
 */
import { supabase } from "../../lib/supabase";

export async function searchBrightData(query: string, limit: number = 10): Promise<any> {
  // Try Supabase client first (works if function is deployed and user is authenticated)
  try {
    console.log("[Bright Data Service] Trying Supabase client invoke...");
    const { data, error } = await supabase.functions.invoke("bright-data-search", {
      body: { query, limit },
    });

    if (!error && data) {
      console.log("[Bright Data Service] Success via Supabase client");
      if (data?.error) {
        throw new Error(typeof data.error === "string" ? data.error : "Bright Data search failed");
      }
      return data;
    }

    if (error) {
      console.log("[Bright Data Service] Supabase client failed, trying proxy:", error.message);
    }
  } catch (err) {
    console.log("[Bright Data Service] Supabase client error, trying proxy:", err);
  }

  // Fallback to Vite proxy in dev
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${window.location.origin}/api/supabase-functions/bright-data-search`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: session?.access_token
        ? `Bearer ${session.access_token}`
        : `Bearer ${anonKey}`,
    };
    
    console.log("[Bright Data Service] Calling Edge Function via proxy:", url);
    
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, limit }),
    });
    
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      console.error("[Bright Data Service] Edge Function error:", res.status, data);
      throw new Error(
        typeof data?.error === "string" ? data.error : data?.details ?? `Bright Data search failed (${res.status}). Please deploy the Edge Function: supabase functions deploy bright-data-search`
      );
    }
    
    return data;
  }

  throw new Error("Bright Data search failed. Please deploy the Edge Function: supabase functions deploy bright-data-search");
}

