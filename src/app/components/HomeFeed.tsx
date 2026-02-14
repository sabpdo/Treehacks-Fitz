import { useEffect } from "react";
import { Link } from "react-router";
import { Camera, Flame, Sparkles, ChevronRight, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { PostGrid } from "./feed";

export function HomeFeed() {
  const { posts, followingUserIds, refetchFeed, getUser, currentUserId, isUsingApi, refetchCurrentUser } = useAppStore();

  useEffect(() => {
    refetchFeed("following", "recent");
  }, [refetchFeed]);

  useEffect(() => {
    if (isUsingApi && currentUserId) refetchCurrentUser();
  }, [isUsingApi, currentUserId, refetchCurrentUser]);

  const currentUser = getUser(currentUserId);
  const streak = isUsingApi ? (currentUser?.streak ?? 0) : 7;
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const friendsToday = posts.filter((p) => followingUserIds.has(p.userId));
  const friendsPosts = friendsToday.slice(0, 6);

  const topRanked = [
    { name: "Uniqlo White Tee", score: 9.4, category: "Essential Basics" },
    { name: "Aritzia Effortless Pant", score: 9.2, category: "Best Bottoms" },
    { name: "Prada Re-Edition Bag", score: 9.8, category: "Investment Pieces" },
    { name: "Veja Sneakers", score: 8.9, category: "Everyday Shoes" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-xl tracking-tight">ClosetRank</h1>
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-400/10 to-rose-500/10 px-3 py-1">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="text-xs text-neutral-700">{streak} day streak</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-12">
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
                  to="/post"
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
                    <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                      <img
                        src={post.imageUrl}
                        alt={post.caption}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <Link
                          to={`/profile/${post.userId}`}
                          className="flex items-center gap-2 transition-opacity hover:opacity-70"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <img
                            src={poster?.avatarUrl ?? ""}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                          <p className="text-xs text-neutral-900">
                            {poster?.handle ?? post.userId}
                          </p>
                        </Link>
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
                {topRanked.map((item, index) => (
                  <div key={index} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="mb-0.5 text-sm text-neutral-900">{item.name}</p>
                        <p className="text-xs text-neutral-400">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-2xl text-neutral-900">
                          {item.score}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200/60 bg-neutral-50 p-4">
                <Link
                  to="/profile"
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
              <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                <img
                  src="https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600"
                  alt="AI generated outfit"
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 text-[#8B9B8E]" />
                  <span className="text-xs text-neutral-900">AI Generated</span>
                </div>
              </div>

              <div className="p-5">
                <p className="mb-4 text-xs leading-relaxed text-neutral-600">
                  Based on your recent activity and weather forecast, this minimal
                  white shirt paired with beige trousers creates a versatile look
                  perfect for today's plans.
                </p>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="h-1 w-1 rounded-full bg-neutral-400" />
                    White Cotton Shirt — Everlane
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="h-1 w-1 rounded-full bg-neutral-400" />
                    Beige Linen Trousers — Aritzia
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="h-1 w-1 rounded-full bg-neutral-400" />
                    Tan Leather Bag — Cuyana
                  </div>
                </div>

                <button className="w-full rounded-xl border border-neutral-900 bg-neutral-900 py-2.5 text-sm text-white transition-colors duration-200 hover:bg-neutral-800">
                  Save to Outfits
                </button>
              </div>
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
