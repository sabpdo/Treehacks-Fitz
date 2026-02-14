import { Outlet, Link, useLocation } from "react-router";
import { Home, Users, Sparkles, User, ShoppingBag, Plus } from "lucide-react";
import { motion } from "motion/react";

export function Root() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    // Profile tab only active on own profile, not when viewing /profile/:userId
    if (path === "/profile") return location.pathname === "/profile";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Main Content */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Floating Post Button */}
      {location.pathname === "/" && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Link
            to="/post"
            className="fixed right-6 bottom-24 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#8B9B8E] to-[#7A8A7D] shadow-2xl shadow-[#8B9B8E]/30 transition-all hover:scale-110 hover:shadow-3xl active:scale-95"
          >
            <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
          </Link>
        </motion.div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200/50 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-around px-6 py-3">
          <Link
            to="/"
            className="relative flex flex-col items-center gap-1.5 transition-colors duration-200"
          >
            <Home
              className={`h-6 w-6 transition-all ${
                isActive("/") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
              strokeWidth={isActive("/") ? 2.5 : 2}
            />
            <span
              className={`text-xs transition-all ${
                isActive("/") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
            >
              Feed
            </span>
            {isActive("/") && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-3 h-1 w-8 rounded-full bg-[#8B9B8E]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>

          <Link
            to="/community"
            className="relative flex flex-col items-center gap-1.5 transition-colors duration-200"
          >
            <Users
              className={`h-6 w-6 transition-all ${
                isActive("/community") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
              strokeWidth={isActive("/community") ? 2.5 : 2}
            />
            <span
              className={`text-xs transition-all ${
                isActive("/community") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
            >
              Community
            </span>
            {isActive("/community") && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-3 h-1 w-8 rounded-full bg-[#8B9B8E]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>

          <Link
            to="/ai-generator"
            className="relative flex flex-col items-center gap-1.5 transition-colors duration-200"
          >
            <Sparkles
              className={`h-6 w-6 transition-all ${
                isActive("/ai-generator") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
              strokeWidth={isActive("/ai-generator") ? 2.5 : 2}
            />
            <span
              className={`text-xs transition-all ${
                isActive("/ai-generator") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
            >
              AI
            </span>
            {isActive("/ai-generator") && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-3 h-1 w-8 rounded-full bg-[#8B9B8E]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>

          <Link
            to="/closet"
            className="relative flex flex-col items-center gap-1.5 transition-colors duration-200"
          >
            <ShoppingBag
              className={`h-6 w-6 transition-all ${
                isActive("/closet") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
              strokeWidth={isActive("/closet") ? 2.5 : 2}
            />
            <span
              className={`text-xs transition-all ${
                isActive("/closet") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
            >
              Closet
            </span>
            {isActive("/closet") && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-3 h-1 w-8 rounded-full bg-[#8B9B8E]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>

          <Link
            to="/profile"
            className="relative flex flex-col items-center gap-1.5 transition-colors duration-200"
          >
            <User
              className={`h-6 w-6 transition-all ${
                isActive("/profile") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
              strokeWidth={isActive("/profile") ? 2.5 : 2}
            />
            <span
              className={`text-xs transition-all ${
                isActive("/profile") ? "text-[#8B9B8E]" : "text-neutral-400"
              }`}
            >
              Profile
            </span>
            {isActive("/profile") && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-3 h-1 w-8 rounded-full bg-[#8B9B8E]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>
        </div>
      </nav>
    </div>
  );
}