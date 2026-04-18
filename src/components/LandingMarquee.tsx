const logos = [
  "Elektro Baumann", "Müller Haustechnik", "Schneider Garten",
  "Weber Sanitär", "Huber Malerei", "Rüegg Zimmerei", "Keller Bau", "Frei Heizung",
];

export default function LandingMarquee() {
  const items = [...logos, ...logos];
  return (
    <div
      className="overflow-hidden py-10"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.01)",
        maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div
        className="flex gap-16 whitespace-nowrap"
        style={{ animation: "marquee 36s linear infinite", width: "max-content" }}
      >
        {items.map((name, i) => (
          <span
            key={i}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "1.2rem",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "rgba(240,237,232,0.35)",
            }}
          >
            {name}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
