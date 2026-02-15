import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Grid3x3, List } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { mockUsers } from "../data/mockData";
import type { User } from "../data/mockData";
import { Link } from "react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { UserCard } from "./feed";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { getFollowing, getFollowers, getDiscoverProfiles, searchUsers } from "../../services/api";
import { apiProfileToUser, type UIUser } from "../../lib/adapters";

type ViewMode = "list" | "grid";
const TAB_ORDER = ["following", "followers", "discover"] as const;

/** Table-like row: avatar | name @handle | Follow */
function UserListRow({
  user,
  isFollowing,
  onFollow,
}: {
  user: User;
  isFollowing: boolean;
  onFollow: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-100 py-3 last:border-0">
      <Link to={`/profile/${user.id}`} className="flex-shrink-0">
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="h-10 w-10 rounded-full object-cover"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/profile/${user.id}`} className="block truncate">
          <p className="truncate font-medium text-neutral-900">{user.name}</p>
          <p className="truncate text-xs text-neutral-500">@{user.handle}</p>
        </Link>
      </div>
      <Button
        variant={isFollowing ? "outline" : "default"}
        size="sm"
        className="flex-shrink-0 rounded-full border-neutral-200 bg-neutral-900 px-4 text-white hover:bg-neutral-800"
        onClick={onFollow}
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </Button>
    </div>
  );
}

export function Community() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tab, setTab] = useState<(typeof TAB_ORDER)[number]>("discover");
  const slideDirectionRef = useRef(0);
  const { followingUserIds, isFollowing, toggleFollow, posts, isUsingApi, currentUserId } = useAppStore();
  const [followingList, setFollowingList] = useState<UIUser[]>([]);
  const [followersList, setFollowersList] = useState<UIUser[]>([]);
  const [discoverList, setDiscoverList] = useState<UIUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isUsingApi || !currentUserId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getFollowing(currentUserId),
      getFollowers(currentUserId),
    ])
      .then(([followingProfiles, followerProfiles]) => {
        if (cancelled) return;
        setFollowingList(followingProfiles.map(apiProfileToUser).filter((u): u is UIUser => u !== null));
        setFollowersList(followerProfiles.map(apiProfileToUser).filter((u): u is UIUser => u !== null));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isUsingApi, currentUserId]);

  const [discoverLoading, setDiscoverLoading] = useState(false);
  useEffect(() => {
    if (!isUsingApi) return;
    let cancelled = false;
    setDiscoverLoading(true);
    if (search.trim()) {
      searchUsers(search)
        .then((profiles) => {
          if (cancelled) return;
          setDiscoverList(profiles.map(apiProfileToUser).filter((u): u is UIUser => u !== null));
        })
        .catch(() => {
          if (!cancelled) setDiscoverList([]);
        })
        .finally(() => {
          if (!cancelled) setDiscoverLoading(false);
        });
    } else {
      getDiscoverProfiles(50)
        .then((profiles) => {
          if (cancelled) return;
          setDiscoverList(profiles.map(apiProfileToUser).filter((u): u is UIUser => u !== null));
        })
        .catch(() => {
          if (!cancelled) setDiscoverList([]);
        })
        .finally(() => {
          if (!cancelled) setDiscoverLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isUsingApi, search]);

  const handleTabChange = (value: string) => {
    const newIndex = TAB_ORDER.indexOf(value as (typeof TAB_ORDER)[number]);
    const oldIndex = TAB_ORDER.indexOf(tab);
    slideDirectionRef.current = newIndex - oldIndex;
    setTab(value as (typeof TAB_ORDER)[number]);
  };

  const following = isUsingApi
    ? followingList
    : mockUsers.filter((u) => u.id !== "me" && followingUserIds.has(u.id));
  const followers = isUsingApi
    ? followersList.slice(0, 6)
    : mockUsers.filter((u) => u.id !== "me").slice(0, 6);
  const discover = isUsingApi
    ? discoverList
    : mockUsers.filter((u) => u.id !== "me");

  const filteredDiscover = useMemo(() => {
    if (isUsingApi) return discover;
    if (!search.trim()) return discover;
    const q = search.toLowerCase();
    return discover.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        (u.bio && u.bio.toLowerCase().includes(q)) ||
        (u.vibes && u.vibes.some((v) => v.toLowerCase().includes(q)))
    );
  }, [isUsingApi, discover, search]);

  const getRecentOotdUrls = (userId: string) =>
    posts.filter((p) => p.userId === userId).slice(0, 4).map((p) => p.imageUrl);

  const renderUserList = (users: typeof discover, emptyMessage: string, useDiscoverLoading = false) => {
    const isLoading = useDiscoverLoading ? discoverLoading : loading;
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={viewMode === "grid" ? "h-44 rounded-xl" : "h-36 rounded-2xl"} />
          ))}
        </div>
      );
    }
    if (users.length === 0) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center">
          <p className="text-sm text-neutral-500">{emptyMessage}</p>
        </div>
      );
    }
    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isFollowing={isFollowing(user.id)}
              onFollow={() => toggleFollow(user.id)}
              variant="grid"
              className="transition-all duration-300 hover:border-neutral-300 hover:shadow-md"
            />
          ))}
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-neutral-200/60 bg-white shadow-sm">
        {users.map((user) => (
          <UserListRow
            key={user.id}
            user={user}
            isFollowing={isFollowing(user.id)}
            onFollow={() => toggleFollow(user.id)}
          />
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    if (tab === "following") return renderUserList(following, "No one followed yet. Discover people to follow.");
    if (tab === "followers") return renderUserList(followers, "No followers yet.");
    return renderUserList(
      filteredDiscover,
      search.trim() ? "No people match your search." : "No other people on the platform yet.",
      true
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8]">
      <div className="mx-auto w-full max-w-2xl px-4">
        <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/95 backdrop-blur-xl">
          <div className="py-4">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-lg font-medium tracking-tight text-neutral-900">
                Community
              </h1>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${viewMode === "list"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-400 hover:bg-neutral-100"
                    }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${viewMode === "grid"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-400 hover:bg-neutral-100"
                    }`}
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search people"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border-neutral-200 bg-neutral-50 pl-10 transition-all duration-200 placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200"
              />
            </div>
          </div>

          <Tabs value={tab} onValueChange={handleTabChange} className="w-full overflow-x-hidden">
            <TabsList className="mb-2 flex w-full justify-start gap-1 rounded-xl bg-neutral-100 p-1">
              <TabsTrigger
                value="following"
                className="flex-1 rounded-lg py-2.5 text-xs font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-neutral-700"
              >
                Following
              </TabsTrigger>
              <TabsTrigger
                value="followers"
                className="flex-1 rounded-lg py-2.5 text-xs font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-neutral-700"
              >
                Followers
              </TabsTrigger>
              <TabsTrigger
                value="discover"
                className="flex-1 rounded-lg py-2.5 text-xs font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-neutral-700"
              >
                Discover
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <div className="relative mt-6 md:mt-8 min-h-[200px] overflow-hidden pb-28 md:pb-32">
          <AnimatePresence mode="wait" custom={slideDirectionRef.current}>
            <motion.div
              key={tab}
              custom={slideDirectionRef.current}
              variants={{
                slideEnter: (d: number) => ({ opacity: 0, x: (d || 0) * 40 }),
                slideCenter: { opacity: 1, x: 0 },
                slideExit: (d: number) => ({ opacity: 0, x: (d || 0) * -40 }),
              }}
              initial="slideEnter"
              animate="slideCenter"
              exit="slideExit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="w-full"
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
