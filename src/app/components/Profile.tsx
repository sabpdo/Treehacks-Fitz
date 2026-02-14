import { Settings, Flame, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { currentUserProfile, rankedItems } from "../data/mockData";

export function Profile() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-base tracking-tight text-neutral-900">Profile</h1>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-all hover:bg-neutral-100">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6">
        {/* Profile Info */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white">
          <div className="p-6">
            <div className="mb-5 flex items-start gap-5">
              <img
                src={currentUserProfile.userAvatar}
                alt={currentUserProfile.username}
                className="h-20 w-20 rounded-full border border-neutral-200 object-cover"
              />
              <div className="flex-1">
                <h2 className="mb-3 text-xl">@{currentUserProfile.username}</h2>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="block text-lg text-neutral-900">
                      {currentUserProfile.followers}
                    </span>
                    <span className="text-xs text-neutral-500">followers</span>
                  </div>
                  <div>
                    <span className="block text-lg text-neutral-900">
                      {currentUserProfile.following}
                    </span>
                    <span className="text-xs text-neutral-500">following</span>
                  </div>
                  <div>
                    <span className="block text-lg text-neutral-900">
                      {currentUserProfile.posts.length}
                    </span>
                    <span className="text-xs text-neutral-500">posts</span>
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 text-sm text-neutral-900 transition-all hover:bg-neutral-50">
              Edit Profile
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-px border-t border-neutral-200/60 bg-neutral-200/60">
            <div className="bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500">
                  <Flame className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  Streak
                </span>
              </div>
              <p className="font-serif text-3xl text-neutral-900">
                {currentUserProfile.streak}
              </p>
              <p className="text-xs text-neutral-400">days posting</p>
            </div>

            <div className="bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B9B8E]">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  Utilization
                </span>
              </div>
              <p className="font-serif text-3xl text-neutral-900">
                {currentUserProfile.closetUtilization}%
              </p>
              <p className="text-xs text-neutral-400">of closet worn</p>
            </div>
          </div>
        </div>

        {/* Rankings Section */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-wide text-neutral-500">
              Your Rankings
            </h3>
            <button className="text-xs text-neutral-500 transition-colors hover:text-neutral-900">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {rankedItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-50">
                    <img
                      src={item.imageUrl}
                      alt={item.brand}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                        {item.category}
                      </p>
                      <p className="mb-1.5 text-sm text-neutral-900">{item.brand}</p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                          {item.vibeTag}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {item.priceTier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex flex-col items-end justify-center">
                    <p className="mb-0.5 font-serif text-3xl text-neutral-900">
                      {item.rating}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-neutral-400">
                      Rating
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Posts Section */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-wide text-neutral-500">
              Your OOTDs
            </h3>
            <div className="flex gap-2">
              <button className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white">
                Grid
              </button>
              <button className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-50">
                List
              </button>
            </div>
          </div>

          {/* Editorial Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {currentUserProfile.posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all hover:shadow-lg"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                  <img
                    src={post.imageUrl}
                    alt={post.caption}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Compatibility Badge */}
                  <div className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 backdrop-blur-sm">
                    <p className="text-[10px] text-neutral-900">
                      {86 - index * 2}% aligned
                    </p>
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="mb-1 text-xs text-white">{post.caption}</p>
                      <div className="flex items-center gap-3 text-[10px] text-white/80">
                        <span>{post.likes} likes</span>
                        <span>{post.comments} comments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
