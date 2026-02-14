import { motion } from "motion/react";
import type { OOTDPost } from "../../data/mockData";
import { PostCard } from "./PostCard";
import { cn } from "../ui/utils";

type PostGridProps = {
  posts: OOTDPost[];
  compact?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
  getCompatibility?: (post: OOTDPost) => number | undefined;
  /** Stagger delay per item (seconds) for entrance animation, e.g. 0.03 */
  staggerDelay?: number;
};

export function PostGrid({
  posts,
  compact = false,
  columns = 3,
  className,
  getCompatibility,
  staggerDelay = 0,
}: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center",
          className
        )}
      >
        <p className="text-sm text-neutral-500">No outfits yet.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4 lg:gap-5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-2 md:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {posts.map((post, index) => {
        const card = (
          <PostCard
            post={post}
            compact={compact}
            compatibilityScore={getCompatibility?.(post) ?? post.compatibilityScore}
          />
        );
        if (staggerDelay > 0) {
          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * staggerDelay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {card}
            </motion.div>
          );
        }
        return <div key={post.id}>{card}</div>;
      })}
    </div>
  );
}
