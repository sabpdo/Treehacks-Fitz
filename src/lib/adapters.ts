/**
 * Adapters from API/backend types to frontend UI types (mockData shapes).
 * Use these when wiring the real API to existing components.
 */

import type { Post, Profile, Comment as ApiComment, ClosetItem, PostOutfitItem } from '../types/database';
import { supabaseUrl } from './supabase';

const BUCKET = 'closet-images';

/** Ensure Supabase storage URL is a full public URL so OpenAI and the browser can load it */
export function ensurePublicStorageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return url || '';
  let full = url.trim();
  if (full.startsWith('data:') || full.startsWith('http://') || full.startsWith('https://')) return full;
  const baseUrl = (supabaseUrl || '').replace(/\/$/, '');

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

/** Tag on a post = a clothing item from the wardrobe (or fallback label from capture flow) */
export interface UIOOTDPostTag {
  label: string;
  type: string;
  /** When present, this tag is a linked closet item — link to /closet?item=id */
  closetItemId?: string;
}

export interface UIOutfitItem {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  imageUrl?: string;
  brand?: string;
  color?: string;
  fabric?: string;
  silhouette?: string;
  /** When set, this item is in the post author's wardrobe — link to /closet?item=id (only for own post). */
  closetItemId?: string;
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
  compatibilityMatchingVibes?: string[];
  compatibilityMatchingColors?: string[];
  aiInsight: string;
  tags?: UIOOTDPostTag[];
  outfitItems?: UIOutfitItem[];
}

export interface UIComment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
}

/** Map DB category to outfit breakdown type (top, bottom, shoes, etc.) */
function categoryToOutfitType(category: string): string {
  const map: Record<string, string> = {
    shirts: 'top',
    pants: 'bottom',
    skirts_dresses: 'bottom',
    jackets_outerwear: 'outerwear',
    shoes: 'shoes',
    bags: 'accessory',
  };
  return map[category] ?? 'top';
}

const DEFAULT_OUTFIT_POSITIONS = [
  { x: 48, y: 32 },
  { x: 52, y: 62 },
  { x: 50, y: 88 },
  { x: 48, y: 22 },
  { x: 50, y: 50 },
];

/** Build outfit items from post's linked closet items (for outfit breakdown). Uses default positions when DB has no position data. */
function closetItemsToOutfitItems(items: ClosetItem[]): UIOutfitItem[] {
  if (!items?.length) return [];
  return items.map((item, i) => {
    const pos = DEFAULT_OUTFIT_POSITIONS[i % DEFAULT_OUTFIT_POSITIONS.length];
    const label = item.subcategory || item.category?.replace(/_/g, ' ') || 'Item';
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      id: item.id,
      type: categoryToOutfitType(item.category),
      label: item.brand ? `${item.brand} ${capitalizedLabel}` : capitalizedLabel,
      position: pos,
      imageUrl: item.image_url || undefined,
      brand: item.brand ?? undefined,
      color: item.colors?.[0] ?? undefined,
      fabric: item.fabric ?? undefined,
      silhouette: item.silhouette ?? undefined,
    };
  });
}

/** Treat "Unknown" / "Unknown Brand" as no value so we never display that text. */
function cleanBrand(brand: string | null | undefined): string | undefined {
  const b = (brand ?? '').trim();
  if (!b || b.toLowerCase() === 'unknown' || b.toLowerCase() === 'unknown brand') return undefined;
  return b;
}

/** Build UI outfit items from post outfit items (same shape as closet item but from post). */
function postOutfitItemsToUIOutfitItems(items: PostOutfitItem[]): UIOutfitItem[] {
  if (!items?.length) return [];
  return items.map((item, i) => {
    const pos = DEFAULT_OUTFIT_POSITIONS[i % DEFAULT_OUTFIT_POSITIONS.length];
    const label = item.subcategory || item.category?.replace(/_/g, ' ') || 'Item';
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    const brand = cleanBrand(item.brand);
    return {
      id: item.id ?? `post-item-${i}`,
      type: categoryToOutfitType(item.category),
      label: brand ? `${brand} ${capitalizedLabel}` : capitalizedLabel,
      position: pos,
      imageUrl: item.image_url || undefined,
      brand,
      color: item.colors?.[0] ?? undefined,
      fabric: item.fabric ?? undefined,
      silhouette: item.silhouette ?? undefined,
      closetItemId: item.closet_item_id ?? undefined,
    };
  });
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

function buildTagsFromPost(post: Post): UIOOTDPostTag[] | undefined {
  // Post items = same schema as closet; optional closet_item_id when also in wardrobe
  const items = post.items;
  if (Array.isArray(items) && items.length > 0) {
    return items.map((item) => ({
      label: item.subcategory || item.brand || item.category || 'Item',
      type: item.category,
      closetItemId: item.closet_item_id,
    }));
  }
  const stored = post.tags;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored.map((t) => ({
      label: typeof t.label === 'string' ? t.label : String(t.label ?? ''),
      type: typeof t.type === 'string' ? t.type : String(t.type ?? ''),
    }));
  }
  return undefined;
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
    savedCount: 0,
    commentCount: post.comments_count ?? 0,
    likedByUserIds: post.is_liked && currentUserId ? [currentUserId] : [],
    compatibilityScore: post.compatibility_score ?? 0,
    compatibilityMatchingVibes: post.compatibility_matching_vibes,
    compatibilityMatchingColors: post.compatibility_matching_colors,
    aiInsight: '',
    tags: buildTagsFromPost(post),
    outfitItems: (() => {
      const raw = (post as any).outfit_items;
      if (raw && Array.isArray(raw) && raw.length > 0) return postOutfitItemsToUIOutfitItems(raw as PostOutfitItem[]);
      if (post.items?.length) return postOutfitItemsToUIOutfitItems(post.items);
      return undefined;
    })(),
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
export function apiClosetItemToUI(dbItem: import('../types/database').ClosetItem): import('../app/data/mockData').ClosetItem & { priceTier?: string; allColors?: string[]; subcategory?: string; rating?: number; eloRating?: number; preferenceTier?: string } {
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
    displayDescription: dbItem.display_description || undefined,
    rating: dbItem.rating || 0,
    eloRating: dbItem.elo_rating || 1500,
    preferenceTier: dbItem.preference_tier || undefined,
  };
}
