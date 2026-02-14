import type {
  Category,
  Subcategory,
  TopSubcategory,
  BottomSubcategory,
  OuterwearSubcategory,
  DressSkirtSubcategory,
  ShoeSubcategory,
  BagSubcategory,
  AccessorySubcategory,
  Gender,
} from '../types/database';

// =====================================================
// CATEGORY DEFINITIONS
// =====================================================

export interface CategoryConfig {
  id: Category;
  label: string;
  icon: string; // emoji or icon name
  subcategories: readonly Subcategory[];
  genderRelevance: Gender[]; // Which genders this category is relevant for
  description: string;
}

export const CATEGORY_CONFIGS: Record<Category, CategoryConfig> = {
  tops: {
    id: 'tops',
    label: 'Tops',
    icon: '👕',
    subcategories: [
      't-shirt',
      'tank top',
      'blouse',
      'button-up shirt',
      'polo',
      'crop top',
      'tube top',
      'henley',
      'other top',
    ] as const,
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'T-shirts, blouses, tanks, and other upper body wear',
  },
  bottoms: {
    id: 'bottoms',
    label: 'Bottoms',
    icon: '👖',
    subcategories: [
      'jeans',
      'trousers',
      'chinos',
      'leggings',
      'joggers',
      'cargo pants',
      'shorts',
      'sweatpants',
      'other bottom',
    ] as const,
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'Pants, jeans, shorts, and other lower body wear',
  },
  outerwear: {
    id: 'outerwear',
    label: 'Sweaters & Jackets',
    icon: '🧥',
    subcategories: [
      'sweater',
      'cardigan',
      'hoodie',
      'sweatshirt',
      'blazer',
      'jacket',
      'coat',
      'vest',
      'other outerwear',
    ] as const,
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'Sweaters, hoodies, jackets, coats, and blazers',
  },
  dresses_skirts: {
    id: 'dresses_skirts',
    label: 'Dresses & Skirts',
    icon: '👗',
    subcategories: [
      'mini dress',
      'midi dress',
      'maxi dress',
      'mini skirt',
      'midi skirt',
      'maxi skirt',
      'other dress/skirt',
    ] as const,
    genderRelevance: ['women', 'unisex'],
    description: 'Dresses and skirts of all lengths',
  },
  shoes: {
    id: 'shoes',
    label: 'Shoes',
    icon: '👟',
    subcategories: [
      'sneakers',
      'boots',
      'sandals',
      'heels',
      'flats',
      'loafers',
      'slippers',
      'other shoes',
    ] as const,
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'All types of footwear',
  },
  bags: {
    id: 'bags',
    label: 'Bags',
    icon: '👜',
    subcategories: [
      'tote',
      'crossbody',
      'shoulder bag',
      'backpack',
      'clutch',
      'satchel',
      'messenger bag',
      'other bag',
    ] as const,
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'Handbags, backpacks, and other bags',
  },
  accessories: {
    id: 'accessories',
    label: 'Accessories',
    icon: '🕶️',
    subcategories: [
      'hat',
      'scarf',
      'belt',
      'sunglasses',
      'jewelry',
      'watch',
      'tie',
      'other accessory',
    ] as const,
    genderRelevance: ['women', 'men', 'unisex'],
    description: 'Hats, jewelry, scarves, and other accessories',
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
 * Get subcategories for a specific category
 */
export function getSubcategoriesForCategory(category: Category): readonly Subcategory[] {
  return CATEGORY_CONFIGS[category].subcategories;
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
 * Format subcategory for display (capitalize, remove hyphens)
 */
export function formatSubcategory(subcategory: string): string {
  return subcategory
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get primary categories (for outfit building)
 * Returns categories that form the core of an outfit
 */
export function getPrimaryCategories(gender: Gender): Category[] {
  if (gender === 'men') {
    return ['tops', 'bottoms', 'outerwear', 'shoes'];
  } else if (gender === 'women') {
    return ['tops', 'bottoms', 'outerwear', 'dresses_skirts', 'shoes'];
  }
  // unisex
  return ['tops', 'bottoms', 'outerwear', 'dresses_skirts', 'shoes'];
}

/**
 * Get accessory categories (optional outfit additions)
 */
export function getAccessoryCategories(): Category[] {
  return ['bags', 'accessories'];
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
    'tops',
    'bottoms',
    'outerwear',
    'dresses_skirts',
    'shoes',
    'bags',
    'accessories',
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