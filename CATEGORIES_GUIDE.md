# ClosetRank Category System

Simple, intuitive categorization for organizing your closet.

## Categories

### 1. **Shirts** 👕
All upper body clothing
- T-shirts, tank tops
- Blouses, button-ups
- Crop tops
- Polos, henleys

### 2. **Pants** 👖
All lower body clothing
- Jeans, trousers
- Shorts, leggings
- Joggers, sweatpants
- Chinos, cargo pants

### 3. **Skirts/Dresses** 👗
**Hidden for men's profiles**
- All dresses (mini, midi, maxi)
- All skirts

### 4. **Jackets/Outerwear** 🧥
Layering pieces
- Sweaters, cardigans
- Hoodies, sweatshirts
- Jackets, coats
- Blazers, vests

### 5. **Shoes** 👟
All footwear
- Sneakers, boots
- Heels, flats
- Sandals, loafers

### 6. **Bags** 👜
All bags
- Handbags, totes
- Backpacks
- Crossbody, messenger bags

---

## Occasions (Vibe Tags)

Instead of complex style tags, we use simple occasions:

- **Date Night** - Going out, dressy, elegant
- **Casual** - Everyday wear, relaxed
- **Workout** - Athletic, gym, activewear
- **Office** - Professional, business attire

---

## Gender Handling

Users can set their gender preference:
- **Women** - See all 6 categories
- **Men** - "Skirts/Dresses" category is hidden (5 categories)
- **Unisex** - See all 6 categories (default)

---

## How It Works

### Adding Items
1. Upload photo of clothing item
2. AI automatically categorizes it
3. AI assigns occasion tags (date night, casual, workout, office)

Example AI response:
```json
{
  "category": "shirts",
  "subcategory": "t-shirt",
  "colors": ["black", "white"],
  "silhouette": "fitted",
  "fabric": "cotton",
  "vibe_tags": ["casual"],
  "description": "Black fitted cotton t-shirt"
}
```

### Viewing Your Closet
Filter by:
- **Category** - Show all shirts, pants, etc.
- **Occasion** - Show all date night outfits, workout clothes, etc.
- **Combo** - "Casual shirts", "Office pants", etc.

### Rankings
Items ranked within category:
```
👕 Shirts
1. White Uniqlo Tee - 9.4/10
2. Black H&M Tank - 9.2/10

👖 Pants
1. Levi's 501 Jeans - 9.8/10
2. Aritzia Trousers - 9.5/10
```

---

## Usage in Code

```typescript
import { getRelevantCategories, getCategoryIcon } from '@/lib/categories';

// Get categories for user
const userGender = userProfile?.gender || 'unisex';
const categories = getRelevantCategories(userGender);

// Display category filters
categories.map(cat => (
  <button>
    {cat.icon} {cat.label}
  </button>
))
```

### For Women
```
👕 Shirts | 👖 Pants | 👗 Skirts/Dresses | 🧥 Jackets/Outerwear | 👟 Shoes | 👜 Bags
```

### For Men
```
👕 Shirts | 👖 Pants | 🧥 Jackets/Outerwear | 👟 Shoes | 👜 Bags
```

---

## Database Schema

```sql
-- Categories
category TEXT NOT NULL -- 'shirts', 'pants', 'skirts_dresses', 'jackets_outerwear', 'shoes', 'bags'

-- Occasions
vibe_tags TEXT[] -- ['date night', 'casual', 'workout', 'office']

-- Gender (in profiles table)
gender TEXT -- 'women', 'men', 'unisex'
```

---

## Key Points

✅ **Simple** - 6 categories total (5 for men)
✅ **Intuitive** - "Shirts" not "Tops", "Pants" not "Bottoms"
✅ **Occasion-based** - Date night, casual, workout, office
✅ **Gender-aware** - Hide skirts/dresses for men
✅ **Inclusive** - Jackets category includes sweaters

---

## Examples

### Women's Closet
- **Shirts**: White blouse, black t-shirt, crop top
- **Pants**: Blue jeans, black leggings, tan trousers
- **Skirts/Dresses**: Little black dress, denim mini skirt
- **Jackets/Outerwear**: Gray cardigan, black leather jacket, wool coat
- **Shoes**: White sneakers, black heels, brown boots
- **Bags**: Leather tote, crossbody purse

### Men's Closet
- **Shirts**: White button-up, gray t-shirt, polo
- **Pants**: Dark jeans, khaki chinos, athletic shorts
- **Jackets/Outerwear**: Navy blazer, hoodie, puffer jacket
- **Shoes**: White sneakers, brown loafers, running shoes
- **Bags**: Black backpack, messenger bag