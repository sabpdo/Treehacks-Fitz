import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, X, ChevronDown, ChevronUp, ExternalLink, Check, Plus } from "lucide-react";
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
  const [isOutfitBreakdownExpanded, setIsOutfitBreakdownExpanded] = useState(false);

  const postFromStore = posts.find((p) => p.id === postId);
  const post = postFromStore ?? fetchedPost;

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

  const outfitItems = (post as { outfitItems?: OutfitItem[] }).outfitItems ?? [];

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
    <div className="min-h-screen bg-[#FAFAF8]">
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

      <div className="mx-auto max-w-3xl px-6 py-6">
        {/* Outfit image */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
          <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
            <img
              src={ensurePublicStorageUrl(post.imageUrl)}
              alt={post.caption}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Caption + vibe */}
        <div className="mb-4">
          {post.caption && (
            <p className="mb-3 text-sm leading-relaxed text-neutral-600">{post.caption}</p>
          )}
          {post.vibeTag && (
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
              {post.vibeTag}
            </span>
          )}
          {post.aiInsight && (
            <p className="mt-3 text-xs italic text-neutral-500">{post.aiInsight}</p>
          )}
        </div>

        {/* Outfit breakdown: always show section; empty state or list */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">Outfit Breakdown</h3>
            {outfitItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsOutfitBreakdownExpanded(!isOutfitBreakdownExpanded)}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-900"
              >
                {isOutfitBreakdownExpanded ? (
                  <>Collapse <ChevronUp className="h-3.5 w-3.5" /></>
                ) : (
                  <>View Details <ChevronDown className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </div>

          {outfitItems.length === 0 ? (
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
          ) : (
            <>
              {!isOutfitBreakdownExpanded && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {sortedItems.map((oi) => (
                    <motion.div
                      key={oi.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-shrink-0"
                    >
                      <div className="w-24 overflow-hidden rounded-lg border border-neutral-200/60 bg-white shadow-sm hover:shadow-md">
                        <div className="relative aspect-square overflow-hidden bg-neutral-50">
                          {oi.imageUrl ? (
                            <img src={ensurePublicStorageUrl(oi.imageUrl)} alt={oi.label} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-neutral-200" />
                          )}
                        </div>
                        <div className="p-2">
                          <p className="truncate text-[10px] uppercase tracking-wide text-neutral-400">{oi.type}</p>
                          <p className="truncate text-xs text-neutral-900">{oi.brand || oi.label}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
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
                        {sortedItems.map((oi) => (
                          <div
                            key={oi.id}
                            className="flex w-full items-center gap-3 p-3 text-left"
                          >
                            {oi.imageUrl ? (
                              <img
                                src={ensurePublicStorageUrl(oi.imageUrl)}
                                alt={oi.label}
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-lg bg-neutral-200" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs uppercase tracking-wide text-neutral-400">{oi.type}</p>
                              <p className="text-sm text-neutral-900">{oi.label}</p>
                              <p className="text-xs text-neutral-500">{oi.brand}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {oi.color && (
                                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">{oi.color}</span>
                                )}
                                {oi.fabric && (
                                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">{oi.fabric}</span>
                                )}
                              </div>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Compatibility + actions */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-neutral-200/60 bg-white p-4">
          <Badge variant="accent">{post.compatibilityScore}%</Badge>
          <ActionRow
            isLiked={isLikedState}
            isSaved={isSaved(post.id)}
            likeCount={post.likeCount}
            commentCount={post.commentCount}
            onLike={handleLike}
            onSave={() => toggleSave(post.id)}
            onComment={() => { }}
          />
        </div>

        {likedByFriendsCount > 0 && (
          <p className="mb-4 text-[11px] text-neutral-400">
            Liked by {likedByFriendsCount} {likedByFriendsCount === 1 ? "friend" : "friends"}
          </p>
        )}

        <div className="border-t border-neutral-200/50 pt-5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-neutral-400">Comments</h3>
          <CommentList comments={comments} className="mb-4" />
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
              className={cn("flex-1 rounded-full border-neutral-200")}
            />
            <Button
              size="sm"
              className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
            >
              Post
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
