# fitz Backend Setup Guide

Complete guide for setting up the fitz backend with Supabase, OpenAI, and all API functionality.

## Overview

The backend includes:

- ✅ **Supabase Database** - PostgreSQL with Row Level Security
- ✅ **OpenAI Vision API** - AI-powered clothing analysis
- ✅ **Compatibility Algorithm** - Smart outfit matching
- ✅ **Full CRUD APIs** - Closet items, posts, profiles, likes, follows
- ✅ **TypeScript Types** - Full type safety

---

## Step 1: Set Up Supabase Database

### 1.1 Run the Database Schema

1. Go to your Supabase dashboard: [app.supabase.com](https://app.supabase.com)
2. Select your **treehacks** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase/schema.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

This will create:

- `profiles` - User profiles with social stats
- `closet_items` - Individual clothing items with AI analysis
- `posts` - OOTD posts
- `post_items` - Junction table linking posts to closet items
- `likes` - Post likes
- `follows` - User follow relationships
- `comments` - Post comments

### 1.2 Verify Tables Created

1. Click **Table Editor** in the left sidebar
2. You should see all 7 tables listed
3. Click on each to verify the structure

---

## Step 2: Get OpenAI API Key

### 2.1 Create OpenAI Account

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Name it "fitz" and copy the key

### 2.2 Add to Environment

Add to your `.env` file:

```env
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

**Cost Estimate:**

- GPT-4 Vision: ~$0.01-0.03 per image analysis
- Text Embeddings: ~$0.0001 per search query
- Budget: $5-10 for hackathon should be plenty!

---

## Step 3: Database Schema Overview

### Core Tables

#### `profiles`

Extends Supabase auth.users with social features:

```typescript
{
  id: UUID (references auth.users)
  username: string
  display_name: string
  avatar_url: string
  bio: string
  instagram_handle: string
  followers: number
  following: number
  streak: number (consecutive days posting)
  closet_utilization: percentage (items worn / total items)
}
```

#### `closet_items`

Individual clothing pieces with AI-extracted data:

```typescript
{
  id: UUID
  user_id: UUID
  image_url: string

  // Manual input
  brand: string
  category: 'top' | 'bottom' | 'shoes' | 'accessories' | 'outerwear'
  vibe_tags: ['date night', 'casual', 'grunge', ...]
  price_tier: 'budget' | 'mid' | 'luxury'

  // AI extracted
  colors: string[]
  silhouette: 'fitted' | 'oversized' | 'loose' | 'tailored' | 'relaxed'
  fabric: string
  subcategory: string (e.g., 'sweater', 'jeans')

  // Usage stats
  times_worn: number
  rating: 0-10
  last_worn_at: timestamp
}
```

#### `posts`

OOTD posts linking to closet items:

```typescript
{
  id: UUID
  user_id: UUID
  image_url: string
  caption: string
  likes_count: number (auto-updated via trigger)
  comments_count: number
}
```

---

## Step 4: API Functions Reference

All API functions are in `src/services/api/`:

### Closet API (`closet.ts`)

```typescript
// Get all items
getClosetItems(userId: string): Promise<ClosetItem[]>

// Get by category
getClosetItemsByCategory(userId: string, category: string): Promise<ClosetItem[]>

// Get top rated (for rankings page)
getTopRatedItems(userId: string, limit?: number): Promise<ClosetItem[]>

// Create with AI analysis
createClosetItem(request: CreateClosetItemRequest): Promise<ClosetItem>

// Update item
updateClosetItem(itemId: string, updates: UpdateClosetItemRequest): Promise<ClosetItem>

// Delete item
deleteClosetItem(itemId: string): Promise<void>

// Rate item (1-10)
rateItem(itemId: string, rating: number): Promise<ClosetItem>

// Mark as worn (updates times_worn count)
markItemAsWorn(itemId: string): Promise<ClosetItem>

// Calculate closet utilization percentage
calculateClosetUtilization(userId: string): Promise<number>
```

### Posts API (`posts.ts`)

```typescript
// Get feed (followed users + own posts)
getFeedPosts(limit?: number, offset?: number): Promise<Post[]>

// Get user's posts
getUserPosts(userId: string): Promise<Post[]>

// Create post (auto-marks items as worn)
createPost(request: CreatePostRequest): Promise<Post>

// Like/Unlike
likePost(postId: string): Promise<void>
unlikePost(postId: string): Promise<void>

// Comments
getPostComments(postId: string): Promise<Comment[]>
addComment(postId: string, content: string): Promise<Comment>
deleteComment(commentId: string, postId: string): Promise<void>
```

### Profile API (`profiles.ts`)

```typescript
// Get profiles
getCurrentProfile(): Promise<Profile | null>
getProfile(userId: string): Promise<Profile | null>

// Update profile
updateProfile(updates: Partial<Profile>): Promise<Profile>

// Follow system
followUser(userId: string): Promise<void>
unfollowUser(userId: string): Promise<void>
isFollowing(userId: string): Promise<boolean>
getFollowers(userId: string): Promise<Profile[]>
getFollowing(userId: string): Promise<Profile[]>

// Streak management
updateStreak(): Promise<number>

// Search
searchUsers(query: string): Promise<Profile[]>
```

### Compatibility API (`compatibility.ts`)

```typescript
// Calculate compatibility between post and user's closet
calculateCompatibilityScore(post: Post, userCloset: ClosetItem[]): Promise<CompatibilityScore>

// Calculate for all feed posts
calculateFeedCompatibility(posts: Post[]): Promise<Post[]>

// Get recommendations (missing items)
getRecommendedItems(userId: string): Promise<{
  missing_categories: string[];
  missing_vibes: string[];
  missing_colors: string[];
}>

// Suggest outfits from closet
suggestOutfits(userId: string, vibe?: string): Promise<ClosetItem[][]>
```

### OpenAI API (`openai.ts`)

```typescript
// Analyze single clothing item
analyzeClothingImage(imageUrl: string): Promise<AIImageAnalysis>

// Analyze full outfit
analyzeOutfitImage(imageUrl: string): Promise<{
  items: AIImageAnalysis[];
  overall_vibe: VibeTag[];
  description: string;
}>

// Generate embeddings for search
generateEmbedding(text: string): Promise<number[]>
```

---

## Step 5: Usage Examples

### Example: Adding a Closet Item with AI

```typescript
import { createClosetItem } from "./services/api/closet";

async function addItem() {
  const item = await createClosetItem({
    image_url: "https://your-image-url.com/sweater.jpg",
    brand: "Uniqlo",
    category: "top",
    vibe_tags: ["casual", "minimalist"],
    price_tier: "budget",
  });

  // AI automatically extracts:
  // - colors: ['gray', 'white']
  // - silhouette: 'oversized'
  // - fabric: 'cotton'
  // - subcategory: 'sweater'

  console.log("Item created:", item);
}
```

### Example: Creating a Post

```typescript
import { createPost } from "./services/api/posts";
import { markItemAsWorn } from "./services/api/closet";

async function createOOTD() {
  const post = await createPost({
    image_url: "https://outfit-photo.jpg",
    caption: "Cozy Sunday vibes ☕",
    item_ids: ["item-1-id", "item-2-id", "item-3-id"], // Links to closet items
  });

  // Automatically:
  // - Marks all 3 items as worn
  // - Updates times_worn count
  // - Updates last_worn_at timestamp

  console.log("Post created:", post);
}
```

### Example: Get Feed with Compatibility

```typescript
import { getFeedPosts } from "./services/api/posts";
import { calculateFeedCompatibility } from "./services/api/compatibility";

async function loadFeed() {
  const posts = await getFeedPosts(20);
  const postsWithScores = await calculateFeedCompatibility(posts);

  // Each post now has compatibility_score (0-100)
  postsWithScores.forEach((post) => {
    console.log(`Post ${post.id}: ${post.compatibility_score}% compatible`);
  });
}
```

### Example: Get Rankings

```typescript
import { getTopRatedItems } from "./services/api/closet";

async function showRankings() {
  const tops = await getTopRatedItems(userId, 10);

  // Display top 10 items sorted by rating
  tops.forEach((item, index) => {
    console.log(
      `#${index + 1}: ${item.brand} ${item.subcategory} - ${item.rating}/10`
    );
  });
}
```

---

## Step 6: Image Upload (Supabase Storage) — **Required for posting OOTDs**

If you get **"Bucket not found"** or **"Failed to create post"** when posting a photo, create this bucket first.

### 6.1 Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Name it exactly **`closet-images`**
4. Enable **Public bucket** (so post images can be displayed)
5. Click **Create bucket**

### 6.2 Make the bucket public (required for images to load in feed)

If post images show **"Image unavailable"** in the feed:

1. In Supabase go to **Storage** → click the **closet-images** bucket.
2. Open the bucket **⋮** menu (or settings) and ensure **"Public bucket"** is **ON**. If you created the bucket without this, turn it on so the `/object/public/` URLs work.
3. Ensure **.env** has **`VITE_SUPABASE_URL`** set to your project URL (e.g. `https://xxxx.supabase.co` with no trailing slash).

### 6.3 Storage policies (required for uploads)

If you get **"new row violates row-level security policy"** when posting a photo, run the storage policies:

1. In Supabase dashboard, go to **SQL Editor**
2. Open **`supabase/storage-policies.sql`** in this repo (or paste the SQL below)
3. Run it

```sql
-- Allow authenticated users to upload to closet-images
CREATE POLICY "Authenticated users can upload to closet-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'closet-images');

-- Allow public read so post images can be displayed
CREATE POLICY "Public read for closet-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'closet-images');
```

**Profile bucket (avatars)**  
Create a bucket named **profile**, set it to **Public**, then run the profile policies from **`supabase/storage-policies.sql`** (the same file also defines INSERT/SELECT for the `profile` bucket so profile pictures can be uploaded and displayed).

### 6.4 Upload Function

```typescript
import { supabase } from "./lib/supabase";

export async function uploadImage(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("closet-images")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("closet-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

---

## Step 7: Testing the Backend

### Test Checklist:

1. **Authentication** ✓

   - Sign up new user
   - Profile automatically created
   - Can update profile

2. **Closet Items** ✓

   - Upload image → AI analyzes it
   - View all items
   - Filter by category
   - Rate items
   - Mark as worn

3. **Posts** ✓

   - Create post with items
   - Items marked as worn
   - Like/unlike posts
   - Add comments
   - View feed

4. **Social** ✓

   - Follow/unfollow users
   - See follower counts update
   - Search users

5. **Compatibility** ✓
   - Posts show compatibility score
   - Score based on your closet

---

## Step 8: Deployment Considerations

### Environment Variables (Vercel)

When deploying to Vercel:

1. Add all env vars in Vercel dashboard:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`

2. Update Supabase allowed origins:
   - Go to Supabase → Settings → API
   - Add your Vercel URL to allowed origins

### Security Best Practices

1. **Row Level Security (RLS)** - ✅ Already enabled

   - Users can only edit their own items
   - All data is read-public (social app)

2. **API Keys** - ⚠️ OpenAI key in browser

   - For hackathon: OK to use client-side
   - For production: Move to serverless function

3. **Rate Limiting**
   - Supabase has built-in rate limits
   - Monitor OpenAI usage to avoid overages

---

## Troubleshooting

### "relation does not exist" error

- Run the `schema.sql` file in Supabase SQL Editor

### AI analysis fails

- Check OpenAI API key is correct
- Check you have credits in OpenAI account
- Image URL must be publicly accessible

### Can't upload images

- Make sure storage bucket is created and public
- Check file size limits

### Compatibility score always 0

- User needs items in their closet first
- Posts need associated items

---

## Next Steps

1. ✅ Database schema created
2. ✅ All API functions built
3. 🔄 Integrate with frontend pages
4. 🔄 Add search with Elasticsearch (optional)
5. 🔄 Deploy to Vercel

---

## API Quick Reference

| Feature       | File                   | Key Functions                                    |
| ------------- | ---------------------- | ------------------------------------------------ |
| Closet Items  | `api/closet.ts`        | `createClosetItem`, `getClosetItems`, `rateItem` |
| Posts/Feed    | `api/posts.ts`         | `getFeedPosts`, `createPost`, `likePost`         |
| Profiles      | `api/profiles.ts`      | `getCurrentProfile`, `followUser`                |
| Compatibility | `api/compatibility.ts` | `calculateCompatibilityScore`                    |
| AI Analysis   | `openai.ts`            | `analyzeClothingImage`                           |

---

**Ready to integrate with the frontend!** Check the examples above for how to call these APIs from your React components.
