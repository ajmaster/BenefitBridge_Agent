"use client";

import { useReducedMotion } from "@/lib/useReducedMotion";

export function HeroDemoLoop() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <img
        src="/demo-videos/hero-loop-poster.png"
        alt=""
        aria-hidden="true"
        className="w-full rounded-2xl shadow-atlas"
      />
    );
  }

  return (
    <video
      className="w-full rounded-2xl shadow-atlas"
      src="/demo-videos/hero-loop.mp4"
      poster="/demo-videos/hero-loop-poster.png"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
