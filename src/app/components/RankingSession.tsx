import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import type { ClosetItem, Category } from '../../types/database';
import type { ItemWithRanking } from '../../lib/ranking';
import {
  submitComparison,
  getNextComparisonItem,
  completeRankingSession,
} from '../../services/api/ranking';
import { getCategoryLabel, getCategoryIcon } from '../../lib/categories';

interface RankingSessionProps {
  newItem: ClosetItem;
  itemsToCompare: ItemWithRanking[];
  totalComparisons: number;
  category: Category;
  onComplete: (rankings: ItemWithRanking[]) => void;
  onSkip?: () => void;
}

export function RankingSession({
  newItem,
  itemsToCompare,
  totalComparisons,
  category,
  onComplete,
  onSkip,
}: RankingSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comparisonsMade, setComparisonsMade] = useState<string[]>([]);
  const [currentComparisonItem, setCurrentComparisonItem] = useState<ItemWithRanking | null>(
    itemsToCompare[0] || null
  );
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const progress = totalComparisons > 0 ? (comparisonsMade.length / totalComparisons) * 100 : 100;

  useEffect(() => {
    // Get first comparison item
    if (itemsToCompare.length > 0 && !currentComparisonItem) {
      setCurrentComparisonItem(itemsToCompare[0]);
    }
  }, [itemsToCompare, currentComparisonItem]);

  const handleChoice = async (chosenItemId: string) => {
    if (!currentComparisonItem || loading) return;

    setSelectedItem(chosenItemId);
    setLoading(true);

    try {
      // Determine winner and loser
      const winnerId = chosenItemId;
      const loserId = chosenItemId === newItem.id ? currentComparisonItem.id : newItem.id;

      // Submit comparison to update Elo ratings
      await submitComparison(winnerId, loserId);

      // Track comparison
      const newComparisonsMade = [...comparisonsMade, currentComparisonItem.id];
      setComparisonsMade(newComparisonsMade);

      // Check if we should continue
      if (newComparisonsMade.length >= totalComparisons) {
        // Session complete
        const rankings = await completeRankingSession(newItem.id, category);
        onComplete(rankings);
        return;
      }

      // Get next comparison item
      const nextItem = await getNextComparisonItem(
        newItem.id,
        category,
        newComparisonsMade
      );

      if (!nextItem) {
        // No more items to compare
        const rankings = await completeRankingSession(newItem.id, category);
        onComplete(rankings);
        return;
      }

      // Wait a moment to show selection, then move to next
      setTimeout(() => {
        setCurrentComparisonItem(nextItem);
        setCurrentIndex(currentIndex + 1);
        setSelectedItem(null);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error submitting comparison:', error);
      setLoading(false);
      setSelectedItem(null);
    }
  };

  if (itemsToCompare.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div className="mx-4 max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-medium text-neutral-900">First Item Added!</h2>
          <p className="mb-6 text-sm text-neutral-600">
            This is your first {getCategoryLabel(category).toLowerCase()} item. Add more to start
            ranking!
          </p>
          <button
            onClick={() => onComplete([])}
            className="w-full rounded-xl bg-neutral-900 py-3 text-sm text-white transition-colors hover:bg-neutral-800"
          >
            Done
          </button>
        </div>
      </motion.div>
    );
  }

  if (!currentComparisonItem) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#FAFAF8]"
    >
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCategoryIcon(category)}</span>
            <div>
              <h1 className="text-lg font-medium text-neutral-900">Rank Your New Item</h1>
              <p className="text-xs text-neutral-500">
                {comparisonsMade.length} of {totalComparisons} comparisons
              </p>
            </div>
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-4 max-w-4xl">
          <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
            <motion.div
              className="h-full bg-[#8B9B8E]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* Comparison */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="mb-6 text-center text-lg text-neutral-900">Which do you prefer?</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <AnimatePresence mode="wait">
              {/* New Item */}
              <ComparisonCard
                key={newItem.id}
                item={newItem}
                label="New Item"
                isSelected={selectedItem === newItem.id}
                onClick={() => handleChoice(newItem.id)}
                disabled={loading}
              />

              {/* Comparison Item */}
              <ComparisonCard
                key={currentComparisonItem.id}
                item={currentComparisonItem}
                currentRating={currentComparisonItem.rating}
                isSelected={selectedItem === currentComparisonItem.id}
                onClick={() => handleChoice(currentComparisonItem.id)}
                disabled={loading}
              />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ComparisonCardProps {
  item: ClosetItem;
  label?: string;
  currentRating?: number;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function ComparisonCard({
  item,
  label,
  currentRating,
  isSelected,
  onClick,
  disabled,
}: ComparisonCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden rounded-2xl border-2 transition-all ${isSelected
          ? 'border-[#8B9B8E] shadow-lg'
          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <img
          src={item.image_url}
          alt={item.subcategory || 'Item'}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Labels */}
        {label && (
          <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 backdrop-blur-sm">
            <p className="text-xs font-medium text-white">{label}</p>
          </div>
        )}

        {currentRating !== undefined && currentRating > 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 backdrop-blur-sm">
            <p className="text-sm font-medium text-neutral-900">{currentRating.toFixed(1)}/10</p>
          </div>
        )}

        {/* Selection overlay */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-[#8B9B8E]/20 backdrop-blur-[2px]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8B9B8E] shadow-lg">
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Item info */}
      <div className="bg-white p-4">
        <p className="mb-1 font-medium text-neutral-900">
          {item.brand || item.subcategory || 'Item'}
        </p>
        {item.subcategory && item.brand && (
          <p className="text-sm text-neutral-500">{item.subcategory}</p>
        )}
        {item.colors && item.colors.length > 0 && (
          <div className="mt-2 flex gap-1">
            {item.colors.slice(0, 3).map((color, i) => (
              <div
                key={i}
                className="h-4 w-4 rounded-full border border-neutral-200"
                style={{ backgroundColor: color.toLowerCase() }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}