export default function DokumenteLoading() {
  return (
    <div style={{ minHeight: "100%", background: "var(--app-bg)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 104px" }}>
        <div className="skeleton" style={{ width: 180, height: 28, borderRadius: 8, marginBottom: 24 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ width: 72, height: 32, borderRadius: 10 }} />
          ))}
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "18px 0",
            borderBottom: i < 4 ? "1px solid var(--app-border)" : "none",
            opacity: 1 - i * 0.15,
          }}>
            <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "50%", height: 13, borderRadius: 6, marginBottom: 7 }} />
              <div className="skeleton" style={{ width: "35%", height: 11, borderRadius: 5 }} />
            </div>
            <div className="skeleton" style={{ width: 68, height: 13, borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
