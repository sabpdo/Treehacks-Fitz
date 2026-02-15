import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Camera, Flame, Sparkles, ChevronRight, TrendingUp, ImageOff, MapPin, Cloud } from "lucide-react";
import { motion } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { ensurePublicStorageUrl, DEFAULT_AVATAR, apiClosetItemToUI } from "../../lib/adapters";
import { getNetworkTopRankings } from "../../services/api/ranking";
import { getClosetItems, getDailyLook, setDailyLook, getLatestBodyAnalysis, createPost, uploadImage, updateStreak, dataURLToFile, type CachedDailyLookItem } from "../../services/api";
import { getWeatherForLocation, getCurrentPosition, type WeatherToday } from "../../services/weather";
import { apiPostToOOTDPost } from "../../lib/adapters";
import { compositeGridImage } from "../../lib/gridImage";
import { generateDailyLookDescription, type BodyAnalysisContext } from "../../services/openai";
import { PostGrid } from "./feed";
import type { ClosetItem } from "../data/mockData";

function scoreItemForBody(item: ClosetItem & { silhouette?: string }, body: BodyAnalysisContext | null): number {
  if (!body) return 0;
  const color = (item.color ?? "").toLowerCase();
  const sil = (item.silhouette ?? (item as ClosetItem & { silhouette?: string }).silhouette ?? "").toLowerCase();
  let s = 0;
  for (const c of body.suggestedColors ?? []) {
    if (color.includes(c.toLowerCase()) || c.toLowerCase().includes(color)) s += 2;
  }
  for (const x of body.suggestedSilhouettes ?? []) {
    if (sil.includes(x.toLowerCase()) || x.toLowerCase().includes(sil)) s += 1;
  }
  return s;
}

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ");
}

type LocationStatus = "idle" | "loading" | "granted" | "denied" | "error";

function isDressLike(item: ClosetItem & { subcategory?: string }): boolean {
  const d = (item.displayDescription ?? "").toLowerCase();
  const s = (item.subcategory ?? "").toLowerCase();
  const style = (item.style ?? "").toLowerCase();
  return d.includes("dress") || s.includes("dress") || style.includes("dress");
}

function suggestOutfitFromWeather(
  highF: number,
  lowF: number,
  closet: ClosetItem[],
  bodyAnalysis: BodyAnalysisContext | null = null
): { items: ClosetItem[]; description: string } {
  const sortByBody = <T extends ClosetItem>(arr: T[]): T[] => {
    if (!bodyAnalysis) return arr;
    return [...arr].sort((a, b) => scoreItemForBody(b, bodyAnalysis) - scoreItemForBody(a, bodyAnalysis));
  };
  const byCategory = {
    tops: sortByBody(closet.filter((c) => c.category === "tops")),
    bottoms: sortByBody(closet.filter((c) => c.category === "bottoms")),
    outerwear: sortByBody(closet.filter((c) => c.category === "outerwear")),
    shoes: sortByBody(closet.filter((c) => c.category === "shoes")),
    accessories: sortByBody(closet.filter((c) => c.category === "accessories")),
  };
  const dresses = byCategory.bottoms.filter(isDressLike);
  const pantsSkirts = byCategory.bottoms.filter((c) => !isDressLike(c));
  const pick = <T,>(arr: T[]): T | null => (arr.length > 0 ? arr[0]! : null);
  const items: ClosetItem[] = [];
  let description: string;

  if (highF < 55) {
    const outer = pick(byCategory.outerwear);
    const dress = pick(dresses);
    const top = pick(byCategory.tops);
    const bottom = pick(pantsSkirts);
    if (dress) {
      items.push(dress);
      if (outer) items.push(outer);
      description = "One dress with a layer—warm and put-together for today's low.";
    } else {
      if (outer) items.push(outer);
      if (top) items.push(top);
      if (bottom) items.push(bottom);
      description = "Layered for the cold—warm and put-together for today's low.";
    }
    if (items.length === 0) items.push(...closet.slice(0, 3));
  } else if (highF > 78) {
    const dress = pick(dresses);
    const top = pick(byCategory.tops);
    const bottom = pick(pantsSkirts);
    const acc = pick(byCategory.accessories);
    if (dress) {
      items.push(dress);
      if (acc) items.push(acc);
      description = "Light and breathable—one piece plus a small accent for the warmer temps.";
    } else {
      if (top) items.push(top);
      if (bottom) items.push(bottom);
      if (acc) items.push(acc);
      description = "Light and breathable—perfect for the warmer temps today.";
    }
    if (items.length === 0) items.push(...closet.slice(0, 3));
  } else {
    const dress = pick(dresses);
    const top = pick(byCategory.tops);
    const bottom = pick(pantsSkirts);
    const extra = pick(byCategory.outerwear) ?? pick(byCategory.accessories);
    if (dress) {
      items.push(dress);
      if (extra) items.push(extra);
      description = "Versatile one-piece look for today's mild weather—comfortable and stylish.";
    } else {
      if (top) items.push(top);
      if (bottom) items.push(bottom);
      if (extra) items.push(extra);
      description = "Versatile for today's mild weather—comfortable and stylish.";
    }
    if (items.length === 0) items.push(...closet.slice(0, 3));
  }

  return { items, description };
}

function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HomeFeed() {
  const navigate = useNavigate();
  const { posts, followingUserIds, refetchFeed, getUser, currentUserId, isUsingApi, refetchCurrentUser, addPost } = useAppStore();
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [networkTopRanked, setNetworkTopRanked] = useState<{ name: string; score: number; category: string }[]>([]);
  const [networkRankingsLoading, setNetworkRankingsLoading] = useState(false);

  // Today's look: cache (per user per day) or location -> weather -> closet -> suggestion
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [weather, setWeather] = useState<WeatherToday | null>(null);
  const [closetForLook, setClosetForLook] = useState<ClosetItem[]>([]);
  const [suggestedOutfit, setSuggestedOutfit] = useState<{ items: (ClosetItem | CachedDailyLookItem)[]; description: string } | null>(null);
  const [lookLoading, setLookLoading] = useState(false);
  const [dailyLookFromCache, setDailyLookFromCache] = useState<boolean | null>(null);
  const [saveToOotdLoading, setSaveToOotdLoading] = useState(false);
  const [saveToOotdError, setSaveToOotdError] = useState<string | null>(null);
  const [descriptionRefined, setDescriptionRefined] = useState(false);

  useEffect(() => {
    refetchFeed("following", "recent");
  }, [refetchFeed]);

  useEffect(() => {
    if (isUsingApi && currentUserId) refetchCurrentUser();
  }, [isUsingApi, currentUserId, refetchCurrentUser]);

  useEffect(() => {
    if (!isUsingApi || followingUserIds.size === 0) {
      setNetworkTopRanked([]);
      return;
    }
    let cancelled = false;
    setNetworkRankingsLoading(true);
    getNetworkTopRankings(Array.from(followingUserIds), 8)
      .then((items) => {
        if (cancelled) return;
        setNetworkTopRanked(
          items.map((item) => ({
            name: item.brand || "Item",
            score: Number(item.rating ?? 0),
            category: formatCategory(item.category || "closet"),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setNetworkTopRanked([]);
      })
      .finally(() => {
        if (!cancelled) setNetworkRankingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isUsingApi, followingUserIds]);

  // Reset cache state when user changes so we re-check for new user / new day
  useEffect(() => {
    if (!isUsingApi || !currentUserId) setDailyLookFromCache(null);
  }, [currentUserId, isUsingApi]);

  // Try cached daily look first (one per user per day)
  useEffect(() => {
    if (!isUsingApi || !currentUserId || dailyLookFromCache !== null) return;
    const todayStr = todayDateString();
    setLookLoading(true);
    getDailyLook(currentUserId, todayStr)
      .then((cached) => {
        if (cached && cached.items.length > 0) {
          setWeather({ highF: cached.weatherHighF, lowF: cached.weatherLowF, highC: 0, lowC: 0 });
          setSuggestedOutfit({ items: cached.items, description: cached.description });
          setLocationStatus("granted");
          setDailyLookFromCache(true);
        } else {
          setDailyLookFromCache(false);
        }
      })
      .catch(() => setDailyLookFromCache(false))
      .finally(() => setLookLoading(false));
  }, [isUsingApi, currentUserId, dailyLookFromCache]);

  // Request location and fetch weather only when no cache for today
  useEffect(() => {
    if (!isUsingApi || !currentUserId || dailyLookFromCache !== false || locationStatus !== "idle") return;
    setLocationStatus("loading");
    getCurrentPosition()
      .then(({ lat, lon }) => getWeatherForLocation(lat, lon))
      .then((w) => {
        setWeather(w);
        setLocationStatus("granted");
      })
      .catch((err: { code?: number }) => {
        setLocationStatus(err?.code === 1 ? "denied" : "error");
      });
  }, [isUsingApi, currentUserId, dailyLookFromCache, locationStatus]);

  // Fetch closet for Today's Look when logged in
  useEffect(() => {
    if (!isUsingApi || !currentUserId) {
      setClosetForLook([]);
      return;
    }
    setLookLoading(true);
    getClosetItems(currentUserId)
      .then((items) => setClosetForLook(items.map(apiClosetItemToUI)))
      .catch(() => setClosetForLook([]))
      .finally(() => setLookLoading(false));
  }, [isUsingApi, currentUserId]);

  // Compute suggested outfit when weather + closet are ready (only when not from cache); factor in body analysis, then refine description with OpenAI
  useEffect(() => {
    if (dailyLookFromCache !== false || !weather || closetForLook.length === 0) {
      if (dailyLookFromCache === false && (!weather || closetForLook.length === 0)) setSuggestedOutfit(null);
      return;
    }
    let cancelled = false;
    const bodyPromise =
      isUsingApi && currentUserId ? getLatestBodyAnalysis(currentUserId) : Promise.resolve(null);
    bodyPromise
      .then((bodyRecord) => {
        if (cancelled) return { suggestion: null as { items: ClosetItem[]; description: string } | null, bodyAnalysis: null as BodyAnalysisContext | null };
        const bodyAnalysis = bodyRecord?.analysis ?? null;
        const suggestion = suggestOutfitFromWeather(weather.highF, weather.lowF, closetForLook, bodyAnalysis);
        return { suggestion, bodyAnalysis };
      })
      .then(({ suggestion, bodyAnalysis }) => {
        if (cancelled || !suggestion) return;
        setSuggestedOutfit({ items: suggestion.items, description: suggestion.description });
        setDescriptionRefined(false);
        const labels = suggestion.items.map((i) => i.displayDescription || i.style || "item");
        return generateDailyLookDescription(weather.highF, weather.lowF, labels, bodyAnalysis);
      })
      .then((aiDesc) => {
        if (!cancelled && aiDesc)
          setSuggestedOutfit((prev) => (prev ? { ...prev, description: aiDesc } : null));
      })
      .catch(() => {
        /* keep static description */
      })
      .finally(() => {
        if (!cancelled) setDescriptionRefined(true);
      });
    return () => {
      cancelled = true;
    };
  }, [dailyLookFromCache, weather, closetForLook, currentUserId, isUsingApi]);

  // Persist generated look to cache after description is refined (or AI failed), so we don't call weather API again for the same day
  useEffect(() => {
    if (
      !isUsingApi ||
      !currentUserId ||
      dailyLookFromCache !== false ||
      !descriptionRefined ||
      !suggestedOutfit ||
      suggestedOutfit.items.length === 0 ||
      !weather
    )
      return;
    const todayStr = todayDateString();
    const snapshot: CachedDailyLookItem[] = suggestedOutfit.items.map((i) => ({
      id: i.id,
      imageUrl: i.imageUrl,
      displayDescription: i.displayDescription ?? null,
      style: i.style,
      brand: "brand" in i ? (i.brand ?? null) : null,
    }));
    let cancelled = false;
    setDailyLook(currentUserId, todayStr, {
      weatherHighF: weather.highF,
      weatherLowF: weather.lowF,
      description: suggestedOutfit.description,
      items: snapshot,
    }).then(() => {
      if (!cancelled) setDailyLookFromCache(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isUsingApi, currentUserId, dailyLookFromCache, descriptionRefined, suggestedOutfit, weather]);

  const handleSaveToOotd = async () => {
    if (!suggestedOutfit?.items.length || !currentUserId || !isUsingApi) return;
    setSaveToOotdError(null);
    setSaveToOotdLoading(true);
    try {
      const urls = suggestedOutfit.items.map((i) => i.imageUrl).filter(Boolean);
      const itemIds = suggestedOutfit.items.map((i) => i.id);
      let imageUrl: string;
      try {
        const dataUrl = await compositeGridImage(urls);
        const file = dataURLToFile(dataUrl, "today-look.png");
        imageUrl = await uploadImage(file);
      } catch (gridErr) {
        if (urls[0]) imageUrl = urls[0];
        else throw gridErr;
      }
      const apiPost = await createPost({
        image_url: imageUrl,
        caption: "Today's look — curated from my closet",
        item_ids: itemIds,
      });
      const uiPost = apiPostToOOTDPost(apiPost, currentUserId);
      addPost({ ...uiPost, tags: uiPost.tags });
      try {
        await updateStreak();
        if (refetchCurrentUser) await refetchCurrentUser();
      } catch {
        /* ignore */
      }
      await refetchFeed("following", "recent");
    } catch (e) {
      console.error("Save to OOTD failed:", e);
      setSaveToOotdError(e instanceof Error ? e.message : "Failed to save. Try again.");
    } finally {
      setSaveToOotdLoading(false);
    }
  };

  const currentUser = getUser(currentUserId);
  const streak = isUsingApi ? (currentUser?.streak ?? 0) : 7;
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const friendsToday = posts.filter(
    (p) => followingUserIds.has(p.userId) || p.userId === currentUserId
  );
  const friendsPosts = friendsToday.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-xl tracking-tight">fitz</h1>
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-400/10 to-rose-500/10 px-3 py-1">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="text-xs text-neutral-700">{streak} day streak</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        {/* Today's OOTD Prompt */}
        <section className="py-8">
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
            <div className="p-8 text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-50">
                  <Camera className="h-5 w-5 text-neutral-700" />
                </div>
              </div>
              <h2 className="mb-2 text-lg text-neutral-900">Post Today's Fit</h2>
              <p className="mb-6 text-xs text-neutral-500">{todayDate}</p>
              <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                <Link
                  to="/capture"
                  className="block w-full rounded-xl bg-neutral-900 py-3.5 text-center text-sm text-white transition-colors duration-200 hover:bg-neutral-800"
                >
                  Open Camera
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Friends Today */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="mb-0.5 text-sm uppercase tracking-wide text-neutral-500">
                Friends Today
              </h3>
              <p className="text-xs text-neutral-400">What people are wearing</p>
            </div>
            <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
              <Link
                to="/ootds"
                className="flex items-center gap-1 text-xs text-neutral-500 transition-colors duration-200 hover:text-neutral-900"
              >
                View all OOTDs
                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" />
              </Link>
            </motion.div>
          </div>

          <PostGrid
            posts={friendsPosts}
            compact
            columns={3}
            getCompatibility={(p) => p.compatibilityScore}
          />
        </section>

        {/* Compatibility Highlights - keep existing style with first 4 from feed */}
        <section className="mb-12">
          <div className="mb-5">
            <h3 className="mb-0.5 text-sm uppercase tracking-wide text-neutral-500">
              Fits That Align With You
            </h3>
            <p className="text-xs text-neutral-400">Based on your wardrobe core</p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {posts.slice(0, 4).map((post, index) => {
              const compatibility = post.compatibilityScore || 91 - index * 4;
              const poster = getUser(post.userId);
              const imageBroken = brokenImageIds.has(post.id);
              const imageSrc = ensurePublicStorageUrl(post.imageUrl);
              const insights = [
                "Matches your neutral palette preference",
                "Similar silhouette to your saved looks",
                "Complements your minimal aesthetic",
                "Aligns with your casual-chic style",
              ];
              return (
                <div key={post.id} className="flex-shrink-0">
                  <Link
                    to={`/post/${post.id}`}
                    className="block w-[280px] overflow-hidden rounded-xl border border-neutral-200/60 bg-white text-left shadow-sm transition-all duration-300 hover:border-neutral-300 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
                      {imageBroken || !imageSrc ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-400">
                          <ImageOff className="h-10 w-10" />
                          <span className="text-xs">Image unavailable</span>
                        </div>
                      ) : (
                        <img
                          src={imageSrc}
                          alt={post.caption || "Post"}
                          className="h-full w-full object-cover object-center"
                          loading="lazy"
                          onError={() => setBrokenImageIds((prev) => new Set(prev).add(post.id))}
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          type="button"
                          className="flex items-center gap-2 transition-opacity hover:opacity-70 text-left"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/profile/${post.userId}`);
                          }}
                        >
                          <img
                            src={poster?.avatarUrl ? ensurePublicStorageUrl(poster.avatarUrl) : DEFAULT_AVATAR}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                          />
                          <p className="text-xs text-neutral-900">
                            {poster?.handle ?? post.userId}
                          </p>
                        </button>
                        <div className="rounded-full bg-[#8B9B8E]/10 px-2.5 py-0.5">
                          <p className="text-xs text-[#8B9B8E]">{compatibility}%</p>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-neutral-500">
                        {insights[index]}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Two Column Layout: Rankings + AI Suggestion */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <div className="mb-5">
              <h3 className="mb-0.5 text-sm uppercase tracking-wide text-neutral-500">
                Top Ranked in Your Network
              </h3>
              <p className="text-xs text-neutral-400">What's trending today</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
              <div className="divide-y divide-neutral-200/60">
                {networkRankingsLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-24 rounded bg-neutral-200" />
                        <div className="h-6 w-10 rounded bg-neutral-200" />
                      </div>
                    </div>
                  ))
                ) : networkTopRanked.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-neutral-500">
                    {followingUserIds.size === 0
                      ? "Follow people to see their top ranked items here."
                      : "No ranked items from people you follow yet."}
                  </div>
                ) : (
                  networkTopRanked.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="mb-0.5 truncate text-sm text-neutral-900">{item.name}</p>
                          <p className="text-xs capitalize text-neutral-400">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-serif text-2xl text-neutral-900">
                            {item.score.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-neutral-200/60 bg-neutral-50 p-4">
                <Link
                  to="/profile?tab=rankings"
                  className="flex w-full items-center justify-center gap-2 text-xs text-neutral-600 transition-colors duration-200 hover:text-neutral-900"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  View Full Rankings
                </Link>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-5">
              <h3 className="mb-0.5 text-sm uppercase tracking-wide text-neutral-500">
                Today's Generated Look
              </h3>
              <p className="text-xs text-neutral-400">Curated from your closet</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
              {!isUsingApi || !currentUserId ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <Cloud className="h-10 w-10 text-neutral-300" />
                  <p className="text-sm text-neutral-500">Sign in and add items to your closet to get a daily look based on your weather.</p>
                </div>
              ) : locationStatus === "loading" || lookLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                  <p className="text-xs text-neutral-500">
                    {dailyLookFromCache === null ? "Checking today's look…" : locationStatus === "loading" ? "Getting your location…" : "Loading your closet…"}
                  </p>
                </div>
              ) : locationStatus === "denied" || locationStatus === "error" ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <MapPin className="h-10 w-10 text-neutral-300" />
                  <p className="text-sm text-neutral-500">
                    Enable location to get outfit suggestions based on today's weather.
                  </p>
                </div>
              ) : closetForLook.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <Sparkles className="h-10 w-10 text-neutral-300" />
                  <p className="text-sm text-neutral-500">Add items to your closet to get a daily look for your weather.</p>
                  <Link to="/closet" className="text-sm font-medium text-neutral-900 underline underline-offset-2">Go to Closet</Link>
                </div>
              ) : suggestedOutfit && suggestedOutfit.items.length > 0 ? (
                <>
                  <div className="relative flex aspect-[4/3] items-center justify-center gap-2 overflow-hidden bg-neutral-50 p-4">
                    {suggestedOutfit.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="flex h-full max-h-[140px] flex-1 overflow-hidden rounded-lg border border-neutral-200/60 bg-white shadow-sm">
                        <img src={item.imageUrl} alt={item.displayDescription || item.style} className="h-full w-full object-cover" />
                      </div>
                    ))}
                    {weather && (
                      <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                        <Cloud className="h-3 w-3 text-[#8B9B8E]" />
                        <span className="text-xs text-neutral-900">High {weather.highF}° / Low {weather.lowF}°</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="mb-4 text-xs leading-relaxed text-neutral-600">{suggestedOutfit.description}</p>
                    <div className="mb-4 space-y-2">
                      {suggestedOutfit.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs text-neutral-500">
                          <div className="h-1 w-1 rounded-full bg-neutral-400" />
                          {item.displayDescription || `${item.style}${item.brand ? ` — ${item.brand}` : ""}`}
                        </div>
                      ))}
                    </div>
                    {saveToOotdError && (
                      <p className="mb-3 text-xs text-red-600">{saveToOotdError}</p>
                    )}
                    <button
                      type="button"
                      disabled={saveToOotdLoading}
                      onClick={handleSaveToOotd}
                      className="w-full rounded-xl border border-neutral-900 bg-neutral-900 py-2.5 text-sm text-white transition-colors duration-200 hover:bg-neutral-800 disabled:opacity-60"
                    >
                      {saveToOotdLoading ? "Creating OOTD…" : "Save to OOTD"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <Sparkles className="h-10 w-10 text-neutral-300" />
                  <p className="text-sm text-neutral-500">Add more items to your closet to get a suggested look.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

    </div>
  );
}
