import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Category, AIImageAnalysis } from '../../types/database';
import type { ItemWithRanking } from '../../lib/ranking';
import { RankingSession } from './RankingSession';
import { startRankingSession } from '../../services/api/ranking';

interface MultiItemRankingFlowProps {
  imageUrl: string;
  detectedItems: AIImageAnalysis[];
  createdItemIds: string[]; // IDs of created closet items (one per detected item)
  onComplete: () => void;
  onSkip?: () => void;
}

interface RankingSessionData {
  itemId: string;
  category: Category;
  newItem: ItemWithRanking;
  itemsToCompare: ItemWithRanking[];
  totalComparisons: number;
}

export function MultiItemRankingFlow({
  imageUrl,
  detectedItems,
  createdItemIds,
  onComplete,
  onSkip,
}: MultiItemRankingFlowProps) {
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [rankingSessions, setRankingSessions] = useState<RankingSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize ranking sessions for all items
  useEffect(() => {
    async function initializeRankingSessions() {
      try {
        setLoading(true);
        const sessions: RankingSessionData[] = [];

        for (let i = 0; i < createdItemIds.length; i++) {
          const itemId = createdItemIds[i];
          const detectedItem = detectedItems[i];

          // Start ranking session for this item
          const sessionData = await startRankingSession(itemId, detectedItem.category);

          // Only add session if there are items to compare
          if (sessionData.itemsToCompare.length > 0) {
            sessions.push({
              itemId,
              category: detectedItem.category,
              ...sessionData,
            });
          }
        }

        setRankingSessions(sessions);
        setLoading(false);

        // If no sessions needed, complete immediately
        if (sessions.length === 0) {
          onComplete();
        }
      } catch (err) {
        console.error('Error initializing ranking sessions:', err);
        setError('Failed to start ranking sessions');
        setLoading(false);
      }
    }

    initializeRankingSessions();
  }, [createdItemIds, detectedItems]);

  const handleSessionComplete = (rankings: ItemWithRanking[]) => {
    // Move to next session or complete
    if (currentSessionIndex < rankingSessions.length - 1) {
      setCurrentSessionIndex(currentSessionIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div className="mx-4 max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-[#8B9B8E]" />
          </div>
          <h2 className="mb-2 text-xl font-medium text-neutral-900">Preparing Rankings...</h2>
          <p className="text-sm text-neutral-600">
            Setting up comparisons for your new items
          </p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div className="mx-4 max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <h2 className="mb-2 text-xl font-medium text-red-600">Error</h2>
          <p className="mb-6 text-sm text-neutral-600">{error}</p>
          <button
            onClick={handleSkip}
            className="w-full rounded-xl bg-neutral-900 py-3 text-sm text-white transition-colors hover:bg-neutral-800"
          >
            Continue
          </button>
        </div>
      </motion.div>
    );
  }

  if (rankingSessions.length === 0) {
    return null;
  }

  const currentSession = rankingSessions[currentSessionIndex];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentSessionIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Progress indicator for multiple items */}
        {rankingSessions.length > 1 && (
          <div className="fixed left-0 right-0 top-0 z-[60] bg-white px-6 py-3 shadow-sm">
            <div className="mx-auto flex max-w-4xl items-center justify-between">
              <p className="text-sm text-neutral-600">
                Ranking item {currentSessionIndex + 1} of {rankingSessions.length}
              </p>
              <div className="flex gap-1">
                {rankingSessions.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-8 rounded-full ${index < currentSessionIndex
                        ? 'bg-[#8B9B8E]'
                        : index === currentSessionIndex
                          ? 'bg-[#8B9B8E]/50'
                          : 'bg-neutral-200'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <RankingSession
          newItem={currentSession.newItem}
          itemsToCompare={currentSession.itemsToCompare}
          totalComparisons={currentSession.totalComparisons}
          category={currentSession.category}
          onComplete={handleSessionComplete}
          onSkip={rankingSessions.length > 1 ? undefined : handleSkip}
        />
      </motion.div>
    </AnimatePresence>
  );
}