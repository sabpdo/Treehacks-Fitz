import { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { OutfitItem } from "../../data/mockData";
import { ensurePublicStorageUrl } from "../../../lib/adapters";
import { cn } from "../ui/utils";

type OutfitItemPopoverProps = {
  item: OutfitItem | null;
  onClose: () => void;
  className?: string;
};

/** Floating card for a single outfit item (dot click). Not a bottom sheet — card on screen with X. */
export function OutfitItemPopover({ item, onClose, className }: OutfitItemPopoverProps) {
  useEffect(() => {
    if (!item) return;
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-[min(88vw,320px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-2xl",
              className
            )}
          >
            <div className="relative flex flex-col">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-500 shadow-sm transition hover:bg-white hover:text-neutral-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {item.imageUrl ? (
                <div className="aspect-square w-full overflow-hidden bg-neutral-50">
                  <img
                    src={ensurePublicStorageUrl(item.imageUrl)}
                    alt={item.label}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="border-t border-neutral-100 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-400">{item.type}</p>
                <p className="mt-0.5 font-medium text-neutral-900">{item.label}</p>
                {(item.brand || item.color) && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {[item.brand, item.color].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
