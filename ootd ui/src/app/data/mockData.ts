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