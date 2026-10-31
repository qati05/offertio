"use client";

import { useSearchParams } from "next/navigation";

export default function CheckoutReturnNotice() {
  const checkout = useSearchParams().get("checkout");
  if (checkout === "erfolg") {
    return (
      <div className="mx-auto mb-4 w-full max-w-[460px] auth-alert">
        Zahlung eingegangen. Dein Gründerplatz wird in wenigen Augenblicken freigeschaltet.
        <a href="/einrichtung" className="mt-2 block underline">
          Logo und Preisliste schicken
        </a>
      </div>
    );
  }
  if (checkout === "abgebrochen") {
    return (
      <div className="mx-auto mb-4 w-full max-w-[460px] auth-alert">
        Zahlung abgebrochen. Es wurde nichts belastet.
      </div>
    );
  }
  return null;
}
