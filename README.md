# TreeHacks

A modern React web application built for the TreeHacks hackathon featuring outfit tracking, AI-powered outfit generation, and social sharing capabilities.

## Overview

ClosetRank is a fashion and outfit management application that allows users to:

- Track and share daily outfits (OOTD - Outfit of the Day)
- Generate AI-powered outfit recommendations
- Manage a digital closet
- Browse a social feed of outfits
- View and manage user profiles

## Tech Stack

- **Frontend Framework:** React 18.3.1
- **Build Tool:** Vite 6.3.5
- **Routing:** React Router 7.13.0
- **UI Components:**
  - Material-UI (MUI) 7.3.5
  - Radix UI primitives
  - Tailwind CSS 4.1.12
- **Styling:** Emotion, Tailwind CSS
- **Additional Libraries:**
  - Lucide React (icons)
  - Recharts (data visualization)
  - React Hook Form (form management)
  - Date-fns (date utilities)
  - And more...

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher (comes with Node.js)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/sabpdo/treehacks.git
cd treehacks
```

### 2. Install Dependencies

```bash
npm install
```

Note: If you encounter issues with corrupted packages, run:

```bash
rm -rf node_modules package-lock.json
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

The application will start at **http://localhost:5173/**

### 4. Build for Production

```bash
npm run build
```

This will create an optimized production build in the `dist/` directory.

## Project Structure

```
treehacks/
├── src/
│   ├── app/
│   │   ├── components/     # React components
│   │   │   ├── Root.tsx
│   │   │   ├── HomeFeed.tsx
│   │   │   ├── OOTDPost.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── AIOutfitGenerator.tsx
│   │   │   └── Closet.tsx
│   │   └── routes.ts       # Application routing
│   └── ...
├── package.json            # Project dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── README.md               # This file
```

## Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the application for production

## Configuration

### Environment Setup

The project uses Vite for development and building. You can customize the configuration in `vite.config.ts`.

### Styling

This project uses Tailwind CSS for utility-first styling. Customize the theme in `tailwind.config.js`.

### Routing

Routes are defined in `src/app/routes.ts`. The application uses React Router with the following routes:

- `/` - Home feed
- `/post` - Create OOTD post
- `/profile` - User profile
- `/ai-generator` - AI outfit generator
- `/closet` - Digital closet management

## Troubleshooting

### "Bucket not found" or "Failed to create post" when posting a photo

1. Create the bucket: **Supabase Dashboard → Storage → New bucket** → name **`closet-images`**, set **Public** → Create.
2. If you see **"new row violates row-level security policy"**, run the SQL in **supabase/storage-policies.sql** in the Supabase SQL Editor (see **BACKEND_SETUP.md** Step 6.3).

### Post images show "Image unavailable" in the feed

1. In Supabase **Storage** → open the **closet-images** bucket → ensure **Public bucket** is **ON** (bucket settings / ⋮ menu).
2. Check **.env** has **`VITE_SUPABASE_URL`** set correctly (e.g. `https://your-project.supabase.co`, no trailing slash).
3. Open DevTools → Console; when an image fails you’ll see the URL that was tried. In Network tab, open that request to see the status (403 = bucket not public or RLS; 404 = wrong path).

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port. Check the terminal output for the actual URL.

### Module Resolution Errors

Make sure you're importing from `react-router-dom` (not `react-router`) for web applications.

### Package Installation Issues

If you see errors related to missing files in `node_modules`, clean install:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

License information will be added.

## Contact

For questions or feedback, please open an issue in this repository.
