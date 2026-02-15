import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { useAppStore } from "../context/AppStore";
import { getItemsInCategory, submitComparison } from "../../services/api/ranking";
import type { Category } from "../../types/database";
import type { ItemWithRanking } from "../../lib/ranking";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "shirts", label: "Shirts & Tops" },
  { value: "pants", label: "Pants" },
  { value: "skirts_dresses", label: "Dresses & Skirts" },
  { value: "jackets_outerwear", label: "Jackets & Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "bags", label: "Bags" },
];

function pickTwo(items: ItemWithRanking[]): [ItemWithRanking, ItemWithRanking] | null {
  if (items.length < 2) return null;
  const i = Math.floor(Math.random() * items.length);
  let j = Math.floor(Math.random() * items.length);
  while (j === i) j = Math.floor(Math.random() * items.length);
  return [items[i], items[j]];
}

export function ReRank() {
  const navigate = useNavigate();
  const { currentUserId, isUsingApi } = useAppStore();
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<ItemWithRanking[]>([]);
  const [pair, setPair] = useState<[ItemWithRanking, ItemWithRanking] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonsDone, setComparisonsDone] = useState(0);

  const loadCategory = useCallback(
    async (cat: Category) => {
      if (!isUsingApi || !currentUserId) return;
      setLoading(true);
      setError(null);
      try {
        const list = await getItemsInCategory(currentUserId, cat);
        setItems(list);
        setPair(pickTwo(list));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load items");
      } finally {
        setLoading(false);
      }
    },
    [isUsingApi, currentUserId]
  );

  useEffect(() => {
    if (category) loadCategory(category);
  }, [category, loadCategory]);

  const handleChoice = async (winnerId: string, loserId: string) => {
    if (!pair) return;
    try {
      await submitComparison(winnerId, loserId);
      setComparisonsDone((c) => c + 1);
      const [a, b] = pair;
      const updated = items.map((item) => {
        if (item.id === winnerId) return { ...item, rating: item.rating + 0.2 };
        if (item.id === loserId) return { ...item, rating: Math.max(0, item.rating - 0.2) };
        return item;
      });
      setItems(updated);
      const next = pickTwo(updated);
      setPair(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save ranking");
    }
  };

  if (!isUsingApi) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] p-6">
        <p className="text-neutral-500">Sign in to re-rank your closet.</p>
        <Button variant="link" onClick={() => navigate("/profile")}>
          Back to profile
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-medium text-neutral-900">Re-rank items</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {!category ? (
          <div>
            <p className="mb-4 text-sm text-neutral-600">Pick a category to re-rank</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className="rounded-xl border border-neutral-200 bg-white p-4 text-left text-sm font-medium text-neutral-900 shadow-sm hover:border-[#8B9B8E] hover:bg-[#8B9B8E]/5"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-neutral-600">
                Which do you prefer? ({comparisonsDone} comparisons)
              </p>
              <button
                type="button"
                onClick={() => setCategory(null)}
                className="text-xs text-neutral-500 hover:underline"
              >
                Change category
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {loading ? (
              <p className="py-12 text-center text-neutral-500">Loading items…</p>
            ) : items.length < 2 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                <p className="text-sm text-neutral-500">
                  Need at least 2 items in this category to re-rank.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/closet")}
                >
                  Add items in Closet
                </Button>
              </div>
            ) : pair ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleChoice(pair[0].id, pair[1].id)}
                  className="overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-md transition-all hover:border-[#8B9B8E] hover:shadow-lg"
                >
                  <div className="aspect-square overflow-hidden bg-neutral-100">
                    <img
                      src={pair[0].image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3 text-left">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {pair[0].brand || "Item"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Rating: {Number(pair[0].rating).toFixed(1)}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChoice(pair[1].id, pair[0].id)}
                  className="overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-md transition-all hover:border-[#8B9B8E] hover:shadow-lg"
                >
                  <div className="aspect-square overflow-hidden bg-neutral-100">
                    <img
                      src={pair[1].image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3 text-left">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {pair[1].brand || "Item"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Rating: {Number(pair[1].rating).toFixed(1)}
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              <p className="py-12 text-center text-neutral-500">No more pairs.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
