/**
 * Adapters from API/backend types to frontend UI types (mockData shapes).
 * Use these when wiring the real API to existing components.
 */

import type { Post, Profile, Comment as ApiComment } from '../types/database';

const BUCKET = 'closet-images';

/** Ensure Supabase storage URL is a full public URL so images load in the browser */
export function ensurePublicStorageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return url || '';
  let full = url.trim();
  if (full.startsWith('data:')) return full;
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const baseUrl = base.replace(/\/$/, '');

  if (!full.startsWith('http')) {
    if (!baseUrl) return full;
    if (full.includes('/storage/v1/object/')) {
      full = `${baseUrl}${full.startsWith('/') ? full : `/${full}`}`;
    } else {
      const path = full.startsWith('/') ? full.slice(1) : full;
      full = `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
    }
  }
  if (full.includes('/storage/v1/object/public/')) return full;
  if (full.includes('/storage/v1/object/'))
    return full.replace('/storage/v1/object/', '/storage/v1/object/public/');
  return full;
}

/** Default no-face avatar when user has no profile photo (data URL SVG) */
export const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

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
  streak?: number;
  closetUtilization?: number;
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
    avatarUrl: profile.avatar_url || DEFAULT_AVATAR,
    bio: profile.bio || '',
    vibes: [],
    followerCount: profile.followers ?? 0,
    followingCount: profile.following ?? 0,
    streak: profile.streak ?? 0,
    closetUtilization: Number(profile.closet_utilization) ?? 0,
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
    imageUrl: ensurePublicStorageUrl(post.image_url),
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

// Map database category to UI category
function mapCategoryToUI(dbCategory: string): "tops" | "bottoms" | "outerwear" | "shoes" | "accessories" {
  const categoryMap: Record<string, "tops" | "bottoms" | "outerwear" | "shoes" | "accessories"> = {
    shirts: "tops",
    pants: "bottoms",
    skirts_dresses: "bottoms",
    jackets_outerwear: "outerwear",
    shoes: "shoes",
    bags: "accessories",
  };
  return categoryMap[dbCategory] || "tops";
}

// Convert database ClosetItem to UI ClosetItem
export function apiClosetItemToUI(dbItem: import('../types/database').ClosetItem): import('../app/data/mockData').ClosetItem & { priceTier?: string; allColors?: string[]; subcategory?: string } {
  return {
    id: dbItem.id,
    imageUrl: ensurePublicStorageUrl(dbItem.image_url),
    category: mapCategoryToUI(dbItem.category),
    color: dbItem.colors?.[0] || "unknown",
    style: dbItem.subcategory || dbItem.brand || "—",
    brand: dbItem.brand || undefined,
    fabric: dbItem.fabric || undefined,
    silhouette: dbItem.silhouette || undefined,
    aiTags: dbItem.vibe_tags || undefined,
    compatibleWith: 0, // Not stored in DB, would need to calculate
    timesWorn: dbItem.times_worn || 0,
    priceTier: dbItem.price_tier || undefined,
    allColors: dbItem.colors || [],
    subcategory: dbItem.subcategory || undefined,
  };
}
