# Authentication Setup Guide

This guide will help you set up authentication for your ClosetRank app using Supabase.

## Overview

The app now includes:
- ✅ Email/Password authentication
- ✅ Google OAuth authentication
- ✅ Protected routes (requires login to access)
- ✅ Login and Sign Up pages
- ✅ Logout functionality in Profile page

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details:
   - Project name: `treehacks` (or your preferred name)
   - Database password: (create a strong password - save it!)
   - Region: Choose closest to your users
4. Click "Create new project" and wait for it to initialize (~2 minutes)

## Step 2: Get Your Supabase Credentials

1. Once your project is ready, go to **Settings** (gear icon in sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL** - Copy this
   - **anon public** key - Copy this (under "Project API keys")

## Step 3: Configure Environment Variables

1. In your project root, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # Optional: Add OpenAI key for AI features
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **IMPORTANT:** Never commit `.env` to git! It's already in `.gitignore`.

## Step 4: Enable Google OAuth (Optional but Recommended)

1. In your Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Google** in the list and click to expand
3. Toggle "Enable Sign in with Google" to ON
4. You'll need to create Google OAuth credentials:

   ### Creating Google OAuth Credentials:

   a. Go to [Google Cloud Console](https://console.cloud.google.com/)

   b. Create a new project or select existing one

   c. Go to **APIs & Services** > **Credentials**

   d. Click **Create Credentials** > **OAuth 2.0 Client ID**

   e. Configure the OAuth consent screen if prompted:
      - User Type: External
      - App name: ClosetRank
      - User support email: your email
      - Developer contact: your email

   f. Create OAuth Client ID:
      - Application type: Web application
      - Name: ClosetRank Web Client
      - Authorized JavaScript origins:
        - `http://localhost:5173` (for development)
        - Your production URL (when deployed)
      - Authorized redirect URIs:
        - Copy the **Callback URL** from Supabase and paste it here
        - It looks like: `https://your-project.supabase.co/auth/v1/callback`

   g. Copy the **Client ID** and **Client Secret**

   h. Paste them back into Supabase Google Provider settings

   i. Click **Save**

## Step 5: Configure Email Settings (Optional)

By default, Supabase sends email confirmations for new signups. You can:

1. **Use Supabase's default email** (rate-limited, development only):
   - Go to **Authentication** > **Email Templates**
   - Customize the email templates if desired

2. **Use your own SMTP provider** (for production):
   - Go to **Settings** > **Auth** > **SMTP Settings**
   - Configure your email provider (SendGrid, AWS SES, etc.)

## Step 6: Test Authentication

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:5173](http://localhost:5173)

3. You should be redirected to the login page

4. Test the authentication flows:
   - Click "Sign up" and create an account with email/password
   - Check your email for verification (if email confirmation is enabled)
   - Try logging in with email/password
   - Try "Continue with Google" if you enabled Google OAuth
   - Once logged in, you should see the home feed
   - Click the logout button in the Profile page to sign out

## Routes

- `/login` - Login page
- `/signup` - Sign up page
- `/` - Home feed (protected)
- `/post` - Create OOTD post (protected)
- `/profile` - User profile with logout button (protected)
- `/ai-generator` - AI outfit generator (protected)
- `/closet` - Digital closet (protected)

## Database Setup (For storing user data)

If you want to store additional user profile information:

1. Go to **Table Editor** in Supabase
2. Create a `profiles` table:

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create function to handle new user creation
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'displayName');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Troubleshooting

### "Invalid login credentials" error
- Check that your email/password are correct
- Verify your Supabase URL and anon key in `.env`
- Make sure you've confirmed your email (check spam folder)

### Google OAuth not working
- Verify your Google OAuth credentials are correct in Supabase
- Make sure the redirect URI in Google Cloud Console matches Supabase's callback URL
- Clear your browser cache and cookies

### User gets logged out immediately
- Check browser console for errors
- Verify `.env` variables are loaded (restart dev server after changing `.env`)
- Make sure `VITE_` prefix is used for all environment variables

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Check that `@supabase/supabase-js` is in `package.json`

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use Row Level Security (RLS)** in Supabase for all tables
3. **Validate user input** on both client and server side
4. **Use HTTPS in production** - Required for OAuth
5. **Set up email rate limiting** to prevent abuse
6. **Enable MFA** for admin accounts in Supabase dashboard

## Deployment

When deploying to Vercel:

1. Add environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

2. Update Google OAuth redirect URIs to include your production URL

3. Configure Supabase redirect URLs:
   - Go to **Authentication** > **URL Configuration**
   - Add your production URL to "Site URL"
   - Add your production URL to "Redirect URLs"

## Next Steps

- Implement user profiles stored in Supabase
- Add password reset functionality
- Implement social features (follow/unfollow)
- Add user settings page
- Implement image upload for profile pictures using Supabase Storage
- Add OAuth with other providers (Facebook, Apple, etc.)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [React Router Docs](https://reactrouter.com/)