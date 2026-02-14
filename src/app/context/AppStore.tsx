import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENT_USER_ID,
  mockComments,
  mockOOTDPosts,
  type Comment,
  type OOTDPost,
} from "../data/mockData";

type AppStoreState = {
  posts: OOTDPost[];
  comments: Comment[];
  savedPostIds: Set<string>;
  followingUserIds: Set<string>;
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
};

const defaultState: AppStoreState = {
  posts: [...mockOOTDPosts],
  comments: [...mockComments],
  savedPostIds: new Set(["p1", "p3"]),
  followingUserIds: new Set(["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"]),
};

const AppStoreContext = createContext<AppStoreState & AppStoreActions | null>(
  null
);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<OOTDPost[]>(defaultState.posts);
  const [comments, setComments] = useState<Comment[]>(defaultState.comments);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(
    defaultState.savedPostIds
  );
  const [followingUserIds, setFollowingUserIds] = useState<Set<string>>(
    defaultState.followingUserIds
  );

  const addPost = useCallback((post: OOTDPost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const toggleSave = useCallback((postId: string) => {
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
  }, []);

  const toggleLike = useCallback((postId: string) => {
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
  }, []);

  const addComment = useCallback((postId: string, text: string) => {
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
  }, []);

  const toggleFollow = useCallback((userId: string) => {
    setFollowingUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const isSaved = useCallback(
    (postId: string) => savedPostIds.has(postId),
    [savedPostIds]
  );

  const isLiked = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      return post?.likedByUserIds.includes(CURRENT_USER_ID) ?? false;
    },
    [posts]
  );

  const isFollowing = useCallback(
    (userId: string) => followingUserIds.has(userId),
    [followingUserIds]
  );

  const getCommentsForPost = useCallback(
    (postId: string) =>
      comments.filter((c) => c.postId === postId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [comments]
  );

  const value = useMemo(
    () => ({
      posts,
      comments,
      savedPostIds,
      followingUserIds,
      addPost,
      toggleSave,
      toggleLike,
      addComment,
      toggleFollow,
      isSaved,
      isLiked,
      isFollowing,
      getCommentsForPost,
    }),
    [
      posts,
      comments,
      savedPostIds,
      followingUserIds,
      addPost,
      toggleSave,
      toggleLike,
      addComment,
      toggleFollow,
      isSaved,
      isLiked,
      isFollowing,
      getCommentsForPost,
    ]
  );

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
