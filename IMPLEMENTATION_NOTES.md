# Implementation Notes – fitz UI (Frontend + Mock)

## Component structure

- **Root** (`Root.tsx`) – Layout with bottom nav (Feed, Community, AI, Closet, Profile) and floating “Post” on home.
- **Feed components** (`feed/`)
  - `PostCard` – Compact or full; image, compatibility %, name, timestamp; links to `/post/:postId`.
  - `PostGrid` – Grid of `PostCard`s with optional empty state.
  - `UserCard` – Avatar, name, handle, bio, vibe badges, Follow/Unfollow, optional 2×2 OOTD peek.
  - `RankingList` – Grouped ranked staples (thumbnail, brand, category, rating, vibe tag, price tier).
  - `Badge` – Small pill (default / muted / accent).
  - `ActionRow` – Like, Save, Comment, Repost with counts.
  - `CommentList` – List of comments or empty message.
- **Pages**
  - **HomeFeed** – “Friends Today” grid (3–6 cards), “View all OOTDs” → `/ootds`, Fits That Align, Top Ranked, AI suggestion.
  - **AllOOTDs** – Filters: Following | Trending | Saved; sort: Recent / Most liked; grid of posts.
  - **Community** – Search “Search people”; tabs Following / Followers / Discover; Discover = user cards with 2×2 OOTD peek.
  - **Profile** – Works for `/profile` (you) and `/profile/:userId` (others). Header: avatar, name, handle, follower/following, Follow/Unfollow (others). Streak + closet utilization. Tabs: OOTDs | Rankings | Saved. OOTDs = grid; Rankings = Beli-style grouped list; Saved = saved posts grid.
  - **PostDetail** – Large image, poster + time, compatibility + AI insight, ActionRow, comments list, add-comment input, “Liked by X friends”.
  - **OOTDPost** – Preset gallery + optional file upload, caption, vibe selector (Date night / Casual / Work / Grunge / Cafe study). “Post” adds to store and navigates to feed.

Shared UI from `ui/`: `Tabs`, `Dialog`, `Button`, `Input`, `Textarea`, `Avatar`, `Skeleton`, etc.

---

## How mock state updates work

- **AppStore** (`context/AppStore.tsx`) holds: `posts`, `comments`, `savedPostIds`, `followingUserIds`. All updates are in-memory (no API).
  - **Likes** – `toggleLike(postId)` updates the post’s `likedByUserIds` and `likeCount` in the `posts` array.
  - **Saves** – `toggleSave(postId)` toggles `savedPostIds` and updates the post’s `savedCount`.
  - **Follows** – `toggleFollow(userId)` toggles `followingUserIds`.
  - **Comments** – `addComment(postId, text)` appends a new comment and increments the post’s `commentCount`.
  - **New post** – `addPost(post)` prepends an `OOTDPost` to `posts` (from “Post OOTD” with preset gallery + caption + vibe).
- **Data** – `mockData.ts`: `mockUsers`, `mockOOTDPosts`, `mockComments`, `presetGalleryImages`, `rankedItems`, `currentUserProfile`. `formatPostTime(iso)` for “Today 6:32 PM”–style timestamps.

---

## Where to add the backend (notes only)

- **Auth** – Replace `CURRENT_USER_ID` and “me” with a real session (e.g. JWT + `/me` or auth context). Use in `AppStore` and any “current user” checks.
- **Users** – Replace `mockUsers` with API: e.g. `GET /users`, `GET /users/:id`, `GET /users/search?q=`, `POST /users/:id/follow`, `DELETE /users/:id/follow`. Use in Community and Profile.
- **Posts** – Replace in-memory `posts` with: `GET /posts` (feed), `GET /posts?filter=following|trending|saved&sort=recent|most_liked`, `GET /posts/:id`, `POST /posts` (create OOTD), `PATCH /posts/:id/like`, `PATCH /posts/:id/save`. Use in HomeFeed, AllOOTDs, PostDetail, OOTDPost, Profile.
- **Comments** – Replace `comments` with: `GET /posts/:id/comments`, `POST /posts/:id/comments`. Use in PostDetail.
- **Saved / following** – Either part of user resource or: `GET /me/saved`, `GET /me/following`, and use for filters and Profile “Saved” tab.
- **Rankings** – Replace `rankedItems` with e.g. `GET /users/:id/rankings` or `GET /rankings` for the Rankings tab.
- **Streak / closet utilization** – Replace static values with e.g. `GET /me/stats` or fields on user profile.

Keep the same component and route structure; swap `useAppStore()` and mock data for API hooks (e.g. React Query) and API client calls.

---

## AI analysis and segmentation (outfit detection)

To get **real** outfit analysis (detect tops, bottoms, shoes, etc. from a photo) instead of mock data:

1. **OpenAI API key**  
   Add to `.env` in the project root:

   ```env
   VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
   ```

   Create a key at [platform.openai.com](https://platform.openai.com) → API Keys. Restart the dev server after changing `.env`.

2. **Where it runs**

   - **OOTDPost** (Post OOTD screen): Upload image → “Analyze & tag items” calls `createItemsFromOutfitPhoto()` → OpenAI Vision analyzes the image and creates closet items; then the ranking flow runs.
   - **OOTDCapture** (camera/upload from home, “tag your items”): After capture or upload, the **scanning** step tries in order:
     1. **Segmentation** (Edge Function): calls `segment-outfit-image`. Two modes:
        - **OpenAI-only (no Replicate cost):** Set **OPENAI_API_KEY** in Edge Function Secrets only. One Vision call returns items (category + description); no per-item crops. Free aside from OpenAI usage.
        - **Replicate (paid):** Set **REPLICATE_API_TOKEN**; mask-clothing produces crops, uploads to Storage, optional **OPENAI_API_KEY** for labels. See [Replicate billing](https://replicate.com/account/billing#billing).
     2. **OpenAI Vision** (if segmentation fails or is not configured): frontend `analyzeOutfitImage()` returns a list of items (no pixel positions).
     3. **Mock items** if both fail or are unconfigured.

3. **Enabling segmentation (tag your items)**

   - Deploy the Edge Function: `supabase functions deploy segment-outfit-image`
   - **Free path:** In Supabase Dashboard → Edge Functions → Secrets, set **OPENAI_API_KEY** only. Leave **REPLICATE_API_TOKEN** unset. The function will use one OpenAI Vision call and return segments (same image as “crop” for each item).
   - **Replicate path (costs money):** Set **REPLICATE_API_TOKEN** (from [replicate.com](https://replicate.com) → API tokens). Optional: **OPENAI_API_KEY** to label each segment. Sign-in is optional; anonymous requests use `segment-temp/anonymous/`.

4. **Backend**  
   Analysis runs in the browser via `src/services/openai.ts` (GPT-4 Vision) when not using segmentation. Segmentation runs only in the Edge Function so the Replicate key stays server-side. See **BACKEND_SETUP.md** for full backend setup (Supabase, schema, storage, etc.).
