// Central API exports for fitz
// Import from here instead of individual files

// Closet Items API
export {
  getClosetItems,
  getClosetItem,
  getClosetItemsByCategory,
  getTopRatedItems,
  getItemsByVibe,
  createClosetItem,
  updateClosetItem,
  deleteClosetItem,
  markItemAsWorn,
  rateItem,
  calculateClosetUtilization,
} from './closet';

// Posts API
export {
  getFeedPosts,
  getUserPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  getSavedPostIds,
  getPostComments,
  addComment,
  deleteComment,
  type FeedFilter,
  type FeedSort,
} from './posts';

// Profiles API
export {
  getCurrentProfile,
  ensureProfile,
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  updateStreak,
  getDiscoverProfiles,
  searchUsers,
} from './profiles';

// Compatibility API
export {
  calculateCompatibilityScore,
  calculateFeedCompatibility,
  getRecommendedItems,
  suggestOutfits,
} from './compatibility';

// Storage API
export {
  uploadImage,
  uploadImageToPath,
  deleteImage,
  compressImage,
  uploadImageWithCompression,
  dataURLToFile,
} from './storage';

// Segmentation (Edge Function: Replicate mask-clothing for "tag your items")
export { segmentOutfitImage, type SegmentResult } from './segmentation';

// Daily look cache (weather-based outfit suggestion per user per day)
export {
  getDailyLook,
  setDailyLook,
  type CachedDailyLook,
  type CachedDailyLookItem,
} from './dailyLook';

// Body analyses (saved photos + analysis for "Analyze Your Body Type" history and suggestions)
export {
  createBodyAnalysis,
  getBodyAnalyses,
  getLatestBodyAnalysis,
  type BodyAnalysisRecord,
} from './bodyAnalysis';