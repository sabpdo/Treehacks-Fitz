import { supabase } from '../../lib/supabase';
import { ClosetItem, Post, CompatibilityScore } from '../../types/database';

/**
 * Calculate compatibility score between a post and user's closet
 * Score is based on:
 * - Matching categories (30%)
 * - Matching colors (25%)
 * - Matching vibe tags (25%)
 * - Matching price tiers (10%)
 * - Matching brands (10%)
 */
export async function calculateCompatibilityScore(
  post: Post,
  userCloset: ClosetItem[]
): Promise<CompatibilityScore> {
  if (!post.items || post.items.length === 0) {
    return {
      score: 0,
      matching_items: 0,
      matching_vibes: [],
      matching_colors: [],
    };
  }

  let totalScore = 0;
  let matchingItems = 0;
  const matchingVibes = new Set<string>();
  const matchingColors = new Set<string>();

  // Calculate score for each item in the post
  for (const postItem of post.items) {
    let itemScore = 0;
    let hasMatch = false;

    for (const closetItem of userCloset) {
      let score = 0;

      // Category match (30 points)
      if (postItem.category === closetItem.category) {
        score += 30;
        hasMatch = true;
      }

      // Color match (25 points)
      const colorOverlap = postItem.colors.filter(color =>
        closetItem.colors.includes(color)
      );
      if (colorOverlap.length > 0) {
        score += (colorOverlap.length / Math.max(postItem.colors.length, 1)) * 25;
        colorOverlap.forEach(color => matchingColors.add(color));
        hasMatch = true;
      }

      // Vibe tag match (25 points)
      const vibeOverlap = postItem.vibe_tags.filter(vibe =>
        closetItem.vibe_tags.includes(vibe)
      );
      if (vibeOverlap.length > 0) {
        score += (vibeOverlap.length / Math.max(postItem.vibe_tags.length, 1)) * 25;
        vibeOverlap.forEach(vibe => matchingVibes.add(vibe));
        hasMatch = true;
      }

      // Price tier match (10 points)
      if (postItem.price_tier && closetItem.price_tier && postItem.price_tier === closetItem.price_tier) {
        score += 10;
      }

      // Brand match (10 points)
      if (postItem.brand && closetItem.brand && postItem.brand.toLowerCase() === closetItem.brand.toLowerCase()) {
        score += 10;
        hasMatch = true;
      }

      itemScore = Math.max(itemScore, score);
    }

    if (hasMatch) {
      matchingItems++;
    }

    totalScore += itemScore;
  }

  // Average score across all items in the post
  const finalScore = Math.round(totalScore / post.items.length);

  return {
    score: Math.min(100, finalScore),
    matching_items: matchingItems,
    matching_vibes: Array.from(matchingVibes),
    matching_colors: Array.from(matchingColors),
  };
}

/**
 * Calculate compatibility for all posts in a feed
 */
export async function calculateFeedCompatibility(posts: Post[]): Promise<Post[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return posts;

  // Get user's closet
  const { data: closet } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', user.id);

  if (!closet || closet.length === 0) {
    return posts.map(post => ({ ...post, compatibility_score: 0 }));
  }

  // Calculate compatibility for each post (score + breakdown for insights)
  const postsWithScores = await Promise.all(
    posts.map(async (post) => {
      const compatibility = await calculateCompatibilityScore(post, closet);
      return {
        ...post,
        compatibility_score: compatibility.score,
        compatibility_matching_vibes: compatibility.matching_vibes,
        compatibility_matching_colors: compatibility.matching_colors,
      };
    })
  );

  return postsWithScores;
}

/**
 * Get recommended items based on user's current closet
 * (Items that would fill gaps in their closet)
 */
export async function getRecommendedItems(userId: string): Promise<{
  missing_categories: string[];
  missing_vibes: string[];
  missing_colors: string[];
}> {
  const { data: closet } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId);

  if (!closet) {
    return {
      missing_categories: ['top', 'bottom', 'shoes', 'accessories', 'outerwear'],
      missing_vibes: [],
      missing_colors: [],
    };
  }

  // All possible categories
  const allCategories = ['top', 'bottom', 'shoes', 'accessories', 'outerwear'];
  const existingCategories = new Set(closet.map(item => item.category));
  const missingCategories = allCategories.filter(cat => !existingCategories.has(cat));

  // All possible vibes
  const allVibes = [
    'date night', 'casual', 'grunge', 'preppy', 'streetwear',
    'formal', 'athleisure', 'business casual', 'bohemian', 'minimalist'
  ];
  const existingVibes = new Set(closet.flatMap(item => item.vibe_tags));
  const missingVibes = allVibes.filter(vibe => !existingVibes.has(vibe));

  // Common colors
  const allColors = ['black', 'white', 'gray', 'blue', 'red', 'green', 'pink', 'brown', 'beige'];
  const existingColors = new Set(closet.flatMap(item => item.colors));
  const missingColors = allColors.filter(color => !existingColors.has(color));

  return {
    missing_categories: missingCategories,
    missing_vibes: missingVibes.slice(0, 5), // Top 5 missing vibes
    missing_colors: missingColors.slice(0, 5), // Top 5 missing colors
  };
}

/**
 * Find outfit combinations from closet
 */
export async function suggestOutfits(userId: string, vibe?: string): Promise<ClosetItem[][]> {
  const { data: closet } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId);

  if (!closet || closet.length === 0) return [];

  // Filter by vibe if specified
  let items = closet;
  if (vibe) {
    items = closet.filter(item => item.vibe_tags.includes(vibe));
  }

  // Group by category
  const tops = items.filter(i => i.category === 'top');
  const bottoms = items.filter(i => i.category === 'bottom');
  const shoes = items.filter(i => i.category === 'shoes');

  // Generate combinations (top + bottom + shoes)
  const outfits: ClosetItem[][] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        // Check if items work well together (matching vibes or complementary colors)
        const vibeMatch = top.vibe_tags.some(v => bottom.vibe_tags.includes(v));
        if (vibeMatch || outfits.length < 5) {
          outfits.push([top, bottom, shoe]);
        }
        if (outfits.length >= 10) break;
      }
      if (outfits.length >= 10) break;
    }
    if (outfits.length >= 10) break;
  }

  return outfits;
}