import { useState, useMemo } from "react";
import { Search, Grid3x3, List } from "lucide-react";
import { useAppStore } from "../context/AppStore";
import { mockUsers } from "../data/mockData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { UserCard } from "./feed";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

type ViewMode = "list" | "grid";

export function Community() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { followingUserIds, isFollowing, toggleFollow, posts } = useAppStore();

  const following = mockUsers.filter((u) => u.id !== "me" && followingUserIds.has(u.id));
  const followers = mockUsers.filter((u) => u.id !== "me").slice(0, 6);
  const discover = mockUsers.filter((u) => u.id !== "me");

  const filteredDiscover = useMemo(() => {
    if (!search.trim()) return discover;
    const q = search.toLowerCase();
    return discover.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        u.bio.toLowerCase().includes(q) ||
        u.vibes.some((v) => v.toLowerCase().includes(q))
    );
  }, [discover, search]);

  const getRecentOotdUrls = (userId: string) =>
    posts.filter((p) => p.userId === userId).slice(0, 4).map((p) => p.imageUrl);

  const [loading] = useState(false);

  const renderUserList = (users: typeof discover, emptyMessage: string) => {
    if (loading) {
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
      <div className="space-y-4">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            recentOotdUrls={getRecentOotdUrls(user.id)}
            isFollowing={isFollowing(user.id)}
            onFollow={() => toggleFollow(user.id)}
            variant="list"
            className="transition-all duration-300 hover:border-neutral-300 hover:shadow-md"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-medium tracking-tight text-neutral-900">
              Community
            </h1>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-400 hover:bg-neutral-100"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "grid"
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

        <Tabs defaultValue="discover" className="w-full overflow-x-hidden">
          <TabsList className="mx-4 mb-2 flex w-[calc(100%-2rem)] max-w-2xl justify-start gap-1 rounded-xl bg-neutral-100 p-1">
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

          <TabsContent value="following" className="mt-4 overflow-x-hidden px-4 pb-24">
            {renderUserList(following, "No one followed yet. Discover people to follow.")}
          </TabsContent>

          <TabsContent value="followers" className="mt-4 overflow-x-hidden px-4 pb-24">
            {renderUserList(followers, "No followers yet.")}
          </TabsContent>

          <TabsContent value="discover" className="mt-4 overflow-x-hidden px-4 pb-24">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-52 rounded-2xl" />
                ))}
              </div>
            ) : filteredDiscover.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center">
                <p className="text-sm text-neutral-500">No people match your search.</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {filteredDiscover.map((user) => (
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
            ) : (
              <div className="space-y-4">
                {filteredDiscover.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    recentOotdUrls={getRecentOotdUrls(user.id)}
                    isFollowing={isFollowing(user.id)}
                    onFollow={() => toggleFollow(user.id)}
                    variant="list"
                    className="transition-all duration-300 hover:border-neutral-300 hover:shadow-md"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </header>
    </div>
  );
}
