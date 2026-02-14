// Database TypeScript Types for ClosetRank

// Main Categories
export type Category = 'tops' | 'bottoms' | 'outerwear' | 'dresses_skirts' | 'shoes' | 'bags' | 'accessories';

// Subcategories by main category
export type TopSubcategory =
  | 't-shirt'
  | 'tank top'
  | 'blouse'
  | 'button-up shirt'
  | 'polo'
  | 'crop top'
  | 'tube top'
  | 'henley'
  | 'other top';

export type BottomSubcategory =
  | 'jeans'
  | 'trousers'
  | 'chinos'
  | 'leggings'
  | 'joggers'
  | 'cargo pants'
  | 'shorts'
  | 'sweatpants'
  | 'other bottom';

export type OuterwearSubcategory =
  | 'sweater'
  | 'cardigan'
  | 'hoodie'
  | 'sweatshirt'
  | 'blazer'
  | 'jacket'
  | 'coat'
  | 'vest'
  | 'other outerwear';

export type DressSkirtSubcategory =
  | 'mini dress'
  | 'midi dress'
  | 'maxi dress'
  | 'mini skirt'
  | 'midi skirt'
  | 'maxi skirt'
  | 'other dress/skirt';

export type ShoeSubcategory =
  | 'sneakers'
  | 'boots'
  | 'sandals'
  | 'heels'
  | 'flats'
  | 'loafers'
  | 'slippers'
  | 'other shoes';

export type BagSubcategory =
  | 'tote'
  | 'crossbody'
  | 'shoulder bag'
  | 'backpack'
  | 'clutch'
  | 'satchel'
  | 'messenger bag'
  | 'other bag';

export type AccessorySubcategory =
  | 'hat'
  | 'scarf'
  | 'belt'
  | 'sunglasses'
  | 'jewelry'
  | 'watch'
  | 'tie'
  | 'other accessory';

export type Subcategory =
  | TopSubcategory
  | BottomSubcategory
  | OuterwearSubcategory
  | DressSkirtSubcategory
  | ShoeSubcategory
  | BagSubcategory
  | AccessorySubcategory;

export type Gender = 'women' | 'men' | 'unisex';

export type PriceTier = 'budget' | 'mid' | 'luxury';

export type VibeTag =
  | 'date night'
  | 'casual'
  | 'grunge'
  | 'preppy'
  | 'streetwear'
  | 'formal'
  | 'athleisure'
  | 'business casual'
  | 'bohemian'
  | 'minimalist';

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
  rating: number;
  last_worn_at: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
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
  items?: ClosetItem[];
  is_liked?: boolean;
  compatibility_score?: number;
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
}

export interface UpdateClosetItemRequest {
  brand?: string;
  category?: Category;
  vibe_tags?: VibeTag[];
  price_tier?: PriceTier;
  rating?: number;
}

export interface CreatePostRequest {
  image_url: string;
  caption?: string;
  item_ids?: string[]; // closet item IDs to associate with post
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