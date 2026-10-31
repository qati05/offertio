import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FounderSetupForm from "@/components/FounderSetupForm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Einrichtung | Offertio",
  robots: { index: false, follow: false },
};

async function founderEligible(userId: string, plan: string | null): Promise<boolean> {
  if (plan === "lifetime") return true;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    return false;
  }
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("founder_seats")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export default async function EinrichtungPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/einrichtung");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, firmenname, adresse, plz, ort, telefon, email, iban, uid_mwst")
    .eq("id", user.id)
    .maybeSingle();

  const eligible = await founderEligible(user.id, profile?.plan ?? null);

  return (
    <div style={{ minHeight: "100%", background: "var(--app-bg)", padding: "32px 20px 96px" }}>
      <FounderSetupForm
        eligible={eligible}
        checkoutSuccess={params.checkout === "erfolg"}
        userId={user.id}
        defaults={{
          firmenname: profile?.firmenname ?? "",
          adresse: profile?.adresse ?? "",
          plz: profile?.plz ?? "",
          ort: profile?.ort ?? "",
          telefon: profile?.telefon ?? "",
          email: profile?.email || user.email || "",
          iban: profile?.iban ?? "",
          uidMwst: profile?.uid_mwst ?? "",
        }}
      />
    </div>
  );
}
