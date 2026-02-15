// Database TypeScript Types for ClosetRank

// Main Categories - Simple system
export type Category = 'shirts' | 'pants' | 'skirts_dresses' | 'jackets_outerwear' | 'shoes' | 'bags';

export type Gender = 'women' | 'men' | 'unisex';

export type PriceTier = 'budget' | 'mid' | 'luxury';

// Vibe Tags - Occasions
export type VibeTag =
  | 'date night'
  | 'casual'
  | 'workout'
  | 'office';

export type Silhouette = 'fitted' | 'oversized' | 'loose' | 'tailored' | 'relaxed';

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  gender: Gender | null;
  followers: number;
  following: number;
  streak: number;
  closet_utilization: number;
  created_at: string;
  updated_at: string;
}

export interface ClosetItem {
  id: string;
  user_id: string;
  image_url: string;

  // Brand & Basic Info
  brand: string | null;
  category: Category;

  // Vibe & Style
  vibe_tags: VibeTag[];
  price_tier: PriceTier | null;

  // AI Extracted Data
  colors: string[];
  silhouette: Silhouette | null;
  fabric: string | null;
  subcategory: string | null;

  // Usage & Rankings
  times_worn: number;
  rating: number; // 0-10 score (converted from Elo)
  elo_rating: number; // Elo rating (800-2200, starts at 1500)
  last_worn_at: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Item on a post — same schema as closet item for the clothing piece.
 * Every post has items; optionally an item is also in the user's wardrobe (closet_item_id).
 */
export interface PostOutfitItem {
  id?: string;
  image_url: string;
  category: Category;
  brand: string | null;
  subcategory: string | null;
  colors: string[];
  fabric: string | null;
  silhouette: Silhouette | null;
  vibe_tags: VibeTag[];
  price_tier?: PriceTier | null;
  /** When set, this item is also in the user's wardrobe (closet_items.id) */
  closet_item_id?: string;
}

export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;

  // Populated fields (not in DB)
  user?: Profile;
  /** Items in this outfit — same schema as closet items; from outfit_items JSONB or post_items join */
  items?: PostOutfitItem[];
  is_liked?: boolean;
  is_saved?: boolean;
  compatibility_score?: number;

  // Legacy: simple tags (label + type); prefer items when available
  tags?: { label: string; type: string }[];
}

export interface PostItem {
  id: string;
  post_id: string;
  closet_item_id: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;

  // Populated fields
  user?: Profile;
}

// Request/Response types
export interface CreateClosetItemRequest {
  image_url: string;
  brand?: string;
  category: Category;
  vibe_tags?: VibeTag[];
  price_tier?: PriceTier;
  colors?: string[];
  fabric?: string;
  silhouette?: Silhouette;
  subcategory?: string;
}

export interface UpdateClosetItemRequest {
  brand?: string;
  category?: Category;
  vibe_tags?: VibeTag[];
  price_tier?: PriceTier;
  rating?: number;
  colors?: string[];
  fabric?: string;
  silhouette?: Silhouette;
  subcategory?: string;
  image_url?: string;
}

export interface CreatePostRequest {
  image_url: string;
  caption?: string;
  /** Items in this outfit — same schema as closet items; adding to wardrobe is optional (closet_item_id) */
  items?: PostOutfitItem[];
  /** @deprecated Use items[].closet_item_id instead. Closet item IDs to link and mark as worn. */
  item_ids?: string[];
  /** @deprecated Use items instead. Kept for backward compat. */
  tags?: { label: string; type: string }[];
}

export interface AIImageAnalysis {
  category: Category;
  subcategory: string;
  colors: string[];
  silhouette: Silhouette;
  fabric: string;
  vibe_tags: VibeTag[];
  description: string;
}

export interface CompatibilityScore {
  score: number; // 0-100
  matching_items: number;
  matching_vibes: string[];
  matching_colors: string[];
}