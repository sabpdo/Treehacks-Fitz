import type { ClosetItem, Category, PreferenceTier } from '../types/database';

/**
 * Elo-based Ranking Algorithm for fitz
 * Inspired by Beli's head-to-head comparison system
 *
 * Items are segmented by preference tier:
 * - "I don't like it" (dont_like): Elo 800-1200, scores 0-3
 * - "I like it" (like): Elo 1200-1800, scores 3-6
 * - "I love it" (love): Elo 1800-2200, scores 7-10
 *
 * Items only rank against others in the same preference tier
 */

// =====================================================
// CONSTANTS
// =====================================================

const K_FACTOR = 64; // How much ratings change per match (higher = more volatile, better spread)

// Segmented Elo ranges by preference tier
const TIER_RANGES = {
  dont_like: { min: 800, max: 1200, initial: 1000 },
  like: { min: 1200, max: 1800, initial: 1500 },
  love: { min: 1800, max: 2200, initial: 2000 },
} as const;

// Score ranges by preference tier (for 0-10 scale)
const TIER_SCORE_RANGES = {
  dont_like: { min: 0, max: 3 },
  like: { min: 3, max: 6 },
  love: { min: 7, max: 10 },
} as const;

// =====================================================
// TYPES
// =====================================================

export interface RankingComparison {
  winner_id: string;
  loser_id: string;
  category: Category;
  session_id?: string;
}

export interface ItemWithRanking extends ClosetItem {
  elo_rating: number;
  rank_in_category?: number;
}

export interface RankingSession {
  id: string;
  user_id: string;
  new_item_id: string;
  category: Category;
  comparisons: RankingComparison[];
  completed: boolean;
  created_at: string;
}

// =====================================================
// ELO CALCULATION
// =====================================================

/**
 * Calculate expected score (probability of winning)
 * @param playerElo - Current Elo of player
 * @param opponentElo - Current Elo of opponent
 * @returns Expected score between 0 and 1
 */
function calculateExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Update Elo ratings after a comparison
 * @param winnerElo - Current Elo of winner
 * @param loserElo - Current Elo of loser
 * @param preferenceTier - The preference tier (items only compete within same tier)
 * @returns New Elo ratings for both items
 */
export function updateEloRatings(
  winnerElo: number,
  loserElo: number,
  preferenceTier: PreferenceTier
): { newWinnerElo: number; newLoserElo: number } {
  const expectedWinner = calculateExpectedScore(winnerElo, loserElo);
  const expectedLoser = calculateExpectedScore(loserElo, winnerElo);

  const { min, max } = TIER_RANGES[preferenceTier];

  // Winner gets 1 point, loser gets 0
  const newWinnerElo = Math.max(
    min,
    Math.min(max, winnerElo + K_FACTOR * (1 - expectedWinner))
  );
  const newLoserElo = Math.max(
    min,
    Math.min(max, loserElo + K_FACTOR * (0 - expectedLoser))
  );

  return { newWinnerElo, newLoserElo };
}

/**
 * Convert Elo rating to 0-10 score using tier-specific ranges
 * @param elo - Elo rating
 * @param preferenceTier - The preference tier
 * @returns Score within tier's range (dont_like: 0-3, like: 3-6, love: 7-10)
 */
export function eloToScore(elo: number, preferenceTier: PreferenceTier): number {
  const { min: eloMin, max: eloMax } = TIER_RANGES[preferenceTier];
  const { min: scoreMin, max: scoreMax } = TIER_SCORE_RANGES[preferenceTier];

  // Normalize Elo within tier's range
  const normalized = (elo - eloMin) / (eloMax - eloMin);

  // Map to tier's score range
  const score = scoreMin + normalized * (scoreMax - scoreMin);

  return Math.max(scoreMin, Math.min(scoreMax, Number(score.toFixed(1))));
}

/**
 * Convert score back to Elo using tier-specific ranges
 * @param score - Score within tier's range
 * @param preferenceTier - The preference tier
 * @returns Elo rating within tier's range
 */
export function scoreToElo(score: number, preferenceTier: PreferenceTier): number {
  const { min: eloMin, max: eloMax } = TIER_RANGES[preferenceTier];
  const { min: scoreMin, max: scoreMax } = TIER_SCORE_RANGES[preferenceTier];

  // Normalize score within tier's range
  const normalized = (score - scoreMin) / (scoreMax - scoreMin);

  // Map to tier's Elo range
  return eloMin + normalized * (eloMax - eloMin);
}

// =====================================================
// BINARY SEARCH ALGORITHM
// =====================================================

/**
 * Determine which items to compare using smart binary search
 * Makes strategic comparisons to efficiently find position and spread ratings
 *
 * @param newItemElo - Elo of the new item
 * @param existingItems - Sorted list of existing items (high to low Elo)
 * @param comparisonsMade - Items already compared
 * @returns Next item to compare against, or null if done
 */
export function getNextComparison(
  newItemElo: number,
  existingItems: ItemWithRanking[],
  comparisonsMade: Set<string>
): ItemWithRanking | null {
  // Filter out already compared items
  const remainingItems = existingItems.filter(
    (item) => !comparisonsMade.has(item.id)
  );

  if (remainingItems.length === 0) {
    return null;
  }

  // Sort by Elo (high to low)
  const sortedRemaining = [...remainingItems].sort(
    (a, b) => b.elo_rating - a.elo_rating
  );

  const numComparisons = comparisonsMade.size - 1; // -1 for the new item itself

  // Strategy: Make comparisons that maximize information gain
  if (numComparisons === 0) {
    // First comparison: Compare with the median item to quickly divide the space
    const medianIndex = Math.floor(sortedRemaining.length / 2);
    return sortedRemaining[medianIndex];
  } else if (numComparisons === 1) {
    // Second comparison: Based on first result, compare with quartile
    // Find items above and below current Elo
    const itemsAbove = sortedRemaining.filter(item => item.elo_rating > newItemElo);
    const itemsBelow = sortedRemaining.filter(item => item.elo_rating <= newItemElo);

    if (itemsAbove.length > 0 && itemsBelow.length > 0) {
      // Pick from the larger group to narrow down position
      if (itemsAbove.length > itemsBelow.length) {
        // Pick middle of upper half
        const midIndex = Math.floor(itemsAbove.length / 2);
        return itemsAbove[midIndex];
      } else {
        // Pick middle of lower half
        const midIndex = Math.floor(itemsBelow.length / 2);
        return itemsBelow[midIndex];
      }
    } else if (itemsAbove.length > 0) {
      // All remaining are above, pick closest
      return itemsAbove[itemsAbove.length - 1];
    } else {
      // All remaining are below, pick closest
      return itemsBelow[0];
    }
  } else {
    // Third comparison: Fine-tune position with closest item
    let closestIndex = 0;
    let closestDiff = Math.abs(sortedRemaining[0].elo_rating - newItemElo);

    for (let i = 1; i < sortedRemaining.length; i++) {
      const diff = Math.abs(sortedRemaining[i].elo_rating - newItemElo);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return sortedRemaining[closestIndex];
  }
}

/**
 * Determine if we have enough comparisons to accurately rank the item
 * Just 2-3 strategic comparisons are enough with ELO rating system
 *
 * @param totalItems - Total number of items in category
 * @param comparisonsMade - Number of comparisons made
 * @returns Whether we can stop comparing
 */
export function shouldStopComparing(
  totalItems: number,
  comparisonsMade: number
): boolean {
  if (totalItems <= 1) return true;

  // Just need 2-3 strategic comparisons to place the item accurately
  const maxComparisons = Math.min(3, totalItems);

  // Stop if we've done enough comparisons
  return comparisonsMade >= maxComparisons;
}

// =====================================================
// RANKING CALCULATION
// =====================================================

/**
 * Calculate rank in category based on Elo
 * @param items - All items in category with Elo ratings
 * @returns Items sorted by rank with rank_in_category field
 */
export function calculateRankings(items: ItemWithRanking[]): ItemWithRanking[] {
  const sorted = [...items].sort((a, b) => b.elo_rating - a.elo_rating);

  return sorted.map((item, index) => ({
    ...item,
    rank_in_category: index + 1,
    rating: eloToScore(item.elo_rating, item.preference_tier),
  }));
}

/**
 * Get top N items in a category
 * @param items - All items with rankings
 * @param n - Number of top items to return
 * @returns Top N items
 */
export function getTopItems(items: ItemWithRanking[], n: number = 10): ItemWithRanking[] {
  return calculateRankings(items).slice(0, n);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Initialize a new item with default Elo based on preference tier
 * @param preferenceTier - The user's preference tier
 * @returns Initial Elo rating (dont_like: 1000, like: 1500, love: 2000)
 */
export function getInitialElo(preferenceTier: PreferenceTier): number {
  return TIER_RANGES[preferenceTier].initial;
}

/**
 * Get the Elo range bounds for a preference tier
 * @param preferenceTier - The preference tier
 * @returns Min and max Elo for the tier
 */
export function getTierEloBounds(preferenceTier: PreferenceTier): { min: number; max: number } {
  return {
    min: TIER_RANGES[preferenceTier].min,
    max: TIER_RANGES[preferenceTier].max,
  };
}

/**
 * Group items by category
 * @param items - All items
 * @returns Items grouped by category
 */
export function groupByCategory(items: ItemWithRanking[]): Record<Category, ItemWithRanking[]> {
  const grouped: Record<string, ItemWithRanking[]> = {
    shirts: [],
    pants: [],
    skirts_dresses: [],
    jackets_outerwear: [],
    shoes: [],
    bags: [],
  };

  items.forEach((item) => {
    if (grouped[item.category]) {
      grouped[item.category].push(item);
    }
  });

  return grouped as Record<Category, ItemWithRanking[]>;
}

/**
 * Calculate statistics for a category
 * @param items - Items in category
 * @returns Category statistics
 */
export function getCategoryStats(items: ItemWithRanking[]): {
  count: number;
  averageScore: number;
  topScore: number;
  lowestScore: number;
} {
  if (items.length === 0) {
    return {
      count: 0,
      averageScore: 0,
      topScore: 0,
      lowestScore: 0,
    };
  }

  const scores = items.map((item) => eloToScore(item.elo_rating, item.preference_tier));

  return {
    count: items.length,
    averageScore: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
    topScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
  };
}

// =====================================================
// RANKING SESSION LOGIC
// =====================================================

/**
 * Simulate a full ranking session for a new item
 * This function runs the binary search algorithm to determine
 * which items to compare and updates Elo ratings
 *
 * @param newItem - The new item being ranked
 * @param categoryItems - Existing items in the same category and preference tier
 * @param userChoices - Array of item IDs that won each comparison
 * @returns Updated Elo for new item and all compared items
 */
export function processRankingSession(
  newItem: ItemWithRanking,
  categoryItems: ItemWithRanking[],
  userChoices: { comparedItemId: string; winnerId: string }[]
): {
  newItemElo: number;
  updatedItems: Map<string, number>; // itemId -> new Elo
} {
  let currentElo = newItem.elo_rating;
  const updatedElos = new Map<string, number>();

  // Process each comparison
  userChoices.forEach(({ comparedItemId, winnerId }) => {
    const comparedItem = categoryItems.find((item) => item.id === comparedItemId);
    if (!comparedItem) return;

    const comparedElo = updatedElos.get(comparedItemId) ?? comparedItem.elo_rating;

    // Update Elo based on who won (using tier-specific bounds)
    if (winnerId === newItem.id) {
      const { newWinnerElo, newLoserElo } = updateEloRatings(
        currentElo,
        comparedElo,
        newItem.preference_tier
      );
      currentElo = newWinnerElo;
      updatedElos.set(comparedItemId, newLoserElo);
    } else {
      const { newWinnerElo, newLoserElo } = updateEloRatings(
        comparedElo,
        currentElo,
        newItem.preference_tier
      );
      currentElo = newLoserElo;
      updatedElos.set(comparedItemId, newWinnerElo);
    }
  });

  return {
    newItemElo: currentElo,
    updatedItems: updatedElos,
  };
}