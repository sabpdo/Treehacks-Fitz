import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Settings, Flame, TrendingUp, ArrowLeft, LogOut } from "lucide-react";
import { useAppStore } from "../context/AppStore";
import { currentUserProfile, rankedItems } from "../data/mockData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { PostGrid, RankingList } from "./feed";
import { Button } from "./ui/button";
import { useAuth } from "../../contexts/AuthContext";

export function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { posts, savedPostIds, isFollowing, toggleFollow, getUser, loadUser, currentUserId } = useAppStore();

  const isOwnProfile = !userId || userId === currentUserId;
  const profileUser = getUser(userId ?? currentUserId);

  useEffect(() => {
    if (userId && !profileUser) loadUser(userId);
  }, [userId, profileUser, loadUser]);

  const displayName = isOwnProfile ? "You" : profileUser?.name ?? "User";
  const displayHandle = isOwnProfile ? (profileUser?.handle || currentUserProfile.username) : (profileUser?.handle ?? "");
  const avatarUrl = isOwnProfile ? (profileUser?.avatarUrl || currentUserProfile.userAvatar) : (profileUser?.avatarUrl ?? "");
  const followerCount = isOwnProfile ? (profileUser?.followerCount ?? currentUserProfile.followers) : (profileUser?.followerCount ?? 0);
  const followingCount = isOwnProfile ? (profileUser?.followingCount ?? currentUserProfile.following) : (profileUser?.followingCount ?? 0);
  const streak = isOwnProfile ? currentUserProfile.streak : 5;
  const closetUtilization = isOwnProfile ? currentUserProfile.closetUtilization : 68;

  const userPosts = posts.filter((p) => p.userId === (profileUser?.id ?? ""));
  const savedPosts = posts.filter((p) => savedPostIds.has(p.id));

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!profileUser && !isOwnProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <p className="text-neutral-500">User not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-4">
          <div className="w-9 flex-shrink-0">
            {!isOwnProfile && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors duration-200 hover:bg-neutral-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
          </div>
          <h1 className="flex-1 text-center text-base tracking-tight text-neutral-900">
            {isOwnProfile ? "Profile" : displayName}
          </h1>
          <div className="flex w-9 flex-shrink-0 justify-end gap-1">
            {isOwnProfile && (
              <>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors duration-200 hover:bg-neutral-100"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6">
        {/* Profile header */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white">
          <div className="p-6">
            <div className="mb-5 flex items-start gap-5">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-20 w-20 rounded-full border border-neutral-200 object-cover"
              />
              <div className="flex-1">
                <h2 className="mb-1 text-xl font-medium text-neutral-900">{displayName}</h2>
                <p className="mb-3 text-sm text-neutral-500">@{displayHandle}</p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="block text-lg text-neutral-900">{followerCount}</span>
                    <span className="text-xs text-neutral-500">followers</span>
                  </div>
                  <div>
                    <span className="block text-lg text-neutral-900">{followingCount}</span>
                    <span className="text-xs text-neutral-500">following</span>
                  </div>
                  {isOwnProfile && (
                    <div>
                      <span className="block text-lg text-neutral-900">{userPosts.length}</span>
                      <span className="text-xs text-neutral-500">posts</span>
                    </div>
                  )}
                </div>
                {!isOwnProfile && (
                  <Button
                    variant={isFollowing(userId!) ? "outline" : "default"}
                    size="sm"
                    className="mt-3 rounded-full bg-neutral-900 px-5 text-white transition-colors duration-200 hover:bg-neutral-800"
                    onClick={() => toggleFollow(userId!)}
                  >
                    {isFollowing(userId!) ? "Unfollow" : "Follow"}
                  </Button>
                )}
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    className="mt-4 w-full rounded-xl border-neutral-300 py-2.5 transition-colors duration-200 hover:bg-neutral-50"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Streak + Utilization */}
          <div className="grid grid-cols-2 gap-px border-t border-neutral-200/60 bg-neutral-200/60">
            <div className="bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500">
                  <Flame className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs uppercase tracking-wide text-neutral-500">Streak</span>
              </div>
              <p className="font-serif text-3xl text-neutral-900">{streak}</p>
              <p className="text-xs text-neutral-400">days posting</p>
            </div>
            <div className="bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B9B8E]">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs uppercase tracking-wide text-neutral-500">Utilization</span>
              </div>
              <p className="font-serif text-3xl text-neutral-900">{closetUtilization}%</p>
              <p className="text-xs text-neutral-400">of closet worn</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="ootds" className="w-full">
          <TabsList className="mb-4 w-full justify-start gap-0 rounded-xl bg-neutral-100 p-1">
            <TabsTrigger value="ootds" className="flex-1 rounded-lg">OOTDs</TabsTrigger>
            <TabsTrigger value="rankings" className="flex-1 rounded-lg">Rankings</TabsTrigger>
            <TabsTrigger value="saved" className="flex-1 rounded-lg">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="ootds" className="mt-0">
            {userPosts.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center">
                <p className="text-sm text-neutral-500">
                  {isOwnProfile ? "No OOTDs yet. Post your first fit!" : "No OOTDs yet."}
                </p>
                {isOwnProfile && (
                  <Link to="/post" className="mt-2 text-xs text-[#8B9B8E] hover:underline">
                    Post OOTD
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <PostGrid posts={userPosts} compact={false} columns={3} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="rankings" className="mt-0">
            {isOwnProfile ? (
              <RankingList items={rankedItems} groupByCategory emptyMessage="No ranked staples yet." />
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center">
                <p className="text-sm text-neutral-500">Rankings are private.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            {isOwnProfile ? (
              savedPosts.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center">
                  <p className="text-sm text-neutral-500">No saved outfits yet.</p>
                  <Link to="/" className="mt-2 text-xs text-[#8B9B8E] hover:underline">
                    Browse feed
                  </Link>
                </div>
              ) : (
                <PostGrid posts={savedPosts} compact={false} columns={3} />
              )
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center">
                <p className="text-sm text-neutral-500">Saved items are private.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
