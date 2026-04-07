export type DokumentTyp = "offerte" | "rechnung";
export type Land = "CH" | "DE" | "AT";

export interface Profile {
  id: string;
  email: string;
  firmenname: string;
  vorname: string;
  nachname: string;
  adresse: string;
  plz: string;
  ort: string;
  telefon: string;
  iban: string;
  bic?: string;
  uid_mwst: string;
  /** DE only: domestic Steuernummer (e.g. 13/123/12345) */
  steuernummer?: string;
  /** AT only: Firmenbuchnummer (e.g. FN 123456a) */
  fn_nr?: string;
  logo_url: string;
  land: Land;
  sprache: string;
  beruf: string;
  zahlungsfrist: number;
  plan: "free" | "pro_monthly" | "pro_yearly";
  /** Lemon Squeezy subscription ID for customer portal access */
  ls_subscription_id?: string | null;
  /** Lemon Squeezy customer ID for portal access */
  ls_customer_id?: string | null;
  /** When the current Pro period ends (ISO timestamp) */
  plan_expires_at?: string | null;
  /** Set when subscription is cancelled but still in grace period */
  plan_cancelled_at?: string | null;
  onboarding_complete?: boolean;
  pdf_template?: "classic" | "modern" | "minimal" | "professionell";
  /**
   * Kleinunternehmer / VAT-exempt flag.
   * CH: Art. 10 MWSTG (< CHF 100k revenue)
   * DE: §19 UStG (≤ EUR 22k prior year / EUR 50k current year)
   * AT: §6 Abs. 1 Z 27 öUStG (< EUR 35k net revenue)
   * When true: PDF shows legal exemption notice, MWST rate locked to 0%.
   */
  kleinunternehmer?: boolean;
  created_at: string;
}

export interface Position {
  bezeichnung: string;
  einheit: string;
  menge: number;
  preis: number;
}

export interface Vorlage {
  id: string;
  user_id: string;
  name: string;
  beruf: string;
  positionen: Position[];
  created_at: string;
}

export interface KundenInfo {
  name: string;
  firma: string;
  adresse: string;
  adresse2: string;
  plz: string;
  ort: string;
  email: string;
  /** DE E-Rechnung: Buyer VAT ID (BT-48), optional */
  uid_mwst?: string;
}

export interface CustomerRecord {
  id: string;
  user_id: string;
  display_name: string;
  email?: string | null;
  adresse?: string | null;
  adresse2?: string | null;
  plz?: string | null;
  ort?: string | null;
  uid_mwst?: string | null;
  lookup_key: string;
  created_at: string;
  updated_at: string;
}

export interface RabattInfo {
  aktiv: boolean;
  label: string;
  modus: "chf" | "prozent";
  wert: number;
}

export interface DokumentHistorie {
  id?: string;
  typ: DokumentTyp;
  nummer: string;
  objekt: string;
  kundenname: string;
  customer_id?: string | null;
  kunde_email?: string | null;
  kunde_adresse?: string | null;
  kunde_adresse2?: string | null;
  kunde_plz?: string | null;
  kunde_ort?: string | null;
  betrag: number;
  datum: string;
  status: "entwurf" | "gesendet" | "angenommen" | "abgelaufen" | "bezahlt" | "ueberfaellig";
  pdf_url?: string;
  source_document_id?: string | null;
  source_document_nummer?: string | null;
  source_document_typ?: DokumentTyp | null;
  converted_document_id?: string | null;
  converted_document_nummer?: string | null;
  converted_document_typ?: DokumentTyp | null;
}

export interface OfferteData {
  nummer: string;
  datum: string;
  kunde: KundenInfo;
  positionen: Position[];
  mwstSatz: number;
  notiz: string;
  profil: Profile;
  /** Discount — must be included so ZUGFeRD XML totals match the PDF */
  rabatt?: RabattInfo;
}
