import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import RecipientViewClient from "./RecipientViewClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/.test(token)) {
    return { title: "Dokument" };
  }

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("dokumente")
    .select("typ, nummer, kundenname")
    .eq("share_token", token)
    .maybeSingle();

  if (!data) return { title: "Dokument" };

  const label = data.typ === "offerte" ? "Offerte" : "Rechnung";
  return {
    title: `${label} ${data.nummer} für ${data.kundenname}`,
    robots: { index: false, follow: false },
  };
}

export default async function ViewPage({ params }: PageProps) {
  const { token } = await params;

  if (!/^[0-9a-f-]{36}$/.test(token)) {
    notFound();
  }

  const admin = getSupabaseAdmin();

  const { data: doc } = await admin
    .from("dokumente")
    .select(`
      id, typ, nummer, objekt, kundenname,
      betrag, datum, status, pdf_url, user_id
    `)
    .eq("share_token", token)
    .maybeSingle();

  if (!doc) notFound();

  const { data: profile } = await admin
    .from("profiles")
    .select("firmenname, vorname, nachname, adresse, plz, ort, telefon, uid_mwst, logo_url, land")
    .eq("id", doc.user_id)
    .maybeSingle();

  let pdfUrl: string | null = null;
  if (doc.pdf_url) {
    const { data: signed } = await admin.storage
      .from("pdfs")
      .createSignedUrl(doc.pdf_url, 3600);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return (
    <RecipientViewClient
      token={token}
      doc={{
        id: doc.id,
        typ: doc.typ as "offerte" | "rechnung",
        nummer: doc.nummer,
        objekt: doc.objekt ?? null,
        kundenname: doc.kundenname,
        betrag: Number(doc.betrag),
        datum: doc.datum,
        status: doc.status,
      }}
      pdfUrl={pdfUrl}
      firmenname={profile?.firmenname ?? ""}
      firmenAdresse={[profile?.adresse, profile?.plz && profile?.ort ? `${profile.plz} ${profile.ort}` : ""].filter(Boolean).join(", ")}
      firmenTelefon={profile?.telefon ?? ""}
      logoUrl={profile?.logo_url ?? null}
      firmenLand={(profile?.land ?? "CH") as "CH" | "DE" | "AT"}
    />
  );
}
