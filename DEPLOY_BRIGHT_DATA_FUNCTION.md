# Deploy Bright Data Edge Function

The Edge Function needs to be deployed to Supabase before it will work.

## Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```
   This will open a browser for authentication.

3. **Link your project** (if not already linked):
   ```bash
   supabase link --project-ref your-project-ref
   ```
   You can find your project ref in your Supabase dashboard URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`

4. **Deploy the function:**
   ```bash
   supabase functions deploy bright-data-search
   ```

5. **Set the secrets:**
   ```bash
   supabase secrets set BRIGHT_DATA_API_KEY=726146be-e415-457a-a916-30dea6313ccc
   supabase secrets set BRIGHT_DATA_DATASET_ID=gd_lebec5ir293umvxh5g
   ```

## Option 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Name it: `bright-data-search`
5. Copy the contents of `supabase/functions/bright-data-search/index.ts` into the editor
6. Click **Deploy**
7. Go to **Secrets** tab and add:
   - `BRIGHT_DATA_API_KEY` = `726146be-e415-457a-a916-30dea6313ccc`
   - `BRIGHT_DATA_DATASET_ID` = `gd_lebec5ir293umvxh5g`

## Verify Deployment

After deploying, try searching again in the Curate tab. You should see:
- `[Bright Data Service] Trying Supabase client invoke...`
- `[Bright Data Service] Success via Supabase client`

If you still see 404 errors, the function may not be deployed correctly. Check the Supabase Dashboard → Edge Functions to verify it exists.

