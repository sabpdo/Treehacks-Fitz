# Bright Data Setup Guide

## Overview

Bright Data API calls are proxied through a Supabase Edge Function to avoid CORS issues. The Edge Function makes server-side requests to Bright Data.

## Step 1: Deploy the Edge Function

1. **Deploy the Bright Data search function:**
   ```bash
   supabase functions deploy bright-data-search
   ```

2. **If you haven't linked your project yet:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

## Step 2: Set Edge Function Secrets

The Edge Function needs your Bright Data credentials. Set them in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **Secrets**
3. Add these secrets:
   - `BRIGHT_DATA_API_KEY` = your Bright Data API key
   - `BRIGHT_DATA_DATASET_ID` = your dataset ID (e.g., `gd_XXXXXXXXXXXX`)

**Or use the CLI:**
```bash
supabase secrets set BRIGHT_DATA_API_KEY=your_api_key_here
supabase secrets set BRIGHT_DATA_DATASET_ID=gd_XXXXXXXXXXXX
```

## Step 3: Get Your Bright Data Credentials

1. Go to [brightdata.com](https://brightdata.com)
2. Sign in to your account
3. Navigate to your dataset
4. Copy your **API Key** and **Dataset ID**

## Step 4: Verify It's Working

1. **Restart your dev server** (if running):
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   # or
   pnpm dev
   ```

2. **Check the browser console** - you should see:
   - `[Shopping Service] Bright Data is ENABLED`
   - `[Shopping Service] Using Edge Function proxy to avoid CORS`
   - `[Shopping Service] Calling Bright Data via Edge Function`

3. **Test the search:**
   - Go to the **Curate** tab
   - Type a search query like "white shirt"
   - You should see real products from Bright Data

## Troubleshooting

### Edge Function not found (404)
- Make sure you've deployed: `supabase functions deploy bright-data-search`
- Check that the function name matches exactly

### "Bright Data credentials not configured" error
- Verify secrets are set in Supabase Dashboard → Edge Functions → Secrets
- Or set via CLI: `supabase secrets list` to verify

### Still seeing CORS errors
- The Edge Function should handle CORS. If you see CORS errors, check:
  - The Edge Function is deployed correctly
  - The Vite proxy is configured (check `vite.config.ts`)
  - You're using the dev server (not a static build)

### Using mock data
- Check console logs to see why Bright Data is disabled
- Verify Edge Function secrets are set correctly
- Check Edge Function logs in Supabase Dashboard

