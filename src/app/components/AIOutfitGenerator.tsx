import React, { useState, useEffect, useRef } from "react";
import { Search, ShoppingBag, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { searchShoppingItems, getRetailerName, type ShoppingItem } from "../../services/shopping";

interface OutfitResult {
  id: string;
  imageUrl: string;
  brand?: string;
  description: string;
  source: "closet" | "external";
  items?: string[];
  price?: string;
  url?: string;
  retailer?: string;
}

export function AIOutfitGenerator() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<OutfitResult[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [suggestions, setSuggestions] = useState<ShoppingItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const exampleSearches = [
    "White shirt",
    "Dinner date",
    "Paris trip",
    "Grunge aesthetic",
    "Office casual",
    "Weekend brunch",
  ];

  // Fetch suggestions as user types
  useEffect(() => {
    if (!searchQuery.trim() || hasSearched) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const items = await searchShoppingItems(searchQuery, 6);
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, hasSearched]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    console.log("[AIOutfitGenerator] handleSearch called with query:", searchQuery);
    setHasSearched(true);
    setIsSearching(true);
    setShowSuggestions(false);

    try {
      // Fetch real items from Bright Data
      console.log("[AIOutfitGenerator] Calling searchShoppingItems...");
      const shoppingItems = await searchShoppingItems(searchQuery, 12);
      console.log("[AIOutfitGenerator] Received shopping items:", shoppingItems.length);

      // Convert ShoppingItem to OutfitResult format
      console.log("[AIOutfitGenerator] Converting shopping items to results...");
      const externalResults: OutfitResult[] = shoppingItems.map((item, index) => {
        const result = {
          id: item.id,
          imageUrl: item.imageUrl,
          brand: item.brand,
          description: item.description || item.title,
          source: "external" as const,
          price: item.price,
          url: item.url,
          retailer: item.retailer,
        };
        console.log(`[AIOutfitGenerator] Converted item ${index}:`, result);
        return result;
      });
      console.log("[AIOutfitGenerator] Total external results:", externalResults.length);

      // For now, we'll show all external results
      // In the future, you could integrate with closet items here
      const closetResults: OutfitResult[] = []; // Could fetch from user's closet in the future

      const allResults = [...closetResults, ...externalResults];

      // Update reasoning based on results
      if (allResults.length > 0) {
        const retailerCounts = new Map<string, number>();
        externalResults.forEach((item) => {
          const retailer = item.retailer || "various retailers";
          retailerCounts.set(retailer, (retailerCounts.get(retailer) || 0) + 1);
        });

        const retailers = Array.from(retailerCounts.keys());
        const retailerText =
          retailers.length > 0
            ? retailers.length === 1
              ? retailers[0]
              : retailers.slice(0, 2).join(" and ") + (retailers.length > 2 ? ` and more` : "")
            : "various retailers";

        setReasoning(
          `Found ${allResults.length} items matching "${searchQuery}" from ${retailerText}. These curated picks are available online and match your search criteria.`
        );
      } else {
        setReasoning(
          `No items found for "${searchQuery}". Try a different search term or check back later.`
        );
      }

      setResults(allResults);
    } catch (error) {
      console.error("Failed to search:", error);
      setReasoning(
        `Unable to search for "${searchQuery}" at the moment. Please try again later.`
      );
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setSearchQuery("");
    setHasSearched(false);
    setResults([]);
    setReasoning("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (item: ShoppingItem) => {
    setSearchQuery(item.title);
    setShowSuggestions(false);
    // Optionally trigger search automatically
    // handleSearch();
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-[#8B9B8E]" />
            <h1 className="text-base tracking-tight text-neutral-900">Shopping</h1>
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

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm"
          >
            <div className="p-6">
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
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                      setShowSuggestions(false);
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder="e.g. white shirt, blazer, jeans..."
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-neutral-900 focus:bg-white"
                />
                
                {/* Search Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && (suggestions.length > 0 || isLoadingSuggestions) && (
                    <div
                      ref={suggestionsRef}
                      className="absolute left-0 right-0 top-full z-50 mt-2"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="max-h-96 overflow-y-auto rounded-xl border border-neutral-200/60 bg-white shadow-lg"
                      >
                        {isLoadingSuggestions ? (
                          <div className="p-4 text-center text-sm text-neutral-500">
                            Searching...
                          </div>
                        ) : suggestions.length > 0 ? (
                          <div className="py-2">
                            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Shop from Web
                            </div>
                            {suggestions.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleSuggestionClick(item)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
                              >
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-sm font-medium text-neutral-900">
                                    {item.title}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-neutral-500">{item.brand}</p>
                                    <span className="text-xs text-neutral-400">•</span>
                                    <p className="text-xs font-medium text-neutral-700">{item.price}</p>
                                  </div>
                                  <p className="text-xs text-neutral-400">
                                    {getRetailerName(item.retailer)}
                                  </p>
                                </div>
                                <ExternalLink className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm text-white transition-all hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {isSearching ? "Searching..." : "Generate Results"}
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
        <AnimatePresence mode="wait">
          {hasSearched && (
            <motion.div
              key="search-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* AI Reasoning */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B9B8E]/10">
                    <ShoppingBag className="h-3.5 w-3.5 text-[#8B9B8E]" />
                  </div>
                  <span className="text-xs uppercase tracking-wide text-neutral-500">
                    Shopping Recommendations
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-600">
                  {reasoning}
                </p>
              </motion.div>

              {/* From Your Closet - Only show if there are closet results */}
              {results.filter((r) => r.source === "closet").length > 0 && (
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm uppercase tracking-wide text-neutral-500">
                      From Your Closet
                    </h3>
                    <span className="text-xs text-neutral-400">
                      {results.filter((r) => r.source === "closet").length} items
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
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

              {/* Web Shopping Results */}
              {isSearching ? (
                <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-neutral-200/60 bg-white py-12">
                  <div className="text-center">
                    <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#8B9B8E] border-t-transparent" />
                    <p className="text-sm text-neutral-500">Searching for items...</p>
                  </div>
                </div>
              ) : results.filter((r) => r.source === "external").length > 0 ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm uppercase tracking-wide text-neutral-500">
                      Shop from Web
                    </h3>
                    <span className="text-xs text-neutral-400">
                      {results.filter((r) => r.source === "external").length} items
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {results
                      .filter((r) => r.source === "external")
                      .map((result, index) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
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
                              {result.price && (
                                <span className="rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[10px] text-neutral-900 backdrop-blur-sm">
                                  {result.price}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-4">
                            <p className="mb-2 text-xs font-medium text-neutral-900">
                              {result.description}
                            </p>
                            {result.retailer && (
                              <p className="mb-2 text-[10px] text-neutral-500">
                                {getRetailerName(result.retailer)}
                              </p>
                            )}
                            {result.url && result.url !== "#" && (
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#8B9B8E] hover:underline"
                              >
                                Shop now <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center">
                  <p className="text-sm text-neutral-500">No items found. Try a different search.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
