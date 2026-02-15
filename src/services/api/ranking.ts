import { supabase } from '../../lib/supabase';
import type { ClosetItem, Category } from '../../types/database';
import type { ItemWithRanking } from '../../lib/ranking';
import {
  getInitialElo,
  eloToScore,
  updateEloRatings,
  getNextComparison,
  shouldStopComparing,
  calculateRankings,
} from '../../lib/ranking';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string): boolean {
  return Boolean(id && UUID_REGEX.test(id));
}

/**
 * Get all items in a category for a user with Elo ratings.
 * Returns [] if userId is not a valid UUID (e.g. mock "me" / "u1") to avoid 400 from Supabase.
 */
export async function getItemsInCategory(
  userId: string,
  category: Category
): Promise<ItemWithRanking[]> {
  if (!isUuid(userId)) {
    return [];
  }
  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .order('elo_rating', { ascending: false });

  if (error) throw error;
  return (data || []) as ItemWithRanking[];
}

/**
 * Submit a ranking comparison (user chose between two items)
 * @param winnerId - ID of the item the user preferred
 * @param loserId - ID of the item the user did not prefer
 */
export async function submitComparison(
  winnerId: string,
  loserId: string
): Promise<{ newWinnerRating: number; newLoserRating: number }> {
  // Get current items
  const { data: items, error: fetchError } = await supabase
    .from('closet_items')
    .select('id, elo_rating, rating')
    .in('id', [winnerId, loserId]);

  if (fetchError || !items || items.length !== 2) {
    throw new Error('Failed to fetch items for comparison');
  }

  const winner = items.find((i) => i.id === winnerId)!;
  const loser = items.find((i) => i.id === loserId)!;

  // Calculate new Elo ratings
  const { newWinnerElo, newLoserElo } = updateEloRatings(
    winner.elo_rating,
    loser.elo_rating
  );

  // Update both items in database
  const updates = [
    supabase
      .from('closet_items')
      .update({
        elo_rating: newWinnerElo,
        rating: eloToScore(newWinnerElo),
      })
      .eq('id', winnerId),
    supabase
      .from('closet_items')
      .update({
        elo_rating: newLoserElo,
        rating: eloToScore(newLoserElo),
      })
      .eq('id', loserId),
  ];

  const results = await Promise.all(updates);

  if (results.some((r) => r.error)) {
    throw new Error('Failed to update item ratings');
  }

  return {
    newWinnerRating: eloToScore(newWinnerElo),
    newLoserRating: eloToScore(newLoserElo),
  };
}

/**
 * Start a ranking session for a new item
 * Returns items to compare against using binary search algorithm
 */
export async function startRankingSession(
  newItemId: string,
  category: Category
): Promise<{
  newItem: ItemWithRanking;
  itemsToCompare: ItemWithRanking[];
  totalComparisons: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the new item
  const { data: newItem, error: newItemError } = await supabase
    .from('closet_items')
    .select('*')
    .eq('id', newItemId)
    .single();

  if (newItemError || !newItem) {
    throw new Error('New item not found');
  }

  // Get existing items in category
  const existingItems = await getItemsInCategory(user.id, category);

  // Filter out the new item
  const otherItems = existingItems.filter((item) => item.id !== newItemId);

  if (otherItems.length === 0) {
    // No items to compare against, just set initial rating
    await supabase
      .from('closet_items')
      .update({
        elo_rating: getInitialElo(),
        rating: eloToScore(getInitialElo()),
      })
      .eq('id', newItemId);

    return {
      newItem: newItem as ItemWithRanking,
      itemsToCompare: [],
      totalComparisons: 0,
    };
  }

  // Calculate how many comparisons we'll need
  const totalComparisons = Math.min(
    Math.ceil(Math.log2(otherItems.length)) + 2,
    Math.min(10, otherItems.length)
  );

  return {
    newItem: newItem as ItemWithRanking,
    itemsToCompare: otherItems,
    totalComparisons,
  };
}

/**
 * Get the next item to compare against in the ranking session
 * Uses binary search to efficiently find the new item's rank
 */
export async function getNextComparisonItem(
  newItemId: string,
  category: Category,
  comparisonsMade: string[] // IDs of items already compared
): Promise<ItemWithRanking | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current new item with updated Elo
  const { data: newItem } = await supabase
    .from('closet_items')
    .select('*')
    .eq('id', newItemId)
    .single();

  if (!newItem) return null;

  // Get existing items in category
  const existingItems = await getItemsInCategory(user.id, category);

  // Filter out already compared items and the new item itself
  const comparedSet = new Set([...comparisonsMade, newItemId]);

  return getNextComparison(
    newItem.elo_rating,
    existingItems,
    comparedSet
  );
}

/**
 * Complete a ranking session
 * Finalizes the new item's ranking and returns updated category rankings
 */
export async function completeRankingSession(
  newItemId: string,
  category: Category
): Promise<ItemWithRanking[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get all items in category with updated rankings
  const items = await getItemsInCategory(user.id, category);

  // Calculate and return rankings
  return calculateRankings(items);
}

/**
 * Get top ranked items across all categories or specific category
 */
export async function getTopRankedItems(
  userId: string,
  category?: Category,
  limit: number = 10
): Promise<ItemWithRanking[]> {
  let query = supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query
    .order('elo_rating', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return calculateRankings((data || []) as ItemWithRanking[]);
}

/**
 * Get rankings for all categories
 */
export async function getAllCategoryRankings(
  userId: string
): Promise<Record<Category, ItemWithRanking[]>> {
  const categories: Category[] = [
    'shirts',
    'pants',
    'skirts_dresses',
    'jackets_outerwear',
    'shoes',
    'bags',
  ];

  const results: Record<string, ItemWithRanking[]> = {};

  await Promise.all(
    categories.map(async (category) => {
      const items = await getItemsInCategory(userId, category);
      results[category] = calculateRankings(items);
    })
  );

  return results as Record<Category, ItemWithRanking[]>;
}

/**
 * Get top ranked items across users you follow (for "Top Ranked in Your Network").
 * Fetches rankings from each followed user, flattens, sorts by rating desc, returns top N.
 */
export async function getNetworkTopRankings(
  followingUserIds: string[],
  limit: number = 8
): Promise<ItemWithRanking[]> {
  if (followingUserIds.length === 0) return [];

  const maxUsers = 15;
  const userIds = followingUserIds.slice(0, maxUsers);

  const allByUser = await Promise.all(
    userIds.map((userId) =>
      getAllCategoryRankings(userId).catch(() => ({} as Record<Category, ItemWithRanking[]>))
    )
  );

  const flat: ItemWithRanking[] = [];
  for (const byCategory of allByUser) {
    for (const items of Object.values(byCategory)) {
      flat.push(...items);
    }
  }

  const sorted = flat
    .filter((item) => item.rating != null && !Number.isNaN(item.rating))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return sorted.slice(0, limit);
}