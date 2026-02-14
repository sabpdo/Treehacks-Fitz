import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useAppStore } from "./AppStore";
import { ensurePublicStorageUrl } from "../../lib/adapters";
import { formatPostTime } from "../data/mockData";
import {
  ActionRow,
  Badge,
  CommentList,
} from "../components/feed";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { cn } from "../components/ui/utils";

type PostSheetContextValue = {
  openPost: (postId: string) => void;
  close: () => void;
  selectedPostId: string | null;
};

const PostSheetContext = createContext<PostSheetContextValue | null>(null);

export function usePostSheet() {
  const ctx = useContext(PostSheetContext);
  return ctx;
}

function PostDetailSheet({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const { posts, getCommentsForPost, isSaved, isLiked, toggleSave, toggleLike, addComment, getUser } =
    useAppStore();
  const [commentText, setCommentText] = useState("");

  const post = posts.find((p) => p.id === postId);
  if (!post) return null;

  const user = getUser(post.userId);
  const comments = getCommentsForPost(post.id);
  const likedByFriendsCount = post.likedByUserIds.length;

  const handleSubmitComment = () => {
    const t = commentText.trim();
    if (!t) return;
    addComment(post.id, t);
    setCommentText("");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl"
      >
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200/60 px-4 py-3">
            <span className="text-sm font-medium text-neutral-900">Outfit</span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
              <img
                src={ensurePublicStorageUrl(post.imageUrl)}
                alt={post.caption}
                className="h-full w-full object-cover"
              />
              <div className="absolute right-3 top-3">
                <Badge variant="accent">{post.compatibilityScore}%</Badge>
              </div>
            </div>

            <div className="border-b border-neutral-200/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <img
                  src={user?.avatarUrl ?? ""}
                  alt={user?.name ?? ""}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{user?.name ?? user?.handle}</p>
                  <p className="text-[10px] text-neutral-400">{formatPostTime(post.createdAt)}</p>
                </div>
              </div>
              {post.caption && (
                <p className="mt-2 text-sm text-neutral-700">{post.caption}</p>
              )}
              {post.aiInsight && (
                <p className="mt-1 text-xs text-neutral-500 italic">{post.aiInsight}</p>
              )}
              {likedByFriendsCount > 0 && (
                <p className="mt-1 text-[10px] text-neutral-400">
                  Liked by {likedByFriendsCount} {likedByFriendsCount === 1 ? "friend" : "friends"}
                </p>
              )}
            </div>

            <ActionRow
              isLiked={isLiked(post.id)}
              isSaved={isSaved(post.id)}
              likeCount={post.likeCount}
              commentCount={post.commentCount}
              onLike={() => toggleLike(post.id)}
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
      </motion.div>
    </>
  );
}

export function PostSheetProvider({ children }: { children: ReactNode }) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const openPost = useCallback((postId: string) => {
    setSelectedPostId(postId);
  }, []);

  const close = useCallback(() => {
    setSelectedPostId(null);
  }, []);

  const value: PostSheetContextValue = {
    openPost,
    close,
    selectedPostId,
  };

  return (
    <PostSheetContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {selectedPostId && (
          <PostDetailSheet postId={selectedPostId} onClose={close} />
        )}
      </AnimatePresence>
    </PostSheetContext.Provider>
  );
}
