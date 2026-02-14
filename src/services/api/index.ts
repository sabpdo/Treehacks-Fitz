// Central API exports for ClosetRank
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
  getPostComments,
  addComment,
  deleteComment,
} from './posts';

// Profiles API
export {
  getCurrentProfile,
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  updateStreak,
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
  deleteImage,
  compressImage,
  uploadImageWithCompression,
} from './storage';