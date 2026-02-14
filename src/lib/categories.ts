import type {
  Category,
  Gender,
} from '../types/database';

// =====================================================
// CATEGORY DEFINITIONS
// =====================================================

export interface CategoryConfig {
  id: Category;
  label: string;
  icon: string; // emoji
  genderRelevance: Gender[]; // Which genders this category is relevant for
  description: string;
}

export const CATEGORY_CONFIGS: Record<Category, CategoryConfig> = {
  shirts: {
    id: 'shirts',
    label: 'Shirts',
    icon: '👕',
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'All shirts, tops, t-shirts, blouses, button-ups',
  },
  pants: {
    id: 'pants',
    label: 'Pants',
    icon: '👖',
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'Pants, jeans, trousers, shorts, leggings',
  },
  skirts_dresses: {
    id: 'skirts_dresses',
    label: 'Skirts/Dresses',
    icon: '👗',
    genderRelevance: ['women', 'unisex'],
    description: 'Dresses and skirts',
  },
  jackets_outerwear: {
    id: 'jackets_outerwear',
    label: 'Jackets/Outerwear',
    icon: '🧥',
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'Jackets, coats, sweaters, hoodies, blazers',
  },
  shoes: {
    id: 'shoes',
    label: 'Shoes',
    icon: '👟',
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'All footwear',
  },
  bags: {
    id: 'bags',
    label: 'Bags',
    icon: '👜',
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'Handbags, backpacks, totes',
  },
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get categories relevant for a specific gender
 */
export function getCategoriesForGender(gender: Gender): CategoryConfig[] {
  return Object.values(CATEGORY_CONFIGS).filter((config) =>
    config.genderRelevance.includes(gender)
  );
}

/**
 * Get all categories (for unisex/all users)
 */
export function getAllCategories(): CategoryConfig[] {
  return Object.values(CATEGORY_CONFIGS);
}

/**
 * Get category config by ID
 */
export function getCategoryConfig(category: Category): CategoryConfig {
  return CATEGORY_CONFIGS[category];
}

/**
 * Check if a category should be visible for a gender
 */
export function isCategoryVisibleForGender(category: Category, gender: Gender): boolean {
  return CATEGORY_CONFIGS[category].genderRelevance.includes(gender);
}

/**
 * Get category label (display name)
 */
export function getCategoryLabel(category: Category): string {
  return CATEGORY_CONFIGS[category].label;
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: Category): string {
  return CATEGORY_CONFIGS[category].icon;
}

/**
 * Get primary categories (for outfit building)
 * Returns categories that form the core of an outfit
 */
export function getPrimaryCategories(gender: Gender): Category[] {
  if (gender === 'men') {
    return ['shirts', 'pants', 'jackets_outerwear', 'shoes'];
  } else if (gender === 'women') {
    return ['shirts', 'pants', 'jackets_outerwear', 'skirts_dresses', 'shoes'];
  }
  // unisex
  return ['shirts', 'pants', 'jackets_outerwear', 'skirts_dresses', 'shoes'];
}

/**
 * Get accessory categories (optional outfit additions)
 */
export function getAccessoryCategories(): Category[] {
  return ['bags'];
}

/**
 * Group items by category
 */
export function groupItemsByCategory<T extends { category: Category }>(
  items: T[]
): Record<Category, T[]> {
  const grouped = {} as Record<Category, T[]>;

  // Initialize all categories
  Object.keys(CATEGORY_CONFIGS).forEach((cat) => {
    grouped[cat as Category] = [];
  });

  // Group items
  items.forEach((item) => {
    grouped[item.category].push(item);
  });

  return grouped;
}

/**
 * Sort categories by display order
 */
export function sortCategoriesByOrder(categories: Category[]): Category[] {
  const order: Category[] = [
    'shirts',
    'pants',
    'skirts_dresses',
    'jackets_outerwear',
    'shoes',
    'bags',
  ];

  return categories.sort((a, b) => {
    return order.indexOf(a) - order.indexOf(b);
  });
}

// =====================================================
// GENDER-SPECIFIC HELPERS
// =====================================================

/**
 * Get user preference for gender (for filtering categories)
 * This would typically come from user profile, defaulting to 'unisex'
 */
export function getUserGenderPreference(userProfile?: { gender?: Gender }): Gender {
  return userProfile?.gender || 'unisex';
}

/**
 * Filter and sort categories based on user's gender preference
 */
export function getRelevantCategories(gender: Gender = 'unisex'): CategoryConfig[] {
  const categories = getCategoriesForGender(gender);
  const sortedIds = sortCategoriesByOrder(categories.map((c) => c.id));
  return sortedIds.map((id) => CATEGORY_CONFIGS[id]);
}