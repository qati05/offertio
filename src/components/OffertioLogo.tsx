"use client";

interface OffertioLogoProps {
  /** "full" = icon + wordmark (default) | "icon" = only icon | "wordmark" = only text */
  variant?: "full" | "icon" | "wordmark";
  size?: number;
  className?: string;
  href?: string;
  /** "dark" = on dark bg (default, amber arc) | "light" = on light bg (dark arc) */
  theme?: "dark" | "light";
}

/**
 * The Arc-O mark.
 * 315° amber arc, clockwise from 12 o'clock to 10:30.
 * Cream origin-dot at 12 anchors the eye; amber endpoint at 10:30 marks completion.
 * Reads as precision, momentum, and the letter O simultaneously.
 */
export function OffertioIcon({
  size = 32,
  theme = "dark",
}: {
  size?: number;
  theme?: "dark" | "light";
}) {
  const bg = theme === "light" ? "#F5F2EE" : "#0F0D0B";
  const arcStart = theme === "light" ? "#B86A28" : "#E8945A";
  const arcEnd = theme === "light" ? "#8A4E1A" : "#C8793D";
  const originDot = theme === "light" ? "#1A1916" : "#F5F1EB";
  const endDot = "#C8793D";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arcGrad" x1="0.65" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={arcStart} />
          <stop offset="100%" stopColor={arcEnd} />
        </linearGradient>
      </defs>

      {/* Background — warm near-black, iOS-style rounded square */}
      <rect width="100" height="100" rx="26" fill={bg} />

      {/*
        Arc: 315° clockwise from 12 o'clock (50, 23) to 10:30 (30.9, 30.9).
        The deliberate 45° gap in the upper-left reads as openness — an offer
        extended, not yet closed.
        large-arc-flag=1 (long path), sweep-flag=1 (clockwise)
      */}
      <path
        d="M 50 23 A 27 27 0 1 1 30.9 30.9"
        stroke="url(#arcGrad)"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />

      {/* Origin — 12 o'clock: cream dot, bright focal point */}
      <circle cx="50" cy="23" r="7" fill={originDot} />

      {/* Completion — 10:30: amber dot marks where the arc arrives */}
      <circle cx="30.9" cy="30.9" r="5" fill={endDot} />
    </svg>
  );
}

export default function OffertioLogo({
  variant = "full",
  size = 32,
  className = "",
  href = "/",
  theme = "dark",
}: OffertioLogoProps) {
  const textColor = theme === "dark" ? "var(--color-text, #F0EDE8)" : "var(--app-text, #1A1916)";

  const content = (
    <span
      className={`offertio-logo ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.28,
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      {variant !== "wordmark" && <OffertioIcon size={size} theme={theme} />}

      {variant !== "icon" && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: size * 0.6,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: textColor,
            lineHeight: 1,
          }}
        >
          offert
          <em
            style={{
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--color-primary, #C8793D)",
            }}
          >
            io
          </em>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: "none" }}>
        {content}
      </a>
    );
  }

  return content;
}
