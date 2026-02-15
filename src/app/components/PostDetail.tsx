import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, X, Check, Plus, ShoppingBag, Sparkles, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { formatPostTime, type OutfitItem } from "../data/mockData";
import { ActionRow, Badge, CommentList } from "./feed";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { getPost } from "../../services/api";
import { apiPostToOOTDPost, ensurePublicStorageUrl } from "../../lib/adapters";

export function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const {
    posts,
    getCommentsForPost,
    loadCommentsForPost,
    isSaved,
    isLiked,
    toggleSave,
    toggleLike,
    addComment,
    getUser,
    currentUserId,
  } = useAppStore();
  const [commentText, setCommentText] = useState("");
  const [fetchedPost, setFetchedPost] = useState<ReturnType<typeof apiPostToOOTDPost> | null>(null);
  const [loading, setLoading] = useState(!!postId);
  const [showShopModal, setShowShopModal] = useState(false);
  const [isOutfitBreakdownExpanded, setIsOutfitBreakdownExpanded] = useState(false);

  const postFromStore = posts.find((p) => p.id === postId);
  const post = postFromStore ?? fetchedPost;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    if (postFromStore) {
      loadCommentsForPost(postId);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getPost(postId)
      .then((apiPost) => {
        if (cancelled || !apiPost) return;
        setFetchedPost(apiPostToOOTDPost(apiPost, currentUserId));
        return loadCommentsForPost(postId);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, postFromStore, currentUserId, loadCommentsForPost]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAFAF8]">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAFAF8]">
        <p className="text-neutral-500">Post not found.</p>
        <Button variant="link" onClick={() => navigate("/")}>
          Back to feed
        </Button>
      </div>
    );
  }

  const user = getUser(post.userId);
  const comments = getCommentsForPost(post.id);
  const likedByFriendsCount = post.likedByUserIds.length;
  const isLikedState = post.likedByUserIds.includes(currentUserId);

  const handleLike = () => {
    toggleLike(post.id);
    if (fetchedPost && post.id === fetchedPost.id) {
      const newLiked = !isLikedState;
      setFetchedPost((prev) =>
        prev
          ? {
            ...prev,
            likeCount: prev.likeCount + (newLiked ? 1 : -1),
            likedByUserIds: newLiked
              ? [...prev.likedByUserIds, currentUserId]
              : prev.likedByUserIds.filter((id) => id !== currentUserId),
          }
          : null
      );
    }
  };

  const handleSubmitComment = () => {
    const t = commentText.trim();
    if (!t) return;
    addComment(post.id, t);
    setCommentText("");
    if (fetchedPost && post.id === fetchedPost.id) {
      setFetchedPost((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : null
      );
    }
  };

  const handleAISearch = (item: OutfitItem) => {
    // Build a descriptive query: e.g. "grey cotton hoodie" instead of just "hoodie"
    const parts = [
      item.color,
      item.fabric,
      item.label,
      item.brand,
    ].filter(Boolean) as string[];
    const searchQuery = parts.join(" ").trim() || item.label;
    sessionStorage.setItem("aiSearchQuery", searchQuery);
    setShowShopModal(false);
    navigate("/ai-generator");
  };

  const rawOutfitItems = (post as { outfitItems?: OutfitItem[] }).outfitItems ?? [];
  const outfitItems = rawOutfitItems.filter(
    (oi) => oi != null && (typeof oi.id === "string" || typeof oi.label === "string")
  );

  const getColorStyle = (color: string) => {
    const colorMap: Record<string, string> = {
      white: "#F5F5F5", black: "#1a1a1a", beige: "#D4C5B9", tan: "#D2B48C",
      cream: "#F5F1E8", navy: "#1F2937", camel: "#C19A6B",
    };
    return colorMap[color.toLowerCase()] || "#E5E7EB";
  };

  const getCategoryOrder = (type: string) => {
    const order: Record<string, number> = { top: 1, bottom: 2, shoes: 3, accessory: 4, outerwear: 0 };
    return order[type] ?? 99;
  };

  const sortedItems = [...outfitItems].sort(
    (a, b) => getCategoryOrder(a.type) - getCategoryOrder(b.type)
  );

  const isOwnPost = post.userId === currentUserId;
  const isPostFromToday = (() => {
    try {
      const d = new Date(post.createdAt);
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    } catch {
      return false;
    }
  })();
  const showDailyOOTDCheckmark = isOwnPost && isPostFromToday;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-[#FAFAF8]"
    >
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </motion.button>
          <div className="text-center">
            <p className="text-xs text-neutral-900">{user?.name ?? user?.handle}</p>
            <p className="text-[10px] text-neutral-400">{formatPostTime(post.createdAt)}</p>
          </div>
          <div className="flex w-9 items-center justify-end">
            {showDailyOOTDCheckmark && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700" title="Daily OOTD posted">
                <Check className="h-3 w-3" />
                Daily OOTD
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
        {/* Hero: image + caption in one card */}
        <article className="mb-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/60">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
              <img
                src={ensurePublicStorageUrl(post.imageUrl)}
                alt={post.caption || "Outfit"}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="px-5 py-4">
              {post.caption && (
                <p className="mb-3 text-sm leading-relaxed text-neutral-700">{post.caption}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {post.vibeTag && (
                  <span className="rounded-full bg-[#8B9B8E]/10 px-3 py-1 text-xs font-medium text-[#5a6b5d]">
                    {post.vibeTag}
                  </span>
                )}
                {post.compatibilityScore != null && post.compatibilityScore > 0 && (
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                    {post.compatibilityScore}% fit
                  </span>
                )}
              </div>
              {post.aiInsight && (
                <p className="mt-3 text-xs italic text-neutral-500">{post.aiInsight}</p>
              )}
            </div>
          </div>
        </article>

        {/* Outfit: collapsible — collapsed = horizontal scroll (small cards), expanded = list */}
        <section className="mb-8">
          {outfitItems.length === 0 ? (
            <>
              <h2 className="mb-4 text-sm font-medium text-neutral-900">What they're wearing</h2>
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 py-10 px-6 text-center">
              <p className="text-sm text-neutral-500">Nothing here yet.</p>
              <p className="mt-1 text-xs text-neutral-400">
                {isOwnPost
                  ? "Add the pieces in your outfit so others can see what you’re wearing."
                  : "This post doesn’t have an outfit breakdown yet."}
              </p>
              {isOwnPost && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2 rounded-full border-neutral-300 text-neutral-700 hover:bg-white"
                  onClick={() => navigate("/capture")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add outfit breakdown
                </Button>
              )}
            </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-neutral-900">What they're wearing</h2>
                <button
                  type="button"
                  onClick={() => setIsOutfitBreakdownExpanded(!isOutfitBreakdownExpanded)}
                  className="flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-neutral-900"
                >
                  {isOutfitBreakdownExpanded ? (
                    <>
                      Collapse
                      <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      View Details
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>

              {!isOutfitBreakdownExpanded && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {sortedItems.map((oi, idx) => {
                    const closetId = (oi as OutfitItem & { closetItemId?: string }).closetItemId;
                    const inWardrobe = isOwnPost && closetId;
                    const displayName = oi.brand && oi.brand.toLowerCase() !== "unknown" ? oi.brand : oi.label;
                    return (
                      <motion.button
                        key={oi.id ?? `oi-${idx}`}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-shrink-0 text-left"
                        onClick={() => {
                          if (inWardrobe && closetId) {
                            navigate(`/closet?item=${closetId}`);
                          } else {
                            setIsOutfitBreakdownExpanded(true);
                          }
                        }}
                      >
                        <div className="w-24 overflow-hidden rounded-lg border border-neutral-200/60 bg-white shadow-sm transition-all hover:shadow-md">
                          <div className="relative aspect-square overflow-hidden bg-neutral-50">
                            {oi.imageUrl ? (
                              <img
                                src={ensurePublicStorageUrl(oi.imageUrl)}
                                alt={oi.label}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                                <Sparkles className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="mb-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                              {oi.type}
                            </p>
                            <p className="truncate text-xs text-neutral-900">{displayName}</p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              <AnimatePresence>
                {isOutfitBreakdownExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="overflow-hidden rounded-xl border border-neutral-200/60 bg-white">
                      <div className="divide-y divide-neutral-100">
                        {sortedItems.map((oi, idx) => {
                          const closetId = (oi as OutfitItem & { closetItemId?: string }).closetItemId;
                          const inWardrobe = isOwnPost && closetId;
                          const displayName = oi.brand && oi.brand.toLowerCase() !== "unknown" ? oi.brand : oi.label;
                          return (
                            <button
                              key={oi.id ?? `oi-${idx}`}
                              type="button"
                              onClick={() => {
                                if (inWardrobe && closetId) navigate(`/closet?item=${closetId}`);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 p-3 text-left transition-colors",
                                inWardrobe && closetId ? "cursor-pointer hover:bg-neutral-50" : "cursor-default"
                              )}
                            >
                              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                                {oi.imageUrl ? (
                                  <img
                                    src={ensurePublicStorageUrl(oi.imageUrl)}
                                    alt={oi.label}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-neutral-300">
                                    <Sparkles className="h-6 w-6" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
                                  {oi.type}
                                </p>
                                <p className="mb-1 text-sm font-medium text-neutral-900">{oi.label}</p>
                                {displayName !== oi.label && (
                                  <p className="mb-2 text-xs text-neutral-500">{displayName}</p>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  {oi.color && (
                                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                                      {oi.color}
                                    </span>
                                  )}
                                  {oi.fabric && (
                                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                                      {oi.fabric}
                                    </span>
                                  )}
                                  {inWardrobe && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[#8B9B8E]/10 px-2 py-0.5 text-[10px] text-[#8B9B8E]">
                                      <Check className="h-2.5 w-2.5" />
                                      In wardrobe
                                    </span>
                                  )}
                                </div>
                              </div>
                              {(inWardrobe && closetId) && (
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </section>

        {/* Actions: like, comment, save + Shop the Look */}
        <section className="mb-8 rounded-2xl bg-neutral-50/80 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {post.compatibilityScore != null && post.compatibilityScore > 0 && (
                <Badge variant="accent">{post.compatibilityScore}% fit</Badge>
              )}
            </div>
            <ActionRow
              isLiked={isLikedState}
              isSaved={isSaved(post.id)}
              likeCount={post.likeCount}
              commentCount={post.commentCount}
              onLike={handleLike}
              onSave={() => toggleSave(post.id)}
              onComment={() => {}}
            />
          </div>
          {outfitItems.length > 0 && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowShopModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop the Look
            </motion.button>
          )}
          {likedByFriendsCount > 0 && (
            <p className="mt-3 text-center text-xs text-neutral-400">
              Liked by {likedByFriendsCount} {likedByFriendsCount === 1 ? "friend" : "friends"}
            </p>
          )}
        </section>

        {/* Comments */}
        <section className="pt-6">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Comments</h2>
          <CommentList comments={comments} className="mb-4" />
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
              className={cn("flex-1 rounded-xl border-neutral-200 bg-white")}
            />
            <Button
              size="sm"
              className="shrink-0 rounded-xl bg-neutral-900 px-4 text-white hover:bg-neutral-800"
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
            >
              Post
            </Button>
          </div>
        </section>
      </div>

      {/* Shop the Look Modal */}
      <AnimatePresence>
        {showShopModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShopModal(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-6"
            >
              <div className="overflow-hidden rounded-3xl border border-neutral-200/60 bg-white shadow-2xl">
                <div className="border-b border-neutral-200/60 bg-neutral-50/50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="mb-0.5 text-base font-medium text-neutral-900">Shop the Look</h3>
                      <p className="text-xs text-neutral-500">Find these items or similar styles</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowShopModal(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="divide-y divide-neutral-100">
                    {sortedItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-4 p-4 transition-colors hover:bg-neutral-50"
                      >
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-50">
                          {item.imageUrl ? (
                            <img
                              src={ensurePublicStorageUrl(item.imageUrl)}
                              alt={item.label}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-neutral-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-neutral-400">{item.type}</p>
                          <p className="mb-0.5 truncate text-sm font-medium text-neutral-900">{item.label}</p>
                          {item.brand && item.brand.toLowerCase() !== "unknown" && (
                            <p className="mb-2 text-xs text-neutral-500">{item.brand}</p>
                          )}
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleAISearch(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white shadow-sm transition-all hover:bg-neutral-800 hover:shadow-md"
                          >
                            <Sparkles className="h-3 w-3" />
                            AI Search
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-neutral-200/60 bg-neutral-50/50 px-5 py-3">
                  <p className="text-center text-[10px] leading-relaxed text-neutral-500">
                    Powered by AI · Find exact items or discover similar styles
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
}
