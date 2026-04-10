export default function DokumentNeuLoading() {
  return (
    <div style={{ minHeight: "100%", background: "var(--app-bg)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 104px" }}>
        <div className="skeleton" style={{ width: 200, height: 28, borderRadius: 8, marginBottom: 32 }} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div className="skeleton" style={{ width: 80, height: 11, borderRadius: 5, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "100%", height: 44, borderRadius: 13 }} />
          </div>
        ))}
        <div className="skeleton" style={{ width: "100%", height: 120, borderRadius: 13, marginTop: 24 }} />
      </div>
    </div>
  );
}
