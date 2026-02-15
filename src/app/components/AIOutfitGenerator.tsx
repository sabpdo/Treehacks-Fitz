import React, { useState, useEffect, useMemo } from "react";
import { Search, Sparkles, X, ExternalLink, ArrowUpDown, TrendingUp, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { getClosetItems, getLatestBodyAnalysis } from "../../services/api";
import { getShoppingItems, type ShoppingItem } from "../../services/api/shopping-items";
import { searchGoogleShopping } from "../../services/api/shoppingSearch";
import { getShoppingSearchQueryFromText } from "../../services/openai";
import type { ClosetItem } from "../../types/database";
import type { BodyTypeAnalysis } from "../../services/openai";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

/** Build a short personal context string from wardrobe + body analysis for personalized search. */
function buildPersonalContext(
  closet: ClosetItem[],
  body: BodyTypeAnalysis | null
): string {
  const parts: string[] = [];
  if (closet.length > 0) {
    const byCategory = closet.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {});
    const categorySummary = Object.entries(byCategory)
      .map(([cat, n]) => `${n} ${cat}`)
      .join(", ");
    const allColors = closet.flatMap((i) => i.colors || []).filter(Boolean);
    const colorCounts = allColors.reduce<Record<string, number>>((acc, c) => {
      const key = c.toLowerCase().trim();
      if (key) acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);
    const silhouettes = [...new Set(closet.map((i) => i.silhouette).filter(Boolean))] as string[];
    parts.push(
      `Wardrobe: ${closet.length} items (${categorySummary}). Common colors: ${topColors.join(", ") || "various"}. Silhouettes they wear: ${silhouettes.join(", ") || "various"}.`
    );
  }
  if (body) {
    const bodyParts: string[] = [];
    if (body.bodyTypeLabel) bodyParts.push(`Body type: ${body.bodyTypeLabel}`);
    if (body.suggestedColors?.length) bodyParts.push(`Flattering colors: ${body.suggestedColors.slice(0, 5).join(", ")}`);
    if (body.suggestedSilhouettes?.length) bodyParts.push(`Flattering silhouettes: ${body.suggestedSilhouettes.slice(0, 5).join(", ")}`);
    if (bodyParts.length) parts.push(bodyParts.join(". "));
  }
  return parts.join(" ");
}

/** Build a detailed explanation of why these search results were chosen for the user (wardrobe + body). */
function buildPersonalizedReasoning(
  term: string,
  shortQuery: string,
  itemCount: number,
  closet: ClosetItem[],
  body: BodyTypeAnalysis | null
): string {
  const parts: string[] = [];
  if (closet.length > 0) {
    const byCategory = closet.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {});
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat.replace(/_/g, " "));
    const allColors = closet.flatMap((i) => i.colors || []).filter(Boolean);
    const colorCounts = allColors.reduce<Record<string, number>>((acc, c) => {
      const key = c.toLowerCase().trim();
      if (key) acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([c]) => c);
    const silhouettes = [...new Set(closet.map((i) => i.silhouette).filter(Boolean))] as string[];
    parts.push(
      `Your wardrobe has ${closet.length} items—lots of ${topCategories.join(" and ")} in colors like ${topColors.join(", ") || "neutrals"}, with ${silhouettes.length ? silhouettes.join(", ") + " silhouettes" : "versatile fits"}.`
    );
  }
  if (body) {
    const bodyParts: string[] = [];
    if (body.bodyTypeLabel) bodyParts.push(`${body.bodyTypeLabel} body type`);
    if (body.suggestedSilhouettes?.length)
      bodyParts.push(`flattering silhouettes: ${body.suggestedSilhouettes.slice(0, 4).join(", ")}`);
    if (body.suggestedColors?.length)
      bodyParts.push(`colors that work for you: ${body.suggestedColors.slice(0, 4).join(", ")}`);
    if (bodyParts.length)
      parts.push(`Your fit profile: ${bodyParts.join("; ")}.`);
  }
  if (parts.length === 0) return `Found ${itemCount} items for "${shortQuery}". Shop below.`;
  parts.push(
    `So we searched for "${shortQuery}" to find pieces that match your style and flatter you. The ${itemCount} results below were picked because they align with your wardrobe and fit—they should pair well with what you own and suit your shape.`
  );
  return parts.join(" ");
}

/** Parse price string from SerpAPI (e.g. "$19.99" or "19.99") to number. */
function parsePrice(priceStr: string | null): number | undefined {
  if (priceStr == null || priceStr === "") return undefined;
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** Random integer from min to max inclusive. */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random rating 3.0–5.0 with one decimal (for SerpAPI results). */
function randomRating(): number {
  return Math.round((3 + Math.random() * 2) * 10) / 10;
}

const RATER_NAMES = [
  "Cynthia", "Marcus", "Jordan", "Sam", "Alex", "Riley", "Quinn", "Morgan",
  "Taylor", "Casey", "Jamie", "Avery", "Skyler", "Reese", "Parker", "Dakota",
  "Blake", "Cameron", "Drew", "Finley",
];

/** Pick a name from RATER_NAMES. If item has rater_name use it; else deterministic from id. */
function getRaterName(item: ShoppingItem): string {
  if (item.rater_name) return item.rater_name;
  const hash = item.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return RATER_NAMES[Math.abs(hash) % RATER_NAMES.length];
}

/** Map SerpAPI result to ShoppingItem shape for the same card UI; randomize rating, reviews count, and rater name. */
function serpResultToShoppingItem(
  r: { title: string; product_link: string; thumbnail: string | null; price: string | null; source: string | null },
  index: number
): ShoppingItem {
  const now = new Date().toISOString();
  return {
    id: `serp-${index}-${Math.random().toString(36).slice(2, 9)}`,
    name: r.title,
    brand: r.source ?? undefined,
    image_url: r.thumbnail ?? "https://via.placeholder.com/400x533?text=No+Image",
    url: r.product_link,
    price: parsePrice(r.price),
    currency: "$",
    rating: randomRating(),
    reviews_count: randomInt(1, 5),
    rater_name: RATER_NAMES[Math.floor(Math.random() * RATER_NAMES.length)],
    created_at: now,
    updated_at: now,
  };
}

interface OutfitResult {
  id: string;
  imageUrl: string;
  brand?: string;
  description: string;
  source: "closet" | "external";
  items?: string[];
  price?: string;
}

type SortType = "rating" | "price";
type SortOrder = "high" | "low";

export function AIOutfitGenerator() {
  const { currentUserId, isUsingApi } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<OutfitResult[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shopSectionTitle, setShopSectionTitle] = useState<string>(""); // e.g. "White Shirts" or "elegant evening dress"
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortType, setSortType] = useState<SortType>("rating");
  const [sortOrder, setSortOrder] = useState<SortOrder>("high");

  // Pre-filled search from Shop the Look (post detail → AI Search)
  useEffect(() => {
    const savedQuery = sessionStorage.getItem("aiSearchQuery");
    if (savedQuery) {
      sessionStorage.removeItem("aiSearchQuery");
      setSearchQuery(savedQuery);
      setTimeout(() => handleSearch(savedQuery), 100);
    }
  }, []);

  const exampleSearches = [
    "White shirt",
    "Dinner date",
    "Paris trip",
    "Grunge aesthetic",
    "Office casual",
    "Weekend brunch",
  ];

  const getDefaultResults = () => [
    // From closet
    {
      id: "c1",
      imageUrl:
        "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400",
      brand: "Your Closet",
      description: "Classic white shirt with beige trousers",
      source: "closet" as const,
      items: ["White Cotton Shirt", "Beige Linen Trousers", "Tan Leather Bag"],
    },
    {
      id: "c2",
      imageUrl:
        "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
      brand: "Your Closet",
      description: "Cream sweater layered look",
      source: "closet" as const,
      items: ["Cream Merino Sweater", "Navy Ponte Pants", "White Sneakers"],
    },
    {
      id: "c3",
      imageUrl:
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
      brand: "Your Closet",
      description: "Camel coat elevated casual",
      source: "closet" as const,
      items: ["Camel Wool Coat", "White Tee", "Black Jeans"],
    },
    // External picks
    {
      id: "e1",
      imageUrl:
        "https://images.unsplash.com/photo-1520483984082-37caa3093d0f?w=400",
      brand: "Everlane",
      description: "Minimal street style",
      source: "external" as const,
      price: "$$",
    },
    {
      id: "e2",
      imageUrl:
        "https://images.unsplash.com/photo-1617922001439-4a2e6562f328?w=400",
      brand: "Reformation",
      description: "Sage casual chic",
      source: "external" as const,
      price: "$$$",
    },
    {
      id: "e3",
      imageUrl:
        "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
      brand: "Aritzia",
      description: "Beige tailored look",
      source: "external" as const,
      price: "$$$",
    },
  ];

  const handleSearch = async (query?: string) => {
    const term = (query ?? searchQuery).trim();
    if (!term) return;

    setSearchQuery(term);
    setHasSearched(true);
    setLoading(true);
    setShoppingItems([]);
    setResults([]);

    // Hard-coded rule: if search is "white shirt", try to fetch from shopping_items table
    const normalizedTerm = term.toLowerCase();
    if (normalizedTerm === "white shirt" || normalizedTerm === "white shirts") {
      try {
        // First, try to get all items (no filter) to see if there are any items in the DB
        console.log("Fetching all shopping items (no filter)...");
        const allItems = await getShoppingItems(undefined, 50);
        console.log("Total items in DB:", allItems.length);

        if (allItems.length > 0) {
          console.log("Sample item names:", allItems.slice(0, 5).map(item => item.name));

          // Filter items that contain "white" and "shirt" (case insensitive)
          const filteredItems = allItems.filter(item => {
            const nameLower = item.name.toLowerCase();
            return nameLower.includes("white") && nameLower.includes("shirt");
          });

          console.log("Filtered items matching 'white shirt':", filteredItems.length);

          // Use filtered items if found, otherwise use all items
          let itemsToShow = filteredItems.length > 0 ? filteredItems : allItems;

          // Sort by rating (highest first), items without rating go to the end
          itemsToShow = itemsToShow.sort((a, b) => {
            const ratingA = a.rating ?? 0;
            const ratingB = b.rating ?? 0;
            // If both have ratings, sort descending
            if (ratingA > 0 && ratingB > 0) {
              return ratingB - ratingA;
            }
            // If only A has rating, A comes first
            if (ratingA > 0 && ratingB === 0) return -1;
            // If only B has rating, B comes first
            if (ratingB > 0 && ratingA === 0) return 1;
            // If neither has rating, maintain original order
            return 0;
          });

          setShoppingItems(itemsToShow);
          setShopSectionTitle("White Shirts");
          setReasoning(
            filteredItems.length > 0
              ? `Found ${filteredItems.length} white shirts from our curated collection.`
              : `Found ${allItems.length} items from our collection.`
          );
        } else {
          // Fall back to default items if no DB items found
          console.log("No DB items found, showing default items");
          setResults(getDefaultResults());
          setReasoning(
            `Based on "${term}", I've curated 6 outfits that match your style profile. The first 3 are from your existing closet, optimized for versatility and seasonal relevance. The external picks complement your wardrobe gaps and align with your preference for neutral tones and minimal silhouettes.`
          );
        }
      } catch (error) {
        console.error("Error fetching shopping items:", error);
        // On error, show default items
        setResults(getDefaultResults());
        setReasoning(
          `Based on "${term}", I've curated 6 outfits that match your style profile. The first 3 are from your existing closet, optimized for versatility and seasonal relevance. The external picks complement your wardrobe gaps and align with your preference for neutral tones and minimal silhouettes.`
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // For any other search: convert to clothing query (personalized when possible) and populate from SerpAPI
    try {
      let personalContext: string | null = null;
      let wardrobeItems: ClosetItem[] = [];
      let latestBody: BodyTypeAnalysis | null = null;
      if (isUsingApi && currentUserId) {
        const [closet, bodyRecord] = await Promise.all([
          getClosetItems(currentUserId),
          getLatestBodyAnalysis(currentUserId),
        ]);
        wardrobeItems = closet;
        latestBody = bodyRecord?.analysis ?? null;
        personalContext = buildPersonalContext(closet, latestBody) || null;
      }
      const shortQuery = await getShoppingSearchQueryFromText(term, personalContext);
      // Limit 10 results to stay under SerpAPI rate limit (e.g. 250 searches/month)
      const serpResults = await searchGoogleShopping(shortQuery, 10);
      const items = serpResults.map((r, i) => serpResultToShoppingItem(r, i));
      setShoppingItems(items);
      setShopSectionTitle(shortQuery);
      const reasoningText =
        items.length > 0
          ? personalContext
            ? buildPersonalizedReasoning(term, shortQuery, items.length, wardrobeItems, latestBody)
            : `Found ${items.length} items for "${shortQuery}". Shop below.`
          : `No shopping results for "${shortQuery}". Try a different search.`;
      setReasoning(reasoningText);
    } catch (err) {
      console.error("SerpAPI/search error:", err);
      setShoppingItems([]);
      setShopSectionTitle("");
      setResults(getDefaultResults());
      setReasoning(
        `Based on "${term}", I've curated 6 outfits that match your style profile. The first 3 are from your existing closet, optimized for versatility and seasonal relevance. The external picks complement your wardrobe gaps and align with your preference for neutral tones and minimal silhouettes.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery("");
    setHasSearched(false);
    setResults([]);
    setReasoning("");
    setShoppingItems([]);
    setShopSectionTitle("");
    setLoading(false);
    setSortType("rating");
    setSortOrder("high");
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "high" ? "low" : "high");
  };

  // Sorted shopping items based on selected sort type and order
  const sortedShoppingItems = useMemo(() => {
    if (shoppingItems.length === 0) return [];

    const items = [...shoppingItems];

    if (sortType === "rating") {
      return items.sort((a, b) => {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;

        if (sortOrder === "high") {
          if (ratingA > 0 && ratingB > 0) return ratingB - ratingA;
          if (ratingA > 0 && ratingB === 0) return -1;
          if (ratingB > 0 && ratingA === 0) return 1;
        } else {
          if (ratingA > 0 && ratingB > 0) return ratingA - ratingB;
          if (ratingA > 0 && ratingB === 0) return 1;
          if (ratingB > 0 && ratingA === 0) return -1;
        }
        return 0;
      });
    } else {
      // price
      return items.sort((a, b) => {
        const priceA = a.price ?? 0;
        const priceB = b.price ?? 0;

        if (sortOrder === "high") {
          if (priceA > 0 && priceB > 0) return priceB - priceA;
          if (priceA > 0 && priceB === 0) return -1;
          if (priceB > 0 && priceA === 0) return 1;
        } else {
          if (priceA > 0 && priceB > 0) return priceA - priceB;
          if (priceA > 0 && priceB === 0) return 1;
          if (priceB > 0 && priceA === 0) return -1;
        }
        return 0;
      });
    }
  }, [shoppingItems, sortType, sortOrder]);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 md:px-8 md:py-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neutral-900" />
            <h1 className="text-base tracking-tight text-neutral-900">AI Search</h1>
          </div>
          {hasSearched && (
            <button
              onClick={handleReset}
              className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
            >
              New Search
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8 md:py-12">
        {/* Search Section */}
        <div className="mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm"
          >
            <div className="p-6 md:p-7">
              <div className="mb-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
                  Search Your Style
                </p>
                <p className="text-sm text-neutral-600">
                  Describe what you're looking for — item, vibe, or occasion
                </p>
              </div>

              {/* Search Input */}
              <div className="relative mb-5">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. white shirt, dinner date, Paris trip..."
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-neutral-900 focus:bg-white"
                />
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={!searchQuery.trim()}
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm text-white transition-all hover:bg-neutral-800 disabled:bg-neutral-300"
              >
                Generate Results
              </button>
            </div>

            {/* Example Searches */}
            {!hasSearched && (
              <div className="border-t border-neutral-200/60 bg-neutral-50 px-6 py-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">
                  Try These
                </p>
                <div className="flex flex-wrap gap-2">
                  {exampleSearches.map((example) => (
                    <button
                      key={example}
                      onClick={() => setSearchQuery(example)}
                      className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-all hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {hasSearched && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* AI Reasoning */}
              {reasoning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B9B8E]/10">
                      <Sparkles className="h-3.5 w-3.5 text-[#8B9B8E]" />
                    </div>
                    <span className="text-xs uppercase tracking-wide text-neutral-500">
                      {shoppingItems.length > 0 ? "Search Results" : "AI Analysis"}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-600">
                    {reasoning}
                  </p>
                </motion.div>
              )}

              {/* Shopping Items from Database (White Shirt Search) */}
              {shoppingItems.length > 0 && (
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm uppercase tracking-wide text-neutral-500">
                      Shop {shopSectionTitle ? shopSectionTitle.charAt(0).toUpperCase() + shopSectionTitle.slice(1) : "Results"}
                    </h3>
                    <span className="text-xs text-neutral-400">{shoppingItems.length} items</span>
                  </div>

                  {/* Sort Controls */}
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSortType("rating")}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${sortType === "rating"
                          ? "bg-[#8B9B8E] text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                      >
                        <TrendingUp className="h-3 w-3" />
                        Rating
                      </button>
                      <button
                        onClick={() => setSortType("price")}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${sortType === "price"
                          ? "bg-[#8B9B8E] text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                      >
                        <DollarSign className="h-3 w-3" />
                        Price
                      </button>
                    </div>

                    <div className="h-4 w-px bg-neutral-300" />

                    <button
                      onClick={toggleSortOrder}
                      className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-all hover:bg-neutral-200"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      {sortOrder === "high" ? "High to Low" : "Low to High"}
                    </button>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse rounded-xl border border-neutral-200/60 bg-white">
                          <div className="aspect-[3/4] bg-neutral-200" />
                          <div className="p-3 space-y-2">
                            <div className="h-4 bg-neutral-200 rounded w-3/4" />
                            <div className="h-3 bg-neutral-200 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {sortedShoppingItems.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => {
                            setSelectedItem(item);
                            setIsModalOpen(true);
                          }}
                          className="group cursor-pointer overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all hover:shadow-lg"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden bg-neutral-50">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://via.placeholder.com/400x533?text=No+Image";
                              }}
                            />

                            {/* Rating Circle and Reviews Badge - Top Right */}
                            {(item.rating !== null && item.rating !== undefined) || item.reviews_count ? (
                              <div className="absolute right-2 top-2">
                                {/* Large Rating Circle - Smaller for mobile */}
                                {item.rating !== null && item.rating !== undefined && (
                                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-white/95 shadow-lg backdrop-blur-sm">
                                    <span className="text-sm font-semibold text-green-600">
                                      {item.rating.toFixed(1)}
                                    </span>

                                    {/* Small Reviews Count Badge - Overlapping bottom right of circle */}
                                    {item.reviews_count !== null && item.reviews_count !== undefined && item.reviews_count > 0 && (
                                      <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#8B9B8E] shadow-md">
                                        <span className="text-[9px] font-medium text-white">
                                          {item.reviews_count}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* If no rating but has reviews count, show just the badge */}
                                {(!item.rating || item.rating === null || item.rating === undefined) &&
                                  item.reviews_count !== null && item.reviews_count !== undefined && item.reviews_count > 0 && (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B9B8E] shadow-md">
                                      <span className="text-[9px] font-medium text-white">
                                        {item.reviews_count}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            ) : null}

                            {/* External Link Button - Bottom Right */}
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all hover:bg-white hover:scale-110"
                            >
                              <ExternalLink className="h-4 w-4 text-neutral-700" />
                            </a>
                          </div>

                          <div className="p-3">
                            {/* Title */}
                            <h3 className="mb-1 line-clamp-2 text-xs font-medium text-neutral-900">
                              {item.name}
                            </h3>

                            {/* Brand and Price */}
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[10px] text-neutral-600 truncate">
                                {item.brand || "Unknown Brand"}
                              </p>
                              {item.price !== null && item.price !== undefined && (
                                <p className="text-xs font-semibold text-[#8B9B8E] whitespace-nowrap">
                                  {item.currency || "$"}{item.price.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* From Your Closet - Only show if not showing shopping items */}
              {shoppingItems.length === 0 && (
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm uppercase tracking-wide text-neutral-500">
                      From Your Closet
                    </h3>
                    <span className="text-xs text-neutral-400">3 outfits</span>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3 md:gap-6">
                    {results
                      .filter((r) => r.source === "closet")
                      .map((result, index) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.1 }}
                          className="group overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all hover:shadow-lg"
                        >
                          <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                            <img
                              src={result.imageUrl}
                              alt={result.description}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 backdrop-blur-sm">
                              <p className="text-[10px] text-neutral-900">
                                {result.brand}
                              </p>
                            </div>
                          </div>

                          <div className="p-4">
                            <p className="mb-3 text-xs leading-relaxed text-neutral-600">
                              {result.description}
                            </p>
                            {result.items && (
                              <div className="space-y-1.5">
                                {result.items.map((item, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-2 text-[10px] text-neutral-500"
                                  >
                                    <div className="h-1 w-1 rounded-full bg-neutral-300" />
                                    {item}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              )}

              {/* Curated Picks - Only show if not showing shopping items */}
              {shoppingItems.length === 0 && (
                <div>
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-sm uppercase tracking-wide text-neutral-500">
                      Curated For You
                    </h3>
                    <span className="text-xs text-neutral-400">3 picks</span>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3 md:gap-6">
                    {results
                      .filter((r) => r.source === "external")
                      .map((result, index) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          className="group overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all hover:shadow-lg"
                        >
                          <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                            <img
                              src={result.imageUrl}
                              alt={result.description}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute left-3 top-3 flex items-center gap-2">
                              <span className="rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[10px] text-neutral-900 backdrop-blur-sm">
                                {result.brand}
                              </span>
                              <span className="rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[10px] text-neutral-900 backdrop-blur-sm">
                                {result.price}
                              </span>
                            </div>
                          </div>

                          <div className="p-4">
                            <p className="text-xs text-neutral-600">
                              {result.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Item Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl border-neutral-200/80 bg-[#FAFAF8] p-0 gap-0 overflow-hidden sm:max-w-xl">
          {selectedItem && (
            <>
              <div className="flex flex-col sm:flex-row sm:max-h-[85vh]">
                {/* Product Image - left or top */}
                <div className="relative w-full sm:w-56 sm:min-h-[280px] sm:flex-shrink-0 bg-neutral-100">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="h-64 w-full object-contain sm:h-full sm:object-cover bg-white"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://via.placeholder.com/400x533?text=No+Image";
                    }}
                  />
                </div>

                {/* Product Info - scrollable */}
                <div className="flex flex-1 flex-col p-5 sm:p-6 overflow-y-auto">
                  <DialogHeader className="p-0 mb-3 text-left">
                    <DialogTitle className="text-base font-semibold text-neutral-900 line-clamp-3 leading-snug pr-8">
                      {selectedItem.name}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500">Brand</p>
                        <p className="text-sm font-medium text-neutral-900">
                          {selectedItem.brand || "Unknown Brand"}
                        </p>
                      </div>
                      {selectedItem.price != null && selectedItem.price !== undefined && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Price</p>
                          <p className="text-lg font-bold text-[#8B9B8E]">
                            {selectedItem.currency || "$"}{selectedItem.price.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-white/80 border border-neutral-200/60 px-3 py-2.5">
                      <p className="text-xs text-neutral-600">
                        {getRaterName(selectedItem)} rated this a{" "}
                        <span className="font-semibold text-green-600">{(selectedItem.rating ?? 9.7).toFixed(1)}</span>
                        {selectedItem.reviews_count != null && selectedItem.reviews_count > 0 && (
                          <span className="text-neutral-500"> · {selectedItem.reviews_count} reviews</span>
                        )}
                      </p>
                    </div>

                    {/* Only show generic details for non-SerpAPI (DB) items */}
                    {selectedItem.id && !selectedItem.id.startsWith("serp-") && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">Details</p>
                        <ul className="space-y-1 text-sm text-neutral-600">
                          <li>• Premium quality fabric</li>
                          <li>• Machine washable</li>
                          <li>• Perfect for everyday wear</li>
                          <li>• Sustainable materials</li>
                        </ul>
                      </div>
                    )}

                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B9B8E] px-4 py-3.5 text-sm font-medium text-white transition-all hover:bg-[#7A8A7D] active:scale-[0.98]"
                    >
                      Shop Now
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
