import React from "react";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen text-[color:var(--color-text)]"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 20% 0%, rgba(200,121,61,0.12), transparent 60%),
          linear-gradient(175deg, #0F0D0B 0%, #09090B 40%, #06060A 100%)
        `,
      }}
    >
      <LandingNavbar />
      <main className="pt-24 pb-16">{children}</main>
      <LandingFooter />
    </div>
  );
}
