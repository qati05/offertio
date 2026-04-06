"use client";

interface OffertioLogoProps {
  /** Icon + Wordmark (default) | "icon" = only icon | "wordmark" = only text */
  variant?: "full" | "icon" | "wordmark";
  size?: number;
  className?: string;
  href?: string;
}

/**
 * The Arc O — 315° of a precise circle, clockwise from 12 to 10:30.
 * Two amber terminals mark origin (12 o'clock) and completion (10:30).
 * Reads as precision, flow, and the letter O simultaneously.
 */
export function OffertioIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background — warm obsidian, slightly rounded square */}
      <rect width="100" height="100" rx="26" fill="#1A1916" />

      {/*
        Arc: 315° clockwise from 12 o'clock (50, 23) to 10:30 (30.9, 30.9).
        The 45° gap sits in the upper-left — a deliberate opening, not a flaw.
        large-arc-flag=1, sweep-flag=1 (clockwise through 3 → 6 → 9 → 10:30)
      */}
      <path
        d="M 50 23 A 27 27 0 1 1 30.9 30.9"
        stroke="#E8E3DC"
        strokeWidth="8.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Origin — 12 o'clock, larger amber dot anchors the eye */}
      <circle cx="50" cy="23" r="7" fill="#C8793D" />

      {/* Completion — 10:30, smaller amber dot marks arrival */}
      <circle cx="30.9" cy="30.9" r="5" fill="#C8793D" />
    </svg>
  );
}

export default function OffertioLogo({
  variant = "full",
  size = 32,
  className = "",
  href = "/",
}: OffertioLogoProps) {
  const content = (
    <span
      className={`offertio-logo ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.3,
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      {variant !== "wordmark" && <OffertioIcon size={size} />}

      {variant !== "icon" && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: size * 0.6,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--color-text)",
            lineHeight: 1,
          }}
        >
          offert
          <em
            style={{
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--color-primary)",
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
