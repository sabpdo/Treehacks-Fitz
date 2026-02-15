import { supabase } from "../../lib/supabase";
import type { BodyTypeAnalysis } from "../../services/openai";

export interface BodyAnalysisRecord {
  id: string;
  user_id: string;
  image_urls: string[];
  analysis: BodyTypeAnalysis;
  created_at: string;
}

/**
 * Save a body analysis after the user runs "Analyze Your Body Type".
 */
export async function createBodyAnalysis(
  userId: string,
  imageUrls: string[],
  analysis: BodyTypeAnalysis
): Promise<BodyAnalysisRecord> {
  const { data, error } = await supabase
    .from("body_analyses")
    .insert({
      user_id: userId,
      image_urls: imageUrls.length ? imageUrls : [],
      analysis: analysis as unknown as Record<string, unknown>,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BodyAnalysisRecord;
}

/**
 * List all body analyses for a user (newest first), for "Previously uploaded" section.
 */
export async function getBodyAnalyses(userId: string): Promise<BodyAnalysisRecord[]> {
  const { data, error } = await supabase
    .from("body_analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    analysis: row.analysis as BodyTypeAnalysis,
  })) as BodyAnalysisRecord[];
}

/**
 * Get the most recent body analysis for a user (for use in clothing suggestions).
 */
export async function getLatestBodyAnalysis(userId: string): Promise<BodyAnalysisRecord | null> {
  const { data, error } = await supabase
    .from("body_analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data, analysis: data.analysis as BodyTypeAnalysis } as BodyAnalysisRecord;
}
