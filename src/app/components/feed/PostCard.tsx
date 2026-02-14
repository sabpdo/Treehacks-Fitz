import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Bookmark, ImageOff } from "lucide-react";
import { formatPostTime } from "../../data/mockData";
import type { OOTDPost } from "../../data/mockData";
import { useAppStore } from "../../context/AppStore";
import { ensurePublicStorageUrl } from "../../../lib/adapters";
import { Badge } from "./Badge";
import { cn } from "../ui/utils";

const MotionDiv = motion.div;

type PostCardProps = {
  post: OOTDPost;
  compatibilityScore?: number;
  compact?: boolean;
  /** Show comment preview + save in scroll/feed view */
  showFeedMeta?: boolean;
  className?: string;
};

export function PostCard({
  post,
  compatibilityScore,
  compact = false,
  showFeedMeta = false,
  className,
}: PostCardProps) {
  const navigate = useNavigate();
  const { getUser, getCommentsForPost, isSaved, toggleSave } = useAppStore();
  const user = getUser(post.userId);
  const score = compatibilityScore ?? post.compatibilityScore;

  const comments = showFeedMeta ? getCommentsForPost(post.id) : [];
  const firstComment = comments[0];
  const commentPreview = firstComment?.text;
  const saved = showFeedMeta && isSaved(post.id);
  const [imageError, setImageError] = useState(false);

  const baseClass = cn(
    "group block overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all duration-300 hover:border-neutral-300 hover:shadow-md active:scale-[0.995]",
    className
  );

  const cardContent = (
    <>
      <div className="relative aspect-[4/5] min-h-[200px] overflow-hidden bg-neutral-100">
        {imageError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-400">
            <ImageOff className="h-10 w-10" />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <img
            src={ensurePublicStorageUrl(post.imageUrl)}
            alt={post.caption || "Post"}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
        )}
        {score != null && (
          <div className="absolute left-3 top-3">
            <Badge variant="accent">{score}%</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Link
            to={`/profile/${post.userId}`}
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={user?.avatarUrl ?? ""}
              alt={user?.name ?? ""}
              className="h-6 w-6 rounded-full object-cover"
            />
            <p className="text-xs font-medium text-neutral-900">{user?.name ?? user?.handle}</p>
          </Link>
        </div>
        <p className="text-[10px] text-neutral-400">{formatPostTime(post.createdAt)}</p>
        {post.caption && !showFeedMeta && (
          <p className="mt-2 line-clamp-2 text-xs text-neutral-600">{post.caption}</p>
        )}
        {showFeedMeta && (
          <div className="mt-3 flex items-start justify-between gap-2 border-t border-neutral-100 pt-3">
            <div className="min-w-0 flex-1">
              {post.commentCount > 0 && (
                <p className="line-clamp-1 text-[11px] text-neutral-500">
                  {commentPreview && (
                    <span className="text-neutral-600">{commentPreview}</span>
                  )}
                  {commentPreview && post.commentCount > 1 && (
                    <span className="text-neutral-400"> · {post.commentCount} comments</span>
                  )}
                  {!commentPreview && (
                    <span className="text-neutral-400">{post.commentCount} comments</span>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSave(post.id);
              }}
              className="flex-shrink-0 text-neutral-400 transition-colors hover:text-neutral-600"
              aria-label={saved ? "Saved" : "Save"}
            >
              <Bookmark
                className={cn("h-4 w-4", saved && "fill-[#8B9B8E] text-[#8B9B8E]")}
              />
            </button>
          </div>
        )}
      </div>
    </>
  );

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    navigate(`/post/${post.id}`);
  };

  if (compact) {
    return (
      <MotionDiv
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e as unknown as React.MouseEvent)}
        className={cn(baseClass, 'cursor-pointer')}
        whileTap={{ scale: 0.995 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative aspect-square min-h-[140px] overflow-hidden bg-neutral-100">
          {imageError ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-neutral-400">
              <ImageOff className="h-8 w-8" />
              <span className="text-[10px]">Unavailable</span>
            </div>
          ) : (
            <img
              src={ensurePublicStorageUrl(post.imageUrl)}
              alt={post.caption || "Post"}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
          )}
          {score != null && (
            <div className="absolute right-2 top-2">
              <Badge variant="accent">{score}%</Badge>
            </div>
          )}
        </div>
        <div className="p-3">
          <Link
            to={`/profile/${post.userId}`}
            className="block transition-opacity hover:opacity-70"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium text-neutral-900">{user?.name ?? user?.handle}</p>
          </Link>
          <p className="text-[10px] text-neutral-400">{formatPostTime(post.createdAt)}</p>
        </div>
      </MotionDiv>
    );
  }

  return (
    <MotionDiv
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e as unknown as React.MouseEvent)}
      className={cn(baseClass, 'cursor-pointer')}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.2 }}
    >
      {cardContent}
    </MotionDiv>
  );
}
