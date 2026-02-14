import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Bookmark, ImageOff, Trash2 } from "lucide-react";
import { formatPostTime } from "../../data/mockData";
import type { OOTDPost } from "../../data/mockData";
import { useAppStore } from "../../context/AppStore";
import { ensurePublicStorageUrl, DEFAULT_AVATAR } from "../../../lib/adapters";
import { Badge } from "./Badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../ui/utils";

const MotionDiv = motion.div;

type PostCardProps = {
  post: OOTDPost;
  compatibilityScore?: number;
  compact?: boolean;
  /** Show comment preview + save in scroll/feed view */
  showFeedMeta?: boolean;
  /** Show delete button (e.g. on own profile grid) */
  showDelete?: boolean;
  /** Called when user confirms delete */
  onDelete?: (postId: string) => void | Promise<void>;
  className?: string;
};

export function PostCard({
  post,
  compatibilityScore,
  compact = false,
  showFeedMeta = false,
  showDelete = false,
  onDelete,
  className,
}: PostCardProps) {
  const navigate = useNavigate();
  const { getUser, getCommentsForPost, isSaved, toggleSave } = useAppStore();
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
            onError={(e) => {
              setImageError(true);
              const src = (e.target as HTMLImageElement)?.src;
              if (src) console.warn("[PostCard] Image failed to load:", src);
            }}
          />
        )}
        {score != null && (
          <div className="absolute left-3 top-3">
            <Badge variant="accent">{score}%</Badge>
          </div>
        )}
        {showDelete && onDelete && (
          <div className="absolute right-3 top-3">
            <button
              type="button"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteConfirmOpen(true);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-red-600 disabled:opacity-50"
              aria-label="Delete post"
            >
              <Trash2 className="h-4 w-4" />
            </button>
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
              src={user?.avatarUrl ? ensurePublicStorageUrl(user.avatarUrl) : DEFAULT_AVATAR}
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

  const deleteConfirmDialog =
    showDelete && onDelete ? (
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent
          className="border-neutral-200/60 bg-white shadow-xl sm:max-w-md"
          aria-describedby="delete-post-description"
        >
          <DialogHeader>
            <DialogTitle className="text-left text-lg font-semibold text-neutral-900">
              Delete post?
            </DialogTitle>
            <DialogDescription
              id="delete-post-description"
              className="text-left text-sm text-neutral-500"
            >
              This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl border-neutral-300 hover:bg-neutral-50"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete(post.id);
                  setDeleteConfirmOpen(false);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ) : null;

  if (compact) {
    return (
      <>
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
                onError={(e) => {
                  setImageError(true);
                  const src = (e.target as HTMLImageElement)?.src;
                  if (src) console.warn("[PostCard] Image failed to load:", src);
                }}
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
        {deleteConfirmDialog}
      </>
    );
  }

  return (
    <>
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
      {deleteConfirmDialog}
    </>
  );
}
