import type { ClosetItem, Category } from '../types/database';

/**
 * Elo-based Ranking Algorithm for fitz
 * Inspired by Beli's head-to-head comparison system
 *
 * Items start at 1500 Elo points
 * After comparisons, Elo is converted to 0.0-10.0 score
 */

// =====================================================
// CONSTANTS
// =====================================================

const INITIAL_ELO = 1500;
const K_FACTOR = 32; // How much ratings change per match (higher = more volatile)
const MIN_ELO = 800;
const MAX_ELO = 2200;

// For converting Elo to 0-10 scale
const ELO_RANGE_MIN = 800;  // Maps to 0.0
const ELO_RANGE_MAX = 2200; // Maps to 10.0

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
 * @returns New Elo ratings for both items
 */
export function updateEloRatings(
  winnerElo: number,
  loserElo: number
): { newWinnerElo: number; newLoserElo: number } {
  const expectedWinner = calculateExpectedScore(winnerElo, loserElo);
  const expectedLoser = calculateExpectedScore(loserElo, winnerElo);

  // Winner gets 1 point, loser gets 0
  const newWinnerElo = Math.max(
    MIN_ELO,
    Math.min(MAX_ELO, winnerElo + K_FACTOR * (1 - expectedWinner))
  );
  const newLoserElo = Math.max(
    MIN_ELO,
    Math.min(MAX_ELO, loserElo + K_FACTOR * (0 - expectedLoser))
  );

  return { newWinnerElo, newLoserElo };
}

/**
 * Convert Elo rating to 0-10 score (Beli-style)
 * @param elo - Elo rating
 * @returns Score between 0.0 and 10.0
 */
export function eloToScore(elo: number): number {
  const normalized = (elo - ELO_RANGE_MIN) / (ELO_RANGE_MAX - ELO_RANGE_MIN);
  const score = normalized * 10;
  return Math.max(0, Math.min(10, Number(score.toFixed(1))));
}

/**
 * Convert 0-10 score back to Elo (for initialization)
 * @param score - Score between 0.0 and 10.0
 * @returns Elo rating
 */
export function scoreToElo(score: number): number {
  const normalized = score / 10;
  return ELO_RANGE_MIN + normalized * (ELO_RANGE_MAX - ELO_RANGE_MIN);
}

// =====================================================
// BINARY SEARCH ALGORITHM
// =====================================================

/**
 * Determine which items to compare using binary search
 * This efficiently finds the new item's position in the ranking
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

  // If only 1-2 items, compare with them
  if (remainingItems.length <= 2) {
    return remainingItems[0];
  }

  // Binary search: find middle item based on current Elo estimate
  const sortedRemaining = [...remainingItems].sort(
    (a, b) => b.elo_rating - a.elo_rating
  );

  // Find the item closest to our current Elo estimate
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

/**
 * Determine if we have enough comparisons to accurately rank the item
 * Using binary search, we need log2(n) comparisons at minimum
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

  // Minimum comparisons needed (log2 of total items, rounded up)
  const minComparisons = Math.ceil(Math.log2(totalItems));

  // Maximum comparisons (cap at 10 to not overwhelm users)
  const maxComparisons = Math.min(10, totalItems);

  // Stop if we've done enough comparisons
  return comparisonsMade >= Math.min(minComparisons + 2, maxComparisons);
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
    rating: eloToScore(item.elo_rating),
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
 * Initialize a new item with default Elo
 * @returns Initial Elo rating
 */
export function getInitialElo(): number {
  return INITIAL_ELO;
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

  const scores = items.map((item) => eloToScore(item.elo_rating));

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
 * @param categoryItems - Existing items in the same category
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

    // Update Elo based on who won
    if (winnerId === newItem.id) {
      const { newWinnerElo, newLoserElo } = updateEloRatings(currentElo, comparedElo);
      currentElo = newWinnerElo;
      updatedElos.set(comparedItemId, newLoserElo);
    } else {
      const { newWinnerElo, newLoserElo } = updateEloRatings(comparedElo, currentElo);
      currentElo = newLoserElo;
      updatedElos.set(comparedItemId, newWinnerElo);
    }
  });

  return {
    newItemElo: currentElo,
    updatedItems: updatedElos,
  };
}