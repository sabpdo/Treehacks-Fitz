import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { PostCard } from "./feed";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";

type FilterTab = "following" | "trending" | "saved";
type SortOption = "recent" | "most_liked";

export function AllOOTDs() {
  const navigate = useNavigate();
  const { posts, savedPostIds, followingUserIds, refetchFeed, feedLoading, isUsingApi } = useAppStore();
  const [filter, setFilter] = useState<FilterTab>("following");
  const [sort, setSort] = useState<SortOption>("recent");
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    refetchFeed(filter, sort);
  }, [filter, sort, refetchFeed]);

  const filtered = (() => {
    if (!isUsingApi) {
      if (filter === "saved") return posts.filter((p) => savedPostIds.has(p.id));
      if (filter === "following") return posts.filter((p) => followingUserIds.has(p.userId));
      if (filter === "trending") {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return [...posts]
          .filter((p) => new Date(p.createdAt).getTime() >= weekAgo)
          .sort((a, b) => b.likeCount - a.likeCount);
      }
    }
    return posts;
  })();

  const sorted =
    sort === "most_liked"
      ? [...filtered].sort((a, b) => b.likeCount - a.likeCount)
      : [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-600 transition-colors duration-200 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
            <h1 className="text-base font-medium tracking-tight text-neutral-900">
              All OOTDs
            </h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Filter pills — Closet-style */}
        <div className="mx-auto max-w-3xl px-4 pb-3 sm:px-6">
          <div className="flex gap-2">
            {(
              [
                { value: "following" as const, label: "Following" },
                { value: "trending" as const, label: "Trending" },
                { value: "saved" as const, label: "Saved" },
              ]
            ).map((tab) => (
              <motion.button
                key={tab.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "flex-1 rounded-full px-4 py-2.5 text-xs font-medium transition-all duration-200",
                  filter === tab.value
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                )}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Sort + count */}
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-4 sm:px-6">
          <span className="text-xs text-neutral-500">{sorted.length} outfits</span>
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSortOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50"
              )}
            >
              {sort === "recent" ? "Recent" : "Most liked"}
              <motion.span
                animate={{ rotate: sortOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </motion.span>
            </motion.button>
            <AnimatePresence>
              {sortOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSortOpen(false)}
                    className="fixed inset-0 z-10"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                  >
                    <button
                      className="w-full px-4 py-2.5 text-left text-xs text-neutral-700 transition-colors duration-200 hover:bg-neutral-50"
                      onClick={() => {
                        setSort("recent");
                        setSortOpen(false);
                      }}
                    >
                      Recent
                    </button>
                    <button
                      className="w-full px-4 py-2.5 text-left text-xs text-neutral-700 transition-colors duration-200 hover:bg-neutral-50"
                      onClick={() => {
                        setSort("most_liked");
                        setSortOpen(false);
                      }}
                    >
                      Most liked
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Scrollable feed — single column, comfortable width on desktop */}
      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        {feedLoading ? (
          <div className="space-y-5 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
            ))}
          </div>
        ) : filter === "saved" && sorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-16 text-center"
          >
            <p className="text-sm text-neutral-500">No saved outfits yet.</p>
            <Link
              to="/"
              className="mt-3 text-xs text-[#8B9B8E] transition-colors duration-200 hover:underline"
            >
              Browse feed
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6 pt-2">
            {sorted.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                compact={false}
                compatibilityScore={post.compatibilityScore}
                showFeedMeta
                className="rounded-2xl"
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
