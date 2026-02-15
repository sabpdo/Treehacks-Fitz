import { supabase } from '../../lib/supabase';

export interface ShoppingItem {
  id: string;
  name: string;
  brand?: string;
  color?: string;
  price?: number;
  currency?: string;
  image_url: string;
  url: string;
  rating?: number;
  reviews_count?: number;
  /** Display name for "X rated this" in modal (SerpAPI items get random; DB items use deterministic pick) */
  rater_name?: string;
  category?: string;
  root_category?: string;
  wardrobe_ids?: number[];
  created_at: string;
  updated_at: string;
}

/**
 * Get all shopping items from the database
 * Optionally filter by search query (searches name field)
 */
export async function getShoppingItems(query?: string, limit: number = 50): Promise<ShoppingItem[]> {
  // If no query, get all items
  if (!query || !query.trim()) {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching shopping items:', error);
      throw error;
    }
    console.log('Fetched all items (no query):', data?.length || 0);
    return (data || []) as ShoppingItem[];
  }

  // If query provided, search in name field
  const searchTerm = query.trim();
  console.log('Searching for:', searchTerm);

  // Try multiple search strategies
  // 1. Exact phrase match
  let queryBuilder = supabase
    .from('shopping_items')
    .select('*')
    .ilike('name', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error fetching shopping items:', error);
    throw error;
  }

  console.log('Search results:', data?.length || 0);
  if (data && data.length > 0) {
    console.log('Sample item names:', data.slice(0, 3).map(item => item.name));
  } else {
    // If no results with exact phrase, try searching individual words
    const words = searchTerm.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 1) {
      console.log('Trying individual word search:', words);
      // Search for items that contain any of the words
      const wordQueries = words.map(word => `name.ilike.%${word}%`).join(',');
      const { data: wordData, error: wordError } = await supabase
        .from('shopping_items')
        .select('*')
        .or(wordQueries)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!wordError && wordData && wordData.length > 0) {
        console.log('Found items with word search:', wordData.length);
        return wordData as ShoppingItem[];
      }
    }
  }

  return (data || []) as ShoppingItem[];
}

/**
 * Get shopping items by brand
 */
export async function getShoppingItemsByBrand(brand: string, limit: number = 50): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('brand', brand)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ShoppingItem[];
}

