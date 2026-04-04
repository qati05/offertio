"use client";

interface OffertioLogoProps {
  /** Icon + Wordmark (default) | "icon" = only icon | "wordmark" = only text */
  variant?: "full" | "icon" | "wordmark";
  size?: number;
  className?: string;
  href?: string;
}

export function OffertioIcon({ size = 32 }: { size?: number }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background square */}
      <rect width="100" height="100" rx="22" fill="#FAF7F4" />

      {/* Document shadow / depth layer */}
      <path
        d="M22 18 L66 18 L82 34 L82 84 L22 84 Z"
        fill="#EDE8E2"
        transform="translate(2 2)"
      />

      {/* Document body — white page */}
      <path
        d="M20 16 L64 16 L80 32 L80 82 L20 82 Z"
        fill="#FFFFFF"
        stroke="#E0D6CC"
        strokeWidth="1"
      />

      {/* Folded corner — orange reveal */}
      <path
        d="M64 16 L64 32 L80 32 Z"
        fill="#D94F00"
      />

      {/* Fold line crease — subtle warm line */}
      <path
        d="M64 16 L64 32 L80 32"
        stroke="#FAF7F4"
        strokeWidth="0.8"
        fill="none"
      />

      {/* Document content lines */}
      {/* First line — orange / headline */}
      <line x1="30" y1="46" x2="65" y2="46" stroke="#D94F00" strokeWidth="3.5" strokeLinecap="round" />

      {/* Detail lines — warm gray */}
      <line x1="30" y1="57" x2="60" y2="57" stroke="#C4B5A5" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="30" y1="66" x2="56" y2="66" stroke="#C4B5A5" strokeWidth="2.2" strokeLinecap="round" />

      {/* Total / bottom accent line */}
      <line x1="30" y1="76" x2="50" y2="76" stroke="#D94F00" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
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
        gap: size * 0.28,
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      {variant !== "wordmark" && <OffertioIcon size={size} />}

      {variant !== "icon" && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: size * 0.62,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "var(--color-text)",
            lineHeight: 1,
          }}
        >
          offert
          <em
            style={{
              fontStyle: "italic",
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
