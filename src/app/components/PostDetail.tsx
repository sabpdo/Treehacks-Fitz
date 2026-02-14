import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { formatPostTime } from "../data/mockData";
import {
  ActionRow,
  Badge,
  CommentList,
} from "./feed";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { getPost } from "../../services/api";
import { apiPostToOOTDPost, ensurePublicStorageUrl } from "../../lib/adapters";
import { getCategoryIcon, getCategoryLabel } from "../../lib/categories";
import type { Post as ApiPost } from "../../types/database";

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
  const [apiPostData, setApiPostData] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(!!postId);

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
        setApiPostData(apiPost);
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

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-neutral-200/60 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2 }}
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors duration-200 hover:bg-neutral-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="flex-1 text-sm font-medium text-neutral-900">Post</h1>
      </header>

      <div className="mx-auto max-w-2xl bg-white sm:px-4">
        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
          <img
            src={ensurePublicStorageUrl(post.imageUrl)}
            alt={post.caption}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="border-b border-neutral-200/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              to={`/profile/${post.userId}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-70"
            >
              <img
                src={user?.avatarUrl ?? ""}
                alt={user?.name ?? ""}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-neutral-900">{user?.name ?? user?.handle}</p>
                <p className="text-xs text-neutral-400">{formatPostTime(post.createdAt)}</p>
              </div>
            </Link>
            <Badge variant="accent">{post.compatibilityScore}%</Badge>
          </div>
          {post.caption && (
            <p className="mt-3 text-sm text-neutral-700">{post.caption}</p>
          )}
          {post.aiInsight && (
            <p className="mt-2 text-xs text-neutral-500 italic">{post.aiInsight}</p>
          )}
          {likedByFriendsCount > 0 && (
            <p className="mt-2 text-[10px] text-neutral-400">
              Liked by {likedByFriendsCount} {likedByFriendsCount === 1 ? "friend" : "friends"}
            </p>
          )}

          {/* Clothing items in this outfit */}
          {apiPostData?.items && apiPostData.items.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                Items in this outfit
              </p>
              <div className="flex flex-wrap gap-2">
                {apiPostData.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1"
                  >
                    <span className="text-sm">{getCategoryIcon(item.category)}</span>
                    <span className="text-[11px] font-medium text-neutral-700">
                      {getCategoryLabel(item.category)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ActionRow
          isLiked={isLikedState}
          isSaved={isSaved(post.id)}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          onLike={handleLike}
          onSave={() => toggleSave(post.id)}
          onComment={() => { }}
        />

        <div className="border-t border-neutral-200/60 px-4 py-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Comments
          </h3>
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
    </div>
  );
}
