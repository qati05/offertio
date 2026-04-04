import LandingScrollReveal from "@/components/LandingScrollReveal";
import LandingNavbar from "@/components/LandingNavbar";
import LandingHero from "@/components/LandingHero";
import LandingTrustBar from "@/components/LandingTrustBar";
import LandingPain from "@/components/LandingPain";
import LandingHowItWorks from "@/components/LandingHowItWorks";
import LandingFeatures from "@/components/LandingFeatures";
import LandingTestimonials from "@/components/LandingTestimonials";
import LandingPricing from "@/components/LandingPricing";
import LandingFaq from "@/components/LandingFaq";
import LandingCta from "@/components/LandingCta";
import LandingFooter from "@/components/LandingFooter";

export default function Home() {
  return (
    <div className="min-h-screen text-[color:var(--color-text)]" style={{
      background: `
        radial-gradient(ellipse 70% 50% at 20% 0%, rgba(200,121,61,0.12), transparent 60%),
        radial-gradient(ellipse 50% 40% at 80% 15%, rgba(200,121,61,0.07), transparent 55%),
        radial-gradient(ellipse 60% 45% at 50% 85%, rgba(168,98,46,0.05), transparent 55%),
        linear-gradient(175deg, #0F0D0B 0%, #09090B 40%, #06060A 100%)
      `,
    }}>
      <LandingScrollReveal />
      <LandingNavbar />

      <main className="overflow-hidden">
        <LandingHero />
        <LandingTrustBar />
        <LandingPain />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingTestimonials />
        <LandingPricing />
        <LandingFaq />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  );
}
