/**
 * Style Twins: graph-based matching via Personalized PageRank (Adsorption-style).
 *
 * Uses existing tables: profiles, posts, post_items, closet_items, likes, saves,
 * comments, follows. Tags are derived from brand/color/vibe/category on closet
 * and post items (no new tables).
 *
 * Edge types:
 * - user -> post: like, save, comment (from likes, saves, comments)
 * - post -> tag: from post outfit_items or post_items -> closet_items
 * - user -> tag: from closet_items (brand, colors, vibe_tags, category)
 * - user -> user: from follows
 */

import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';
import { getProfile } from './profiles';
import { STYLE_TWINS } from './styleTwinsConstants';

// --- Node ID helpers (heterogeneous graph) ---
const PREFIX = { user: 'u:', post: 'p:', tag: 't:' } as const;
function uid(id: string) { return PREFIX.user + id; }
function pid(id: string) { return PREFIX.post + id; }
function tagId(kind: string, value: string) {
  const v = (value || '').trim().toLowerCase().replace(/\s+/g, '_');
  return v ? `${PREFIX.tag}${kind}:${v}` : null;
}

/** Weighted adjacency: fromNode -> { toNode: weight } (outgoing). */
export type AdjacencyList = Map<string, Record<string, number>>;

/** One recommended style twin with score and reason chips. */
export interface StyleTwinResult {
  user: Profile;
  score: number;
  reasons: string[];
}

/** Build tag nodes from a single item (closet or post item). */
function tagsFromItem(item: {
  brand?: string | null;
  category?: string | null;
  colors?: string[];
  vibe_tags?: string[];
}): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  if (item.brand && item.brand.trim().toLowerCase() !== 'unknown') {
    const k = tagId('brand', item.brand)!;
    out.push({ key: k, label: `brand: ${item.brand.trim()}` });
  }
  if (item.category) {
    const k = tagId('category', item.category)!;
    out.push({ key: k, label: `category: ${(item.category as string).replace(/_/g, ' ')}` });
  }
  (item.colors || []).slice(0, 5).forEach((c) => {
    if (!c || c === '—') return;
    const k = tagId('color', c)!;
    out.push({ key: k, label: `color: ${c}` });
  });
  (item.vibe_tags || []).slice(0, 5).forEach((v) => {
    const k = tagId('vibe', v)!;
    out.push({ key: k, label: `vibe: ${v}` });
  });
  return out;
}

/**
 * Fetch neighborhood data from Supabase and build weighted adjacency list.
 * Limits: MAX_POSTS_IN_GRAPH, MAX_CLOSET_ITEMS_PER_USER, and user set capped by interaction count.
 */
export async function buildStyleGraph(seedUserId: string): Promise<{
  adjacency: AdjacencyList;
  userNodeIds: Set<string>;
  tagToLabels: Map<string, string>;
  userTags: Map<string, Set<string>>; // user id -> set of tag keys (for reasons)
}> {
  const {
    WEIGHT_SAVE,
    WEIGHT_LIKE,
    WEIGHT_COMMENT,
    WEIGHT_CLOSET_TAG,
    WEIGHT_FOLLOW,
    WEIGHT_POST_TAG,
    MAX_POSTS_IN_GRAPH,
    MAX_CLOSET_ITEMS_PER_USER,
    MAX_TAGS_PER_POST,
  } = STYLE_TWINS;

  const userTags = new Map<string, Set<string>>();
  const tagToLabels = new Map<string, string>();

  // 1) Seed's likes, saves, comments -> post IDs; and follow edges
  const [likesSeed, savesSeed, commentsSeed, followOutRes, followInRes] = await Promise.all([
    supabase.from('likes').select('user_id, post_id').eq('user_id', seedUserId),
    supabase.from('saves').select('user_id, post_id').eq('user_id', seedUserId),
    supabase.from('comments').select('user_id, post_id').eq('user_id', seedUserId),
    supabase.from('follows').select('follower_id, following_id').eq('follower_id', seedUserId),
    supabase.from('follows').select('follower_id, following_id').eq('following_id', seedUserId),
  ]);

  const postIds = new Set<string>();
  const userIds = new Set<string>([seedUserId]);
  const upWeight = new Map<string, number>();

  function addUserPost(
    rows: { user_id: string; post_id: string }[],
    weight: number
  ) {
    (rows || []).forEach((r) => {
      postIds.add(r.post_id);
      userIds.add(r.user_id);
      const key = `${r.user_id}:${r.post_id}`;
      upWeight.set(key, (upWeight.get(key) || 0) + weight);
    });
  }

  addUserPost(likesSeed.data || [], WEIGHT_LIKE);
  addUserPost(savesSeed.data || [], WEIGHT_SAVE);
  addUserPost(commentsSeed.data || [], WEIGHT_COMMENT);

  const postIdListForFetch = Array.from(postIds);
  if (postIdListForFetch.length > 0) {
    const [likesOthers, savesOthers, commentsOthers] = await Promise.all([
      supabase.from('likes').select('user_id, post_id').in('post_id', postIdListForFetch),
      supabase.from('saves').select('user_id, post_id').in('post_id', postIdListForFetch),
      supabase.from('comments').select('user_id, post_id').in('post_id', postIdListForFetch),
    ]);
    addUserPost(likesOthers.data || [], WEIGHT_LIKE);
    addUserPost(savesOthers.data || [], WEIGHT_SAVE);
    addUserPost(commentsOthers.data || [], WEIGHT_COMMENT);
  }

  (followOutRes.data || []).forEach((r: { follower_id: string; following_id: string }) => {
    userIds.add(r.follower_id);
    userIds.add(r.following_id);
  });
  (followInRes.data || []).forEach((r: { follower_id: string; following_id: string }) => {
    userIds.add(r.follower_id);
    userIds.add(r.following_id);
  });

  const postIdList = Array.from(postIds).slice(0, MAX_POSTS_IN_GRAPH);
  const userIdList = Array.from(userIds);

  // 2) Posts with items: outfit_items JSONB or post_items -> closet_items
  const { data: postsRows } = await supabase
    .from('posts')
    .select('id, outfit_items, user_id')
    .in('id', postIdList.length ? postIdList : ['00000000-0000-0000-0000-000000000000']);

  const postToAuthor = new Map<string, string>();
  (postsRows || []).forEach((p: any) => postToAuthor.set(p.id, p.user_id));

  const postsWithItems: Array<{
    id: string;
    user_id: string;
    items: Array<{ brand?: string | null; category?: string; colors?: string[]; vibe_tags?: string[] }>;
  }> = [];

  const postsWithoutItems: string[] = [];
  for (const row of postsRows || []) {
    const items: Array<{ brand?: string | null; category?: string; colors?: string[]; vibe_tags?: string[] }> = [];
    if (row.outfit_items && Array.isArray(row.outfit_items) && row.outfit_items.length > 0) {
      row.outfit_items.forEach((it: any) => items.push(it));
    }
    postsWithItems.push({ id: row.id, user_id: row.user_id, items });
    if (items.length === 0) postsWithoutItems.push(row.id);
  }

  if (postsWithoutItems.length > 0) {
    const { data: postItemsRows } = await supabase
      .from('post_items')
      .select('post_id, closet_item:closet_items(brand, category, colors, vibe_tags)')
      .in('post_id', postsWithoutItems);
    const byPost = new Map<string, any[]>();
    (postItemsRows || []).forEach((pi: any) => {
      const c = pi.closet_item;
      if (!c) return;
      const list = byPost.get(pi.post_id) || [];
      list.push(c);
      byPost.set(pi.post_id, list);
    });
    byPost.forEach((items, postId) => {
      const existing = postsWithItems.find((p) => p.id === postId);
      if (existing) existing.items = items;
    });
  }

  // 3) Closet items for all users in neighborhood (for user->tag)
  const { data: closetRows } = await supabase
    .from('closet_items')
    .select('user_id, brand, category, colors, vibe_tags')
    .in('user_id', userIdList);

  const closetByUser = new Map<string, any[]>();
  (closetRows || []).forEach((c: any) => {
    const list = closetByUser.get(c.user_id) || [];
    if (list.length < MAX_CLOSET_ITEMS_PER_USER) list.push(c);
    closetByUser.set(c.user_id, list);
  });

  // --- Build adjacency (outgoing edges) ---
  const adjacency: AdjacencyList = new Map();

  function addEdge(from: string, to: string, w: number) {
    const row = adjacency.get(from) || {};
    row[to] = (row[to] || 0) + w;
    adjacency.set(from, row);
  }

  // User -> Post (like, save, comment) — one edge per (user, post) with sum of weights
  upWeight.forEach((w, key) => {
    const [u, p] = key.split(':');
    addEdge(uid(u), pid(p), w);
  });

  // Post -> User (post author): so PPR can flow from posts back to users
  postToAuthor.forEach((authorId, postId) => {
    if (authorId) addEdge(pid(postId), uid(authorId), WEIGHT_POST_TAG);
  });

  // Tag -> User (reverse of user->tag): so tag nodes send score back to users
  closetByUser.forEach((items, userId) => {
    items.forEach((it) => {
      tagsFromItem(it).forEach(({ key }) => {
        addEdge(key, uid(userId), WEIGHT_CLOSET_TAG);
      });
    });
  });

  // Follow: user A -> user B (follower -> following)
  (followOutRes.data || []).forEach((r: { follower_id: string; following_id: string }) => {
    addEdge(uid(r.follower_id), uid(r.following_id), WEIGHT_FOLLOW);
  });
  (followInRes.data || []).forEach((r: { follower_id: string; following_id: string }) => {
    addEdge(uid(r.following_id), uid(r.follower_id), WEIGHT_FOLLOW);
  });

  // Post -> Tag (from post items); normalize by tag count per post
  for (const post of postsWithItems) {
    const allTags = new Map<string, number>();
    post.items.slice(0, 20).forEach((it) => {
      tagsFromItem(it).slice(0, MAX_TAGS_PER_POST).forEach(({ key, label }) => {
        allTags.set(key, (allTags.get(key) || 0) + WEIGHT_POST_TAG);
        tagToLabels.set(key, label);
      });
    });
    const total = allTags.size || 1;
    allTags.forEach((w, key) => {
      addEdge(pid(post.id), key, w / total);
    });
  }

  // User -> Tag from closet
  closetByUser.forEach((items, userId) => {
    const tags = new Set<string>();
    items.forEach((it) => {
      tagsFromItem(it).forEach(({ key, label }) => {
        addEdge(uid(userId), key, WEIGHT_CLOSET_TAG);
        tags.add(key);
        tagToLabels.set(key, label);
      });
    });
    userTags.set(userId, tags);
  });

  // Row-normalize: each node's outgoing weights sum to 1
  adjacency.forEach((row, from) => {
    const sum = Object.values(row).reduce((a, b) => a + b, 0);
    if (sum <= 0) return;
    const norm: Record<string, number> = {};
    Object.entries(row).forEach(([to, w]) => { norm[to] = w / sum; });
    adjacency.set(from, norm);
  });

  const userNodeIds = new Set(userIdList.map(uid));
  return { adjacency, userNodeIds, tagToLabels, userTags };
}

/**
 * Personalized PageRank: p_{t+1} = (1-r) * W^T * p_t + r * e_seed.
 * Returns a map from node id to score (probability mass).
 */
export function personalizedPageRank(
  adjacency: AdjacencyList,
  seedNode: string,
  restartProb: number = STYLE_TWINS.RESTART_PROB,
  maxIters: number = STYLE_TWINS.MAX_ITERS,
  eps: number = STYLE_TWINS.CONVERGENCE_EPS
): Map<string, number> {
  const nodes = new Set<string>();
  adjacency.forEach((row, from) => {
    nodes.add(from);
    Object.keys(row).forEach((to) => nodes.add(to));
  });
  nodes.add(seedNode);

  const n = nodes.size;
  const nodeList = Array.from(nodes);
  const nodeToIdx = new Map<string, number>();
  nodeList.forEach((id, i) => nodeToIdx.set(id, i));

  // Build transpose: inEdges[i] = list of (fromIdx, weight) that point to i
  const inEdges: Array<Array<[number, number]>> = nodeList.map(() => []);
  adjacency.forEach((row, from) => {
    const fromIdx = nodeToIdx.get(from)!;
    Object.entries(row).forEach(([to, w]) => {
      const toIdx = nodeToIdx.get(to)!;
      inEdges[toIdx].push([fromIdx, w]);
    });
  });

  const seedIdx = nodeToIdx.get(seedNode) ?? 0;
  let p = new Float64Array(n);
  p[seedIdx] = 1;

  for (let iter = 0; iter < maxIters; iter++) {
    const next = new Float64Array(n);
    next[seedIdx] = restartProb;
    for (let i = 0; i < n; i++) {
      const incoming = inEdges[i];
      let mass = 0;
      for (const [j, w] of incoming) mass += p[j] * w;
      next[i] += (1 - restartProb) * mass;
    }
    let maxDiff = 0;
    for (let i = 0; i < n; i++) maxDiff = Math.max(maxDiff, Math.abs(next[i] - p[i]));
    p = next;
    if (maxDiff < eps) break;
  }

  const scoreMap = new Map<string, number>();
  nodeList.forEach((id, i) => scoreMap.set(id, p[i]));
  return scoreMap;
}

/**
 * For each recommended user, extract 3–5 reason chips from top shared tag nodes.
 */
function getReasonChips(
  seedUserId: string,
  twinUserId: string,
  userTags: Map<string, Set<string>>,
  tagToLabels: Map<string, string>,
  scoreMap: Map<string, number>,
  maxChips: number
): string[] {
  const seedTags = userTags.get(seedUserId) || new Set();
  const twinTags = userTags.get(twinUserId) || new Set();
  const shared = new Set<string>([...seedTags].filter((t) => twinTags.has(t)));

  const byScore = Array.from(shared)
    .map((tagKey) => ({ tagKey, score: scoreMap.get(tagKey) || 0 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChips);

  const reasons: string[] = [];
  const seenPrefix = new Set<string>();
  for (const { tagKey } of byScore) {
    const label = tagToLabels.get(tagKey);
    if (!label) continue;
    const prefix = label.split(':')[0];
    if (seenPrefix.has(prefix)) continue;
    seenPrefix.add(prefix);
    reasons.push(label);
  }
  if (reasons.length < 2 && shared.size > 0) {
    byScore.slice(0, maxChips).forEach(({ tagKey }) => {
      const label = tagToLabels.get(tagKey);
      if (label && !reasons.includes(label)) reasons.push(label);
    });
  }
  return reasons.slice(0, maxChips);
}

/**
 * Get top-K style twins for a user. Uses PPR from seed user node; returns
 * other users sorted by score with reason chips.
 */
export async function getStyleTwins(
  userId: string,
  k: number = STYLE_TWINS.DEFAULT_TOP_K
): Promise<StyleTwinResult[]> {
  const { adjacency, userNodeIds, tagToLabels, userTags } = await buildStyleGraph(userId);
  const seedNode = uid(userId);
  const scoreMap = personalizedPageRank(
    adjacency,
    seedNode,
    STYLE_TWINS.RESTART_PROB,
    STYLE_TWINS.MAX_ITERS,
    STYLE_TWINS.CONVERGENCE_EPS
  );

  const userScores = Array.from(userNodeIds)
    .filter((node) => node !== seedNode && node.startsWith(PREFIX.user))
    .map((node) => ({ node, score: scoreMap.get(node) || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const profiles = await Promise.all(
    userScores.map(({ node }) => {
      const id = node.slice(PREFIX.user.length);
      return getProfile(id);
    })
  );

  const results: StyleTwinResult[] = [];
  userScores.forEach(({ node, score }, i) => {
    const profile = profiles[i];
    if (!profile) return;
    const id = node.slice(PREFIX.user.length);
    const reasons = getReasonChips(
      userId,
      id,
      userTags,
      tagToLabels,
      scoreMap,
      STYLE_TWINS.MAX_REASON_CHIPS
    );
    if (reasons.length === 0) reasons.push('Similar engagement and style signals');
    results.push({ user: profile, score, reasons });
  });

  return results;
}

/**
 * Get style match score and reason chips between current user (viewer) and a target profile.
 * Used on profile pages to show "X% match" next to streak when viewing someone else.
 */
export async function getMatchScore(
  viewerUserId: string,
  targetUserId: string
): Promise<{ score: number; reasons: string[] }> {
  if (viewerUserId === targetUserId) {
    return { score: 1, reasons: ['Your profile'] };
  }
  const { adjacency, userNodeIds, tagToLabels, userTags } = await buildStyleGraph(viewerUserId);
  const seedNode = uid(viewerUserId);
  const scoreMap = personalizedPageRank(
    adjacency,
    seedNode,
    STYLE_TWINS.RESTART_PROB,
    STYLE_TWINS.MAX_ITERS,
    STYLE_TWINS.CONVERGENCE_EPS
  );
  const targetNode = uid(targetUserId);
  const score = scoreMap.get(targetNode) ?? 0;
  const reasons = userNodeIds.has(targetNode)
    ? getReasonChips(
        viewerUserId,
        targetUserId,
        userTags,
        tagToLabels,
        scoreMap,
        STYLE_TWINS.MAX_REASON_CHIPS
      )
    : [];
  if (reasons.length === 0 && score > 0) reasons.push('Similar engagement and style signals');
  return { score, reasons };
}
