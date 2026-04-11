import Link from "next/link";

export const metadata = {
  title: "Blog – Rechnungs- und Offertentipps für DACH | Offertio",
  description:
    "Praxistipps zu QR-Rechnung Schweiz, E-Rechnung Deutschland und Offertensoftware für Selbstständige und kleine Betriebe.",
};

const blogPosts = [
  {
    slug: "qr-rechnung-schweiz-2026",
    title: "Swiss QR-Rechnung 2026: Alles was Schweizer Betriebe wissen müssen",
    teaser:
      "Die QR-Rechnung ist seit 2022 Standard in der Schweiz. Was genau ist sie, wer braucht sie und wie erstellt man sie richtig?",
    readingTime: "6 min",
    date: "2026-04-10",
    dateFormatted: "10. April 2026",
  },
  {
    slug: "e-rechnung-deutschland-2026",
    title:
      "E-Rechnung Pflicht Deutschland 2025/2026: Was gilt für Kleinunternehmer?",
    teaser:
      "Ab 2025 ist die E-Rechnung im B2B-Geschäft in Deutschland verbindlich. Das erwartet Selbstständige und kleine Betriebe.",
    readingTime: "7 min",
    date: "2026-04-09",
    dateFormatted: "9. April 2026",
  },
];

export default function BlogPage() {
  return (
    <div className="px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{ color: "var(--color-text)" }}
          >
            Offertio Blog
          </h1>
          <p
            className="text-lg"
            style={{ color: "var(--color-text-muted)" }}
          >
            Praxistipps zu Rechnungen, Offerten und digitalen Geschäftsprozessen
            für Betriebe in der Schweiz, Deutschland und Österreich.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="space-y-8">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:shadow-lg"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="space-y-3">
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ color: "var(--color-text)" }}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:opacity-80 transition-opacity duration-200"
                  >
                    {post.title}
                  </Link>
                </h2>

                <p
                  className="text-base leading-7"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {post.teaser}
                </p>

                <div
                  className="flex flex-wrap items-center gap-4 text-sm pt-2"
                  style={{ color: "var(--color-text-soft)" }}
                >
                  <span>{post.dateFormatted}</span>
                  <span>•</span>
                  <span>{post.readingTime} Lesedauer</span>
                </div>

                <div className="pt-4">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center font-medium transition-all duration-200 hover:translate-x-1"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Weiterlesen →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
