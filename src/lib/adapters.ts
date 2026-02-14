/**
 * Adapters from API/backend types to frontend UI types (mockData shapes).
 * Use these when wiring the real API to existing components.
 */

import type { Post, Profile, Comment as ApiComment } from '../types/database';

// UI types (from mockData) - minimal shape used by components
export interface UIUser {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  vibes: string[];
  followerCount: number;
  followingCount: number;
}

export interface UIOOTDPost {
  id: string;
  userId: string;
  imageUrl: string;
  caption: string;
  vibeTag: string;
  createdAt: string;
  likeCount: number;
  savedCount: number;
  commentCount: number;
  likedByUserIds: string[];
  compatibilityScore: number;
  aiInsight: string;
}

export interface UIComment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export function apiProfileToUser(profile: Profile | null | undefined): UIUser | null {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.display_name || profile.username || 'User',
    handle: profile.username || '',
    avatarUrl: profile.avatar_url || '',
    bio: profile.bio || '',
    vibes: [],
    followerCount: profile.followers ?? 0,
    followingCount: profile.following ?? 0,
  };
}

export function apiPostToOOTDPost(
  post: Post,
  currentUserId?: string
): UIOOTDPost {
  const user = post.user;
  const vibeTag =
    post.items?.[0]?.vibe_tags?.[0] ||
    (post as any).vibe_tag ||
    'casual';
  return {
    id: post.id,
    userId: post.user_id,
    imageUrl: post.image_url,
    caption: post.caption || '',
    vibeTag: typeof vibeTag === 'string' ? vibeTag : 'casual',
    createdAt: post.created_at,
    likeCount: post.likes_count ?? 0,
    savedCount: 0, // not stored on post in DB
    commentCount: post.comments_count ?? 0,
    likedByUserIds: post.is_liked && currentUserId ? [currentUserId] : [],
    compatibilityScore: post.compatibility_score ?? 0,
    aiInsight: '',
  };
}

export function apiCommentToUIComment(c: ApiComment): UIComment {
  return {
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    text: c.content,
    createdAt: c.created_at,
  };
}
