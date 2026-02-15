import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { Ruler, Upload, Sparkles, ChevronRight, ImageIcon } from "lucide-react";
import { motion } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { analyzeBodyType, type BodyTypeAnalysis } from "../../services/openai";
import { uploadImage, createBodyAnalysis, getBodyAnalyses, type BodyAnalysisRecord } from "../../services/api";
import { PostGrid } from "./feed";
import type { OOTDPost } from "../data/mockData";

const INITIAL_DIMENSIONS = {
  heightInches: "",
  shoulderInches: "",
  waistInches: "",
  hipInches: "",
  inseamInches: "",
  weightLbs: "",
};

function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, "-");
}

/** True if post has any outfit item matching suggested colors or silhouettes */
function postMatchesAnalysis(post: OOTDPost, analysis: BodyTypeAnalysis): boolean {
  const items = post.outfitItems ?? [];
  const suggestedColors = (analysis.suggestedColors ?? []).map(normalizeForMatch);
  const suggestedSilhouettes = (analysis.suggestedSilhouettes ?? []).map(normalizeForMatch);
  if (suggestedColors.length === 0 && suggestedSilhouettes.length === 0) return false;
  for (const item of items) {
    const itemColor = normalizeForMatch(item.color ?? "");
    const itemSilhouette = normalizeForMatch(item.silhouette ?? "");
    if (suggestedColors.length && itemColor && suggestedColors.some((c) => itemColor.includes(c) || c.includes(itemColor)))
      return true;
    if (suggestedSilhouettes.length && itemSilhouette && suggestedSilhouettes.some((s) => itemSilhouette.includes(s) || s.includes(itemSilhouette)))
      return true;
  }
  return false;
}

export function BodyAnalyze() {
  const { posts, refetchFeed, currentUserId, isUsingApi } = useAppStore();
  const [dimensions, setDimensions] = useState(INITIAL_DIMENSIONS);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BodyTypeAnalysis | null>(null);
  const [previousAnalyses, setPreviousAnalyses] = useState<BodyAnalysisRecord[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const recommendedPosts = useMemo(() => {
    if (!result) return [];
    return posts.filter((p) => postMatchesAnalysis(p, result));
  }, [posts, result]);

  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const toAdd = Math.min(files.length, 4 - photoPreviews.length);
    if (toAdd <= 0) {
      e.target.value = "";
      return;
    }
    const fileList = Array.from(files).slice(0, toAdd);

    // Read as data URLs first so previews show immediately
    const readAsDataUrl = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    const dataUrls = await Promise.all(fileList.map(readAsDataUrl));
    setPhotoPreviews((prev) => [...prev, ...dataUrls].slice(0, 4));

    // Upload to body bucket and replace with public URLs so they load reliably
    setUploadingPhotos(true);
    try {
      const urls = await Promise.all(
        fileList.map((file) => uploadImage(file, "body"))
      );
      setPhotoPreviews((prev) => {
        const withoutNew = prev.slice(0, -dataUrls.length);
        return [...withoutNew, ...urls].slice(0, 4);
      });
    } catch {
      // Keep data URLs if upload fails (e.g. bucket policy not set)
    } finally {
      setUploadingPhotos(false);
    }
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    setError(null);
    setAnalyzing(true);
    try {
      const dimensionsPayload = {
        heightInches: dimensions.heightInches ? Number(dimensions.heightInches) : undefined,
        shoulderInches: dimensions.shoulderInches ? Number(dimensions.shoulderInches) : undefined,
        waistInches: dimensions.waistInches ? Number(dimensions.waistInches) : undefined,
        hipInches: dimensions.hipInches ? Number(dimensions.hipInches) : undefined,
        inseamInches: dimensions.inseamInches ? Number(dimensions.inseamInches) : undefined,
        weightLbs: dimensions.weightLbs ? Number(dimensions.weightLbs) : undefined,
      };
      const cleanDim = Object.fromEntries(Object.entries(dimensionsPayload).filter(([, v]) => v != null && !Number.isNaN(v)));
      const analysis = await analyzeBodyType({
        dimensions: Object.keys(cleanDim).length ? cleanDim : undefined,
        imageUrls: photoPreviews.length ? photoPreviews : undefined,
      });
      setResult(analysis);
      if (isUsingApi && currentUserId) {
        try {
          await createBodyAnalysis(currentUserId, photoPreviews, analysis);
          const list = await getBodyAnalyses(currentUserId);
          setPreviousAnalyses(list);
        } catch {
          /* ignore save failure */
        }
      }
      await refetchFeed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const hasDimensions =
    !!(dimensions.heightInches || dimensions.waistInches || dimensions.hipInches || dimensions.shoulderInches || dimensions.inseamInches);
  const canAnalyze = hasDimensions || photoPreviews.length > 0;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <h1 className="font-serif text-xl tracking-tight text-neutral-900">Analyze Your Body Type</h1>
          <p className="mt-0.5 text-xs text-neutral-500">Get personalized color & silhouette suggestions, then see recommended looks from the feed.</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Dimensions */}
        <div className="mb-6 rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-800">Dimensions (optional)</h2>
          </div>
          <p className="mb-4 text-xs text-neutral-500">Enter measurements in inches (and lbs for weight). At least one field or a photo below helps.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "heightInches", label: "Height (in)" },
              { key: "weightLbs", label: "Weight (lbs)" },
              { key: "shoulderInches", label: "Shoulder (in)" },
              { key: "waistInches", label: "Waist (in)" },
              { key: "hipInches", label: "Hip (in)" },
              { key: "inseamInches", label: "Inseam (in)" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="—"
                  value={(dimensions as Record<string, string>)[key]}
                  onChange={(e) => setDimensions((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#8B9B8E]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="mb-6 rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-800">Photos (optional)</h2>
          </div>
          <p className="mb-4 text-xs text-neutral-500">Upload 1–4 full-body or torso photos for best results.</p>
          {uploadingPhotos && <p className="mb-2 text-xs text-neutral-500">Uploading to storage…</p>}
          <div className="flex flex-wrap gap-3">
            {photoPreviews.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="h-24 w-24 rounded-lg object-cover border border-neutral-200" />
                <button
                  type="button"
                  onClick={() => setPhotoPreviews((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            {photoPreviews.length < 4 && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-neutral-400">
                <Upload className="mb-1 h-6 w-6" />
                <span className="text-[10px]">Add</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
              </label>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button
          type="button"
          disabled={!canAnalyze || analyzing}
          onClick={handleAnalyze}
          className="mb-10 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {analyzing ? (
            "Analyzing…"
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Get my fit suggestions
            </>
          )}
        </button>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-700">Your best fits</h2>
              {result.bodyTypeLabel && (
                <p className="mb-3 text-xs text-neutral-500">Body type: <span className="font-medium text-neutral-700">{result.bodyTypeLabel}</span></p>
              )}
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-neutral-600">Suggested colors</p>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedColors.map((c) => (
                    <span key={c} className="rounded-full bg-[#8B9B8E]/15 px-3 py-1 text-xs text-[#5a6b5d]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-neutral-600">Suggested silhouettes</p>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedSilhouettes.map((s) => (
                    <span key={s} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              {result.tips?.length ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-neutral-600">Tips</p>
                  <ul className="list-inside list-disc space-y-1 text-xs text-neutral-600">
                    {result.tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Recommended for you</h3>
                <p className="text-xs text-neutral-500">Looks that match your suggested colors & silhouettes</p>
              </div>
              {recommendedPosts.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200/60 bg-white py-12 text-center">
                  <p className="text-sm text-neutral-500">No posts match yet. Post more OOTDs or try different filters.</p>
                  <Link to="/" className="mt-3 inline-block text-xs text-[#8B9B8E] hover:underline">Browse feed</Link>
                </div>
              ) : (
                <PostGrid posts={recommendedPosts} columns={2} getCompatibility={(p) => p.compatibilityScore} />
              )}
            </section>
          </motion.div>
        )}

        {/* Previously uploaded images and analysis */}
        {isUsingApi && currentUserId && (
          <section className="mt-12 border-t border-neutral-200/60 pt-10">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-700">Previously uploaded images and analysis</h2>
            <p className="mb-4 text-xs text-neutral-500">Your past body-type analyses are used to personalize clothing suggestions.</p>
            {loadingPrevious ? (
              <p className="text-xs text-neutral-500">Loading…</p>
            ) : previousAnalyses.length === 0 ? (
              <p className="rounded-2xl border border-neutral-200/60 bg-white py-8 text-center text-xs text-neutral-500">No analyses yet. Run one above to see history here.</p>
            ) : (
              <div className="space-y-4">
                {previousAnalyses.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col gap-4 rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-sm sm:flex-row sm:items-start"
                  >
                    <div className="flex shrink-0 gap-2">
                      {record.image_urls?.length > 0 ? (
                        record.image_urls.slice(0, 3).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-20 w-20 rounded-lg object-cover border border-neutral-200"
                          />
                        ))
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                          <ImageIcon className="h-8 w-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs text-neutral-400">
                        {new Date(record.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                      </p>
                      {record.analysis.bodyTypeLabel && (
                        <p className="mb-2 text-xs font-medium text-neutral-700">Body type: {record.analysis.bodyTypeLabel}</p>
                      )}
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {(record.analysis.suggestedColors ?? []).slice(0, 4).map((c) => (
                          <span key={c} className="rounded-full bg-[#8B9B8E]/15 px-2 py-0.5 text-[10px] text-[#5a6b5d]">
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {(record.analysis.suggestedSilhouettes ?? []).slice(0, 4).map((s) => (
                          <span key={s} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                            {s}
                          </span>
                        ))}
                      </div>
                      {record.analysis.tips?.[0] && (
                        <p className="text-[10px] text-neutral-500 italic">{record.analysis.tips[0]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
