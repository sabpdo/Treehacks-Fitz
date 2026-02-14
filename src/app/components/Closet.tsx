import React, { useState, useEffect } from "react";
import { Plus, Grid3x3, List, X, ChevronRight, Flame, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { mockClosetItems, type ClosetItem, currentUserProfile } from "../data/mockData";
import { useAppStore } from "../context/AppStore";
import { getCurrentProfile, getClosetItems, createClosetItem, uploadImage } from "../../services/api";
import { apiClosetItemToUI } from "../../lib/adapters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { Category, VibeTag, PriceTier, Silhouette } from "../../types/database";

type CategoryFilter = "all" | "tops" | "bottoms" | "outerwear" | "shoes" | "accessories";
type ViewMode = "grid" | "list";

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
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                        placeholder="e.g., Nike, Zara"
                      />
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
                          <SelectItem value="budget">Budget</SelectItem>
                          <SelectItem value="mid">Mid-range</SelectItem>
                          <SelectItem value="luxury">Luxury</SelectItem>
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
                      backgroundColor:
                        item.color.toLowerCase() === "white"
                          ? "#F5F5F5"
                          : item.color.toLowerCase() === "black"
                          ? "#1a1a1a"
                          : item.color.toLowerCase() === "beige"
                          ? "#D4C5B9"
                          : item.color.toLowerCase() === "navy"
                          ? "#1F2937"
                          : item.color.toLowerCase() === "gray"
                          ? "#9CA3AF"
                          : item.color.toLowerCase() === "sage"
                          ? "#8B9B8E"
                          : item.color.toLowerCase() === "cream"
                          ? "#F5F1E8"
                          : item.color.toLowerCase() === "camel"
                          ? "#C19A6B"
                          : item.color.toLowerCase() === "tan"
                          ? "#D2B48C"
                          : item.color.toLowerCase() === "gold"
                          ? "#FFD700"
                          : "#E5E7EB",
                    }}
                  />
                </div>
                <div className="p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                    {item.category}
                  </p>
                  <p className="mb-0.5 text-sm text-neutral-900">{item.brand}</p>
                  <p className="text-xs text-neutral-500">{item.color}</p>
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
                        backgroundColor:
                          item.color.toLowerCase() === "white"
                            ? "#F5F5F5"
                            : item.color.toLowerCase() === "black"
                            ? "#1a1a1a"
                            : item.color.toLowerCase() === "beige"
                            ? "#D4C5B9"
                            : item.color.toLowerCase() === "navy"
                            ? "#1F2937"
                            : item.color.toLowerCase() === "gray"
                            ? "#9CA3AF"
                            : item.color.toLowerCase() === "sage"
                            ? "#8B9B8E"
                            : item.color.toLowerCase() === "cream"
                            ? "#F5F1E8"
                            : item.color.toLowerCase() === "camel"
                            ? "#C19A6B"
                            : item.color.toLowerCase() === "tan"
                            ? "#D2B48C"
                            : item.color.toLowerCase() === "gold"
                            ? "#FFD700"
                            : "#E5E7EB",
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

                  {/* Metadata Grid - Matching form field order */}
                  <div className="mb-6 space-y-4">
                    {/* Brand */}
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                        Brand
                      </p>
                      <p className="text-neutral-900">{selectedItem.brand || "—"}</p>
                    </div>

                    {/* Category */}
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                        Category
                      </p>
                      <p className="capitalize text-neutral-900">
                        {selectedItem.category}
                      </p>
                    </div>

                    {/* Price Tier */}
                    {(selectedItem as any).priceTier && (
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                          Price Tier
                        </p>
                        <p className="capitalize text-neutral-900">
                          {(selectedItem as any).priceTier}
                        </p>
                      </div>
                    )}
                    
                    {/* Colors */}
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">
                        Colors
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {((selectedItem as any).allColors && (selectedItem as any).allColors.length > 0
                          ? (selectedItem as any).allColors
                          : [selectedItem.color]
                        ).map((color: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full border border-neutral-300"
                              style={{
                                backgroundColor:
                                  color.toLowerCase() === "white"
                                    ? "#F5F5F5"
                                    : color.toLowerCase() === "black"
                                    ? "#1a1a1a"
                                    : color.toLowerCase() === "beige"
                                    ? "#D4C5B9"
                                    : color.toLowerCase() === "navy"
                                    ? "#1F2937"
                                    : color.toLowerCase() === "gray"
                                    ? "#9CA3AF"
                                    : color.toLowerCase() === "sage"
                                    ? "#8B9B8E"
                                    : color.toLowerCase() === "cream"
                                    ? "#F5F1E8"
                                    : color.toLowerCase() === "camel"
                                    ? "#C19A6B"
                                    : color.toLowerCase() === "tan"
                                    ? "#D2B48C"
                                    : color.toLowerCase() === "gold"
                                    ? "#FFD700"
                                    : "#E5E7EB",
                              }}
                            />
                            <span className="text-neutral-900 capitalize text-sm">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fabric */}
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                        Fabric
                      </p>
                      <p className="text-neutral-900">{selectedItem.fabric || "—"}</p>
                    </div>

                    {/* Silhouette */}
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                        Silhouette
                      </p>
                      <p className="text-neutral-900 capitalize">
                        {selectedItem.silhouette || "—"}
                      </p>
                    </div>

                    {/* Subcategory */}
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                        Subcategory
                      </p>
                      <p className="text-neutral-900">{selectedItem.style || "—"}</p>
                    </div>

                    {/* Vibe Tags */}
                    {selectedItem.aiTags && selectedItem.aiTags.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">
                          Vibe Tags
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedItem.aiTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

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

                  {/* Action Buttons */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 py-3 text-sm text-white transition-all hover:bg-neutral-800">
                      View Outfits
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-3 text-sm text-neutral-900 transition-all hover:bg-neutral-50">
                      Edit Details
                    </button>
                  </div>
                </div>
              </div>
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
