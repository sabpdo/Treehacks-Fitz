import { useState, useEffect } from "react";
import { X, Camera, Flame, Check, ChevronDown, Sparkles, Search, Plus, Upload, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { mockClosetItems } from "../data/mockData";

type CaptureStep = "camera" | "scanning" | "tagging" | "confirm";
type SwapModalView = "select" | "add-new";

interface DetectedItem {
  id: string;
  type: "top" | "bottom" | "shoes" | "accessory";
  position: { x: number; y: number };
  label: string;
  color: string;
  fabric?: string;
  silhouette?: string;
  closetMatch?: {
    id: string;
    brand: string;
    imageUrl: string;
  };
  isConfirmed: boolean;
}

export function OOTDCapture({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<CaptureStep>("camera");
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapModalView, setSwapModalView] = useState<SwapModalView>("select");
  const [swappingItemId, setSwappingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Add new item form state
  const [newItemData, setNewItemData] = useState({
    image: "",
    category: "",
    brand: "",
    color: "",
    fabric: "",
    silhouette: "",
  });

  // Mock camera capture
  const handleCapture = () => {
    setCapturedImage("https://images.unsplash.com/photo-1520483984082-37caa3093d0f?w=800");
    setStep("scanning");
  };

  // AI Scanning simulation
  useEffect(() => {
    if (step === "scanning") {
      const timer = setTimeout(() => {
        // Mock detected items
        setDetectedItems([
          {
            id: "item1",
            type: "top",
            position: { x: 50, y: 30 },
            label: "White Linen Shirt",
            color: "White",
            fabric: "Linen",
            silhouette: "Relaxed",
            closetMatch: {
              id: "1",
              brand: "Everlane",
              imageUrl: mockClosetItems[0].imageUrl,
            },
            isConfirmed: false,
          },
          {
            id: "item2",
            type: "bottom",
            position: { x: 50, y: 60 },
            label: "Beige Wide-Leg Trousers",
            color: "Beige",
            fabric: "Cotton",
            silhouette: "Wide Leg",
            closetMatch: {
              id: "2",
              brand: "Aritzia",
              imageUrl: mockClosetItems[1].imageUrl,
            },
            isConfirmed: false,
          },
          {
            id: "item3",
            type: "shoes",
            position: { x: 50, y: 85 },
            label: "White Leather Sneakers",
            color: "White",
            fabric: "Leather",
            silhouette: "Low-top",
            closetMatch: {
              id: "9",
              brand: "Nike",
              imageUrl: mockClosetItems[8].imageUrl,
            },
            isConfirmed: false,
          },
        ]);
        setStep("tagging");
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [step]);

  const confirmItem = (itemId: string) => {
    setDetectedItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, isConfirmed: true } : item
      )
    );
    setSelectedPin(null);
  };

  const openSwapModal = (itemId: string) => {
    setSwappingItemId(itemId);
    setShowSwapModal(true);
    setSwapModalView("select");
    setSearchQuery("");
    setCategoryFilter("all");
  };

  const selectSwapItem = (closetItemId: string) => {
    if (!swappingItemId) return;
    
    const closetItem = mockClosetItems.find((item) => item.id === closetItemId);
    if (!closetItem) return;

    setDetectedItems((items) =>
      items.map((item) =>
        item.id === swappingItemId
          ? {
              ...item,
              closetMatch: {
                id: closetItem.id,
                brand: closetItem.brand || "Unknown",
                imageUrl: closetItem.imageUrl,
              },
              label: `${closetItem.color} ${closetItem.category}`,
              color: closetItem.color,
              fabric: closetItem.fabric,
              silhouette: closetItem.silhouette,
            }
          : item
      )
    );

    setShowSwapModal(false);
    setSwappingItemId(null);
  };

  const handleAddNewItem = () => {
    // In a real app, this would save to the closet
    setShowSwapModal(false);
    setSwapModalView("select");
    setNewItemData({
      image: "",
      category: "",
      brand: "",
      color: "",
      fabric: "",
      silhouette: "",
    });
  };

  // Filter closet items based on search and category
  const getFilteredClosetItems = () => {
    let filtered = mockClosetItems;

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  // Get AI suggested matches (mock - would use actual AI in production)
  const getAISuggestedMatches = () => {
    const swappingItem = detectedItems.find((item) => item.id === swappingItemId);
    if (!swappingItem) return [];

    // Mock compatibility scoring
    return mockClosetItems
      .filter((item) => item.category === swappingItem.type)
      .slice(0, 3)
      .map((item, index) => ({
        ...item,
        compatibility: 95 - index * 8,
      }));
  };

  const allItemsConfirmed = detectedItems.every((item) => item.isConfirmed);

  const getColorStyle = (color: string) => {
    const colorMap: Record<string, string> = {
      white: "#F5F5F5",
      black: "#1a1a1a",
      beige: "#D4C5B9",
      navy: "#1F2937",
      gray: "#9CA3AF",
      sage: "#8B9B8E",
      cream: "#F5F1E8",
      camel: "#C19A6B",
      tan: "#D2B48C",
      gold: "#FFD700",
    };
    return colorMap[color.toLowerCase()] || "#E5E7EB";
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAF8]">
      {/* Camera Screen */}
      {step === "camera" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-full w-full"
        >
          <div className="h-full w-full bg-neutral-900">
            <img
              src="https://images.unsplash.com/photo-1520483984082-37caa3093d0f?w=800"
              alt="Camera preview"
              className="h-full w-full object-cover opacity-80"
            />
          </div>

          <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-6 py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="text-xs text-white">7 day streak</span>
              </div>
            </div>

            <div className="mt-8 text-center">
              <h1 className="text-base text-white">Post Today's Fit</h1>
              <p className="mt-1 text-xs text-white/70">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-6 pb-8 pt-12">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCapture}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur-sm transition-all hover:bg-white/30"
            >
              <Camera className="h-8 w-8 text-white" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* AI Scanning Screen */}
      {step === "scanning" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-full w-full"
        >
          <div className="h-full w-full bg-neutral-900">
            <img
              src={capturedImage}
              alt="Captured outfit"
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]">
              <div className="flex h-full flex-col items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm"
                    >
                      <Sparkles className="h-5 w-5 text-white" />
                    </motion.div>
                  </div>
                  <h2 className="mb-2 text-base text-white">Analyzing your fit...</h2>
                  <p className="text-xs text-white/60">Detecting items and styles</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent),
                      linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)
                    `,
                    backgroundSize: "50px 50px",
                  }}
                />

                <motion.div
                  initial={{ y: "-100%" }}
                  animate={{ y: "200%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Tagging Screen */}
      {step === "tagging" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-full w-full overflow-hidden"
        >
          <div className="absolute left-0 right-0 top-0 z-20 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-4">
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-all hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-sm text-neutral-900">Tag Your Items</h2>
              <button
                onClick={() => setStep("confirm")}
                disabled={!allItemsConfirmed}
                className={`text-sm transition-colors ${
                  allItemsConfirmed
                    ? "text-neutral-900 hover:text-neutral-600"
                    : "text-neutral-300"
                }`}
              >
                Next
              </button>
            </div>
          </div>

          <div className="relative h-full w-full pt-[65px]">
            <div className="relative mx-auto h-full max-w-2xl">
              <img
                src={capturedImage}
                alt="Captured outfit"
                className="h-full w-full object-cover"
              />

              <AnimatePresence>
                {detectedItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                    className="absolute"
                    style={{
                      left: `${item.position.x}%`,
                      top: `${item.position.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <button
                      onClick={() =>
                        setSelectedPin(selectedPin === item.id ? null : item.id)
                      }
                      className="relative"
                    >
                      <motion.div
                        animate={{
                          scale: selectedPin === item.id ? 1.2 : 1,
                        }}
                        className={`h-3 w-3 rounded-full border-2 border-white shadow-lg transition-all ${
                          item.isConfirmed ? "bg-[#8B9B8E]" : "bg-neutral-900"
                        }`}
                      />

                      {!item.isConfirmed && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0.5 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-neutral-900"
                        />
                      )}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {selectedPin && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedPin(null)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 mx-auto max-w-2xl overflow-hidden rounded-t-3xl border-t border-neutral-200/60 bg-white shadow-2xl"
                  >
                    {detectedItems
                      .filter((item) => item.id === selectedPin)
                      .map((item) => (
                        <div key={item.id} className="p-6">
                          <div className="mb-5 flex items-start justify-between">
                            <div>
                              <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                                {item.type}
                              </p>
                              <h3 className="mb-2 text-base text-neutral-900">
                                {item.label}
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                                  {item.color}
                                </span>
                                {item.fabric && (
                                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                                    {item.fabric}
                                  </span>
                                )}
                                {item.silhouette && (
                                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                                    {item.silhouette}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedPin(null)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {item.closetMatch ? (
                            <div className="mb-5">
                              <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">
                                Matched from Closet
                              </p>
                              <div className="flex items-center gap-3 rounded-xl border border-neutral-200/60 bg-neutral-50 p-3">
                                <img
                                  src={item.closetMatch.imageUrl}
                                  alt={item.closetMatch.brand}
                                  className="h-16 w-16 rounded-lg object-cover"
                                />
                                <div className="flex-1">
                                  <p className="mb-0.5 text-sm text-neutral-900">
                                    {item.closetMatch.brand}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {item.label}
                                  </p>
                                </div>
                                {item.isConfirmed && (
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B9B8E]">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="mb-5">
                              <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">
                                Not in Closet
                              </p>
                              <button className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 text-sm text-neutral-900 transition-all hover:bg-neutral-50">
                                Add as New Item
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {!item.isConfirmed ? (
                              <>
                                <button
                                  onClick={() => confirmItem(item.id)}
                                  className="rounded-xl bg-neutral-900 py-2.5 text-sm text-white transition-all hover:bg-neutral-800"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => openSwapModal(item.id)}
                                  className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-2.5 text-sm text-neutral-900 transition-all hover:bg-neutral-50"
                                >
                                  Swap
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setDetectedItems((items) =>
                                    items.map((i) =>
                                      i.id === item.id
                                        ? { ...i, isConfirmed: false }
                                        : i
                                    )
                                  )
                                }
                                className="col-span-2 rounded-xl border border-neutral-300 bg-white py-2.5 text-sm text-neutral-600 transition-all hover:bg-neutral-50"
                              >
                                Edit Selection
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Post Confirmation Screen */}
      {step === "confirm" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full w-full overflow-y-auto bg-[#FAFAF8]"
        >
          <div className="sticky top-0 z-20 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-4">
              <button
                onClick={() => setStep("tagging")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-all hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-sm text-neutral-900">Post</h2>
              <button className="text-sm text-neutral-900 transition-colors hover:text-neutral-600">
                Share
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-2xl px-6 py-6">
            <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
              <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                <img
                  src={capturedImage}
                  alt="Final outfit"
                  className="h-full w-full object-cover"
                />

                {detectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="absolute"
                    style={{
                      left: `${item.position.x}%`,
                      top: `${item.position.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="h-2 w-2 rounded-full border border-white bg-white/50 shadow-sm backdrop-blur-sm" />
                  </div>
                ))}

                <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                  <p className="text-xs text-neutral-900">86% aligned</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                rows={3}
                className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-neutral-900"
              />
            </div>

            <div className="mb-6">
              <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">
                Tagged Items
              </p>
              <div className="space-y-2">
                {detectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200/60 bg-white p-3"
                  >
                    {item.closetMatch && (
                      <img
                        src={item.closetMatch.imageUrl}
                        alt={item.closetMatch.brand}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="mb-0.5 text-sm text-neutral-900">
                        {item.closetMatch?.brand || item.label}
                      </p>
                      <p className="text-xs capitalize text-neutral-500">
                        {item.type}
                      </p>
                    </div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B9B8E]/10">
                      <Check className="h-3.5 w-3.5 text-[#8B9B8E]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm text-white transition-all hover:bg-neutral-800">
              Post to Feed
            </button>
          </div>
        </motion.div>
      )}

      {/* Swap Modal */}
      <AnimatePresence>
        {showSwapModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSwapModal(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] mx-auto max-h-[85vh] max-w-2xl overflow-hidden rounded-t-3xl border-t border-neutral-200/60 bg-[#FAFAF8] shadow-2xl"
            >
              {swapModalView === "select" ? (
                <div className="flex h-full max-h-[85vh] flex-col">
                  <div className="border-b border-neutral-200/60 bg-white px-6 py-4">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="mb-1 text-base text-neutral-900">
                          Select Matching Item
                        </h3>
                        <p className="text-xs text-neutral-500">
                          Choose from your closet or add new
                        </p>
                      </div>
                      <button
                        onClick={() => setShowSwapModal(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search your closet..."
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-neutral-900 focus:bg-white"
                      />
                    </div>

                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {[
                        { value: "all", label: "All" },
                        { value: "tops", label: "Tops" },
                        { value: "bottoms", label: "Bottoms" },
                        { value: "outerwear", label: "Outerwear" },
                        { value: "shoes", label: "Shoes" },
                        { value: "accessories", label: "Accessories" },
                      ].map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setCategoryFilter(cat.value)}
                          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs transition-all ${
                            categoryFilter === cat.value
                              ? "bg-neutral-900 text-white"
                              : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-[#8B9B8E]" />
                        <p className="text-xs uppercase tracking-wide text-neutral-500">
                          Best Matches
                        </p>
                      </div>

                      <div className="space-y-2">
                        {getAISuggestedMatches().map((item) => (
                          <motion.button
                            key={item.id}
                            onClick={() => selectSwapItem(item.id)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200/60 bg-white p-3 text-left shadow-sm transition-all hover:shadow-md"
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.brand || "Item"}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <p className="mb-1 text-sm text-neutral-900">
                                {item.brand || "Unknown Brand"}
                              </p>
                              <div className="mb-1.5 flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-full border border-neutral-300"
                                  style={{
                                    backgroundColor: getColorStyle(item.color),
                                  }}
                                />
                                <span className="text-xs text-neutral-500">
                                  {item.color}
                                </span>
                                {item.silhouette && (
                                  <>
                                    <span className="text-neutral-300">·</span>
                                    <span className="text-xs text-neutral-500">
                                      {item.silhouette}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex w-fit items-center gap-1.5 rounded-full bg-[#8B9B8E]/10 px-2 py-0.5">
                                <div className="h-1 w-1 rounded-full bg-[#8B9B8E]" />
                                <span className="text-[10px] text-[#8B9B8E]">
                                  {item.compatibility}% compatible
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-neutral-400" />
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">
                        Your Closet ({getFilteredClosetItems().length})
                      </p>

                      <div className="space-y-1.5">
                        {getFilteredClosetItems().map((item) => (
                          <motion.button
                            key={item.id}
                            onClick={() => selectSwapItem(item.id)}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.99 }}
                            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200/60 bg-white p-2.5 text-left transition-all hover:border-neutral-300 hover:bg-neutral-50"
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.brand || "Item"}
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="mb-0.5 truncate text-sm text-neutral-900">
                                {item.brand || "Unknown Brand"}
                              </p>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-full border border-neutral-300"
                                  style={{
                                    backgroundColor: getColorStyle(item.color),
                                  }}
                                />
                                <span className="text-xs text-neutral-500">{item.color}</span>
                                {item.silhouette && (
                                  <>
                                    <span className="text-neutral-300">·</span>
                                    <span className="truncate text-xs text-neutral-500">
                                      {item.silhouette}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-neutral-200/60 bg-white p-4">
                    <button
                      onClick={() => setSwapModalView("add-new")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-2.5 text-sm text-neutral-900 transition-all hover:bg-neutral-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Item
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full max-h-[85vh] flex-col">
                  <div className="border-b border-neutral-200/60 bg-white px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="mb-1 text-base text-neutral-900">Add New Item</h3>
                        <p className="text-xs text-neutral-500">
                          Fill in the details below
                        </p>
                      </div>
                      <button
                        onClick={() => setSwapModalView("select")}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Image
                        </label>
                        <div className="relative">
                          <Upload className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="text"
                            value={newItemData.image}
                            onChange={(e) =>
                              setNewItemData({ ...newItemData, image: e.target.value })
                            }
                            placeholder="Image URL or upload..."
                            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-neutral-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Category
                        </label>
                        <select
                          value={newItemData.category}
                          onChange={(e) =>
                            setNewItemData({ ...newItemData, category: e.target.value })
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                        >
                          <option value="">Select category...</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="outerwear">Outerwear</option>
                          <option value="shoes">Shoes</option>
                          <option value="accessory">Accessory</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Brand
                        </label>
                        <input
                          type="text"
                          value={newItemData.brand}
                          onChange={(e) =>
                            setNewItemData({ ...newItemData, brand: e.target.value })
                          }
                          placeholder="e.g. Everlane, Aritzia..."
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Color
                        </label>
                        <input
                          type="text"
                          value={newItemData.color}
                          onChange={(e) =>
                            setNewItemData({ ...newItemData, color: e.target.value })
                          }
                          placeholder="e.g. White, Black, Beige..."
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Fabric
                        </label>
                        <input
                          type="text"
                          value={newItemData.fabric}
                          onChange={(e) =>
                            setNewItemData({ ...newItemData, fabric: e.target.value })
                          }
                          placeholder="e.g. Cotton, Linen, Wool..."
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Silhouette
                        </label>
                        <input
                          type="text"
                          value={newItemData.silhouette}
                          onChange={(e) =>
                            setNewItemData({
                              ...newItemData,
                              silhouette: e.target.value,
                            })
                          }
                          placeholder="e.g. Fitted, Oversized, Wide Leg..."
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-neutral-200/60 bg-white p-4">
                    <button
                      onClick={handleAddNewItem}
                      className="w-full rounded-xl bg-neutral-900 py-3 text-sm text-white transition-all hover:bg-neutral-800"
                    >
                      Save to Closet
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
