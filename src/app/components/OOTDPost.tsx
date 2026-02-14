import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload, Flame, Tag, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export function OOTDPost() {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [vibeTag, setVibeTag] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    // Mock post submission
    navigate("/");
  };

  const suggestedTags = [
    "cafe study",
    "date night",
    "girls night",
    "work mode",
    "weekend vibes",
    "brunch",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7F4] to-[#FAFAF8]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-neutral-600 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Cancel</span>
          </button>
          <h1 className="text-lg tracking-tight">New OOTD</h1>
          <button
            onClick={handlePost}
            disabled={!selectedImage || !caption}
            className="rounded-full bg-[#8B9B8E] px-5 py-2 text-sm text-white transition-all hover:bg-[#7A8A7D] disabled:bg-neutral-300 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Streak Indicator */}
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
                <p className="mb-0.5 text-sm text-neutral-600">
                  Keep it going!
                </p>
                <p className="text-lg">7-day posting streak 🔥</p>
              </div>
            </div>
            <Sparkles className="h-6 w-6 text-orange-400" />
          </div>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <label
            htmlFor="image-upload"
            className="group relative flex aspect-[4/5] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-neutral-300 bg-white/50 backdrop-blur-sm transition-all hover:border-[#8B9B8E] hover:bg-white"
          >
            {selectedImage ? (
              <>
                <img
                  src={selectedImage}
                  alt="Selected outfit"
                  className="h-full w-full rounded-3xl object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/30">
                  <div className="translate-y-4 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="rounded-full bg-white/90 px-6 py-3 backdrop-blur-sm">
                      <p className="text-sm">Change photo</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#8B9B8E]/20 to-[#9FA8A3]/20">
                  <Upload className="h-10 w-10 text-[#8B9B8E]" />
                </div>
                <p className="mb-2 text-sm">Upload your outfit photo</p>
                <p className="text-xs text-neutral-400">
                  Tap to select from gallery
                </p>
              </div>
            )}
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </motion.div>

        {/* Caption Input */}
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

        {/* Vibe Tag Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm"
        >
          <div className="p-5">
            <label className="mb-3 block text-xs tracking-wide text-neutral-400">
              VIBE TAG
            </label>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3">
              <Tag className="h-5 w-5 text-neutral-400" />
              <input
                type="text"
                value={vibeTag}
                onChange={(e) => setVibeTag(e.target.value)}
                placeholder="e.g. cafe study, date night..."
                className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>

            {/* Suggested Tags */}
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setVibeTag(tag)}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-all hover:border-[#8B9B8E] hover:bg-[#8B9B8E]/10 hover:text-[#8B9B8E]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tag Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="overflow-hidden rounded-2xl bg-white shadow-sm"
        >
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="mb-1 text-sm">Tag items from closet</p>
              <p className="text-xs text-neutral-400">
                Help others recreate your look
              </p>
            </div>
            <button className="rounded-full bg-[#8B9B8E]/10 px-4 py-2 text-sm text-[#8B9B8E] transition-colors hover:bg-[#8B9B8E]/20">
              Browse
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
