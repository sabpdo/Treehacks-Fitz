import { useState } from "react";
import { Search, ShoppingCart, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { searchProducts } from "../../services/api/shopping";
import type { ScrapedProduct } from "../../types/shopping";
import { getCategoryIcon } from "../../lib/categories";

export function Shopping() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const results = await searchProducts(query.trim());
      setProducts(results);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7F4] to-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="mb-4 text-2xl font-semibold tracking-tight text-neutral-900">
            Shopping
          </h1>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search for clothing (e.g., 'black jacket', 'summer dress')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 rounded-full border-neutral-300"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="rounded-full bg-[#8B9B8E] px-6 hover:bg-[#7A8A7D] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <ShoppingCart className="mb-4 h-16 w-16 text-neutral-300" />
            <h2 className="mb-2 text-xl font-medium text-neutral-700">
              Find your next favorite piece
            </h2>
            <p className="text-sm text-neutral-500">
              Search for clothing from H&M, Zara, Uniqlo, and more
            </p>
          </motion.div>
        )}

        {/* Products Grid */}
        <AnimatePresence mode="wait">
          {products.length > 0 && (
            <motion.div
              key="products"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {products.map((product, index) => (
                <motion.div
                  key={`${product.url}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all hover:border-[#8B9B8E] hover:shadow-md"
                >
                  {/* Product Image */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingCart className="h-12 w-12 text-neutral-300" />
                      </div>
                    )}

                    {/* Store Badge */}
                    <div className="absolute left-2 top-2">
                      <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-neutral-700 backdrop-blur-sm">
                        {product.store}
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="mb-1 line-clamp-2 text-sm font-medium text-neutral-900">
                      {product.name}
                    </h3>

                    {product.category && (
                      <div className="mb-2 flex items-center gap-1 text-xs text-neutral-500">
                        <span>{getCategoryIcon(product.category)}</span>
                        <span className="capitalize">{product.category.replace('_', ' ')}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-[#8B9B8E]">
                        {product.price}
                      </p>
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-neutral-600 transition-colors hover:text-[#8B9B8E]"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <div className="aspect-[3/4] animate-pulse bg-neutral-200" />
                <div className="p-4">
                  <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
                  <div className="mb-3 h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
                  <div className="h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}