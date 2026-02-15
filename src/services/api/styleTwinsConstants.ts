/**
 * Style Twins: Personalized PageRank (Adsorption-style) matching
 *
 * Tunable weights and algorithm parameters. Adjust these to change how much
 * each edge type contributes to "style proximity" and how quickly the random
 * walk converges.
 *
 * Intuition: PPR with restart from the seed user spreads score over the graph.
 * Users who share saved posts, likes, tags, and follows get higher scores.
 * Restart probability (r) means we periodically jump back to the seed user,
 * so recommendations stay relevant to that user's neighborhood.
 */

export const STYLE_TWINS = {
  /** Restart probability in PPR: p_{t+1} = (1-r)*W^T*p_t + r*e_seed. Higher = more personal. */
  RESTART_PROB: 0.2,

  /** Number of power iterations (or until convergence). */
  MAX_ITERS: 40,

  /** Convergence threshold: stop if max |p_t - p_{t-1}| < this. */
  CONVERGENCE_EPS: 1e-6,

  // --- Edge weights (unnormalized; we row-normalize for transition probs) ---
  /** Save (bookmark) edge: strong signal of style interest. */
  WEIGHT_SAVE: 2.0,
  /** Like edge. */
  WEIGHT_LIKE: 1.0,
  /** Comment edge: stronger engagement than like. */
  WEIGHT_COMMENT: 1.5,
  /** User -> tag from closet (brand/color/vibe/category). */
  WEIGHT_CLOSET_TAG: 0.5,
  /** Follow edge: social connection. */
  WEIGHT_FOLLOW: 0.3,
  /** Post -> tag (from post outfit items). Normalized by tag count per post. */
  WEIGHT_POST_TAG: 1.0,

  // --- Graph limits (keep subgraph small for performance) ---
  /** Max posts to load for building post->tag and user->post edges. */
  MAX_POSTS_IN_GRAPH: 500,
  /** Max closet items per user when building user->tag. */
  MAX_CLOSET_ITEMS_PER_USER: 200,
  /** Max tags per post when building post->tag (sample if more). */
  MAX_TAGS_PER_POST: 20,
  /** Top-K style twins to return. */
  DEFAULT_TOP_K: 10,
  /** Max reason chips per recommended user. */
  MAX_REASON_CHIPS: 5,
} as const;
