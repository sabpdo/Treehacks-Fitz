# ClosetRank Category System

Complete guide to the clothing categorization system with gender-specific handling.

## Overview

The category system organizes clothing items into 7 main categories with detailed subcategories. It supports gender preferences to show/hide relevant categories (e.g., dresses/skirts for women, accessories like ties for men).

---

## Main Categories

### 1. **Tops** 👕
**Gender:** All (women, men, unisex)
**Subcategories:**
- t-shirt
- tank top
- blouse
- button-up shirt
- polo
- crop top
- tube top
- henley
- other top

**Examples:** T-shirts, tank tops, blouses, button-ups, crop tops

---

### 2. **Bottoms** 👖
**Gender:** All (women, men, unisex)
**Subcategories:**
- jeans
- trousers
- chinos
- leggings
- joggers
- cargo pants
- shorts
- sweatpants
- other bottom

**Examples:** Jeans, pants, shorts, leggings, joggers

---

### 3. **Sweaters & Jackets** 🧥 *(Outerwear)*
**Gender:** All (women, men, unisex)
**Subcategories:**
- sweater
- cardigan
- hoodie
- sweatshirt
- blazer
- jacket
- coat
- vest
- other outerwear

**Examples:** Sweaters, hoodies, jackets, coats, blazers, cardigans

**Note:** This category includes both sweaters and jackets/coats as they're both layering pieces.

---

### 4. **Dresses & Skirts** 👗
**Gender:** Women, Unisex
**Visibility:** **Hidden for men's profiles**

**Subcategories:**
- mini dress
- midi dress
- maxi dress
- mini skirt
- midi skirt
- maxi skirt
- other dress/skirt

**Examples:** All types of dresses and skirts

---

### 5. **Shoes** 👟
**Gender:** All (women, men, unisex)
**Subcategories:**
- sneakers
- boots
- sandals
- heels
- flats
- loafers
- slippers
- other shoes

**Examples:** All footwear

---

### 6. **Bags** 👜
**Gender:** All (women, men, unisex)
**Subcategories:**
- tote
- crossbody
- shoulder bag
- backpack
- clutch
- satchel
- messenger bag
- other bag

**Examples:** Handbags, backpacks, totes, crossbody bags

---

### 7. **Accessories** 🕶️
**Gender:** All (women, men, unisex)
**Subcategories:**
- hat
- scarf
- belt
- sunglasses
- jewelry
- watch
- tie
- other accessory

**Examples:** Hats, scarves, jewelry, belts, sunglasses, ties

---

## Gender-Specific Handling

### Setting Gender Preference

Users can set their gender preference in their profile:
- `women` - Shows all categories
- `men` - Hides "Dresses & Skirts" category
- `unisex` - Shows all categories (default)

### Database Field

```typescript
interface Profile {
  gender: 'women' | 'men' | 'unisex' | null;
  // ... other fields
}
```

### Usage in Code

```typescript
import { getRelevantCategories, isCategoryVisibleForGender } from '@/lib/categories';

// Get categories for a user
const userGender = userProfile?.gender || 'unisex';
const categories = getRelevantCategories(userGender);

// Check if specific category should be shown
const showDresses = isCategoryVisibleForGender('dresses_skirts', userGender);
// Returns: false for men, true for women/unisex
```

---

## API Functions

### Category Utilities

```typescript
// Get all categories for a gender
getCategoriesForGender(gender: Gender): CategoryConfig[]

// Get all categories (unisex)
getAllCategories(): CategoryConfig[]

// Get category configuration
getCategoryConfig(category: Category): CategoryConfig

// Get subcategories for a category
getSubcategoriesForCategory(category: Category): Subcategory[]

// Check if category is visible
isCategoryVisibleForGender(category: Category, gender: Gender): boolean

// Format subcategory for display
formatSubcategory(subcategory: string): string
// Example: "mini-dress" → "Mini Dress"

// Group items by category
groupItemsByCategory(items: ClosetItem[]): Record<Category, ClosetItem[]>

// Sort categories in display order
sortCategoriesByOrder(categories: Category[]): Category[]
```

---

## How It Works in the App

### 1. **Adding Items to Closet**

When users add clothing items:
1. AI analyzes the image using GPT-4 Vision
2. AI determines the appropriate category and subcategory
3. Item is categorized automatically

Example AI response:
```json
{
  "category": "tops",
  "subcategory": "t-shirt",
  "colors": ["black", "white"],
  "silhouette": "fitted",
  "fabric": "cotton",
  "vibe_tags": ["casual", "minimalist"]
}
```

### 2. **Viewing Closet**

Items can be filtered/grouped by:
- **Category tabs:** Tops, Bottoms, Outerwear, etc.
- **Subcategory filters:** Within each category
- **Gender preference:** Some categories hidden based on user's gender

### 3. **Rankings Page**

Items are ranked within their category:
- **Tops Rankings:** Best t-shirts, blouses, etc.
- **Bottoms Rankings:** Best jeans, pants, etc.
- **Outerwear Rankings:** Best sweaters, jackets, etc.

Example display:
```
👕 Tops
  1. White Uniqlo Tee - 9.4/10
  2. Black H&M Tank - 9.2/10

👖 Bottoms
  1. Levi's 501 Jeans - 9.8/10
  2. Aritzia Trousers - 9.5/10
```

### 4. **Search & Filters**

Users can search by:
- Category: "Show me all my tops"
- Subcategory: "Show me all my sweaters"
- Combined: "Show me casual sweaters"

---

## UI Components

### Category Filter Component

```typescript
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories';

function CategoryFilter({ gender }: { gender: Gender }) {
  const categories = getRelevantCategories(gender);

  return (
    <div className="flex gap-2">
      {categories.map((cat) => (
        <button key={cat.id} className="category-btn">
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### Example Output for Women:
```
👕 Tops | 👖 Bottoms | 🧥 Sweaters & Jackets | 👗 Dresses & Skirts | 👟 Shoes | 👜 Bags | 🕶️ Accessories
```

### Example Output for Men:
```
👕 Tops | 👖 Bottoms | 🧥 Sweaters & Jackets | 👟 Shoes | 👜 Bags | 🕶️ Accessories
```
*(Dresses & Skirts hidden)*

---

## Migration Guide

If you have existing items with old categories, map them as follows:

| Old Category | New Category | Example Subcategory |
|--------------|--------------|-------------------|
| `top` | `tops` | t-shirt, blouse |
| `bottom` | `bottoms` | jeans, shorts |
| `outerwear` | `outerwear` | jacket, sweater |
| `accessories` | Split into `bags` or `accessories` | bag → bags, belt → accessories |
| `shoes` | `shoes` | sneakers, boots |

**Note:** "Dresses" were previously in "top" or custom category, now they go in `dresses_skirts`.

---

## Database Schema Updates

Add gender field to profiles table:

```sql
ALTER TABLE profiles
ADD COLUMN gender TEXT; -- 'women', 'men', 'unisex'
```

Update category field in closet_items table comments:

```sql
COMMENT ON COLUMN closet_items.category IS
'Category: tops, bottoms, outerwear, dresses_skirts, shoes, bags, accessories';
```

---

## Best Practices

1. **Default to Unisex:** If user hasn't set gender, show all categories
2. **Don't Over-Filter:** Only hide truly gender-specific categories (currently just dresses/skirts for men)
3. **Flexible Subcategories:** Use "other [category]" for items that don't fit standard subcategories
4. **Consistent Naming:** Always use plural form: "tops" not "top", "bottoms" not "bottom"
5. **Sweaters in Outerwear:** Sweaters, cardigans, hoodies all go in "outerwear" category

---

## Future Enhancements

Potential additions:
- **Swimwear** category
- **Sleepwear** category
- **Activewear** as separate from athleisure
- **Formal wear** subcategories (tuxedo, evening gown, etc.)
- User-custom categories

---

## Support

For questions or issues with categorization:
1. Check AI analysis is returning correct categories
2. Verify gender preference is set correctly
3. Ensure using latest category constants from `src/lib/categories.ts`
4. Review database schema matches TypeScript types