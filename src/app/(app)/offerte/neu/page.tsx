"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OfferteNeuRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dokument/neu");
  }, [router]);
  return (
    <div className="greeting">
      <div className="greeting-sub">Weiterleitung…</div>
    </div>
  );
}
