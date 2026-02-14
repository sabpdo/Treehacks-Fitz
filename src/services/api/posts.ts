import { supabase } from '../../lib/supabase';
import { Post, CreatePostRequest, Comment, PostOutfitItem, type Category } from '../../types/database';

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
    items: normalizePostItems(post),
  }));
}

/** Post items from outfit_items JSONB or from post_items → closet_items (same schema). */
function normalizePostItems(post: any): PostOutfitItem[] {
  if (post.outfit_items && Array.isArray(post.outfit_items) && post.outfit_items.length > 0) {
    return post.outfit_items;
  }
  const fromJoin = post.items?.map((pi: any) => closetItemToPostOutfitItem(pi?.closet_item)).filter(Boolean) || [];
  return fromJoin;
}

function closetItemToPostOutfitItem(c: any): PostOutfitItem | null {
  if (!c || !c.id) return null;
  return {
    id: c.id,
    image_url: c.image_url || '',
    category: c.category,
    brand: c.brand ?? null,
    subcategory: c.subcategory ?? null,
    colors: Array.isArray(c.colors) ? c.colors : [],
    fabric: c.fabric ?? null,
    silhouette: c.silhouette ?? null,
    vibe_tags: Array.isArray(c.vibe_tags) ? c.vibe_tags : [],
    price_tier: c.price_tier ?? null,
    closet_item_id: c.id,
  };
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
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoIso = weekAgo.toISOString();
    query = query
      .gte('created_at', weekAgoIso)
      .order('likes_count', { ascending: false })
      .range(offset, offset + limit - 1);
  } else {
    // following: posts from followed users + own posts (fetch following IDs first; PostgREST doesn't support subqueries in .or())
    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    const followingIds = (followRows || []).map((r) => r.following_id);
    const feedUserIds = [user.id, ...followingIds];
    query = query
      .in('user_id', feedUserIds)
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

  return (data || []).map((post) => ({
    ...post,
    items: normalizePostItems(post),
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

  const items = normalizePostItems(data);

  return {
    ...data,
    is_liked,
    is_saved,
    items,
  };
}

/**
 * Create a new post
 */
export async function createPost(request: CreatePostRequest): Promise<Post> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Normalize items (same schema as closet): ensure arrays and optional closet_item_id
  const outfitItems: PostOutfitItem[] = (request.items && request.items.length > 0)
    ? request.items.map((it) => ({
      id: it.id,
      image_url: it.image_url || '',
      category: it.category,
      brand: it.brand ?? null,
      subcategory: it.subcategory ?? null,
      colors: Array.isArray(it.colors) ? it.colors : [],
      fabric: it.fabric ?? null,
      silhouette: it.silhouette ?? null,
      vibe_tags: Array.isArray(it.vibe_tags) ? it.vibe_tags : [],
      closet_item_id: it.closet_item_id,
    }))
    : (request.tags && request.tags.length > 0)
      ? request.tags.map((t) => ({
        image_url: '',
        category: tagTypeToCategory(t.type),
        brand: null,
        subcategory: t.label || null,
        colors: [],
        fabric: null,
        silhouette: null,
        vibe_tags: [],
      }))
      : [];

  function tagTypeToCategory(type: string): Category {
    const t = (type || '').toLowerCase().replace(/\s+/g, '_');
    if (t === 'pants' || t === 'bottom' || t === 'bottoms') return 'pants';
    if (t === 'skirts_dresses' || t === 'dress' || t === 'skirt') return 'skirts_dresses';
    if (t === 'jackets_outerwear' || t === 'jacket' || t === 'outerwear') return 'jackets_outerwear';
    if (t === 'shoes' || t === 'shoe') return 'shoes';
    if (t === 'bags' || t === 'bag' || t === 'accessory' || t === 'accessories' || t === 'handbag') return 'bags';
    return 'shirts';
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      image_url: request.image_url,
      caption: request.caption || null,
      ...(outfitItems.length > 0 ? { outfit_items: outfitItems } : {}),
      ...(request.tags && request.tags.length > 0 && outfitItems.length === 0 ? { tags: request.tags } : {}),
    })
    .select()
    .single();

  if (postError) throw postError;

  const closetIdsToLink = [
    ...(request.item_ids || []),
    ...outfitItems.map((it) => it.closet_item_id).filter(Boolean),
  ] as string[];
  const uniqueClosetIds = [...new Set(closetIdsToLink)];

  if (uniqueClosetIds.length > 0) {
    const postItems = uniqueClosetIds.map((closet_item_id) => ({
      post_id: post.id,
      closet_item_id,
    }));

    const { error: itemsError } = await supabase.from('post_items').insert(postItems);
    if (itemsError) throw itemsError;

    for (const itemId of uniqueClosetIds) {
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