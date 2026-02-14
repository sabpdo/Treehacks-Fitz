import { supabase } from '../../lib/supabase';
import { Profile } from '../../types/database';

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Ensure current user has a profile row (creates one if missing).
 * Call this when the DB trigger may not have run (e.g. trigger not applied).
 */
export async function ensureProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const existing = await getCurrentProfile();
  if (existing) return existing;

  const displayName = (user.user_metadata?.display_name ?? user.user_metadata?.displayName ?? user.email) as string;
  const username = (user.user_metadata?.username ?? user.email) as string;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName || null,
      username: username || null,
      avatar_url: (user.user_metadata?.avatar_url as string) || null,
    })
    .select()
    .maybeSingle();

  if (error) {
    // Ignore unique violation (trigger may have created row between get and insert)
    if (error.code === '23505') return getCurrentProfile();
    throw error;
  }
  return data;
}

/**
 * Get a profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Update current user's profile
 */
export async function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let data: Profile | null = null;
  let error: { message: string; code?: string } | null = null;

  const runUpdate = async () => {
    const result = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle();
    return result;
  };

  const result = await runUpdate();
  data = result.data;
  error = result.error;

  if (error) {
    const message = error.message || 'Unknown error';
    const code = error.code ? ` (${error.code})` : '';
    const err = new Error(`${message}${code}`);
    (err as Error & { details?: unknown }).details = error;
    throw err;
  }
  if (data === null) {
    // Profile row may be missing if DB trigger didn't run; create it and retry once
    await ensureProfile();
    const retry = await runUpdate();
    if (retry.error) throw retry.error;
    if (retry.data) return retry.data;
    throw new Error('Profile not found or update not allowed. Make sure the profiles table exists and RLS allows updates.');
  }
  return data;
}

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: userId,
    });

  if (error) throw error;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', userId);

  if (error) throw error;
}

/**
 * Check if following a user
 */
export async function isFollowing(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', userId)
    .single();

  return !!data;
}

/**
 * Get followers for a user
 */
export async function getFollowers(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId);

  if (error) throw error;
  return ((data || []).map(f => f.follower) as unknown) as Profile[];
}

/**
 * Get users that a user is following
 */
export async function getFollowing(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following:profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId);

  if (error) throw error;
  return ((data || []).map(f => f.following) as unknown) as Profile[];
}

/**
 * Update streak (called daily when user posts)
 */
export async function updateStreak(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const profile = await getProfile(user.id);
  if (!profile) throw new Error('Profile not found');

  // Check if user posted today
  const today = new Date().toISOString().split('T')[0];
  const { data: todayPosts } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', `${today}T00:00:00`)
    .limit(1);

  if (todayPosts && todayPosts.length > 0) {
    const newStreak = profile.streak + 1;
    await updateProfile({ streak: newStreak });
    return newStreak;
  }

  return profile.streak;
}

/**
 * Get suggested users for Discover (other people on the platform, excluding current user)
 */
export async function getDiscoverProfiles(limit = 50): Promise<Profile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (user) {
    query = query.neq('id', user.id);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Search users by username
 */
export async function searchUsers(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return data || [];
}