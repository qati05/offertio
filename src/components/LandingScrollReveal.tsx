"use client";

import { useEffect } from "react";

export default function LandingScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;

    const updateScrollTokens = () => {
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(window.scrollY / maxScroll, 1);
      root.style.setProperty("--scroll-progress", progress.toFixed(4));
      root.style.setProperty("--hero-parallax", `${window.scrollY * 0.06}px`);
    };

    updateScrollTokens();

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateScrollTokens();
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div className="scroll-progress-bar h-full origin-left" />
    </div>
  );
}
