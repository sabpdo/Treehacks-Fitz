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
      // If it's a 404 or CORS error, the function doesn't exist - skip to proxy
      if (error.message?.includes("404") || error.message?.includes("CORS") || error.message?.includes("Failed to send")) {
        throw error; // Re-throw to trigger fallback
      }
    }
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.log("[Bright Data Service] Supabase client error, trying proxy:", errorMessage);
    
    // If it's a network/CORS/404 error, skip to proxy or mock data
    if (errorMessage.includes("404") || 
        errorMessage.includes("CORS") || 
        errorMessage.includes("Failed to send") ||
        errorMessage.includes("ERR_FAILED")) {
      // Will fall through to proxy or mock data
    } else {
      // Other errors, re-throw
      throw err;
    }
  }

  // Fallback to Vite proxy in dev (but it will also fail if function not deployed)
  if (import.meta.env.DEV && typeof window !== "undefined") {
    try {
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
        // If 404, function doesn't exist - throw to trigger mock data fallback
        if (res.status === 404) {
          throw new Error("Edge Function not deployed. Using mock data.");
        }
        throw new Error(
          typeof data?.error === "string" ? data.error : data?.details ?? `Bright Data search failed (${res.status})`
        );
      }
      
      return data;
    } catch (proxyError: any) {
      console.log("[Bright Data Service] Proxy also failed, will use mock data:", proxyError.message);
      // Re-throw to trigger mock data fallback in shopping.ts
      throw proxyError;
    }
  }

  // In production without function, throw to trigger mock data
  throw new Error("Edge Function not available. Using mock data.");
}

