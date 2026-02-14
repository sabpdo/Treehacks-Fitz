import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENT_USER_ID,
  mockComments,
  mockOOTDPosts,
  mockUsers,
  type Comment,
  type OOTDPost,
} from "../data/mockData";
import { useAuth } from "../../contexts/AuthContext";
import {
  getFeedPosts,
  getSavedPostIds,
  getPostComments,
  addComment as apiAddComment,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  getPost,
  getFollowing,
  getCurrentProfile,
  ensureProfile,
  followUser,
  unfollowUser,
  getProfile,
  type FeedFilter,
  type FeedSort,
} from "../../services/api";
import {
  apiPostToOOTDPost,
  apiCommentToUIComment,
  apiProfileToUser,
  type UIUser,
  type UIComment,
} from "../../lib/adapters";

type AppStoreState = {
  posts: OOTDPost[];
  comments: Comment[];
  savedPostIds: Set<string>;
  followingUserIds: Set<string>;
  feedLoading: boolean;
  feedError: string | null;
  /** When using API, current user's id (auth.user.id). When mock, "me". */
  currentUserId: string;
  /** True when data comes from real API (user is logged in). */
  isUsingApi: boolean;
};

type AppStoreActions = {
  addPost: (post: OOTDPost) => void;
  toggleSave: (postId: string) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  toggleFollow: (userId: string) => void;
  isSaved: (postId: string) => boolean;
  isLiked: (postId: string) => boolean;
  isFollowing: (userId: string) => boolean;
  getCommentsForPost: (postId: string) => Comment[];
  loadCommentsForPost: (postId: string) => Promise<void>;
  getUser: (id: string) => UIUser | null;
  loadUser: (id: string) => Promise<void>;
  refetchFeed: (filter?: FeedFilter, sort?: FeedSort) => Promise<void>;
  refetchCurrentUser: () => Promise<void>;
};

const defaultState: AppStoreState = {
  posts: [...mockOOTDPosts],
  comments: [...mockComments],
  savedPostIds: new Set(["p1", "p3"]),
  followingUserIds: new Set(["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"]),
  feedLoading: false,
  feedError: null,
  currentUserId: CURRENT_USER_ID,
  isUsingApi: false,
};

const AppStoreContext = createContext<AppStoreState & AppStoreActions | null>(
  null
);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();

  const [posts, setPosts] = useState<OOTDPost[]>(defaultState.posts);
  const [comments, setComments] = useState<Comment[]>(defaultState.comments);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(
    defaultState.savedPostIds
  );
  const [followingUserIds, setFollowingUserIds] = useState<Set<string>>(
    defaultState.followingUserIds
  );
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, UIComment[]>>({});
  const [usersCache, setUsersCache] = useState<Record<string, UIUser>>({});
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const currentUserId = authUser?.id ?? CURRENT_USER_ID;
  const useApi = !!authUser;

  const refetchFeed = useCallback(
    async (filter: FeedFilter = "following", sort: FeedSort = "recent") => {
      if (!useApi) return;
      setFeedLoading(true);
      setFeedError(null);
      try {
        const apiPosts = await getFeedPosts(20, 0, filter, sort);
        const next = apiPosts.map((p) => apiPostToOOTDPost(p, currentUserId));
        setPosts(next);
        apiPosts.forEach((p) => {
          if (p.user) {
            const u = apiProfileToUser(p.user);
            if (u) setUsersCache((prev) => ({ ...prev, [u.id]: u }));
          }
        });
      } catch (e) {
        setFeedError(e instanceof Error ? e.message : "Failed to load feed");
      } finally {
        setFeedLoading(false);
      }
    },
    [useApi, currentUserId]
  );

  useEffect(() => {
    if (!useApi) return;
    refetchFeed("following", "recent");
  }, [useApi, refetchFeed]);

  useEffect(() => {
    if (!useApi || !authUser) return;
    let cancelled = false;
    (async () => {
      try {
        let currentProfile = await getCurrentProfile();
        if (!currentProfile) {
          await ensureProfile();
          currentProfile = await getCurrentProfile();
        }
        const [saved, followingList] = await Promise.all([
          getSavedPostIds(),
          getFollowing(authUser.id),
        ]);
        if (cancelled) return;
        setSavedPostIds(saved);
        setFollowingUserIds(new Set(followingList.map((p) => p.id)));
        const me = apiProfileToUser(currentProfile);
        if (me) setUsersCache((prev) => ({ ...prev, [me.id]: me }));
        followingList.forEach((p) => {
          const u = apiProfileToUser(p);
          if (u) setUsersCache((prev) => ({ ...prev, [u.id]: u }));
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useApi, authUser?.id]);

  const addPost = useCallback((post: OOTDPost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const toggleSave = useCallback(
    async (postId: string) => {
      if (useApi) {
        try {
          const wasSaved = savedPostIds.has(postId);
          if (wasSaved) await unsavePost(postId);
          else await savePost(postId);
          setSavedPostIds((prev) => {
            const next = new Set(prev);
            if (wasSaved) next.delete(postId);
            else next.add(postId);
            return next;
          });
        } catch (e) {
          console.error("Toggle save failed:", e);
        }
        return;
      }
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        const wasSaved = next.has(postId);
        if (wasSaved) next.delete(postId);
        else next.add(postId);
        setPosts((plist) =>
          plist.map((p) =>
            p.id === postId
              ? { ...p, savedCount: p.savedCount + (wasSaved ? -1 : 1) }
              : p
          )
        );
        return next;
      });
    },
    [useApi, savedPostIds]
  );

  const toggleLike = useCallback(
    async (postId: string) => {
      if (useApi) {
        try {
          const post = posts.find((p) => p.id === postId);
          const wasLiked = post?.likedByUserIds.includes(currentUserId);
          if (wasLiked) await unlikePost(postId);
          else await likePost(postId);
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== postId) return p;
              return {
                ...p,
                likeCount: p.likeCount + (wasLiked ? -1 : 1),
                likedByUserIds: wasLiked
                  ? p.likedByUserIds.filter((id) => id !== currentUserId)
                  : [...p.likedByUserIds, currentUserId],
              };
            })
          );
        } catch (e) {
          console.error("Toggle like failed:", e);
        }
        return;
      }
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const liked = p.likedByUserIds.includes(CURRENT_USER_ID);
          return {
            ...p,
            likeCount: liked ? p.likeCount - 1 : p.likeCount + 1,
            likedByUserIds: liked
              ? p.likedByUserIds.filter((id) => id !== CURRENT_USER_ID)
              : [...p.likedByUserIds, CURRENT_USER_ID],
          };
        })
      );
    },
    [useApi, posts, currentUserId]
  );

  const addComment = useCallback(
    async (postId: string, text: string) => {
      if (useApi) {
        try {
          const c = await apiAddComment(postId, text);
          const ui = apiCommentToUIComment(c);
          setCommentsByPostId((prev) => ({
            ...prev,
            [postId]: [ui, ...(prev[postId] || [])],
          }));
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
            )
          );
          if (c.user) {
            const u = apiProfileToUser(c.user);
            if (u) setUsersCache((prev) => ({ ...prev, [u.id]: u }));
          }
        } catch (e) {
          console.error("Add comment failed:", e);
        }
        return;
      }
      const newComment: Comment = {
        id: `c-${Date.now()}`,
        postId,
        userId: CURRENT_USER_ID,
        text,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [newComment, ...prev]);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
        )
      );
    },
    [useApi]
  );

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (useApi) {
        const isCurrentlyFollowing = followingUserIds.has(userId);
        setFollowingUserIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlyFollowing) next.delete(userId);
          else next.add(userId);
          return next;
        });
        try {
          if (isCurrentlyFollowing) await unfollowUser(userId);
          else await followUser(userId);
        } catch (e) {
          console.error("Toggle follow failed:", e);
          setFollowingUserIds((prev) => {
            const next = new Set(prev);
            if (isCurrentlyFollowing) next.add(userId);
            else next.delete(userId);
            return next;
          });
        }
        return;
      }
      setFollowingUserIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    },
    [useApi, followingUserIds]
  );

  const isSaved = useCallback(
    (postId: string) => savedPostIds.has(postId),
    [savedPostIds]
  );

  const isLiked = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      return post?.likedByUserIds.includes(currentUserId) ?? false;
    },
    [posts, currentUserId]
  );

  const isFollowing = useCallback(
    (userId: string) => followingUserIds.has(userId),
    [followingUserIds]
  );

  const getCommentsForPost = useCallback(
    (postId: string): Comment[] => {
      if (useApi) {
        const list = commentsByPostId[postId] || [];
        return list.map((c) => ({
          id: c.id,
          postId: c.postId,
          userId: c.userId,
          text: c.text,
          createdAt: c.createdAt,
        }));
      }
      return comments
        .filter((c) => c.postId === postId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },
    [useApi, commentsByPostId, comments]
  );

  const loadCommentsForPost = useCallback(async (postId: string) => {
    try {
      const list = await getPostComments(postId);
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: list.map(apiCommentToUIComment),
      }));
    } catch (e) {
      console.error("Load comments failed:", e);
    }
  }, []);

  const getUser = useCallback(
    (id: string): UIUser | null => {
      if (useApi) return usersCache[id] ?? null;
      const u = mockUsers.find((u) => u.id === id);
      if (!u) return null;
      return {
        id: u.id,
        name: u.name,
        handle: u.handle,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        vibes: u.vibes,
        followerCount: u.followerCount,
        followingCount: u.followingCount,
      };
    },
    [useApi, usersCache]
  );

  const loadUser = useCallback(async (id: string) => {
    try {
      const profile = await getProfile(id);
      const u = apiProfileToUser(profile);
      if (u) setUsersCache((prev) => ({ ...prev, [id]: u }));
    } catch (e) {
      console.error("Load user failed:", e);
    }
  }, []);

  const refetchCurrentUser = useCallback(async () => {
    if (!useApi || !authUser) return;
    try {
      const profile = await getCurrentProfile();
      const u = apiProfileToUser(profile);
      if (u) setUsersCache((prev) => ({ ...prev, [authUser.id]: u }));
    } catch (e) {
      console.error("Refetch current user failed:", e);
    }
  }, [useApi, authUser?.id]);

  const value = useMemo(
    () => ({
      posts,
      comments,
      savedPostIds,
      followingUserIds,
      feedLoading,
      feedError,
      currentUserId,
      isUsingApi: useApi,
      addPost,
      toggleSave,
      toggleLike,
      addComment,
      toggleFollow,
      isSaved,
      isLiked,
      isFollowing,
      getCommentsForPost,
      loadCommentsForPost,
      getUser,
      loadUser,
      refetchFeed,
      refetchCurrentUser,
    }),
    [
      posts,
      comments,
      savedPostIds,
      followingUserIds,
      feedLoading,
      feedError,
      currentUserId,
      useApi,
      addPost,
      toggleSave,
      toggleLike,
      addComment,
      toggleFollow,
      isSaved,
      isLiked,
      isFollowing,
      getCommentsForPost,
      loadCommentsForPost,
      getUser,
      loadUser,
      refetchFeed,
      refetchCurrentUser,
    ]
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
