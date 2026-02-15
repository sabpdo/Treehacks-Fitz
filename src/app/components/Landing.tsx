import React, { useRef } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { Sparkles, Camera, Heart, ArrowRight } from "lucide-react";

// Curated outfit/fashion images for collage (Unsplash)
const COLLAGE_IMAGES = [
  { src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=320&q=80", pos: "top-[8%] left-[4%]", w: "w-36 md:w-44", rot: "-rotate-[8deg]" },
  { src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=320&q=80", pos: "top-[12%] right-[10%]", w: "w-32 md:w-40", rot: "rotate-[5deg]" },
  { src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=320&q=80", pos: "top-[35%] left-[2%]", w: "w-40 md:w-52", rot: "-rotate-[4deg]" },
  { src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=320&q=80", pos: "top-[28%] right-[2%]", w: "w-36 md:w-48", rot: "rotate-[6deg]" },
  { src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80", pos: "bottom-[25%] left-[8%]", w: "w-32 md:w-40", rot: "rotate-[-6deg]" },
  { src: "https://images.unsplash.com/photo-1558769132-cb1aea304033?w=320&q=80", pos: "bottom-[20%] right-[6%]", w: "w-36 md:w-44", rot: "rotate-[7deg]" },
  { src: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=320&q=80", pos: "top-[55%] left-[18%]", w: "w-28 md:w-36", rot: "-rotate-[10deg]" },
  { src: "https://images.unsplash.com/photo-1564257631407-2f31f46d1f24?w=320&q=80", pos: "bottom-[35%] right-[18%]", w: "w-30 md:w-38", rot: "rotate-[-5deg]" },
  { src: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=320&q=80", pos: "top-[6%] left-[32%]", w: "w-24 md:w-32", rot: "rotate-[12deg]" },
  { src: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=320&q=80", pos: "bottom-[8%] left-[28%]", w: "w-28 md:w-36", rot: "-rotate-[7deg]" },
];

// Fits from the community: outfit image + handle
const COMMUNITY_FITS = [
  { src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=280&q=80", handle: "@MAGGIE" },
  { src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=280&q=80", handle: "@SAVANNAH" },
  { src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=280&q=80", handle: "@MAXINE" },
  { src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=280&q=80", handle: "@PEARL" },
  { src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=280&q=80", handle: "@EMILY" },
  { src: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=280&q=80", handle: "@MICHELLE" },
  { src: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=280&q=80", handle: "@SISSI" },
  { src: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=280&q=80", handle: "@AMY" },
];

export function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  // Parallax: collage images move at different speeds on scroll
  const parallax = (v0: number, v1: number) => useTransform(scrollYProgress, [0, 0.5, 1], [v0, v1, v0]);
  const collageY = [
    parallax(-12, 24), parallax(18, -20), parallax(-8, 16), parallax(14, -12),
    parallax(-20, 10), parallax(10, -18), parallax(-16, 14), parallax(22, -8),
    parallax(-10, 20), parallax(16, -14),
  ];

  // @ symbol: fades and drifts slightly as you scroll
  const atOpacity = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0.14, 0.08, 0.04, 0.07, 0.03]);
  const atYOffset = useTransform(scrollYProgress, [0, 0.5, 1], [0, 24, 0]);
  const atY = useTransform(atYOffset, (v) => `calc(-50% + ${v}px)`);
  const atScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.08, 1]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Collage background - parallax on scroll */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[#0a0a0a]/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/50 to-[#0a0a0a]/90 z-10" />
        {COLLAGE_IMAGES.map((img, i) => (
          <motion.div
            key={i}
            className={`absolute ${img.pos} ${img.w} ${img.rot} rounded-xl md:rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-transform duration-300 hover:scale-105`}
            style={{ zIndex: 1, y: collageY[i] }}
          >
            <img
              src={img.src}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              fetchPriority={i < 4 ? "high" : "low"}
            />
          </motion.div>
        ))}
      </div>

      {/* Glossy @ symbol - moves and fades with scroll */}
      <motion.div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 z-[2] pointer-events-none select-none hidden lg:block"
        style={{ y: atY, opacity: atOpacity, scale: atScale }}
        aria-hidden
      >
        <span
          className="block text-[min(28vw,320px)] font-extralight"
          style={{
            fontFamily: "system-ui, sans-serif",
            textShadow: "0 0 80px rgba(255,255,255,0.2)",
            filter: "drop-shadow(0 0 40px rgba(96,165,250,0.2))",
          }}
        >
          @
        </span>
      </motion.div>

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-3 items-center gap-4 px-5 py-3.5 md:px-8 md:py-4">
          <Link
            to="/login"
            className="group relative justify-self-start overflow-hidden rounded-full border-2 border-[#60a5fa] bg-black/60 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#60a5fa] hover:text-black"
          >
            <span className="relative flex items-center gap-2">
              Try fitz
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
          <Link to="/" className="justify-self-center flex items-center" aria-label="fitz">
            <img src="/fitz.png" alt="fitz" className="h-9 w-auto object-contain opacity-95" />
          </Link>
          <div className="flex items-center justify-end gap-3">
            <Link
              to="/login"
              className="rounded-full border border-white/25 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/50 hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-[#60a5fa] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#93c5fd]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-[85vh] flex-col items-center justify-center px-6 pt-28 pb-24 md:px-8 md:pt-32 md:pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative w-full max-w-xl mx-auto text-center"
        >
          <div
            className="relative mx-auto w-[min(220px,45vw)] md:w-[280px] transition-transform duration-500 hover:scale-[1.02]"
            style={{
              filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.4)) drop-shadow(0 0 60px rgba(96,165,250,0.2))",
            }}
          >
            <img src="/fitz.png" alt="fitz" className="h-auto w-full object-contain" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-10 text-2xl font-medium tracking-tight text-white/95 md:text-3xl lg:text-4xl"
          >
            Your daily fit,{" "}
            <span className="bg-gradient-to-r from-[#60a5fa] to-[#38bdf8] bg-clip-text text-transparent">
              shared.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/70 md:text-base"
          >
            Post your OOTD, get AI style recs, and discover what your friends are wearing.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center"
          >
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#60a5fa] px-8 py-3.5 text-base font-medium text-black transition-colors hover:bg-[#93c5fd]"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              I have an account
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="relative z-10 border-t border-white/10 bg-black/30 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6 md:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-xl font-semibold text-white md:text-2xl"
          >
            How fitz works
          </motion.h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
            {[
              { step: "1", icon: Camera, title: "Post your fit", text: "Snap your outfit of the day and share it with friends. One tap from your camera or roll." },
              { step: "2", icon: Sparkles, title: "Get style recs", text: "AI suggests looks from your closet and curates picks. Weather-aware and tailored to your vibe." },
              { step: "3", icon: Heart, title: "Share & discover", text: "See what your network is wearing, rank items together, and shop the look in one click." },
            ].map(({ step, icon: Icon, title, text }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-6 md:p-7"
              >
                <span className="absolute -top-2.5 left-5 flex h-7 w-7 items-center justify-center rounded-full bg-[#60a5fa] text-xs font-semibold text-black">
                  {step}
                </span>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#60a5fa]/15 text-[#60a5fa]">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mb-1.5 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="relative z-10 border-t border-white/10 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6 md:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-xl font-semibold text-white md:text-2xl"
          >
            Fits from the community
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mx-auto mt-2 max-w-sm text-center text-sm text-white/50"
          >
            Real outfits, real style. Join and share yours.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 flex gap-4 overflow-x-auto pb-2 scrollbar-hide md:gap-5"
          >
            {COMMUNITY_FITS.map(({ src, handle }) => (
              <div
                key={handle}
                className="flex-shrink-0 w-[140px] md:w-[160px] overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg"
              >
                <div className="aspect-[3/4] overflow-hidden bg-neutral-800">
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="truncate px-3 py-2.5 text-center text-xs font-medium text-white/90">
                  {handle}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* CTA strip */}
      <section className="relative z-10 border-t border-white/10 bg-gradient-to-b from-[#60a5fa]/5 to-transparent py-16 md:py-20">
        <div className="mx-auto max-w-xl px-6 text-center md:px-8">
          <h2 className="text-xl font-semibold text-white md:text-2xl">
            Ready to share your fit?
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Join fitz and start posting in seconds.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#60a5fa] px-8 py-3.5 text-base font-medium text-black transition-colors hover:bg-[#93c5fd]"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-[#60a5fa] underline underline-offset-2 hover:no-underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-8">
          <img src="/fitz.png" alt="fitz" className="h-7 w-auto opacity-70" />
          <div className="flex items-center gap-6 text-xs text-white/40">
            <a href="#" className="transition-colors hover:text-white/70">Terms</a>
            <a href="#" className="transition-colors hover:text-white/70">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
