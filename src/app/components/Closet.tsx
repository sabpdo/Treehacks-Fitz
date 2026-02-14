import React, { useState, useEffect } from "react";
import { Plus, Grid3x3, List, X, ChevronRight, Flame, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { mockClosetItems, type ClosetItem, currentUserProfile } from "../data/mockData";
import { useAppStore } from "../context/AppStore";
import { getCurrentProfile, getClosetItems, createClosetItem, updateClosetItem, uploadImage, getClosetItem } from "../../services/api";
import { apiClosetItemToUI } from "../../lib/adapters";

// Map UI category to database category (reverse of adapter)
function mapCategoryToUI(dbCategory: string): "tops" | "bottoms" | "outerwear" | "shoes" | "accessories" {
  const categoryMap: Record<string, "tops" | "bottoms" | "outerwear" | "shoes" | "accessories"> = {
    shirts: "tops",
    pants: "bottoms",
    skirts_dresses: "bottoms",
    jackets_outerwear: "outerwear",
    shoes: "shoes",
    bags: "accessories",
  };
  return categoryMap[dbCategory] || "tops";
}
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { Category, VibeTag, PriceTier, Silhouette } from "../../types/database";

type CategoryFilter = "all" | "tops" | "bottoms" | "outerwear" | "shoes" | "accessories";
type ViewMode = "grid" | "list";

const PREDEFINED_BRANDS = [
  "H&M", "Zara", "Nike", "Adidas", "Uniqlo", "Forever 21", "Gap", "Old Navy",
  "Target", "ASOS", "Shein", "Urban Outfitters", "Aritzia", "Lululemon",
  "Levi's", "Madewell", "Everlane", "Reformation"
];

// Map color names to actual hex colors
function getColorHex(colorName: string): string {
  const color = colorName.toLowerCase().trim();
  const colorMap: Record<string, string> = {
    // Basic colors
    white: "#FFFFFF",
    black: "#000000",
    gray: "#808080",
    grey: "#808080",
    // Neutrals
    beige: "#F5F5DC",
    cream: "#FFFDD0",
    camel: "#C19A6B",
    tan: "#D2B48C",
    navy: "#000080",
    sage: "#87AE73",
    // Primary colors
    red: "#FF0000",
    blue: "#0000FF",
    green: "#008000",
    yellow: "#FFFF00",
    orange: "#FFA500",
    purple: "#800080",
    pink: "#FFC0CB",
    // Common variations
    burgundy: "#800020",
    maroon: "#800000",
    coral: "#FF7F50",
    salmon: "#FA8072",
    peach: "#FFE5B4",
    mint: "#98FF98",
    turquoise: "#40E0D0",
    teal: "#008080",
    cyan: "#00FFFF",
    lavender: "#E6E6FA",
    violet: "#8A2BE2",
    indigo: "#4B0082",
    magenta: "#FF00FF",
    fuchsia: "#FF00FF",
    lime: "#00FF00",
    olive: "#808000",
    khaki: "#F0E68C",
    gold: "#FFD700",
    silver: "#C0C0C0",
    bronze: "#CD7F32",
    // Additional common colors
    brown: "#A52A2A",
    chocolate: "#7B3F00",
    coffee: "#6F4E37",
    ivory: "#FFFFF0",
    offwhite: "#FAFAFA",
    charcoal: "#36454F",
  };
  return colorMap[color] || "#E5E7EB"; // Default to light gray if color not found
}

export function Closet() {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedItem, setSelectedItem] = useState<ClosetItem | null>(null);
  const [streak, setStreak] = useState<number>(currentUserProfile.streak);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>(mockClosetItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [editItemError, setEditItemError] = useState<string | null>(null);
  const [detailModalCategory, setDetailModalCategory] = useState<Category | "">("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [detailFormData, setDetailFormData] = useState({
    image: null as File | null,
    imagePreview: null as string | null,
    brand: "",
    category: "" as Category | "",
    vibeTags: [] as VibeTag[],
    priceTier: "" as PriceTier | "",
    colors: [] as string[],
    fabric: "",
    silhouette: "" as Silhouette | "",
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    image: null as File | null,
    imagePreview: null as string | null,
    brand: "",
    category: "" as Category | "",
    vibeTags: [] as VibeTag[],
    priceTier: "" as PriceTier | "",
    colors: [] as string[],
    fabric: "",
    silhouette: "" as Silhouette | "",
    subcategory: "",
  });
  const { isUsingApi, currentUserId, getUser } = useAppStore();

  // Map UI category back to database category
  const mapCategoryToDB = (uiCategory: string): Category => {
    const categoryMap: Record<string, Category> = {
      tops: "shirts",
      bottoms: "pants", // Default to pants, could be skirts_dresses
      outerwear: "jackets_outerwear",
      shoes: "shoes",
      accessories: "bags",
    };
    return categoryMap[uiCategory] || "shirts";
  };

  // Initialize detail modal form data when item is selected
  useEffect(() => {
    if (selectedItem && isUsingApi && selectedItem.id) {
      getClosetItem(selectedItem.id)
        .then((dbItem) => {
          if (dbItem) {
            setDetailFormData({
              image: null,
              imagePreview: dbItem.image_url || null,
              brand: dbItem.brand || "",
              category: dbItem.category,
              vibeTags: (dbItem.vibe_tags || []) as VibeTag[],
              priceTier: (dbItem.price_tier || "") as PriceTier | "",
              colors: dbItem.colors || [],
              fabric: dbItem.fabric || "",
              silhouette: (dbItem.silhouette || "") as Silhouette | "",
            });
            setDetailModalCategory(dbItem.category);
          }
        })
        .catch(() => {
          // Fallback to UI data
          const dbCategoryMap: Record<string, Category> = {
            tops: "shirts",
            bottoms: "pants",
            outerwear: "jackets_outerwear",
            shoes: "shoes",
            accessories: "bags",
          };
          setDetailFormData({
            image: null,
            imagePreview: selectedItem.imageUrl,
            brand: selectedItem.brand || "",
            category: dbCategoryMap[selectedItem.category] || "shirts",
            vibeTags: (selectedItem.aiTags || []) as VibeTag[],
            priceTier: ((selectedItem as any).priceTier || "") as PriceTier | "",
            colors: (selectedItem as any).allColors || [selectedItem.color],
            fabric: selectedItem.fabric || "",
            silhouette: (selectedItem.silhouette || "") as Silhouette | "",
          });
          setDetailModalCategory(dbCategoryMap[selectedItem.category] || "shirts");
        });
    } else if (selectedItem) {
      // Fallback to UI data when not using API
      const dbCategoryMap: Record<string, Category> = {
        tops: "shirts",
        bottoms: "pants",
        outerwear: "jackets_outerwear",
        shoes: "shoes",
        accessories: "bags",
      };
      setDetailFormData({
        image: null,
        imagePreview: selectedItem.imageUrl,
        brand: selectedItem.brand || "",
        category: dbCategoryMap[selectedItem.category] || "shirts",
        vibeTags: (selectedItem.aiTags || []) as VibeTag[],
        priceTier: ((selectedItem as any).priceTier || "") as PriceTier | "",
        colors: (selectedItem as any).allColors || [selectedItem.color],
        fabric: selectedItem.fabric || "",
        silhouette: (selectedItem.silhouette || "") as Silhouette | "",
      });
      setDetailModalCategory(dbCategoryMap[selectedItem.category] || "shirts");
    }
  }, [selectedItem, isUsingApi]);

  // Load closet items from API
  useEffect(() => {
    if (isUsingApi && currentUserId) {
      setLoading(true);
      setError(null);
      getClosetItems(currentUserId)
        .then((items) => {
          const uiItems = items.map(apiClosetItemToUI);
          setClosetItems(uiItems);
        })
        .catch((err) => {
          console.error("Failed to load closet items:", err);
          setError("Failed to load closet items");
          // Fallback to mock data on error
          setClosetItems(mockClosetItems);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Use mock data when not using API
      setClosetItems(mockClosetItems);
    }
  }, [isUsingApi, currentUserId]);

  const filteredItems =
    filter === "all"
      ? closetItems
      : closetItems.filter((item) => item.category === filter);

  // Calculate category breakdown
  const categoryBreakdown = {
    tops: closetItems.filter((i) => i.category === "tops").length,
    bottoms: closetItems.filter((i) => i.category === "bottoms").length,
    outerwear: closetItems.filter((i) => i.category === "outerwear").length,
    shoes: closetItems.filter((i) => i.category === "shoes").length,
    accessories: closetItems.filter((i) => i.category === "accessories").length,
  };

  const totalItems = closetItems.length;

  // Load streak from API if using API
  useEffect(() => {
    if (isUsingApi && currentUserId) {
      const profileUser = getUser(currentUserId);
      if (profileUser) {
        // Streak is not in UIUser type, so we need to fetch from API
        getCurrentProfile()
          .then((profile) => {
            if (profile) setStreak(profile.streak);
          })
          .catch(() => {
            // Fallback to mock data on error
            setStreak(currentUserProfile.streak);
          });
      }
    }
  }, [isUsingApi, currentUserId, getUser]);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base tracking-tight text-neutral-900">My Closet</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-400 hover:bg-neutral-100"
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-400 hover:bg-neutral-100"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Dashboard Overview */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white">
          <div className="grid gap-px bg-neutral-200/60 md:grid-cols-3">
            {/* Streak */}
            <div className="bg-white p-6">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  Streak
                </span>
              </div>
              <p className="mb-1 font-serif text-4xl text-neutral-900">
                {streak}
              </p>
              <p className="text-xs text-neutral-400">
                days posting
              </p>
            </div>

            {/* Total Items */}
            <div className="bg-white p-6">
              <div className="mb-3">
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  Total Items
                </span>
              </div>
              <p className="mb-1 font-serif text-4xl text-neutral-900">
                {totalItems}
              </p>
              <p className="text-xs text-neutral-400">
                Across {Object.keys(categoryBreakdown).length} categories
              </p>
            </div>

            {/* Add Item Button */}
            <div className="flex items-center justify-center bg-white p-6">
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger asChild>
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 py-3 text-sm text-white transition-all hover:bg-neutral-800">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-white flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Add New Item to Closet</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!formData.image || !formData.category) {
                        setAddItemError("Please select an image and category");
                        return;
                      }

                      if (!isUsingApi || !currentUserId) {
                        setAddItemError("Please log in to add items");
                        return;
                      }

                      setAddingItem(true);
                      setAddItemError(null);

                      try {
                        // Upload image first
                        const imageUrl = await uploadImage(formData.image);

                        // Create closet item
                        const newItem = await createClosetItem({
                          image_url: imageUrl,
                          brand: formData.brand || undefined,
                          category: formData.category as Category,
                          vibe_tags: formData.vibeTags.length > 0 ? formData.vibeTags : undefined,
                          price_tier: formData.priceTier || undefined,
                          colors: formData.colors.length > 0 ? formData.colors : undefined,
                          fabric: formData.fabric || undefined,
                          silhouette: formData.silhouette || undefined,
                          subcategory: formData.subcategory || undefined,
                        });

                        // Convert to UI format and add to list
                        const uiItem = apiClosetItemToUI(newItem);
                        setClosetItems((prev) => [uiItem, ...prev]);

                        // Reset form and close dialog
                        setFormData({
                          image: null,
                          imagePreview: null,
                          brand: "",
                          category: "" as Category | "",
                          vibeTags: [],
                          priceTier: "" as PriceTier | "",
                          colors: [],
                          fabric: "",
                          silhouette: "" as Silhouette | "",
                          subcategory: "",
                        });
                        setAddItemOpen(false);
                      } catch (err) {
                        console.error("Failed to add item:", err);
                        setAddItemError(err instanceof Error ? err.message : "Failed to add item");
                      } finally {
                        setAddingItem(false);
                      }
                    }}
                    className="space-y-4 overflow-y-auto flex-1 pr-2"
                  >
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="image">Item Image *</Label>
                      <div className="flex items-center gap-4">
                        {formData.imagePreview ? (
                          <div className="relative">
                            <img
                              src={formData.imagePreview}
                              alt="Preview"
                              className="h-32 w-32 rounded-lg object-cover border border-neutral-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, image: null, imagePreview: null }));
                              }}
                              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor="image-upload"
                            className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-neutral-400"
                          >
                            <Upload className="mb-2 h-6 w-6 text-neutral-400" />
                            <span className="text-xs text-neutral-500">Upload Image</span>
                          </label>
                        )}
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData((prev) => ({
                                  ...prev,
                                  image: file,
                                  imagePreview: reader.result as string,
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Brand */}
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Select
                        value={formData.brand}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, brand: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="H&M">H&M</SelectItem>
                          <SelectItem value="Zara">Zara</SelectItem>
                          <SelectItem value="Nike">Nike</SelectItem>
                          <SelectItem value="Adidas">Adidas</SelectItem>
                          <SelectItem value="Uniqlo">Uniqlo</SelectItem>
                          <SelectItem value="Forever 21">Forever 21</SelectItem>
                          <SelectItem value="Gap">Gap</SelectItem>
                          <SelectItem value="Old Navy">Old Navy</SelectItem>
                          <SelectItem value="Target">Target</SelectItem>
                          <SelectItem value="ASOS">ASOS</SelectItem>
                          <SelectItem value="Shein">Shein</SelectItem>
                          <SelectItem value="Urban Outfitters">Urban Outfitters</SelectItem>
                          <SelectItem value="Aritzia">Aritzia</SelectItem>
                          <SelectItem value="Lululemon">Lululemon</SelectItem>
                          <SelectItem value="Levi's">Levi's</SelectItem>
                          <SelectItem value="Madewell">Madewell</SelectItem>
                          <SelectItem value="Everlane">Everlane</SelectItem>
                          <SelectItem value="Reformation">Reformation</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {(formData.brand === "Other" || (formData.brand && !PREDEFINED_BRANDS.includes(formData.brand))) && (
                        <Input
                          id="brand-custom"
                          value={formData.brand === "Other" ? "" : formData.brand}
                          placeholder="Enter brand name"
                          onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                        />
                      )}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as Category }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shirts">Shirts/Tops</SelectItem>
                          <SelectItem value="pants">Pants</SelectItem>
                          <SelectItem value="skirts_dresses">Skirts/Dresses</SelectItem>
                          <SelectItem value="jackets_outerwear">Jackets/Outerwear</SelectItem>
                          <SelectItem value="shoes">Shoes</SelectItem>
                          <SelectItem value="bags">Bags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Tier */}
                    <div className="space-y-2">
                      <Label htmlFor="priceTier">Price Tier</Label>
                      <Select
                        value={formData.priceTier}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, priceTier: value as PriceTier }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select price tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="budget">$</SelectItem>
                          <SelectItem value="mid">$$</SelectItem>
                          <SelectItem value="luxury">$$$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Colors */}
                    <div className="space-y-2">
                      <Label htmlFor="colors">Colors</Label>
                      <div className="flex flex-wrap gap-2">
                        {["black", "white", "gray", "navy", "beige", "sage", "cream", "camel", "tan", "gold", "red", "blue", "green", "pink", "brown"].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                colors: prev.colors.includes(color)
                                  ? prev.colors.filter((c) => c !== color)
                                  : [...prev.colors, color],
                              }));
                            }}
                            className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                              formData.colors.includes(color)
                                ? "bg-neutral-900 text-white"
                                : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                      <Input
                        id="custom-color"
                        placeholder="Or enter custom color"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const value = input.value.trim().toLowerCase();
                            if (value && !formData.colors.includes(value)) {
                              setFormData((prev) => ({
                                ...prev,
                                colors: [...prev.colors, value],
                              }));
                              input.value = "";
                            }
                          }
                        }}
                      />
                    </div>

                    {/* Fabric */}
                    <div className="space-y-2">
                      <Label htmlFor="fabric">Fabric</Label>
                      <Input
                        id="fabric"
                        value={formData.fabric}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fabric: e.target.value }))}
                        placeholder="e.g., cotton, denim, silk, wool"
                      />
                    </div>

                    {/* Silhouette */}
                    <div className="space-y-2">
                      <Label htmlFor="silhouette">Silhouette</Label>
                      <Select
                        value={formData.silhouette}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, silhouette: value as Silhouette }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select silhouette" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fitted">Fitted</SelectItem>
                          <SelectItem value="oversized">Oversized</SelectItem>
                          <SelectItem value="loose">Loose</SelectItem>
                          <SelectItem value="tailored">Tailored</SelectItem>
                          <SelectItem value="relaxed">Relaxed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subcategory */}
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Subcategory</Label>
                      <Input
                        id="subcategory"
                        value={formData.subcategory}
                        onChange={(e) => setFormData((prev) => ({ ...prev, subcategory: e.target.value }))}
                        placeholder="e.g., t-shirt, jeans, sweater, sneakers"
                      />
                    </div>

                    {/* Vibe Tags */}
                    <div className="space-y-2">
                      <Label>Vibe Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {(["date night", "casual", "workout", "office"] as VibeTag[]).map((vibe) => (
                          <button
                            key={vibe}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                vibeTags: prev.vibeTags.includes(vibe)
                                  ? prev.vibeTags.filter((v) => v !== vibe)
                                  : [...prev.vibeTags, vibe],
                              }));
                            }}
                            className={`rounded-full px-3 py-1 text-xs transition-colors ${
                              formData.vibeTags.includes(vibe)
                                ? "bg-neutral-900 text-white"
                                : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                            }`}
                          >
                            {vibe}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Error Message */}
                    {addItemError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {addItemError}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAddItemOpen(false);
                          setFormData({
                            image: null,
                            imagePreview: null,
                            brand: "",
                            category: "" as Category | "",
                            vibeTags: [],
                            priceTier: "" as PriceTier | "",
                            colors: [],
                            fabric: "",
                            silhouette: "" as Silhouette | "",
                            subcategory: "",
                          });
                          setAddItemError(null);
                        }}
                        disabled={addingItem}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addingItem || !formData.image || !formData.category}>
                        {addingItem ? "Adding..." : "Add Item"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Category Breakdown Chart */}
          <div className="border-t border-neutral-200/60 bg-white px-6 py-5">
            <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">
              Category Breakdown
            </p>
            <div className="space-y-2.5">
              {Object.entries(categoryBreakdown).map(([category, count]) => {
                const percentage = (count / totalItems) * 100;
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="w-20 text-xs capitalize text-neutral-600">
                      {category}
                    </div>
                    <div className="flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="h-full rounded-full bg-neutral-900"
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right text-xs text-neutral-500">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
              onClick={() => setFilter(cat.value as CategoryFilter)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs transition-all ${
                filter === cat.value
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-neutral-500">Loading closet items...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Visual Grid View */}
        {!loading && viewMode === "grid" && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredItems.length === 0 ? (
              <div className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center">
                <p className="text-sm text-neutral-500">No items in your closet yet.</p>
              </div>
            ) : (
              filteredItems.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedItem(item)}
                className="group overflow-hidden rounded-xl border border-neutral-200/60 bg-white text-left transition-all hover:border-neutral-300 hover:shadow-lg"
              >
                <div className="relative aspect-square overflow-hidden bg-neutral-50">
                  <img
                    src={item.imageUrl}
                    alt={`${item.brand} ${item.category}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Color Dot */}
                  <div
                    className="absolute right-3 top-3 h-5 w-5 rounded-full border-2 border-white shadow-sm"
                    style={{
                      backgroundColor: getColorHex(item.color),
                    }}
                  />
                </div>
                <div className="p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                    {item.category}
                  </p>
                  <p className="text-sm text-neutral-900">
                    {(item as any).subcategory && item.brand 
                      ? `${(item as any).subcategory} • ${item.brand}` 
                      : (item as any).subcategory || item.brand || item.style || "—"}
                  </p>
                </div>
              </motion.button>
              ))
            )}
          </div>
        )}

        {/* Structured List View */}
        {!loading && viewMode === "list" && (
          <div className="overflow-hidden rounded-xl border border-neutral-200/60 bg-white">
            {/* Table Header */}
            <div className="grid grid-cols-[60px_1fr_100px_100px_80px_100px_100px] gap-4 border-b border-neutral-200/60 bg-neutral-50 px-4 py-3 text-xs uppercase tracking-wide text-neutral-500">
              <div></div>
              <div>Item</div>
              <div>Category</div>
              <div>Brand</div>
              <div>Color</div>
              <div>Fabric</div>
              <div>Silhouette</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-neutral-200/60">
              {filteredItems.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-neutral-500">No items in your closet yet.</p>
                </div>
              ) : (
                filteredItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => setSelectedItem(item)}
                  className="grid w-full grid-cols-[60px_1fr_100px_100px_80px_100px_100px] items-center gap-4 px-4 py-3 text-left text-sm transition-colors hover:bg-neutral-50"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-neutral-100">
                    <img
                      src={item.imageUrl}
                      alt={item.brand || "Item"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-900">{item.brand || "—"}</p>
                    <p className="text-xs text-neutral-400">{item.style}</p>
                  </div>
                  <div className="text-xs capitalize text-neutral-600">
                    {item.category}
                  </div>
                  <div className="text-xs text-neutral-600">{item.brand || "—"}</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full border border-neutral-300"
                      style={{
                        backgroundColor: getColorHex(item.color),
                      }}
                    />
                    <span className="text-xs text-neutral-600">{item.color}</span>
                  </div>
                  <div className="text-xs text-neutral-600">{item.fabric || "—"}</div>
                  <div className="text-xs text-neutral-600">
                    {item.silhouette || "—"}
                  </div>
                </motion.button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl overflow-hidden rounded-t-3xl bg-white shadow-2xl md:inset-y-8 md:rounded-3xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-neutral-200/60 px-6 py-4">
                <h3 className="text-base">Item Details</h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="max-h-[70vh] overflow-y-auto md:max-h-[600px]">
                <div className="p-6">
                  {/* Image */}
                  <div className="mb-6 overflow-hidden rounded-2xl bg-neutral-50">
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.brand || "Item"}
                      className="w-full object-cover"
                    />
                  </div>

                  {/* Editable Form Fields - Matching edit form (without subcategory) */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!selectedItem || !detailFormData.category) {
                        setDetailError("Please fill in required fields");
                        return;
                      }

                      if (!isUsingApi || !currentUserId) {
                        setDetailError("Please log in to save changes");
                        return;
                      }

                      setSavingDetails(true);
                      setDetailError(null);

                      try {
                        // Prepare update data
                        const updates: any = {
                          brand: detailFormData.brand || null,
                          category: detailFormData.category as Category,
                          vibe_tags: detailFormData.vibeTags.length > 0 ? detailFormData.vibeTags : [],
                          price_tier: detailFormData.priceTier || null,
                          colors: detailFormData.colors.length > 0 ? detailFormData.colors : [],
                          fabric: detailFormData.fabric || null,
                          silhouette: detailFormData.silhouette || null,
                        };

                        // If new image was uploaded, update image_url
                        if (detailFormData.image) {
                          const imageUrl = await uploadImage(detailFormData.image);
                          updates.image_url = imageUrl;
                        }

                        // Update the item
                        const updatedItem = await updateClosetItem(selectedItem.id, updates);

                        // Convert to UI format and update in list
                        const uiItem = apiClosetItemToUI(updatedItem);
                        setClosetItems((prev) =>
                          prev.map((item) => (item.id === selectedItem.id ? uiItem : item))
                        );

                        // Update selected item
                        setSelectedItem(uiItem);
                      } catch (err) {
                        console.error("Failed to update item:", err);
                        setDetailError(err instanceof Error ? err.message : "Failed to update item");
                      } finally {
                        setSavingDetails(false);
                      }
                    }}
                    className="mb-6 space-y-4"
                  >
                    {/* Image Preview/Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="detail-image">Item Image</Label>
                      <div className="flex items-center gap-4">
                        {detailFormData.imagePreview ? (
                          <div className="relative">
                            <img
                              src={detailFormData.imagePreview}
                              alt="Preview"
                              className="h-32 w-32 rounded-lg object-cover border border-neutral-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setDetailFormData((prev) => ({ ...prev, image: null, imagePreview: null }));
                              }}
                              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor="detail-image-upload"
                            className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-neutral-400"
                          >
                            <Upload className="mb-2 h-6 w-6 text-neutral-400" />
                            <span className="text-xs text-neutral-500">Change Image</span>
                          </label>
                        )}
                        <input
                          id="detail-image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setDetailFormData((prev) => ({
                                  ...prev,
                                  image: file,
                                  imagePreview: reader.result as string,
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Brand */}
                    <div className="space-y-2">
                      <Label htmlFor="detail-brand">Brand</Label>
                      <Select
                        value={detailFormData.brand}
                        onValueChange={(value) => setDetailFormData((prev) => ({ ...prev, brand: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="H&M">H&M</SelectItem>
                          <SelectItem value="Zara">Zara</SelectItem>
                          <SelectItem value="Nike">Nike</SelectItem>
                          <SelectItem value="Adidas">Adidas</SelectItem>
                          <SelectItem value="Uniqlo">Uniqlo</SelectItem>
                          <SelectItem value="Forever 21">Forever 21</SelectItem>
                          <SelectItem value="Gap">Gap</SelectItem>
                          <SelectItem value="Old Navy">Old Navy</SelectItem>
                          <SelectItem value="Target">Target</SelectItem>
                          <SelectItem value="ASOS">ASOS</SelectItem>
                          <SelectItem value="Shein">Shein</SelectItem>
                          <SelectItem value="Urban Outfitters">Urban Outfitters</SelectItem>
                          <SelectItem value="Aritzia">Aritzia</SelectItem>
                          <SelectItem value="Lululemon">Lululemon</SelectItem>
                          <SelectItem value="Levi's">Levi's</SelectItem>
                          <SelectItem value="Madewell">Madewell</SelectItem>
                          <SelectItem value="Everlane">Everlane</SelectItem>
                          <SelectItem value="Reformation">Reformation</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {(detailFormData.brand === "Other" || (detailFormData.brand && !PREDEFINED_BRANDS.includes(detailFormData.brand))) && (
                        <Input
                          id="detail-brand-custom"
                          value={detailFormData.brand === "Other" ? "" : detailFormData.brand}
                          placeholder="Enter brand name"
                          onChange={(e) => setDetailFormData((prev) => ({ ...prev, brand: e.target.value }))}
                        />
                      )}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label htmlFor="detail-category">Category *</Label>
                      <Select
                        value={detailFormData.category}
                        onValueChange={(value) => setDetailFormData((prev) => ({ ...prev, category: value as Category }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shirts">Shirts/Tops</SelectItem>
                          <SelectItem value="pants">Pants</SelectItem>
                          <SelectItem value="skirts_dresses">Skirts/Dresses</SelectItem>
                          <SelectItem value="jackets_outerwear">Jackets/Outerwear</SelectItem>
                          <SelectItem value="shoes">Shoes</SelectItem>
                          <SelectItem value="bags">Bags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Tier */}
                    <div className="space-y-2">
                      <Label htmlFor="detail-priceTier">Price Tier</Label>
                      <Select
                        value={detailFormData.priceTier}
                        onValueChange={(value) => setDetailFormData((prev) => ({ ...prev, priceTier: value as PriceTier }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select price tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="budget">$</SelectItem>
                          <SelectItem value="mid">$$</SelectItem>
                          <SelectItem value="luxury">$$$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Colors */}
                    <div className="space-y-2">
                      <Label htmlFor="detail-colors">Colors</Label>
                      <div className="flex flex-wrap gap-2">
                        {["black", "white", "gray", "navy", "beige", "sage", "cream", "camel", "tan", "gold", "red", "blue", "green", "pink", "brown"].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setDetailFormData((prev) => ({
                                ...prev,
                                colors: prev.colors.includes(color)
                                  ? prev.colors.filter((c) => c !== color)
                                  : [...prev.colors, color],
                              }));
                            }}
                            className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                              detailFormData.colors.includes(color)
                                ? "bg-neutral-900 text-white"
                                : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                      <Input
                        id="detail-custom-color"
                        placeholder="Or enter custom color"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const value = input.value.trim().toLowerCase();
                            if (value && !detailFormData.colors.includes(value)) {
                              setDetailFormData((prev) => ({
                                ...prev,
                                colors: [...prev.colors, value],
                              }));
                              input.value = "";
                            }
                          }
                        }}
                      />
                    </div>

                    {/* Fabric */}
                    <div className="space-y-2">
                      <Label htmlFor="detail-fabric">Fabric</Label>
                      <Input
                        id="detail-fabric"
                        value={detailFormData.fabric}
                        onChange={(e) => setDetailFormData((prev) => ({ ...prev, fabric: e.target.value }))}
                        placeholder="e.g., cotton, denim, silk, wool"
                      />
                    </div>

                    {/* Silhouette */}
                    <div className="space-y-2">
                      <Label htmlFor="detail-silhouette">Silhouette</Label>
                      <Select
                        value={detailFormData.silhouette}
                        onValueChange={(value) => setDetailFormData((prev) => ({ ...prev, silhouette: value as Silhouette }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select silhouette" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fitted">Fitted</SelectItem>
                          <SelectItem value="oversized">Oversized</SelectItem>
                          <SelectItem value="loose">Loose</SelectItem>
                          <SelectItem value="tailored">Tailored</SelectItem>
                          <SelectItem value="relaxed">Relaxed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Vibe Tags */}
                    <div className="space-y-2">
                      <Label>Vibe Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {(["date night", "casual", "workout", "office"] as VibeTag[]).map((vibe) => (
                          <button
                            key={vibe}
                            type="button"
                            onClick={() => {
                              setDetailFormData((prev) => ({
                                ...prev,
                                vibeTags: prev.vibeTags.includes(vibe)
                                  ? prev.vibeTags.filter((v) => v !== vibe)
                                  : [...prev.vibeTags, vibe],
                              }));
                            }}
                            className={`rounded-full px-3 py-1 text-xs transition-colors ${
                              detailFormData.vibeTags.includes(vibe)
                                ? "bg-neutral-900 text-white"
                                : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                            }`}
                          >
                            {vibe}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Error Message */}
                    {detailError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {detailError}
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedItem(null)}
                        disabled={savingDetails}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={savingDetails || !detailFormData.category}>
                        {savingDetails ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-neutral-200/60 bg-neutral-50 p-4">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                        Works With
                      </p>
                      <p className="text-2xl text-neutral-900">
                        {selectedItem.compatibleWith || 0}
                      </p>
                      <p className="text-xs text-neutral-500">items in closet</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                        Times Worn
                      </p>
                      <p className="text-2xl text-neutral-900">
                        {selectedItem.timesWorn || 0}
                      </p>
                      <p className="text-xs text-neutral-500">this season</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Item Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-white flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Item Details</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedItem || !formData.category) {
                setEditItemError("Please fill in required fields");
                return;
              }

              if (!isUsingApi || !currentUserId) {
                setEditItemError("Please log in to edit items");
                return;
              }

              setEditingItem(true);
              setEditItemError(null);

              try {
                // Prepare update data
                const updates: any = {
                  brand: formData.brand || null,
                  category: formData.category as Category,
                  vibe_tags: formData.vibeTags.length > 0 ? formData.vibeTags : [],
                  price_tier: formData.priceTier || null,
                  colors: formData.colors.length > 0 ? formData.colors : [],
                  fabric: formData.fabric || null,
                  silhouette: formData.silhouette || null,
                  subcategory: formData.subcategory || null,
                };

                // If new image was uploaded, update image_url
                if (formData.image) {
                  const imageUrl = await uploadImage(formData.image);
                  updates.image_url = imageUrl;
                }

                // Update the item
                const updatedItem = await updateClosetItem(selectedItem.id, updates);

                // Convert to UI format and update in list
                const uiItem = apiClosetItemToUI(updatedItem);
                setClosetItems((prev) =>
                  prev.map((item) => (item.id === selectedItem.id ? uiItem : item))
                );

                // Update selected item
                setSelectedItem(uiItem);

                // Reset form and close dialog
                setFormData({
                  image: null,
                  imagePreview: null,
                  brand: "",
                  category: "" as Category | "",
                  vibeTags: [],
                  priceTier: "" as PriceTier | "",
                  colors: [],
                  fabric: "",
                  silhouette: "" as Silhouette | "",
                  subcategory: "",
                });
                setEditItemOpen(false);
              } catch (err) {
                console.error("Failed to update item:", err);
                setEditItemError(err instanceof Error ? err.message : "Failed to update item");
              } finally {
                setEditingItem(false);
              }
            }}
            className="space-y-4 overflow-y-auto flex-1 pr-2"
          >
            {/* Image Preview/Upload */}
            <div className="space-y-2">
              <Label htmlFor="edit-image">Item Image</Label>
              <div className="flex items-center gap-4">
                {formData.imagePreview ? (
                  <div className="relative">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="h-32 w-32 rounded-lg object-cover border border-neutral-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, image: null, imagePreview: null }));
                      }}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="edit-image-upload"
                    className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-neutral-400"
                  >
                    <Upload className="mb-2 h-6 w-6 text-neutral-400" />
                    <span className="text-xs text-neutral-500">Change Image</span>
                  </label>
                )}
                <input
                  id="edit-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData((prev) => ({
                          ...prev,
                          image: file,
                          imagePreview: reader.result as string,
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="edit-brand">Brand</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, brand: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="H&M">H&M</SelectItem>
                  <SelectItem value="Zara">Zara</SelectItem>
                  <SelectItem value="Nike">Nike</SelectItem>
                  <SelectItem value="Adidas">Adidas</SelectItem>
                  <SelectItem value="Uniqlo">Uniqlo</SelectItem>
                  <SelectItem value="Forever 21">Forever 21</SelectItem>
                  <SelectItem value="Gap">Gap</SelectItem>
                  <SelectItem value="Old Navy">Old Navy</SelectItem>
                  <SelectItem value="Target">Target</SelectItem>
                  <SelectItem value="ASOS">ASOS</SelectItem>
                  <SelectItem value="Shein">Shein</SelectItem>
                  <SelectItem value="Urban Outfitters">Urban Outfitters</SelectItem>
                  <SelectItem value="Aritzia">Aritzia</SelectItem>
                  <SelectItem value="Lululemon">Lululemon</SelectItem>
                  <SelectItem value="Levi's">Levi's</SelectItem>
                  <SelectItem value="Madewell">Madewell</SelectItem>
                  <SelectItem value="Everlane">Everlane</SelectItem>
                  <SelectItem value="Reformation">Reformation</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {(formData.brand === "Other" || (formData.brand && !PREDEFINED_BRANDS.includes(formData.brand))) && (
                <Input
                  id="edit-brand-custom"
                  value={formData.brand === "Other" ? "" : formData.brand}
                  placeholder="Enter brand name"
                  onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                />
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as Category }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shirts">Shirts/Tops</SelectItem>
                  <SelectItem value="pants">Pants</SelectItem>
                  <SelectItem value="skirts_dresses">Skirts/Dresses</SelectItem>
                  <SelectItem value="jackets_outerwear">Jackets/Outerwear</SelectItem>
                  <SelectItem value="shoes">Shoes</SelectItem>
                  <SelectItem value="bags">Bags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Tier */}
            <div className="space-y-2">
              <Label htmlFor="edit-priceTier">Price Tier</Label>
              <Select
                value={formData.priceTier}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, priceTier: value as PriceTier }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select price tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">$</SelectItem>
                  <SelectItem value="mid">$$</SelectItem>
                  <SelectItem value="luxury">$$$</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <Label htmlFor="edit-colors">Colors</Label>
              <div className="flex flex-wrap gap-2">
                {["black", "white", "gray", "navy", "beige", "sage", "cream", "camel", "tan", "gold", "red", "blue", "green", "pink", "brown"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        colors: prev.colors.includes(color)
                          ? prev.colors.filter((c) => c !== color)
                          : [...prev.colors, color],
                      }));
                    }}
                    className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                      formData.colors.includes(color)
                        ? "bg-neutral-900 text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
              <Input
                id="edit-custom-color"
                placeholder="Or enter custom color"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    const value = input.value.trim().toLowerCase();
                    if (value && !formData.colors.includes(value)) {
                      setFormData((prev) => ({
                        ...prev,
                        colors: [...prev.colors, value],
                      }));
                      input.value = "";
                    }
                  }
                }}
              />
            </div>

            {/* Fabric */}
            <div className="space-y-2">
              <Label htmlFor="edit-fabric">Fabric</Label>
              <Input
                id="edit-fabric"
                value={formData.fabric}
                onChange={(e) => setFormData((prev) => ({ ...prev, fabric: e.target.value }))}
                placeholder="e.g., cotton, denim, silk, wool"
              />
            </div>

            {/* Silhouette */}
            <div className="space-y-2">
              <Label htmlFor="edit-silhouette">Silhouette</Label>
              <Select
                value={formData.silhouette}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, silhouette: value as Silhouette }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select silhouette" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fitted">Fitted</SelectItem>
                  <SelectItem value="oversized">Oversized</SelectItem>
                  <SelectItem value="loose">Loose</SelectItem>
                  <SelectItem value="tailored">Tailored</SelectItem>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            <div className="space-y-2">
              <Label htmlFor="edit-subcategory">Subcategory</Label>
              <Input
                id="edit-subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData((prev) => ({ ...prev, subcategory: e.target.value }))}
                placeholder="e.g., t-shirt, jeans, sweater, sneakers"
              />
            </div>

            {/* Vibe Tags */}
            <div className="space-y-2">
              <Label>Vibe Tags</Label>
              <div className="flex flex-wrap gap-2">
                {(["date night", "casual", "workout", "office"] as VibeTag[]).map((vibe) => (
                  <button
                    key={vibe}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        vibeTags: prev.vibeTags.includes(vibe)
                          ? prev.vibeTags.filter((v) => v !== vibe)
                          : [...prev.vibeTags, vibe],
                      }));
                    }}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      formData.vibeTags.includes(vibe)
                        ? "bg-neutral-900 text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {editItemError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {editItemError}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditItemOpen(false);
                  setFormData({
                    image: null,
                    imagePreview: null,
                    brand: "",
                    category: "" as Category | "",
                    vibeTags: [],
                    priceTier: "" as PriceTier | "",
                    colors: [],
                    fabric: "",
                    silhouette: "" as Silhouette | "",
                    subcategory: "",
                  });
                  setEditItemError(null);
                }}
                disabled={editingItem}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editingItem || !formData.category}>
                {editingItem ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
