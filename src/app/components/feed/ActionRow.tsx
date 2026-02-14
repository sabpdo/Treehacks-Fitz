import { Heart, Bookmark, MessageCircle, Repeat2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../ui/utils";

type ActionRowProps = {
  isLiked: boolean;
  isSaved: boolean;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
  onSave: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  className?: string;
};

export function ActionRow({
  isLiked,
  isSaved,
  likeCount,
  commentCount,
  onLike,
  onSave,
  onComment,
  onRepost,
  className,
}: ActionRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 border-t border-neutral-200/60 bg-white px-4 py-3",
        className
      )}
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.2 }}
        onClick={onLike}
        className="flex items-center gap-1.5 text-neutral-600 transition-colors duration-200 hover:text-neutral-900"
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-colors duration-200",
            isLiked && "fill-rose-500 text-rose-500"
          )}
        />
        <span className="text-xs">{likeCount}</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.2 }}
        onClick={onSave}
        className="flex items-center gap-1.5 text-neutral-600 transition-colors duration-200 hover:text-neutral-900"
      >
        <Bookmark
          className={cn(
            "h-5 w-5 transition-colors duration-200",
            isSaved && "fill-[#8B9B8E] text-[#8B9B8E]"
          )}
        />
      </motion.button>

      {onComment != null && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.2 }}
          onClick={onComment}
          className="flex items-center gap-1.5 text-neutral-600 transition-colors duration-200 hover:text-neutral-900"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs">{commentCount}</span>
        </motion.button>
      )}

      {onRepost != null && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.2 }}
          onClick={onRepost}
          className="flex items-center gap-1.5 text-neutral-600 transition-colors duration-200 hover:text-neutral-900"
        >
          <Repeat2 className="h-5 w-5" />
        </motion.button>
      )}
    </div>
  );
}
