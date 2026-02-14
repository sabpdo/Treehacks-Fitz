import { supabase } from '../../lib/supabase';
import { Post, CreatePostRequest, Comment } from '../../types/database';

export type FeedFilter = 'following' | 'trending' | 'saved';
export type FeedSort = 'recent' | 'most_liked';

async function enrichPostsWithLikeAndSave(
  posts: any[],
  userId: string
): Promise<Post[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  const [likesRes, savesRes] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabase.from('saves').select('post_id').eq('user_id', userId).in('post_id', postIds),
  ]);

  const likedSet = new Set((likesRes.data || []).map((r) => r.post_id));
  const savedSet = new Set((savesRes.data || []).map((r) => r.post_id));

  return posts.map((post) => ({
    ...post,
    is_liked: likedSet.has(post.id),
    is_saved: savedSet.has(post.id),
    items: post.items?.map((pi: any) => pi.closet_item) || [],
  }));
}

/**
 * Get feed posts with optional filter and sort
 * @param filter - 'following' (default), 'trending', or 'saved'
 * @param sort - 'recent' (default) or 'most_liked'
 */
export async function getFeedPosts(
  limit: number = 20,
  offset: number = 0,
  filter: FeedFilter = 'following',
  sort: FeedSort = 'recent'
): Promise<Post[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const orderBy = sort === 'most_liked' ? 'likes_count' : 'created_at';
  const ascending = sort === 'most_liked';

  let query = supabase
    .from('posts')
    .select(`
      *,
      user:profiles!posts_user_id_fkey(*),
      items:post_items(
        closet_item:closet_items(*)
      )
    `);

  if (filter === 'saved') {
    const { data: savedRows } = await supabase
      .from('saves')
      .select('post_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const savedPostIds = (savedRows || []).map((r) => r.post_id);
    if (savedPostIds.length === 0) return [];

    query = query.in('id', savedPostIds);
  } else if (filter === 'trending') {
    query = query.order(orderBy, { ascending }).range(offset, offset + limit - 1);
  } else {
    // following: posts from followed users + own posts
    query = query
      .or(`user_id.eq.${user.id},user_id.in.(
        select following_id from follows where follower_id = '${user.id}'
      )`)
      .order(orderBy, { ascending })
      .range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) throw error;

  let list = data || [];
  if (filter === 'saved') {
    list = list.sort((a: any, b: any) => {
      if (sort === 'most_liked') return (b.likes_count ?? 0) - (a.likes_count ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return enrichPostsWithLikeAndSave(list, user.id);
}

/**
 * Save (bookmark) a post
 */
export async function savePost(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('saves').insert({
    user_id: user.id,
    post_id: postId,
  });

  if (error) throw error;
}

/**
 * Unsave (remove bookmark) a post
 */
export async function unsavePost(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('saves')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId);

  if (error) throw error;
}

/**
 * Get IDs of posts the current user has saved
 */
export async function getSavedPostIds(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('saves')
    .select('post_id')
    .eq('user_id', user.id);

  if (error) throw error;
  return new Set((data || []).map((r) => r.post_id));
}

/**
 * Get posts by a specific user
 */
export async function getUserPosts(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      user:profiles!posts_user_id_fkey(*),
      items:post_items(
        closet_item:closet_items(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(post => ({
    ...post,
    items: post.items?.map((pi: any) => pi.closet_item) || [],
  }));
}

/**
 * Get a single post by ID
 */
export async function getPost(postId: string): Promise<Post | null> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      user:profiles!posts_user_id_fkey(*),
      items:post_items(
        closet_item:closet_items(*)
      )
    `)
    .eq('id', postId)
    .single();

  if (error) throw error;
  if (!data) return null;

  // Check if liked and saved
  let is_liked = false;
  let is_saved = false;
  if (user) {
    const [likeRes, saveRes] = await Promise.all([
      supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', postId).single(),
      supabase.from('saves').select('id').eq('user_id', user.id).eq('post_id', postId).single(),
    ]);
    is_liked = !!likeRes.data;
    is_saved = !!saveRes.data;
  }

  return {
    ...data,
    is_liked,
    is_saved,
    items: data.items?.map((pi: any) => pi.closet_item) || [],
  };
}

/**
 * Create a new post
 */
export async function createPost(request: CreatePostRequest): Promise<Post> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      image_url: request.image_url,
      caption: request.caption || null,
    })
    .select()
    .single();

  if (postError) throw postError;

  // Associate closet items with post
  if (request.item_ids && request.item_ids.length > 0) {
    const postItems = request.item_ids.map(item_id => ({
      post_id: post.id,
      closet_item_id: item_id,
    }));

    const { error: itemsError } = await supabase
      .from('post_items')
      .insert(postItems);

    if (itemsError) throw itemsError;

    // Mark items as worn
    for (const itemId of request.item_ids) {
      const { data: item } = await supabase
        .from('closet_items')
        .select('times_worn')
        .eq('id', itemId)
        .single();

      if (item) {
        await supabase
          .from('closet_items')
          .update({
            times_worn: item.times_worn + 1,
            last_worn_at: new Date().toISOString(),
          })
          .eq('id', itemId);
      }
    }
  }

  return getPost(post.id) as Promise<Post>;
}

/**
 * Update a post
 */
export async function updatePost(postId: string, caption: string): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .update({ caption })
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
}

/**
 * Like a post
 */
export async function likePost(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('likes')
    .insert({
      user_id: user.id,
      post_id: postId,
    });

  if (error) throw error;
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId);

  if (error) throw error;
}

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!comments_user_id_fkey(*)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Add a comment to a post
 */
export async function addComment(postId: string, content: string): Promise<Comment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content,
    })
    .select(`
      *,
      user:profiles!comments_user_id_fkey(*)
    `)
    .single();

  if (error) throw error;

  return data;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string, postId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}