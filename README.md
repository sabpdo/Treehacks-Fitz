# Fitz

**Fitz** is an AI-powered fashion social platform that makes it easy to find what to buy next and share outfits with friends. Built for TreeHacks.

Finding personalized and trusted clothing recommendations is hard amid a million options. Fitz combines your **closet**, **body fit profile**, and **social feed** to curate recommendations and shopping results tailored to you.

## Features

- **Capture** — Photo or upload an outfit; AI detects items and can match them to your closet. Link pieces to what you own, swap in similar items, then post to the feed.
- **Feed** — See what you and friends are wearing. Weather-aware **Today’s Look** is built from your closet and location. Posts show a **compatibility score** (how well the outfit matches your wardrobe). Like, comment, save, and **Shop the Look** on any post.
- **Body** — Add measurements or photos for a body-type and fit profile. Get suggested colors and silhouettes that flatter you; the app uses this to rank closet items and personalize suggestions.
- **Shop (AI Search)** — Search by vibe or occasion (e.g. “Paris trip”, “dinner date”). When you’re logged in, we use your wardrobe and body profile to turn that into a personalized shopping query and show real product results (via SerpAPI). “White shirt” shows curated items from our database; other searches return Google Shopping results with a short explanation of why they were picked for you.
- **Closet** — Digital wardrobe with categories, vibes, and AI pairing suggestions. Add items via photo; link to shopping products.

## Tech Stack

- **Frontend:** React 18, Vite 6, React Router 7
- **UI:** Tailwind CSS 4, Radix UI, Motion, Lucide icons
- **Backend / Data:** Supabase (auth, Postgres, storage)
- **AI:** OpenAI (outfit analysis, shopping-query generation, daily look copy)
- **Shopping search:** SerpAPI Google Shopping (proxied via `/api/shopping-search`)

## Prerequisites

- **Node.js** 18+
- **npm** 8+

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/sabpdo/treehacks.git
cd treehacks
npm install
```

If you hit package issues:

```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                 | Description                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL                                                                        |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key                                                                           |
| `VITE_OPENAI_API_KEY`    | OpenAI API key (for AI Search, outfit/body analysis)                                        |
| `VITE_SERPAPI_KEY`       | (Optional) SerpAPI key for Shop search. In production, set `SERPAPI_KEY` in Vercel instead. |

### 3. Run the app

```bash
npm run dev
```

App runs at **http://localhost:5173/**

### 4. Build for production

```bash
npm run build
```

Output is in `dist/`.

## Routes

| Path                                  | Description                         |
| ------------------------------------- | ----------------------------------- |
| `/`                                   | Home feed                           |
| `/capture`                            | Capture / create OOTD (OOTDCapture) |
| `/post`                               | Create post (OOTDPost)              |
| `/post/:postId`                       | Post detail                         |
| `/ootds`                              | All OOTDs                           |
| `/community`                          | Community                           |
| `/profile`                            | Your profile                        |
| `/profile/:userId`                    | User profile                        |
| `/search`                             | Shop / AI Search                    |
| `/closet`                             | Closet                              |
| `/analyze`                            | Body analysis                       |
| `/rerank`                             | ReRank                              |
| `/login`, `/signup`, `/confirm-email` | Auth                                |

## Scripts

- `npm run dev` — Development server with hot reload
- `npm run build` — Production build
- `npm run populate:shopping` — Populate shopping items (e.g. `npx tsx scripts/populate-shopping-items.ts data/your-products.json` with Supabase env set)

## Project structure

```
treehacks/
├── api/                    # Vercel serverless (e.g. shopping-search proxy)
├── src/
│   ├── app/
│   │   ├── components/     # Main UI (HomeFeed, OOTDCapture, Closet, AIOutfitGenerator, etc.)
│   │   ├── context/        # App store, auth
│   │   └── routes.tsx      # React Router config
│   ├── services/           # API clients, OpenAI, Supabase
│   ├── lib/                # Adapters, utils
│   └── types/              # DB / app types
├── scripts/                # e.g. populate-shopping-items
├── package.json
├── vite.config.ts
└── README.md
```

## Troubleshooting

### "Bucket not found" or "Failed to create post" when posting a photo

1. In Supabase: **Storage → New bucket** → name **`closet-images`**, set **Public** → Create.
2. If you see **"new row violates row-level security policy"**, run the SQL in **supabase/storage-policies.sql** in the Supabase SQL Editor (see **BACKEND_SETUP.md** if present).

### Post images show "Image unavailable"

1. **Storage** → **closet-images** → ensure the bucket is **Public**.
2. Check **.env** has **`VITE_SUPABASE_URL`** correct (no trailing slash).
3. In DevTools → Network, inspect the failing image request (403 = bucket/RLS; 404 = wrong path).

### Shop search fails or "SERPAPI_KEY not configured"

- **Local:** Set `VITE_SERPAPI_KEY` in `.env`; Vite proxy forwards to SerpAPI (see `vite.config.ts`).
- **Production (Vercel):** Set **`SERPAPI_KEY`** in Project Settings → Environment Variables. The `/api/shopping-search` serverless function uses it.

### Port already in use

Vite will try the next port; check the terminal for the URL.

## Contributing

Contributions are welcome. Open an issue or submit a pull request.

## License

TBD.
