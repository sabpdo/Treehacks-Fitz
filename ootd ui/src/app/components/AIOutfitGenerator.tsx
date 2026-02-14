import { useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

  const exampleSearches = [
    "White shirt",
    "Dinner date",
    "Paris trip",
    "Grunge aesthetic",
    "Office casual",
    "Weekend brunch",
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setHasSearched(true);

    // Mock AI results
    setReasoning(
      `Based on "${searchQuery}", I've curated 6 outfits that match your style profile. The first 3 are from your existing closet, optimized for versatility and seasonal relevance. The external picks complement your wardrobe gaps and align with your preference for neutral tones and minimal silhouettes.`
    );

    setResults([
      // From closet
      {
        id: "c1",
        imageUrl:
          "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400",
        brand: "Your Closet",
        description: "Classic white shirt with beige trousers",
        source: "closet",
        items: ["White Cotton Shirt", "Beige Linen Trousers", "Tan Leather Bag"],
      },
      {
        id: "c2",
        imageUrl:
          "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
        brand: "Your Closet",
        description: "Cream sweater layered look",
        source: "closet",
        items: ["Cream Merino Sweater", "Navy Ponte Pants", "White Sneakers"],
      },
      {
        id: "c3",
        imageUrl:
          "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
        brand: "Your Closet",
        description: "Camel coat elevated casual",
        source: "closet",
        items: ["Camel Wool Coat", "White Tee", "Black Jeans"],
      },
      // External picks
      {
        id: "e1",
        imageUrl:
          "https://images.unsplash.com/photo-1520483984082-37caa3093d0f?w=400",
        brand: "Everlane",
        description: "Minimal street style",
        source: "external",
        price: "$$",
      },
      {
        id: "e2",
        imageUrl:
          "https://images.unsplash.com/photo-1617922001439-4a2e6562f328?w=400",
        brand: "Reformation",
        description: "Sage casual chic",
        source: "external",
        price: "$$$",
      },
      {
        id: "e3",
        imageUrl:
          "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
        brand: "Aritzia",
        description: "Beige tailored look",
        source: "external",
        price: "$$$",
      },
    ]);
  };

  const handleReset = () => {
    setSearchQuery("");
    setHasSearched(false);
    setResults([]);
    setReasoning("");
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#8B9B8E]" />
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
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. white shirt, dinner date, Paris trip..."
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-neutral-900 focus:bg-white"
                />
              </div>

              <button
                onClick={handleSearch}
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
                    AI Analysis
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-600">
                  {reasoning}
                </p>
              </motion.div>

              {/* From Your Closet */}
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm uppercase tracking-wide text-neutral-500">
                    From Your Closet
                  </h3>
                  <span className="text-xs text-neutral-400">3 outfits</span>
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

              {/* Curated Picks */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm uppercase tracking-wide text-neutral-500">
                    Curated For You
                  </h3>
                  <span className="text-xs text-neutral-400">3 picks</span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
