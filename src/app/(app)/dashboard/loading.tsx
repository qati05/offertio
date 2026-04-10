export default function DashboardLoading() {
  return (
    <div style={{ minHeight: "100%", background: "var(--app-bg)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 104px" }}>
        {/* Greeting skeleton */}
        <div style={{ marginBottom: 48 }}>
          <div className="skeleton" style={{ width: 160, height: 13, borderRadius: 6, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 220, height: 36, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 180, height: 13, borderRadius: 6 }} />
        </div>

        {/* Tile skeletons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 48 }}>
          <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
        </div>

        {/* Verlauf skeletons */}
        <div className="skeleton" style={{ width: 60, height: 11, borderRadius: 5, marginBottom: 20 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "18px 0",
            borderBottom: i < 2 ? "1px solid var(--app-border)" : "none",
            opacity: 1 - i * 0.28,
          }}>
            <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "44%", height: 13, borderRadius: 6, marginBottom: 7 }} />
              <div className="skeleton" style={{ width: "30%", height: 11, borderRadius: 5 }} />
            </div>
            <div className="skeleton" style={{ width: 68, height: 13, borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
