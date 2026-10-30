import { Suspense } from "react";
import LifetimeCheckout from "@/components/LifetimeCheckout";
import CheckoutReturnNotice from "@/components/CheckoutReturnNotice";

export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

export default function AbonnementPage() {
  return (
    <div style={{ minHeight: "100%", background: "var(--app-bg)", padding: "48px 24px 104px" }}>
      <Suspense fallback={null}>
        <CheckoutReturnNotice />
      </Suspense>
      <LifetimeCheckout />
    </div>
  );
}
