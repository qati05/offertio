"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OfferteSuccessRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dokument/success");
  }, [router]);
  return (
    <div className="greeting">
      <div className="greeting-sub">Weiterleitung…</div>
    </div>
  );
}
