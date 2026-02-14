import { Link } from "react-router";
import { motion } from "motion/react";
import type { User } from "../../data/mockData";
import { ensurePublicStorageUrl, DEFAULT_AVATAR } from "../../../lib/adapters";
import { Badge } from "./Badge";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

type UserCardProps = {
  user: User;
  recentOotdUrls?: string[];
  isFollowing: boolean;
  onFollow: () => void;
  showFollowButton?: boolean;
  variant?: "list" | "grid";
  className?: string;
};

export function UserCard({
  user,
  recentOotdUrls = [],
  isFollowing,
  onFollow,
  showFollowButton = true,
  variant = "list",
  className,
}: UserCardProps) {
  if (variant === "grid") {
    return (
      <motion.div
        whileTap={{ scale: 0.995 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm transition-all duration-300 hover:border-neutral-300 hover:shadow-md",
          className
        )}
      >
        <Link to={`/profile/${user.id}`} className="block p-4">
          <div className="flex flex-col items-center text-center">
            <img
              src={user.avatarUrl ? ensurePublicStorageUrl(user.avatarUrl) : DEFAULT_AVATAR}
              alt={user.name}
              className="h-16 w-16 rounded-full object-cover transition-transform duration-300 hover:scale-105"
            />
            <p className="mt-2 font-medium text-neutral-900">{user.name}</p>
            <p className="text-xs text-neutral-500">@{user.handle}</p>
          </div>
        </Link>
        {showFollowButton && (
          <div className="border-t border-neutral-100 px-4 pb-4 pt-2">
            <motion.div whileTap={{ scale: 0.96 }} transition={{ duration: 0.2 }}>
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className="w-full rounded-full border-neutral-200 bg-neutral-900 py-1.5 text-xs text-white transition-all duration-200 hover:bg-neutral-800"
                onClick={(e) => {
                  e.preventDefault();
                  onFollow();
                }}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            </motion.div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-all duration-300 hover:border-neutral-300 hover:shadow-md",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <Link
            to={`/profile/${user.id}`}
            className="flex-shrink-0 transition-opacity duration-200 hover:opacity-90"
          >
            <img
              src={user.avatarUrl ? ensurePublicStorageUrl(user.avatarUrl) : DEFAULT_AVATAR}
              alt={user.name}
              className="h-14 w-14 rounded-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={`/profile/${user.id}`}
              className="block transition-opacity duration-200 hover:opacity-80"
            >
              <p className="font-medium text-neutral-900">{user.name}</p>
              <p className="text-xs text-neutral-500">@{user.handle}</p>
            </Link>
            {user.bio && (
              <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{user.bio}</p>
            )}
            {user.vibes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.vibes.slice(0, 3).map((v) => (
                  <Badge key={v} variant="muted">
                    {v}
                  </Badge>
                ))}
              </div>
            )}
            {showFollowButton && (
              <motion.div whileTap={{ scale: 0.96 }} transition={{ duration: 0.2 }}>
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  className="mt-3 rounded-full border-neutral-200 bg-neutral-900 px-4 text-white transition-all duration-200 hover:bg-neutral-800"
                  onClick={(e) => {
                    e.preventDefault();
                    onFollow();
                  }}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {recentOotdUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-1 overflow-hidden rounded-xl bg-neutral-50">
            {recentOotdUrls.slice(0, 4).map((url, i) => (
              <div key={i} className="group aspect-square overflow-hidden">
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
