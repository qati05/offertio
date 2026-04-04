"use client";
import dynamic from "next/dynamic";

const LandingHero = dynamic(() => import("./LandingHero"), {
  ssr: false,
  loading: () => <div className="relative min-h-screen" />,
});

export default LandingHero;
