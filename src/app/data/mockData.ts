export interface Post {
  id: string;
  username: string;
  userAvatar: string;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  vibeTag?: string;
  featured?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface ClosetItem {
  id: string;
  imageUrl: string;
  category: "tops" | "bottoms" | "outerwear" | "shoes" | "accessories";
  color: string;
  style: string;
  brand?: string;
  fabric?: string;
  silhouette?: string;
  aiTags?: string[];
  compatibleWith?: number;
  timesWorn?: number;
  /** Short AI-generated product-style label (e.g. "Beige leather crossbody bag") from upload; use as title when pairing */
  displayDescription?: string | null;
}

export interface OutfitCard {
  id: string;
  items: string[];
  description: string;
  imageUrl: string;
}

export interface RankedItem {
  id: string;
  category: string;
  imageUrl: string;
  brand: string;
  rating: number;
  vibeTag: string;
  priceTier: "$" | "$$" | "$$$";
}

export const mockPosts: Post[] = [
  {
    id: '1',
    username: 'sophia.style',
    userAvatar: 'https://i.pravatar.cc/150?img=1',
    imageUrl: 'https://images.unsplash.com/photo-1759726995149-d2d683fd38bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwb3V0Zml0JTIwY2FzdWFsJTIwbWluaW1hbHxlbnwxfHx8fDE3NzEwNTQwODB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Effortless Sunday vibes ☕️',
    likes: 234,
    comments: 12,
    timestamp: '2h ago',
    vibeTag: 'cafe study',
    featured: true
  },
  {
    id: '2',
    username: 'emma.co',
    userAvatar: 'https://i.pravatar.cc/150?img=5',
    imageUrl: 'https://images.unsplash.com/photo-1520483984082-37caa3093d0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHlsaXNoJTIwd29tYW4lMjBzdHJlZXQlMjBmYXNoaW9ufGVufDF8fHx8MTc3MTA1NDA4MHww&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Street style essentials 🤍',
    likes: 567,
    comments: 28,
    timestamp: '5h ago',
    vibeTag: 'casual chic',
    size: 'large'
  },
  {
    id: '3',
    username: 'olivia.wardrobe',
    userAvatar: 'https://i.pravatar.cc/150?img=9',
    imageUrl: 'https://images.unsplash.com/photo-1759229874914-c1ffdb3ebd0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwb3V0Zml0JTIwbmV1dHJhbCUyMHRvbmVzfGVufDF8fHx8MTc3MTA1NDA4MXww&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Neutral tones for the win',
    likes: 421,
    comments: 19,
    timestamp: '1d ago',
    vibeTag: 'office ready',
    featured: true
  },
  {
    id: '4',
    username: 'ava.minimal',
    userAvatar: 'https://i.pravatar.cc/150?img=16',
    imageUrl: 'https://images.unsplash.com/photo-1759873821340-24189bde9922?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmVuZHklMjBmYXNoaW9uJTIwbG9vayUyMGJlaWdlfGVufDF8fHx8MTc3MTA1NDA4MXww&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Beige everything 🥐',
    likes: 389,
    comments: 15,
    timestamp: '1d ago',
    vibeTag: 'brunch date',
    size: 'medium'
  },
  {
    id: '5',
    username: 'mia.closet',
    userAvatar: 'https://i.pravatar.cc/150?img=25',
    imageUrl: 'https://images.unsplash.com/photo-1769107805465-bfd41863f1a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwY2xvdGhpbmclMjBhZXN0aGV0aWN8ZW58MXx8fHwxNzcxMDU0MDgxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Less is more',
    likes: 502,
    comments: 22,
    timestamp: '2d ago',
    vibeTag: 'minimalist',
    featured: true
  },
  {
    id: '6',
    username: 'zoe.aesthetic',
    userAvatar: 'https://i.pravatar.cc/150?img=12',
    imageUrl: 'https://images.unsplash.com/photo-1700557477628-c200fa4cd6da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXN0aGV0aWMlMjBmYXNoaW9uJTIwcGhvdG9ncmFwaHklMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzEwNTQ2NzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Golden hour fits hit different ✨',
    likes: 892,
    comments: 45,
    timestamp: '3d ago',
    vibeTag: 'date night',
    size: 'small'
  },
  {
    id: '7',
    username: 'lily.wardrobe',
    userAvatar: 'https://i.pravatar.cc/150?img=20',
    imageUrl: 'https://images.unsplash.com/photo-1629922949137-e236a5ab497d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwZmFzaGlvbiUyMGVkaXRvcmlhbCUyMHdvbWFufGVufDF8fHx8MTc3MTA1NDY3Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Clean lines, clean mind',
    likes: 654,
    comments: 31,
    timestamp: '4d ago',
    vibeTag: 'work mode',
    size: 'medium'
  },
  {
    id: '8',
    username: 'grace.style',
    userAvatar: 'https://i.pravatar.cc/150?img=27',
    imageUrl: 'https://images.unsplash.com/photo-1592327877233-90b9bfd92e48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMGFlc3RoZXRpYyUyMG91dGZpdCUyMGJlaWdlfGVufDF8fHx8MTc3MTA1NDY3Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    caption: 'Weekend energy',
    likes: 445,
    comments: 18,
    timestamp: '5d ago',
    vibeTag: 'cozy vibes',
    size: 'small'
  }
];

export const mockClosetItems: ClosetItem[] = [
  {
    id: "1",
    imageUrl:
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400",
    category: "tops",
    color: "White",
    style: "Casual",
    brand: "Everlane",
    fabric: "Cotton",
    silhouette: "Fitted",
    aiTags: ["minimalist", "versatile", "everyday"],
    compatibleWith: 24,
    timesWorn: 12,
  },
  {
    id: "2",
    imageUrl:
      "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
    category: "bottoms",
    color: "Beige",
    style: "Smart Casual",
    brand: "Aritzia",
    fabric: "Linen Blend",
    silhouette: "Wide Leg",
    aiTags: ["elegant", "breathable", "office-ready"],
    compatibleWith: 18,
    timesWorn: 8,
  },
  {
    id: "3",
    imageUrl:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
    category: "outerwear",
    color: "Camel",
    style: "Classic",
    brand: "COS",
    fabric: "Wool",
    silhouette: "Oversized",
    aiTags: ["timeless", "layering", "structured"],
    compatibleWith: 32,
    timesWorn: 15,
  },
  {
    id: "4",
    imageUrl:
      "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400",
    category: "shoes",
    color: "Black",
    style: "Minimalist",
    brand: "Veja",
    fabric: "Leather",
    silhouette: "Low-top",
    aiTags: ["sustainable", "everyday", "sleek"],
    compatibleWith: 28,
    timesWorn: 20,
  },
  {
    id: "5",
    imageUrl:
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
    category: "tops",
    color: "Cream",
    style: "Casual",
    brand: "& Other Stories",
    fabric: "Merino Wool",
    silhouette: "Relaxed",
    aiTags: ["cozy", "neutral", "layering"],
    compatibleWith: 22,
    timesWorn: 9,
  },
  {
    id: "6",
    imageUrl:
      "https://images.unsplash.com/photo-1624623278313-a930126a11c3?w=400",
    category: "bottoms",
    color: "Navy",
    style: "Tailored",
    brand: "Zara",
    fabric: "Ponte",
    silhouette: "Straight",
    aiTags: ["professional", "versatile", "classic"],
    compatibleWith: 19,
    timesWorn: 11,
  },
  {
    id: "7",
    imageUrl:
      "https://images.unsplash.com/photo-1606902965551-dce093cda6e7?w=400",
    category: "accessories",
    color: "Tan",
    style: "Minimal",
    brand: "Cuyana",
    fabric: "Leather",
    silhouette: "Tote",
    aiTags: ["structured", "everyday", "quality"],
    compatibleWith: 35,
    timesWorn: 18,
  },
  {
    id: "8",
    imageUrl:
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400",
    category: "outerwear",
    color: "Black",
    style: "Modern",
    brand: "Uniqlo",
    fabric: "Puffer",
    silhouette: "Cropped",
    aiTags: ["warm", "casual", "sporty"],
    compatibleWith: 16,
    timesWorn: 7,
  },
  {
    id: "9",
    imageUrl:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
    category: "shoes",
    color: "White",
    style: "Casual",
    brand: "Nike",
    fabric: "Canvas",
    silhouette: "Sneaker",
    aiTags: ["athletic", "versatile", "comfortable"],
    compatibleWith: 25,
    timesWorn: 14,
  },
  {
    id: "10",
    imageUrl:
      "https://images.unsplash.com/photo-1617922001439-4a2e6562f328?w=400",
    category: "tops",
    color: "Sage",
    style: "Relaxed",
    brand: "Reformation",
    fabric: "Tencel",
    silhouette: "Boxy",
    aiTags: ["sustainable", "soft", "casual-chic"],
    compatibleWith: 21,
    timesWorn: 6,
  },
  {
    id: "11",
    imageUrl:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400",
    category: "bottoms",
    color: "Gray",
    style: "Athletic",
    brand: "Lululemon",
    fabric: "Tech Fabric",
    silhouette: "Tapered",
    aiTags: ["activewear", "stretch", "modern"],
    compatibleWith: 15,
    timesWorn: 10,
  },
  {
    id: "12",
    imageUrl:
      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400",
    category: "accessories",
    color: "Gold",
    style: "Minimal",
    brand: "Mejuri",
    fabric: "Metal",
    silhouette: "Delicate",
    aiTags: ["elegant", "everyday", "layering"],
    compatibleWith: 40,
    timesWorn: 25,
  },
];

export const rankedItems: RankedItem[] = [
  {
    id: "r1",
    category: "Best White Shirts",
    imageUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400",
    brand: "Everlane",
    rating: 9.4,
    vibeTag: "Everyday",
    priceTier: "$$",
  },
  {
    id: "r2",
    category: "Best Work Bags",
    imageUrl: "https://images.unsplash.com/photo-1606902965551-dce093cda6e7?w=400",
    brand: "Cuyana",
    rating: 9.8,
    vibeTag: "Professional",
    priceTier: "$$$",
  },
  {
    id: "r3",
    category: "Best Sweaters",
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
    brand: "& Other Stories",
    rating: 8.9,
    vibeTag: "Cozy",
    priceTier: "$$",
  },
  {
    id: "r4",
    category: "Best Date Night Tops",
    imageUrl: "https://images.unsplash.com/photo-1617922001439-4a2e6562f328?w=400",
    brand: "Reformation",
    rating: 9.2,
    vibeTag: "Date Night",
    priceTier: "$$$",
  },
  {
    id: "r5",
    category: "Best Sneakers",
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
    brand: "Nike",
    rating: 8.7,
    vibeTag: "Casual",
    priceTier: "$$",
  },
  {
    id: "r6",
    category: "Best Outerwear",
    imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
    brand: "COS",
    rating: 9.6,
    vibeTag: "Timeless",
    priceTier: "$$$",
  },
];

export const currentUserProfile = {
  username: 'you',
  userAvatar: 'https://i.pravatar.cc/150?img=32',
  followers: 1243,
  following: 567,
  streak: 7,
  closetUtilization: 73,
  posts: mockPosts.slice(0, 3)
};

// ——— New mock shape for full app (users, OOTD posts, comments) ———

export interface User {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  vibes: string[];
  followerCount: number;
  followingCount: number;
}

/** Tag on a post = clothing item from wardrobe (or label from capture flow) */
export interface OOTDPostTag {
  label: string;
  type: string; // e.g. top, bottom, shoes, dress, jacket
  /** When set, this tag is a linked closet item — link to /closet?item=id */
  closetItemId?: string;
}

/** One tagged item on an outfit post (position for dot, details for popup/list) */
export interface OutfitItem {
  id: string;
  type: string; // top, bottom, shoes, accessory
  label: string;
  position: { x: number; y: number }; // percentage
  imageUrl?: string;
  brand?: string;
  color?: string;
  fabric?: string;
  silhouette?: string;
  /** When set, item is in the post author's wardrobe — link to /closet?item=id */
  closetItemId?: string;
}

export interface OOTDPost {
  id: string;
  userId: string;
  imageUrl: string;
  caption: string;
  vibeTag: string;
  createdAt: string; // ISO or "Today 6:32 PM" style
  likeCount: number;
  savedCount: number;
  commentCount: number;
  likedByUserIds: string[];
  compatibilityScore: number;
  aiInsight: string;
  /** Tagged items from capture flow (label + category) */
  tags?: OOTDPostTag[];
  /** Tagged items in the outfit (for dots + Codibook-style list) */
  outfitItems?: OutfitItem[];
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export const CURRENT_USER_ID = "me";

export const mockUsers: User[] = [
  {
    id: "u1",
    name: "Sophia Lee",
    handle: "sophia.style",
    avatarUrl: "https://i.pravatar.cc/150?img=1",
    bio: "Minimalist with a soft spot for neutrals",
    vibes: ["Minimal", "Neutral", "Cafe"],
    followerCount: 1200,
    followingCount: 340,
  },
  {
    id: "u2",
    name: "Emma Chen",
    handle: "emma.co",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    bio: "Street style & elevated basics",
    vibes: ["Street", "Casual", "Chic"],
    followerCount: 890,
    followingCount: 210,
  },
  {
    id: "u3",
    name: "Olivia Ward",
    handle: "olivia.wardrobe",
    avatarUrl: "https://i.pravatar.cc/150?img=9",
    bio: "Office-ready with a twist",
    vibes: ["Work", "Tailored", "Neutral"],
    followerCount: 2100,
    followingCount: 500,
  },
  {
    id: "u4",
    name: "Ava Kim",
    handle: "ava.minimal",
    avatarUrl: "https://i.pravatar.cc/150?img=16",
    bio: "Beige and cream everything",
    vibes: ["Beige", "Brunch", "Soft"],
    followerCount: 760,
    followingCount: 180,
  },
  {
    id: "u5",
    name: "Mia Torres",
    handle: "mia.closet",
    avatarUrl: "https://i.pravatar.cc/150?img=25",
    bio: "Less is more, always",
    vibes: ["Minimalist", "Clean", "Quiet"],
    followerCount: 3400,
    followingCount: 420,
  },
  {
    id: "u6",
    name: "Zoe Park",
    handle: "zoe.aesthetic",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    bio: "Golden hour and good fits",
    vibes: ["Date night", "Aesthetic", "Warm"],
    followerCount: 5200,
    followingCount: 600,
  },
  {
    id: "u7",
    name: "Lily Brooks",
    handle: "lily.wardrobe",
    avatarUrl: "https://i.pravatar.cc/150?img=20",
    bio: "Clean lines, clean mind",
    vibes: ["Work", "Minimal", "Structured"],
    followerCount: 1100,
    followingCount: 290,
  },
  {
    id: "u8",
    name: "Grace Hill",
    handle: "grace.style",
    avatarUrl: "https://i.pravatar.cc/150?img=27",
    bio: "Weekend energy and cozy vibes",
    vibes: ["Cozy", "Casual", "Weekend"],
    followerCount: 680,
    followingCount: 150,
  },
  {
    id: CURRENT_USER_ID,
    name: "You",
    handle: "you",
    avatarUrl: "https://i.pravatar.cc/150?img=32",
    bio: "Building a wardrobe that works",
    vibes: ["Minimal", "Versatile", "Casual"],
    followerCount: 1243,
    followingCount: 567,
  },
];

export function formatPostTime(iso: string): string {
  const d = new Date();
  const t = new Date(iso);
  const isToday = t.toDateString() === d.toDateString();
  return isToday
    ? `Today ${t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
    : t.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export const mockOOTDPosts: OOTDPost[] = [
  {
    id: "p1",
    userId: "u1",
    imageUrl:
      "https://images.unsplash.com/photo-1759726995149-d2d683fd38bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Effortless Sunday vibes ☕️",
    vibeTag: "Cafe study",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likeCount: 234,
    savedCount: 45,
    commentCount: 12,
    likedByUserIds: ["u2", "u4"],
    compatibilityScore: 82,
    aiInsight: "Matches your neutral palette and relaxed silhouette preference.",
    outfitItems: [
      { id: "p1-i1", type: "top", label: "White Cotton Shirt", position: { x: 48, y: 32 }, imageUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400", brand: "Everlane", color: "White" },
      { id: "p1-i2", type: "bottom", label: "Beige Wide-Leg Trousers", position: { x: 52, y: 62 }, imageUrl: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400", brand: "Aritzia", color: "Beige" },
      { id: "p1-i3", type: "shoes", label: "White Leather Sneakers", position: { x: 50, y: 88 }, imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400", brand: "Veja", color: "White" },
    ],
  },
  {
    id: "p2",
    userId: "u2",
    imageUrl:
      "https://images.unsplash.com/photo-1520483984082-37caa3093d0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Street style essentials 🤍",
    vibeTag: "Casual",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    likeCount: 567,
    savedCount: 89,
    commentCount: 28,
    likedByUserIds: ["u1", "u3", "u5"],
    compatibilityScore: 78,
    aiInsight: "Similar silhouette to your saved looks.",
    outfitItems: [
      { id: "p2-i1", type: "top", label: "Cream Knit", position: { x: 50, y: 28 }, imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400", brand: "& Other Stories", color: "Cream" },
      { id: "p2-i2", type: "bottom", label: "Navy Trousers", position: { x: 48, y: 58 }, imageUrl: "https://images.unsplash.com/photo-1624623278313-a930126a11c3?w=400", brand: "Zara", color: "Navy" },
      { id: "p2-i3", type: "shoes", label: "Black Sneakers", position: { x: 52, y: 85 }, imageUrl: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400", brand: "Veja", color: "Black" },
    ],
  },
  {
    id: "p3",
    userId: "u3",
    imageUrl:
      "https://images.unsplash.com/photo-1759229874914-c1ffdb3ebd0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Neutral tones for the win",
    vibeTag: "Work",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 421,
    savedCount: 67,
    commentCount: 19,
    likedByUserIds: ["u2"],
    compatibilityScore: 91,
    aiInsight: "Aligns with your minimal aesthetic and office-ready style.",
    outfitItems: [
      { id: "p3-i1", type: "top", label: "White Linen Shirt", position: { x: 50, y: 30 }, imageUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400", brand: "Everlane", color: "White" },
      { id: "p3-i2", type: "bottom", label: "Beige Trousers", position: { x: 50, y: 60 }, imageUrl: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400", brand: "Aritzia", color: "Beige" },
      { id: "p3-i3", type: "outerwear", label: "Camel Coat", position: { x: 48, y: 22 }, imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400", brand: "COS", color: "Camel" },
      { id: "p3-i4", type: "shoes", label: "Black Loafers", position: { x: 52, y: 88 }, imageUrl: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400", brand: "Veja", color: "Black" },
    ],
  },
  {
    id: "p4",
    userId: "u4",
    imageUrl:
      "https://images.unsplash.com/photo-1759873821340-24189bde9922?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Beige everything 🥐",
    vibeTag: "Casual",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 389,
    savedCount: 52,
    commentCount: 15,
    likedByUserIds: ["u1", "u5"],
    compatibilityScore: 88,
    aiInsight: "Complements your beige and cream palette.",
    outfitItems: [
      { id: "p4-i1", type: "top", label: "Cream Sweater", position: { x: 50, y: 35 }, imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400", brand: "& Other Stories", color: "Cream" },
      { id: "p4-i2", type: "bottom", label: "Tan Trousers", position: { x: 50, y: 65 }, imageUrl: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400", brand: "Aritzia", color: "Beige" },
    ],
  },
  {
    id: "p5",
    userId: "u5",
    imageUrl:
      "https://images.unsplash.com/photo-1769107805465-bfd41863f1a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Less is more",
    vibeTag: "Minimalist",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 502,
    savedCount: 120,
    commentCount: 22,
    likedByUserIds: ["u1", "u2", "u6"],
    compatibilityScore: 85,
    aiInsight: "Clean lines that match your closet core.",
    outfitItems: [
      { id: "p5-i1", type: "top", label: "White Tee", position: { x: 48, y: 34 }, imageUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400", brand: "Everlane", color: "White" },
      { id: "p5-i2", type: "bottom", label: "Black Trousers", position: { x: 52, y: 62 }, imageUrl: "https://images.unsplash.com/photo-1624623278313-a930126a11c3?w=400", brand: "Zara", color: "Navy" },
      { id: "p5-i3", type: "shoes", label: "White Sneakers", position: { x: 50, y: 86 }, imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400", brand: "Veja", color: "White" },
    ],
  },
  {
    id: "p6",
    userId: "u6",
    imageUrl:
      "https://images.unsplash.com/photo-1700557477628-c200fa4cd6da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Golden hour fits hit different ✨",
    vibeTag: "Date night",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 892,
    savedCount: 200,
    commentCount: 45,
    likedByUserIds: ["u1", "u3", "u4", "u5"],
    compatibilityScore: 79,
    aiInsight: "Warm tones and dressy-casual vibe align with your saved outfits.",
  },
  {
    id: "p7",
    userId: "u7",
    imageUrl:
      "https://images.unsplash.com/photo-1629922949137-e236a5ab497d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Clean lines, clean mind",
    vibeTag: "Work",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 654,
    savedCount: 98,
    commentCount: 31,
    likedByUserIds: ["u2", "u6"],
    compatibilityScore: 84,
    aiInsight: "Professional minimal look similar to your style.",
  },
  {
    id: "p8",
    userId: "u8",
    imageUrl:
      "https://images.unsplash.com/photo-1592327877233-90b9bfd92e48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Weekend energy",
    vibeTag: "Casual",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 445,
    savedCount: 61,
    commentCount: 18,
    likedByUserIds: [],
    compatibilityScore: 76,
    aiInsight: "Relaxed weekend vibe that fits your casual preferences.",
  },
];

export const mockComments: Comment[] = [
  { id: "c1", postId: "p1", userId: "u2", text: "Love this fit! Where’s the top from?", createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: "c2", postId: "p1", userId: "u4", text: "So cozy and chic 💚", createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString() },
  { id: "c3", postId: "p2", userId: "u1", text: "Street style goals", createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: "c4", postId: "p3", userId: "u5", text: "Neutral perfection", createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
];

// Preset gallery for "Post OOTD" (simulated upload)
export const presetGalleryImages: string[] = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
  "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600",
  "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=600",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600",
];