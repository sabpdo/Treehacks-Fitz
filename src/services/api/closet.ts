import { supabase } from '../../lib/supabase';
import { ClosetItem, CreateClosetItemRequest, UpdateClosetItemRequest, AIImageAnalysis } from '../../types/database';
import { analyzeClothingImage, analyzeOutfitImage } from '../openai';
import { getInitialElo, eloToScore } from '../../lib/ranking';
import { ensurePublicStorageUrl } from '../../lib/adapters';

/**
 * Get all closet items for a user
 */
export async function getClosetItems(userId: string): Promise<ClosetItem[]> {
  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single closet item by ID
 */
export async function getClosetItem(itemId: string): Promise<ClosetItem | null> {
  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get closet items by category
 */
export async function getClosetItemsByCategory(
  userId: string,
  category: string
): Promise<ClosetItem[]> {
  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .order('rating', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get top-rated closet items (for rankings)
 */
export async function getTopRatedItems(userId: string, limit: number = 10): Promise<ClosetItem[]> {
  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId)
    .order('rating', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get items by vibe tags
 */
export async function getItemsByVibe(userId: string, vibe: string): Promise<ClosetItem[]> {
  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId)
    .contains('vibe_tags', [vibe]);

  if (error) throw error;
  return data || [];
}

/**
 * Create a closet item with AI analysis
 */
export async function createClosetItem(
  request: CreateClosetItemRequest
): Promise<ClosetItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // OpenAI requires a full absolute URL to fetch the image; normalize relative storage paths
  const imageUrl = ensurePublicStorageUrl(request.image_url) || request.image_url;

  // Analyze image with OpenAI
  let aiAnalysis;
  try {
    aiAnalysis = await analyzeClothingImage(imageUrl);
  } catch (error) {
    console.error('AI analysis failed, using manual input:', error);
    // Fall back to manual input if AI fails
    aiAnalysis = {
      category: request.category,
      subcategory: '',
      colors: [],
      silhouette: 'fitted' as const,
      fabric: '',
      vibe_tags: request.vibe_tags || [],
      description: '',
      short_label: undefined,
    };
  }

  const displayDescription =
    aiAnalysis.short_label?.trim() ||
    (aiAnalysis.description ? aiAnalysis.description.split(/[.!?]/)[0]?.trim().slice(0, 60) : null);

  // Merge AI analysis with user input (user input takes precedence)
  const itemData = {
    user_id: user.id,
    image_url: imageUrl,
    brand: request.brand || null,
    category: request.category,
    preference_tier: request.preference_tier,
    vibe_tags: request.vibe_tags || aiAnalysis.vibe_tags,
    price_tier: request.price_tier || null,
    colors: request.colors && request.colors.length > 0 ? request.colors : aiAnalysis.colors,
    silhouette: request.silhouette || aiAnalysis.silhouette,
    fabric: request.fabric || aiAnalysis.fabric,
    subcategory: request.subcategory || aiAnalysis.subcategory,
    display_description: displayDescription || null,
    times_worn: 0,
    rating: 0,
    elo_rating: getInitialElo(request.preference_tier),
  };

  const { data, error } = await supabase
    .from('closet_items')
    .insert(itemData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a closet item
 */
export async function updateClosetItem(
  itemId: string,
  updates: UpdateClosetItemRequest
): Promise<ClosetItem> {
  const { data, error } = await supabase
    .from('closet_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a closet item
 */
export async function deleteClosetItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('closet_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Mark item as worn (updates times_worn and last_worn_at)
 */
export async function markItemAsWorn(itemId: string): Promise<ClosetItem> {
  const item = await getClosetItem(itemId);
  if (!item) throw new Error('Item not found');

  const { data, error } = await supabase
    .from('closet_items')
    .update({
      times_worn: item.times_worn + 1,
      last_worn_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Rate a closet item (1-10)
 */
export async function rateItem(itemId: string, rating: number): Promise<ClosetItem> {
  if (rating < 0 || rating > 10) {
    throw new Error('Rating must be between 0 and 10');
  }

  const { data, error } = await supabase
    .from('closet_items')
    .update({ rating })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calculate closet utilization for a user
 */
export async function calculateClosetUtilization(userId: string): Promise<number> {
  const { data: items } = await supabase
    .from('closet_items')
    .select('times_worn')
    .eq('user_id', userId);

  if (!items || items.length === 0) return 0;

  const wornItems = items.filter(item => item.times_worn > 0).length;
  const utilization = (wornItems / items.length) * 100;

  // Update profile
  await supabase
    .from('profiles')
    .update({ closet_utilization: Math.round(utilization) })
    .eq('id', userId);

  return Math.round(utilization);
}

/**
 * Create multiple closet items from an outfit photo
 * Analyzes the photo with AI to detect multiple items (jacket + pants, etc.)
 * Creates a separate closet item for each detected item
 * Returns the created items and AI analysis for ranking flow
 */
export async function createItemsFromOutfitPhoto(
  imageUrl: string,
  brand?: string
): Promise<{
  items: ClosetItem[];
  aiAnalysis: AIImageAnalysis[];
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Analyze outfit image with OpenAI to detect multiple items
  const outfitAnalysis = await analyzeOutfitImage(imageUrl);

  if (!outfitAnalysis.items || outfitAnalysis.items.length === 0) {
    throw new Error('No items detected in image');
  }

  // Create a closet item for each detected item
  const createdItems: ClosetItem[] = [];

  for (const detectedItem of outfitAnalysis.items) {
    const itemData = {
      user_id: user.id,
      image_url: imageUrl,
      brand: brand || null,
      category: detectedItem.category,
      vibe_tags: detectedItem.vibe_tags,
      price_tier: null,
      colors: detectedItem.colors,
      silhouette: detectedItem.silhouette,
      fabric: detectedItem.fabric,
      subcategory: detectedItem.subcategory,
      times_worn: 0,
      rating: 0,
      elo_rating: getInitialElo(),
    };

    const { data, error } = await supabase
      .from('closet_items')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      console.error('Error creating item:', error);
      continue;
    }

    createdItems.push(data);
  }

  if (createdItems.length === 0) {
    throw new Error('Failed to create any items');
  }

  return {
    items: createdItems,
    aiAnalysis: outfitAnalysis.items,
  };
}