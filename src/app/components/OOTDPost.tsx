import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload, Flame, Tag, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useAppStore } from "../context/AppStore";
import { CURRENT_USER_ID, presetGalleryImages } from "../data/mockData";
import type { OOTDPost } from "../data/mockData";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { createItemsFromOutfitPhoto } from "../../services/api/closet";
import { createPost, uploadImage, updateStreak } from "../../services/api";
import { apiPostToOOTDPost } from "../../lib/adapters";
import { MultiItemRankingFlow } from "./MultiItemRankingFlow";
import type { AIImageAnalysis } from "../../types/database";

function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mime = (arr[0].match(/:(.*?);/) || [])[1] || "image/png";
  const bstr = atob(arr[1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

/** Convert selected image (data URL or http URL) to a File for upload */
async function imageToFile(selectedImage: string, filename: string): Promise<File> {
  if (selectedImage.startsWith("data:")) {
    return dataURLtoFile(selectedImage, filename);
  }
  if (selectedImage.startsWith("http://") || selectedImage.startsWith("https://")) {
    const res = await fetch(selectedImage, { mode: "cors" });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const blob = await res.blob();
    const ext = blob.type?.split("/")[1] || "jpg";
    return new File([blob], filename.replace(/\.[^.]+$/, `.${ext}`), { type: blob.type || "image/jpeg" });
  }
  throw new Error("Invalid image source");
}

const VIBE_OPTIONS = ["Date night", "Casual", "Work", "Grunge", "Cafe study"];

export function OOTDPost() {
  const navigate = useNavigate();
  const { addPost, isUsingApi, currentUserId, refetchCurrentUser } = useAppStore();
  const [caption, setCaption] = useState("");
  const [vibeTag, setVibeTag] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRankingFlow, setShowRankingFlow] = useState(false);
  const [createdItemIds, setCreatedItemIds] = useState<string[]>([]);
  const [detectedItems, setDetectedItems] = useState<AIImageAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!selectedImage || !caption.trim()) return;

    // If OpenAI is not configured, post directly without AI analysis
    if (!(import.meta as any).env?.VITE_OPENAI_API_KEY) {
      await handlePostSimple();
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // Create closet items from the photo with AI analysis
      const { items, aiAnalysis } = await createItemsFromOutfitPhoto(selectedImage);

      // Store the created items and AI analysis for ranking
      setCreatedItemIds(items.map(item => item.id));
      setDetectedItems(aiAnalysis);

      // Show ranking flow
      setShowRankingFlow(true);
    } catch (err) {
      console.error('Error creating items:', err);
      setError('Failed to analyze photo. You can still post without AI tagging below.');
      setIsAnalyzing(false);
    }
  };

  const handlePostWithoutTagging = () => {
    setError(null);
    handlePostSimple();
  };

  const handlePostSimple = async () => {
    if (!selectedImage || !caption.trim()) return;
    if (isUsingApi) {
      try {
        setError(null);
        setIsPosting(true);
        const file = await imageToFile(selectedImage, "ootd.jpg");
        const imageUrl = await uploadImage(file);
        const apiPost = await createPost({
          image_url: imageUrl,
          caption: caption.trim(),
        });
        try {
          await updateStreak();
          await refetchCurrentUser();
        } catch {
          // ignore streak/refetch failure
        }
        addPost(apiPostToOOTDPost(apiPost, currentUserId));
        navigate("/");
      } catch (e) {
        console.error("Create post failed:", e);
        setError("Failed to create post. Please try again.");
      } finally {
        setIsPosting(false);
      }
      return;
    }
    const now = new Date().toISOString();
    const newPost: OOTDPost = {
      id: `p-${Date.now()}`,
      userId: CURRENT_USER_ID,
      imageUrl: selectedImage,
      caption: caption.trim(),
      vibeTag: vibeTag || "Casual",
      createdAt: now,
      likeCount: 0,
      savedCount: 0,
      commentCount: 0,
      likedByUserIds: [],
      compatibilityScore: 75 + Math.floor(Math.random() * 20),
      aiInsight: "Fresh fit — your style is showing.",
    };
    addPost(newPost);
    navigate("/");
  };

  const handleRankingComplete = async () => {
    if (isUsingApi && selectedImage) {
      try {
        const file = await imageToFile(selectedImage, "ootd.jpg");
        const imageUrl = await uploadImage(file);
        const apiPost = await createPost({
          image_url: imageUrl,
          caption: caption.trim(),
          item_ids: createdItemIds.length > 0 ? createdItemIds : undefined,
        });
        try {
          await updateStreak();
          await refetchCurrentUser();
        } catch {
          // ignore streak/refetch failure
        }
        addPost(apiPostToOOTDPost(apiPost, currentUserId));
        navigate("/");
      } catch (e) {
        console.error("Create post failed:", e);
        setError("Failed to create post. Please try again.");
      }
      return;
    }
    const now = new Date().toISOString();
    const newPost: OOTDPost = {
      id: `p-${Date.now()}`,
      userId: CURRENT_USER_ID,
      imageUrl: selectedImage!,
      caption: caption.trim(),
      vibeTag: vibeTag || "Casual",
      createdAt: now,
      likeCount: 0,
      savedCount: 0,
      commentCount: 0,
      likedByUserIds: [],
      compatibilityScore: 75 + Math.floor(Math.random() * 20),
      aiInsight: "Fresh fit — your style is showing.",
    };
    addPost(newPost);
    navigate("/");
  };

  const handleSkipRanking = () => {
    // Skip ranking and go straight to posting
    handleRankingComplete();
  };

  const canPost = selectedImage && caption.trim() && !isAnalyzing && !isPosting;
  const canPostSimple = selectedImage && caption.trim() && !isPosting;

  // Show ranking flow if items were created
  if (showRankingFlow && createdItemIds.length > 0 && selectedImage) {
    return (
      <MultiItemRankingFlow
        imageUrl={selectedImage}
        detectedItems={detectedItems}
        createdItemIds={createdItemIds}
        onComplete={handleRankingComplete}
        onSkip={handleSkipRanking}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7F4] to-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-neutral-200/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-neutral-600 transition-colors hover:text-neutral-900"
            disabled={isAnalyzing || isPosting}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Cancel</span>
          </button>
          <h1 className="text-lg tracking-tight">New OOTD</h1>
          <button
            onClick={handlePost}
            disabled={!canPost}
            className="rounded-full bg-[#8B9B8E] px-5 py-2 text-sm text-white transition-all hover:bg-[#7A8A7D] disabled:bg-neutral-300 disabled:opacity-50"
          >
            {isPosting ? 'Posting...' : isAnalyzing ? 'Analyzing...' : 'Post'}
          </button>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="mb-3">{error}</p>
            <p className="mb-3 text-xs text-red-600">
              You can still post your photo without AI tagging.
            </p>
            <Button
              onClick={handlePostWithoutTagging}
              disabled={!canPostSimple}
              className="rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              {isPosting ? 'Posting...' : 'Post without tagging'}
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-orange-50 to-rose-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="mb-0.5 text-sm text-neutral-600">Keep it going!</p>
                <p className="text-lg">7-day posting streak 🔥</p>
              </div>
            </div>
            <Sparkles className="h-6 w-6 text-orange-400" />
          </div>
        </motion.div>

        {/* Image: preset gallery or upload */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Choose from gallery
          </p>
          <div className="grid grid-cols-3 gap-2">
            {presetGalleryImages.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setSelectedImage(url)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-xl border-2 bg-neutral-100 transition-all",
                  selectedImage === url
                    ? "border-[#8B9B8E] ring-2 ring-[#8B9B8E]/30"
                    : "border-transparent hover:border-neutral-300"
                )}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-3 text-sm text-neutral-500 hover:border-[#8B9B8E] hover:text-[#8B9B8E]">
            <Upload className="h-4 w-4" />
            Or upload from device
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          {selectedImage && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                <img
                  src={selectedImage}
                  alt="Selected"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Caption */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm"
        >
          <div className="p-5">
            <label className="mb-2 block text-xs tracking-wide text-neutral-400">
              CAPTION
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share the story behind your outfit..."
              className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-neutral-400"
              rows={3}
            />
          </div>
        </motion.div>

        {/* Vibe tag selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm"
        >
          <div className="p-5">
            <label className="mb-3 flex items-center gap-2 text-xs tracking-wide text-neutral-400">
              <Tag className="h-4 w-4" />
              VIBE TAG
            </label>
            <div className="flex flex-wrap gap-2">
              {VIBE_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setVibeTag(tag)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-all",
                    vibeTag === tag
                      ? "border-[#8B9B8E] bg-[#8B9B8E]/10 text-[#8B9B8E]"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-[#8B9B8E] hover:bg-[#8B9B8E]/5"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.4 }}
          className="overflow-hidden rounded-2xl bg-white shadow-sm"
        >
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="mb-1 text-sm">Tag items from closet</p>
              <p className="text-xs text-neutral-400">Help others recreate your look</p>
            </div>
            <button type="button" className="rounded-full bg-[#8B9B8E]/10 px-4 py-2 text-sm text-[#8B9B8E] hover:bg-[#8B9B8E]/20">
              Browse
            </button>
          </div>
        </motion.div>

        {/* Bottom Post actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-col gap-3"
        >
          <p className="text-center text-xs text-neutral-500">
            Add a photo and caption above, then choose how to post.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handlePostSimple}
              disabled={!canPostSimple}
              className="flex-1 rounded-xl bg-neutral-900 py-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              Post now (no tagging)
            </Button>
            <Button
              onClick={handlePost}
              disabled={!canPost}
              variant="outline"
              className="flex-1 rounded-xl border-[#8B9B8E] py-4 text-sm font-medium text-[#8B9B8E] hover:bg-[#8B9B8E]/10 disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing…" : "Analyze & tag items"}
            </Button>
          </div>
          {!vibeTag && (
            <p className="text-center text-[10px] text-neutral-400">
              Optional: pick a vibe tag above for &quot;Analyze & tag items&quot;.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
