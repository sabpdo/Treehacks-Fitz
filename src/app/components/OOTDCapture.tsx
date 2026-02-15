import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Flame, Check, ChevronDown, Sparkles, Search, Plus, Upload, ChevronRight, GripVertical, ChevronLeft, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { mockClosetItems, type OOTDPost, type ClosetItem } from "../data/mockData";
import { analyzeOutfitImage } from "../../services/openai";
import type { AIImageAnalysis, PostOutfitItem, Category } from "../../types/database";
import {
  segmentOutfitImage,
  uploadImage,
  uploadImageToPath,
  dataURLToFile,
  createPost,
  updateStreak,
  getClosetItems,
  createClosetItem,
  type SegmentResult,
} from "../../services/api";
import { apiPostToOOTDPost, apiClosetItemToUI, ensurePublicStorageUrl } from "../../lib/adapters";
import { useAppStore } from "../context/AppStore";

type CaptureStep = "camera" | "scanning" | "tagging" | "confirm";
type SwapModalView = "select" | "add-new";

interface DetectedItem {
  id: string;
  /** Display category — any string from AI (e.g. top, bottom, shoes, dress, jacket, accessory, handbag). */
  type: string;
  position: { x: number; y: number };
  label: string;
  color: string;
  fabric?: string;
  silhouette?: string;
  /** Crop image URL from segmentation (for "Add as New Item" form) */
  imageUrl?: string;
  closetMatch?: {
    id: string;
    brand: string;
    imageUrl: string;
  };
  isConfirmed: boolean;
}

/** Map API category to display type; pass through unknown as-is. */
function categoryToType(category: string): string {
  const lower = (category || "").toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    shirts: "top",
    pants: "bottom",
    skirts_dresses: "dress",
    jackets_outerwear: "jacket",
    shoes: "shoes",
    bags: "bag",
  };
  return map[lower] ?? (lower.replace(/_/g, " ") || "item");
}

/** Map DetectedItem.type (UI) to DB Category — same schema as closet items. */
function detectedTypeToDbCategory(type: string): Category {
  const t = (type || "").toLowerCase().trim();
  if (t === "pants" || t === "bottom" || t === "bottoms") return "pants";
  if (t === "skirts_dresses" || t === "dress" || t === "skirt") return "skirts_dresses";
  if (t === "jacket" || t === "outerwear" || t === "jackets_outerwear") return "jackets_outerwear";
  if (t === "shoes" || t === "shoe") return "shoes";
  if (t === "bags" || t === "bag" || t === "accessory" || t === "accessories" || t === "handbag") return "bags";
  return "shirts";
}

/** Convert detected items to post outfit items (same schema as closet). Never persist "Unknown" as brand. */
function detectedItemsToPostOutfitItems(detected: DetectedItem[]): PostOutfitItem[] {
  return detected.map((di) => {
    const rawBrand = di.closetMatch?.brand ?? null;
    const brand =
      rawBrand && rawBrand.trim().toLowerCase() !== "unknown" ? rawBrand : null;
    return {
      image_url: di.imageUrl || di.closetMatch?.imageUrl || "",
      category: detectedTypeToDbCategory(di.type),
      brand,
      subcategory: di.label || null,
      colors: di.color && di.color !== "—" ? [di.color] : [],
      fabric: di.fabric ?? null,
      silhouette: (di.silhouette as PostOutfitItem["silhouette"]) ?? null,
      vibe_tags: [],
      ...(di.closetMatch?.id ? { closet_item_id: di.closetMatch.id } : {}),
    };
  });
}

function aiAnalysisToDetectedItems(items: AIImageAnalysis[]): DetectedItem[] {
  return items.map((item, index) => {
    const type = categoryToType(item.category);
    const y = 25 + (index * 25);
    return {
      id: `item-${index}-${item.subcategory.replace(/\s/g, "-")}`,
      type,
      position: { x: 50, y: Math.min(y, 85) },
      label: item.subcategory || item.description?.slice(0, 30) || "Item",
      color: item.colors?.[0] ?? "—",
      fabric: item.fabric,
      silhouette: item.silhouette,
      isConfirmed: false,
    };
  });
}

/** Get bounding box (in pixel coords) of non-transparent pixels in a mask image. */
function getMaskBbox(
  maskCanvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): { x: number; y: number; w: number; h: number } | null {
  const w = maskCanvas.width;
  const h = maskCanvas.height;
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const alpha = d[i + 3];
      if (alpha > 128) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX || minY > maxY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Crop segments that have a mask (from Hugging Face); derive bbox from mask and crop the image. */
async function cropSegmentsWithMask(
  segments: SegmentResult[],
  imageUrl: string
): Promise<SegmentResult[]> {
  const withMask = segments.filter((s) => s.mask);
  if (withMask.length === 0) return segments;

  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = imageUrl;
    });
  } catch {
    return segments;
  }
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;
  if (!origW || !origH) return segments;

  const result: SegmentResult[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.mask) {
      result.push(seg);
      continue;
    }
    const maskDataUrl = seg.mask.startsWith("data:") ? seg.mask : `data:image/png;base64,${seg.mask}`;
    const maskImg = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        maskImg.onload = () => resolve();
        maskImg.onerror = () => reject(new Error("Mask load failed"));
        maskImg.src = maskDataUrl;
      });
    } catch {
      result.push(seg);
      continue;
    }
    const maskW = maskImg.naturalWidth;
    const maskH = maskImg.naturalHeight;
    if (!maskW || !maskH) {
      result.push(seg);
      continue;
    }
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = maskW;
    maskCanvas.height = maskH;
    const mCtx = maskCanvas.getContext("2d");
    if (!mCtx) {
      result.push(seg);
      continue;
    }
    mCtx.drawImage(maskImg, 0, 0);
    const bbox = getMaskBbox(maskCanvas, mCtx);
    if (!bbox || bbox.w < 1 || bbox.h < 1) {
      result.push(seg);
      continue;
    }
    const scaleX = origW / maskW;
    const scaleY = origH / maskH;
    const sx = bbox.x * scaleX;
    const sy = bbox.y * scaleY;
    const sw = bbox.w * scaleX;
    const sh = bbox.h * scaleY;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.max(1, Math.round(sw));
    cropCanvas.height = Math.max(1, Math.round(sh));
    const ctx = cropCanvas.getContext("2d");
    if (!ctx) {
      result.push(seg);
      continue;
    }
    try {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height);
      const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.9);
      const { mask: _m, ...rest } = seg;
      result.push({ ...rest, crop_url: dataUrl });
    } catch {
      result.push(seg);
    }
  }
  return result;
}

/** Crop segments that have bbox (0-100%) from the full image; returns segments with crop_url set to data URL. */
async function cropSegmentsWithBbox(
  segments: SegmentResult[],
  imageUrl: string
): Promise<SegmentResult[]> {
  const withBbox = segments.filter((s) => s.bbox);
  if (withBbox.length === 0) return segments;

  const img = new Image();
  img.crossOrigin = "anonymous";
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = imageUrl;
    });
  } catch {
    return segments;
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return segments;

  const result: SegmentResult[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.bbox) {
      result.push(seg);
      continue;
    }
    const { x_min, y_min, x_max, y_max } = seg.bbox;
    const pad = 2;
    const x1 = Math.max(0, x_min - pad);
    const y1 = Math.max(0, y_min - pad);
    const x2 = Math.min(100, x_max + pad);
    const y2 = Math.min(100, y_max + pad);
    const sx = (x1 / 100) * w;
    const sy = (y1 / 100) * h;
    const sw = ((x2 - x1) / 100) * w;
    const sh = ((y2 - y1) / 100) * h;
    if (sw < 1 || sh < 1) {
      result.push(seg);
      continue;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      result.push(seg);
      continue;
    }
    try {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      result.push({ ...seg, crop_url: dataUrl });
    } catch {
      result.push(seg);
    }
  }
  return result;
}

/** Upload each cropped segment (specific item photo) to Supabase Storage so it can be used in wardrobe and posts. */
async function uploadSegmentCropsToStorage(
  segments: SegmentResult[],
  userId: string
): Promise<SegmentResult[]> {
  const requestId = crypto.randomUUID();
  const basePath = `segment-crops/${userId}/${requestId}`;
  const results: SegmentResult[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.crop_url.startsWith("data:")) {
      results.push(seg);
      continue;
    }
    try {
      const file = dataURLToFile(seg.crop_url, `crop-${i}.jpg`);
      const path = `${basePath}/${i}.jpg`;
      const publicUrl = await uploadImageToPath(file, path);
      results.push({ ...seg, crop_url: publicUrl });
    } catch (err) {
      console.warn("Upload segment crop failed:", err);
      results.push(seg);
    }
  }
  return results;
}

/** Map segmentation API result (one crop per clothing region) to DetectedItem for tagging UI. */
function segmentsToDetectedItems(segments: SegmentResult[]): DetectedItem[] {
  return segments.map((seg, index) => {
    const type = categoryToType(seg.category);
    const y = 25 + (index * 25);
    return {
      id: `segment-${index}-${seg.description.replace(/\s/g, "-").slice(0, 20)}`,
      type,
      position: { x: 50, y: Math.min(y, 85) },
      label: seg.description || seg.category || "Item",
      color: seg.color?.trim() && seg.color !== "—" ? seg.color : "—",
      fabric: seg.fabric?.trim() || undefined,
      silhouette: seg.silhouette?.trim() || undefined,
      imageUrl: seg.crop_url,
      isConfirmed: false,
    };
  });
}

const MOCK_DETECTED_ITEMS: DetectedItem[] = [
  {
    id: "item1",
    type: "top",
    position: { x: 50, y: 30 },
    label: "White Linen Shirt",
    color: "White",
    fabric: "Linen",
    silhouette: "Relaxed",
    closetMatch: { id: "1", brand: "Everlane", imageUrl: mockClosetItems[0].imageUrl },
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
    closetMatch: { id: "2", brand: "Aritzia", imageUrl: mockClosetItems[1].imageUrl },
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
    closetMatch: { id: "9", brand: "Nike", imageUrl: mockClosetItems[8].imageUrl },
    isConfirmed: false,
  },
];

export function OOTDCapture({ onClose }: { onClose: () => void }) {
  const { getUser, currentUserId, isUsingApi, addPost, refetchCurrentUser } = useAppStore();
  const currentUser = getUser(currentUserId);
  const streak = isUsingApi ? (currentUser?.streak ?? 0) : 7;

  const [step, setStep] = useState<CaptureStep>("camera");
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapModalView, setSwapModalView] = useState<SwapModalView>("select");
  const [swappingItemId, setSwappingItemId] = useState<string | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const addNewItemPhotoInputRef = useRef<HTMLInputElement>(null);

  // Add new item form state (brand = actual brand from dropdown; subcategory = item name/description)
  const [newItemData, setNewItemData] = useState({
    image: "",
    category: "",
    subcategory: "",
    brand: "",
    colors: [] as string[],
    fabric: "",
    silhouette: "",
  });

  const ADD_ITEM_BRANDS = [
    "H&M", "Zara", "Nike", "Adidas", "Uniqlo", "Forever 21", "Gap", "Old Navy",
    "Target", "ASOS", "Shein", "Urban Outfitters", "Aritzia", "Lululemon",
    "Levi's", "Madewell", "Everlane", "Reformation", "Other",
  ];
  const ADD_ITEM_COLORS = ["black", "white", "gray", "navy", "beige", "sage", "cream", "camel", "tan", "gold", "red", "blue", "green", "pink", "brown"];

  /** Normalize API color so it preselects the matching chip (lowercase + phrase mapping). */
  const preselectColorsFromDetected = (color: string): string[] => {
    if (!color || color === "—") return [];
    const lower = color.trim().toLowerCase();
    const match = ADD_ITEM_COLORS.find((c) => lower === c || lower.startsWith(c) || lower.includes(c));
    if (match) return [match];
    if (ADD_ITEM_COLORS.includes(lower)) return [lower];
    return [lower];
  };

  /** Map API fabric/silhouette strings to form values; silhouette normalized to DB enum when possible. */
  const normalizeDetectedFabric = (fabric: string | undefined): string =>
    (fabric && fabric.trim()) ? fabric.trim() : "";
  const normalizeDetectedSilhouette = (silhouette: string | undefined): string => {
    if (!silhouette || !silhouette.trim()) return "";
    const lower = silhouette.trim().toLowerCase().replace(/\s+/g, "_");
    const map: Record<string, string> = {
      fitted: "fitted",
      oversized: "oversized",
      loose: "loose",
      tailored: "tailored",
      relaxed: "relaxed",
      "wide_leg": "loose",
      "wide_legs": "loose",
      "straight": "tailored",
      "slim": "fitted",
      "low-top": "fitted",
      "low_top": "fitted",
      "high_waist": "fitted",
    };
    return map[lower] ?? silhouette.trim();
  };

  // Closet items for swap modal (when using API)
  const [closetItemsForSwap, setClosetItemsForSwap] = useState<ClosetItem[]>([]);
  const [addingToCloset, setAddingToCloset] = useState(false);
  const [addToClosetError, setAddToClosetError] = useState<string | null>(null);

  // Start camera when on camera step (try back camera first, then front/user for desktop)
  useEffect(() => {
    if (step !== "camera") return;
    setCameraError(null);
    setCameraReady(false);

    let stream: MediaStream | null = null;
    const video = videoRef.current;

    const applyStream = (s: MediaStream) => {
      stream = s;
      streamRef.current = s;
      if (video) {
        video.srcObject = s;
        video.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true));
      } else {
        setCameraReady(true);
      }
    };

    const optsEnv = {
      video: { facingMode: "environment" as const, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    };
    const optsUser = {
      video: { facingMode: "user" as const, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    };

    navigator.mediaDevices
      .getUserMedia(optsEnv)
      .then(applyStream)
      .catch(() =>
        navigator.mediaDevices.getUserMedia(optsUser).then((s) => {
          applyStream(s);
        })
      )
      .catch((err) => {
        console.warn("Camera access failed:", err);
        setCameraError(err?.message || "Camera not available");
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [step]);

  const handleCapture = () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    // Allow capture when we have any frame (readyState 2 = HAVE_CURRENT_DATA); use videoWidth when available
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    if (w === 0 || h === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(dataUrl);
      setStep("scanning");
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setStep("scanning");
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // AI scanning: try segmentation first (HF or edge OpenAI with bbox → real crops), then direct OpenAI, then mock
  useEffect(() => {
    if (step !== "scanning" || !capturedImage) return;

    let cancelled = false;

    const goToTagging = (items: DetectedItem[]) => {
      if (!cancelled) {
        setDetectedItems(items.length > 0 ? items : MOCK_DETECTED_ITEMS);
        setStep("tagging");
      }
    };

    const runSegmentation = async () => {
      try {
        const file = dataURLToFile(capturedImage, "capture.jpg");
        const imageUrl = await uploadImage(file);
        const { segments } = await segmentOutfitImage(imageUrl);
        if (segments.length > 0) {
          const usedHuggingFace = segments.some((s) => s.mask);
          if (usedHuggingFace) {
            console.log("[Segmentation] Using Hugging Face (clothing model masks)");
          } else {
            console.log("[Segmentation] Using OpenAI (vision bbox)");
          }
          const withCrops = usedHuggingFace
            ? await cropSegmentsWithMask(segments, capturedImage)
            : await cropSegmentsWithBbox(segments, capturedImage);
          const withStorageUrls = await uploadSegmentCropsToStorage(
            withCrops,
            currentUserId || "anonymous"
          );
          goToTagging(segmentsToDetectedItems(withStorageUrls));
          return true;
        }
      } catch (err) {
        console.warn("Segmentation failed, falling back:", err);
      }
      return false;
    };

    const runOpenAI = async () => {
      const env = (import.meta as unknown as { env?: { VITE_OPENAI_API_KEY?: string } }).env;
      if (!env?.VITE_OPENAI_API_KEY) return false;
      try {
        const res = await analyzeOutfitImage(capturedImage);
        const items = res?.items;
        if (items && items.length > 0) {
          console.log("[Segmentation] Using OpenAI (direct outfit analysis, no bbox)");
          goToTagging(aiAnalysisToDetectedItems(items));
          return true;
        }
      } catch (err) {
        console.warn("OpenAI analysis failed:", err);
      }
      return false;
    };

    let mockTimer: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      const usedSegmentation = await runSegmentation();
      if (cancelled) return;
      if (!usedSegmentation) {
        const usedOpenAI = await runOpenAI();
        if (!cancelled && !usedOpenAI) {
          mockTimer = setTimeout(() => goToTagging(MOCK_DETECTED_ITEMS), 2500);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (mockTimer) clearTimeout(mockTimer);
    };
  }, [step, capturedImage]);

  const confirmItem = (itemId: string) => {
    setDetectedItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, isConfirmed: true } : item
      )
    );
    setSelectedPin(null);
  };

  const openSwapModal = (itemId: string) => {
    setIsAddingNewItem(false);
    setSwappingItemId(itemId);
    setShowSwapModal(true);
    setSwapModalView("select");
    setSearchQuery("");
    setCategoryFilter("all");
  };

  // Fetch real closet items when swap modal opens (API mode)
  useEffect(() => {
    if (!showSwapModal || !isUsingApi || !currentUserId) return;
    let cancelled = false;
    getClosetItems(currentUserId)
      .then((items) => {
        if (!cancelled) setClosetItemsForSwap(items.map(apiClosetItemToUI));
      })
      .catch(() => {
        if (!cancelled) setClosetItemsForSwap([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showSwapModal, isUsingApi, currentUserId]);

  /** Map UI closet category (tops, bottoms, …) to DetectedItem type */
  const uiCategoryToType = (cat: string): DetectedItem["type"] => {
    if (cat === "tops") return "top";
    if (cat === "bottoms") return "bottom";
    if (cat === "outerwear") return "jacket";
    if (cat === "shoes") return "shoes";
    if (cat === "accessories") return "accessory";
    return "top";
  };

  const getNewItemPosition = (): { x: number; y: number } => {
    const n = detectedItems.length;
    return { x: 25 + (n % 3) * 25, y: 35 + Math.floor(n / 3) * 22 };
  };

  const selectSwapItem = (closetItemId: string) => {
    if (!swappingItemId) return;

    const closetItem = getFilteredClosetItems().find((item) => item.id === closetItemId);
    if (!closetItem) return;

    if (isAddingNewItem) {
      const pos = getNewItemPosition();
      setDetectedItems((items) => [
        ...items,
        {
          id: `manual-${Date.now()}`,
          type: uiCategoryToType(closetItem.category),
          position: pos,
          label: `${closetItem.color} ${closetItem.category}`,
          color: closetItem.color,
          fabric: closetItem.fabric,
          silhouette: closetItem.silhouette,
          closetMatch: {
            id: closetItem.id,
            brand: closetItem.brand || "Unknown",
            imageUrl: closetItem.imageUrl,
          },
          isConfirmed: false,
        },
      ]);
      setShowSwapModal(false);
      setIsAddingNewItem(false);
      return;
    }
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

  /** Open the Add New Item form pre-filled from a detected item (for "Not in Closet" → Add as New Item). */
  const openAddAsNewItem = (item: DetectedItem) => {
    setSwappingItemId(item.id);
    setAddToClosetError(null);
    setNewItemData({
      image: item.imageUrl ?? item.closetMatch?.imageUrl ?? "",
      category: detectedTypeToDbCategory(item.type ?? "top"),
      subcategory: item.label ?? "",
      brand: item.closetMatch?.brand ?? "",
      colors: preselectColorsFromDetected(item.color),
      fabric: normalizeDetectedFabric(item.fabric),
      silhouette: normalizeDetectedSilhouette(item.silhouette),
    });
    setSwapModalView("add-new");
    setShowSwapModal(true);
  };

  const handleAddNewItem = async () => {
    if (isUsingApi && currentUserId) {
      setAddToClosetError(null);
      setAddingToCloset(true);
      try {
        let imageUrl: string;
        const imageInput = (newItemData.image || "").trim();
        if (imageInput.startsWith("data:")) {
          const file = dataURLToFile(imageInput, "closet-item.jpg");
          imageUrl = await uploadImage(file);
        } else if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
          imageUrl = imageInput;
        } else {
          const detected = swappingItemId ? detectedItems.find((i) => i.id === swappingItemId) : null;
          if (detected?.imageUrl?.startsWith("http")) {
            imageUrl = detected.imageUrl;
          } else if (detected?.imageUrl?.startsWith("data:")) {
            imageUrl = await uploadImage(dataURLToFile(detected.imageUrl, "closet-item.jpg"));
          } else if (capturedImage) {
            imageUrl = await uploadImage(dataURLToFile(capturedImage, "closet-item.jpg"));
          } else {
            setAddToClosetError("Please add an image (paste crop URL or use a segmented photo).");
            setAddingToCloset(false);
            return;
          }
        }
        const dbCategory = detectedTypeToDbCategory(newItemData.category || "top");
        const created = await createClosetItem({
          image_url: imageUrl,
          category: dbCategory,
          brand: newItemData.brand || undefined,
          subcategory: newItemData.subcategory || undefined,
          colors: newItemData.colors.length > 0 ? newItemData.colors : undefined,
          fabric: newItemData.fabric || undefined,
          silhouette: (newItemData.silhouette as import("../../types/database").Silhouette) || undefined,
        });
        const uiItem = apiClosetItemToUI(created);
        setClosetItemsForSwap((prev) => [uiItem, ...prev]);
        if (swappingItemId) {
          setDetectedItems((prev) =>
            prev.map((item) =>
              item.id === swappingItemId
                ? {
                  ...item,
                  closetMatch: {
                    id: created.id,
                    brand: created.brand || "Unknown",
                    imageUrl: ensurePublicStorageUrl(created.image_url),
                  },
                  label: newItemData.subcategory || item.label,
                  color: newItemData.colors[0] || item.color,
                  fabric: newItemData.fabric ?? item.fabric,
                  silhouette: newItemData.silhouette ?? item.silhouette,
                }
                : item
            )
          );
        }
        setShowSwapModal(false);
        setSwapModalView("select");
        setSwappingItemId(null);
        setNewItemData({ image: "", category: "", subcategory: "", brand: "", colors: [], fabric: "", silhouette: "" });
      } catch (e) {
        console.error("Add to closet failed:", e);
        setAddToClosetError(e instanceof Error ? e.message : "Failed to add to closet");
      } finally {
        setAddingToCloset(false);
      }
      return;
    }
    // Mock: add a manual item from the form to the list
    const pos = getNewItemPosition();
    const type = categoryToType(newItemData.category || "shirts");
    setDetectedItems((items) => [
      ...items,
      {
        id: `manual-${Date.now()}`,
        type: type === "outerwear" ? "jacket" : type,
        position: pos,
        label: newItemData.brand
          ? `${newItemData.colors[0] || "Item"} ${newItemData.brand}`
          : newItemData.colors[0] || newItemData.subcategory || "New item",
        color: newItemData.colors[0] || "",
        fabric: newItemData.fabric || undefined,
        silhouette: newItemData.silhouette as DetectedItem["silhouette"],
        closetMatch: undefined,
        isConfirmed: false,
      },
    ]);
    setShowSwapModal(false);
    setSwapModalView("select");
    setIsAddingNewItem(false);
    setNewItemData({ image: "", category: "", subcategory: "", brand: "", colors: [], fabric: "", silhouette: "" });
  };

  /** Remove a tagged item from the list (e.g. wrong detection like a handbag that isn't there). */
  const removeDetectedItem = (itemId: string) => {
    setDetectedItems((prev) => prev.filter((i) => i.id !== itemId));
    if (selectedPin === itemId) setSelectedPin(null);
  };

  /** Reorder detected items (drag and drop). */
  const reorderItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setDetectedItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  };

  /** Add a new item to the list for the user to tag (manual add). */
  const handleAddTagItem = () => {
    const newItem: DetectedItem = {
      id: `new-${Date.now()}`,
      type: "top",
      position: { x: 50, y: 50 },
      label: "New item",
      color: "—",
      isConfirmed: false,
    };
    setDetectedItems((prev) => [...prev, newItem]);
    setSelectedPin(newItem.id);
  };

  /** Post the outfit to the feed and close capture. */
  const handlePostToFeed = async () => {
    setPostError(null);
    if (isUsingApi) {
      try {
        setPosting(true);
        const file = dataURLToFile(capturedImage, "ootd.jpg");
        const imageUrl = await uploadImage(file);
        const items = detectedItemsToPostOutfitItems(detectedItems);
        const apiPost = await createPost({
          image_url: imageUrl,
          caption: caption.trim() || "Outfit of the day",
          items: items.length > 0 ? items : undefined,
        });
        try {
          await updateStreak();
          if (refetchCurrentUser) await refetchCurrentUser();
        } catch {
          /* ignore */
        }
        const uiPost = apiPostToOOTDPost(apiPost, currentUserId);
        addPost({ ...uiPost, tags: uiPost.tags });
        onClose();
      } catch (e) {
        console.error("Create post failed:", e);
        setPostError("Failed to post. Try again.");
      } finally {
        setPosting(false);
      }
      return;
    }
    const tags = detectedItems.map((i) => ({ label: i.label, type: i.type }));
    const post: OOTDPost = {
      id: `post-${Date.now()}`,
      userId: currentUserId,
      imageUrl: capturedImage,
      caption: caption.trim() || "Outfit of the day",
      vibeTag: "Casual",
      createdAt: new Date().toISOString(),
      likeCount: 0,
      savedCount: 0,
      commentCount: 0,
      likedByUserIds: [],
      compatibilityScore: 0,
      aiInsight: "",
      tags,
    };
    addPost(post);
    onClose();
  };

  // Filter closet items based on search and category (API items when using API)
  const getFilteredClosetItems = (): ClosetItem[] => {
    let filtered = isUsingApi ? closetItemsForSwap : mockClosetItems;

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

  // Map DetectedItem type (any string) to ClosetItem category for swap modal
  const typeToCategory: Record<string, string> = {
    top: "tops",
    tops: "tops",
    bottom: "bottoms",
    bottoms: "bottoms",
    dress: "bottoms",
    jacket: "tops",
    shoes: "shoes",
    accessory: "accessories",
    accessories: "accessories",
    bag: "accessories",
    handbag: "accessories",
  };

  // Get AI suggested matches (mock - would use actual AI in production)
  const getAISuggestedMatches = () => {
    const swappingItem = detectedItems.find((item) => item.id === swappingItemId);
    if (!swappingItem) return [];

    const category = typeToCategory[swappingItem.type] ?? swappingItem.type;
    return mockClosetItems
      .filter((item) => item.category === category)
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
          className="relative flex h-full w-full flex-col bg-neutral-900"
        >
          <div className="relative h-full w-full min-h-0">
            {/* Always mount video when on camera step (so ref exists for stream); show loading until ready */}
            {!cameraError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(1)" }}
              />
            )}
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-sm text-white/80">{cameraError}</p>
                <p className="text-xs text-white/60">Use upload instead</p>
              </div>
            ) : !cameraReady ? (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            ) : null}
          </div>

          <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-6 py-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="text-xs text-white">{streak} day streak</span>
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
            <div className="flex flex-col items-center gap-4">
              {cameraReady && !cameraError ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCapture}
                  className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur-sm transition-all hover:bg-white/30"
                >
                  <Camera className="h-8 w-8 text-white" />
                </motion.button>
              ) : null}
              <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white backdrop-blur-sm transition-all hover:bg-white/20">
                <Upload className="h-4 w-4" />
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Scanning Screen - photo stays visible in background */}
      {step === "scanning" && capturedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-neutral-900"
          style={{ minHeight: "100vh", minWidth: "100%" }}
        >
          {/* Background: captured photo full screen - explicit size so it always fills */}
          <div className="absolute inset-0 min-h-full min-w-full">
            <img
              src={capturedImage}
              alt="Captured outfit"
              className="block h-full w-full object-cover object-center"
              style={{ minHeight: "100%", minWidth: "100%" }}
            />
          </div>

          {/* Overlay: dim + scanning UI */}
          <div className="absolute inset-0 bg-black/35">
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
        </motion.div>
      )}

      {/* AI Tagging Screen — list of detected items, drag to reorder, no pins on image */}
      {step === "tagging" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex h-full w-full flex-col bg-[#FAFAF8]"
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
                className={`text-sm transition-colors ${allItemsConfirmed
                  ? "text-neutral-900 hover:text-neutral-600"
                  : "text-neutral-300"
                  }`}
              >
                Next
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-4 py-4">
              <div className="mb-4 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
                <img
                  src={capturedImage}
                  alt="Your outfit"
                  className="w-full object-cover"
                  style={{ maxHeight: "min(40vh, 280px)", objectFit: "cover" }}
                />
              </div>

              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Items we detected
              </p>
              <ul className="space-y-2">
                {detectedItems.map((item, index) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="list-none"
                  >
                    <div
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${item.isConfirmed
                        ? "border-[#8B9B8E]/50 bg-[#8B9B8E]/5"
                        : "border-neutral-200/60 bg-white"
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPin(selectedPin === item.id ? null : item.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-90"
                      >
                        {item.closetMatch?.imageUrl ? (
                          <img
                            src={item.closetMatch.imageUrl}
                            alt=""
                            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
                            <span className="text-lg font-medium uppercase">{item.type.slice(0, 1)}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900">{item.label}</p>
                          <p className="text-xs capitalize text-neutral-500">{item.type}</p>
                          {item.color && item.color !== "—" && (
                            <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">{item.color}</span>
                          )}
                        </div>
                        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${item.isConfirmed ? "bg-[#8B9B8E]/20" : "bg-neutral-200"}`}>
                          <Check className={`h-3.5 w-3.5 ${item.isConfirmed ? "text-[#8B9B8E]" : "text-neutral-400"}`} />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeDetectedItem(item.id);
                        }}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleAddTagItem}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white py-3.5 text-sm text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
              >
                <Plus className="h-4 w-4" />
                Add / tag item
              </button>
            </div>
          </div>

          <AnimatePresence>
            {selectedPin && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedPin(null)}
                  className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px]"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-[70] mx-auto max-h-[80vh] max-w-2xl overflow-y-auto rounded-t-3xl border-t border-neutral-200/60 bg-white shadow-2xl"
                >
                  {detectedItems
                    .filter((item) => item.id === selectedPin)
                    .map((item) => (
                      <div key={item.id} className="p-6">
                        <div className="mb-5 flex items-start justify-between">
                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">{item.type}</p>
                            <h3 className="mb-2 text-base font-medium text-neutral-900">{item.label}</h3>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">{item.color}</span>
                              {item.fabric && (
                                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">{item.fabric}</span>
                              )}
                              {item.silhouette && (
                                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">{item.silhouette}</span>
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
                            <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">Matched from Closet</p>
                            <div className="flex items-center gap-3 rounded-xl border border-neutral-200/60 bg-neutral-50 p-3">
                              <img
                                src={item.closetMatch.imageUrl}
                                alt={item.closetMatch.brand}
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="mb-0.5 text-sm font-medium text-neutral-900">{item.closetMatch.brand}</p>
                                <p className="text-xs text-neutral-500">{item.label}</p>
                              </div>
                              {item.isConfirmed && (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8B9B8E]">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-5">
                            <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">Not in Closet</p>
                            <button
                              type="button"
                              onClick={() => openAddAsNewItem(item)}
                              className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 text-sm text-neutral-900 transition-all hover:bg-neutral-50"
                            >
                              Add as New Item
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          {!item.isConfirmed ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  confirmItem(item.id);
                                }}
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
                                  items.map((i) => (i.id === item.id ? { ...i, isConfirmed: false } : i))
                                )
                              }
                              className="col-span-2 rounded-xl border border-neutral-300 bg-white py-2.5 text-sm text-neutral-600 transition-all hover:bg-neutral-50"
                            >
                              Edit Selection
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeDetectedItem(item.id);
                            setSelectedPin(null);
                          }}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-2.5 text-sm text-red-600 transition-all hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove item
                        </button>
                      </div>
                    ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
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
                type="button"
                onClick={() => setStep("tagging")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-all hover:bg-neutral-100"
                aria-label="Back to tags"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-sm font-medium text-neutral-900">Post</h2>
              <button
                type="button"
                onClick={handlePostToFeed}
                disabled={posting}
                className="text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-600 disabled:opacity-50"
              >
                {posting ? "Posting…" : "Share"}
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

            {postError && (
              <p className="mb-4 text-sm text-red-600">{postError}</p>
            )}
            <button
              type="button"
              onClick={handlePostToFeed}
              disabled={posting}
              className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-medium text-white transition-all hover:bg-neutral-800 disabled:opacity-50"
            >
              {posting ? "Posting…" : "Post to Feed"}
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
              onClick={() => {
                setShowSwapModal(false);
                setIsAddingNewItem(false);
              }}
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
                          {isAddingNewItem ? "Add item AI missed" : "Select Matching Item"}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {isAddingNewItem
                            ? "Pick from your closet or add a new item"
                            : "Choose from your closet or add new"}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowSwapModal(false);
                          setIsAddingNewItem(false);
                        }}
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
                          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs transition-all ${categoryFilter === cat.value
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
                        <input
                          ref={addNewItemPhotoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith("image/")) {
                              const reader = new FileReader();
                              reader.onload = () =>
                                setNewItemData((prev) => ({ ...prev, image: String(reader.result) }));
                              reader.readAsDataURL(file);
                            }
                            e.target.value = "";
                          }}
                        />
                        {(newItemData.image || "").trim() ? (
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="relative h-20 w-20 shrink-0 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden">
                                <img
                                  src={(newItemData.image || "").trim()}
                                  alt="Item crop"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const el = e.currentTarget;
                                    el.onerror = null;
                                    el.style.display = "none";
                                    const fallback = el.parentElement?.querySelector(".add-item-preview-fallback") as HTMLElement | null;
                                    if (fallback) fallback.classList.remove("hidden");
                                  }}
                                />
                                <div className="add-item-preview-fallback absolute inset-0 hidden items-center justify-center bg-neutral-100 text-center text-xs text-neutral-500">
                                  Preview unavailable
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="mb-1 text-xs text-neutral-500">
                                  Auto-uploaded crop — this image will be saved to your wardrobe. You can change it below.
                                </p>
                                <input
                                  type="text"
                                  value={newItemData.image}
                                  onChange={(e) =>
                                    setNewItemData({ ...newItemData, image: e.target.value })
                                  }
                                  placeholder="Image URL"
                                  className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-4 text-sm outline-none transition-all focus:border-neutral-900"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => addNewItemPhotoInputRef.current?.click()}
                                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-50"
                              >
                                Upload different photo
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewItemData((prev) => ({ ...prev, image: "" }))}
                                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-50"
                              >
                                Clear photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="relative">
                              <Upload className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                              <input
                                type="text"
                                value={newItemData.image}
                                onChange={(e) =>
                                  setNewItemData({ ...newItemData, image: e.target.value })
                                }
                                placeholder="Paste image URL or upload below..."
                                className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-neutral-900"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => addNewItemPhotoInputRef.current?.click()}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                              <Upload className="h-4 w-4" />
                              Upload photo
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Item name / Description
                        </label>
                        <input
                          type="text"
                          value={newItemData.subcategory}
                          onChange={(e) =>
                            setNewItemData({ ...newItemData, subcategory: e.target.value })
                          }
                          placeholder="e.g. White linen shirt, High-waist jeans..."
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                        />
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
                          <option value="shirts">Shirts/Tops</option>
                          <option value="pants">Pants</option>
                          <option value="skirts_dresses">Skirts/Dresses</option>
                          <option value="jackets_outerwear">Jackets/Outerwear</option>
                          <option value="shoes">Shoes</option>
                          <option value="bags">Bags</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Brand
                        </label>
                        <select
                          value={newItemData.brand}
                          onChange={(e) =>
                            setNewItemData({ ...newItemData, brand: e.target.value })
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                        >
                          <option value="">Select brand (optional)</option>
                          {ADD_ITEM_BRANDS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                        {(newItemData.brand === "Other" || (newItemData.brand && !ADD_ITEM_BRANDS.includes(newItemData.brand))) && (
                          <input
                            type="text"
                            value={newItemData.brand === "Other" ? "" : newItemData.brand}
                            onChange={(e) =>
                              setNewItemData({ ...newItemData, brand: e.target.value })
                            }
                            placeholder="Enter brand name"
                            className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                          />
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                          Colors
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {ADD_ITEM_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() =>
                                setNewItemData((prev) => ({
                                  ...prev,
                                  colors: prev.colors.includes(color)
                                    ? prev.colors.filter((c) => c !== color)
                                    : [...prev.colors, color],
                                }))
                              }
                              className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${newItemData.colors.includes(color)
                                ? "bg-neutral-900 text-white"
                                : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                                }`}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Or type custom color and press Enter"
                          className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-neutral-900"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const value = input.value.trim().toLowerCase();
                              if (value && !newItemData.colors.includes(value)) {
                                setNewItemData((prev) => ({
                                  ...prev,
                                  colors: [...prev.colors, value],
                                }));
                                input.value = "";
                              }
                            }
                          }}
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
                    {addToClosetError && (
                      <p className="mb-2 text-xs text-red-600">{addToClosetError}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleAddNewItem()}
                      disabled={addingToCloset}
                      className="w-full rounded-xl bg-neutral-900 py-3 text-sm text-white transition-all hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {addingToCloset ? "Saving…" : "Save to Closet"}
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
