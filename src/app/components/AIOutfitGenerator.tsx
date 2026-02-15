import React, { useState, useEffect } from "react";
import { Search, Sparkles, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getShoppingItems, type ShoppingItem } from "../../services/api/shopping-items";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface OutfitResult {
  id: string;
  imageUrl: string;
  brand?: string;
  description: string;
  source: "closet" | "external";
  items?: string[];
  price?: string;
}

export function AIOutfitGenerator() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<OutfitResult[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

    // Default behavior for other searches
    setLoading(false);
    setResults(getDefaultResults());
    setReasoning(
      `Based on "${term}", I've curated 6 outfits that match your style profile. The first 3 are from your existing closet, optimized for versatility and seasonal relevance. The external picks complement your wardrobe gaps and align with your preference for neutral tones and minimal silhouettes.`
    );
  };

  const handleReset = () => {
    setSearchQuery("");
    setHasSearched(false);
    setResults([]);
    setReasoning("");
    setShoppingItems([]);
    setLoading(false);
  };

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
                      Shop White Shirts
                    </h3>
                    <span className="text-xs text-neutral-400">{shoppingItems.length} items</span>
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
                      {shoppingItems.map((item, index) => (
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
        <DialogContent className="max-w-md">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{selectedItem.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Product Image */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://via.placeholder.com/400x533?text=No+Image";
                    }}
                  />
                </div>

                {/* Product Info */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Brand</p>
                    <p className="text-base font-semibold text-neutral-900">
                      {selectedItem.brand || "Unknown Brand"}
                    </p>
                  </div>

                  {selectedItem.price !== null && selectedItem.price !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-neutral-600">Price</p>
                      <p className="text-xl font-bold text-[#8B9B8E]">
                        {selectedItem.currency || "$"}{selectedItem.price.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Hardcoded Rating */}
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Rating</p>
                    <p className="text-base text-neutral-900">
                      Cynthia rated this a <span className="font-semibold text-green-600">9.7</span>
                    </p>
                  </div>

                  {/* Additional Hardcoded Info */}
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Details</p>
                    <ul className="mt-1 space-y-1 text-sm text-neutral-600">
                      <li>• Premium quality fabric</li>
                      <li>• Machine washable</li>
                      <li>• Perfect for everyday wear</li>
                      <li>• Sustainable materials</li>
                    </ul>
                  </div>

                  {/* External Link Button */}
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B9B8E] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#7A8A7D]"
                  >
                    Shop Now
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
