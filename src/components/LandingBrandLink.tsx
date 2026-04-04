"use client";

import Link from "next/link";

type LandingBrandSize = "sm" | "md";

const SIZE_STYLES: Record<LandingBrandSize, { icon: string; text: string }> = {
  sm: {
    icon: "w-6 h-6 text-xs rounded-lg",
    text: "text-base",
  },
  md: {
    icon: "w-8 h-8 text-sm rounded-lg",
    text: "text-lg",
  },
};

interface LandingBrandLinkProps {
  size?: LandingBrandSize;
  className?: string;
}

export default function LandingBrandLink({
  size = "md",
  className = "",
}: LandingBrandLinkProps) {
  const styles = SIZE_STYLES[size];

  return (
    <Link href="/" className={`flex items-center gap-2 group ${className}`.trim()}>
      <div
        className={`${styles.icon} flex items-center justify-center text-white font-bold transition-transform duration-300 group-hover:rotate-6`}
        style={{ background: "var(--color-primary)" }}
      >
        O
      </div>
      <span
        className={`${styles.text} font-bold tracking-[-0.02em]`}
        style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
      >
        Offertio
      </span>
    </Link>
  );
}
