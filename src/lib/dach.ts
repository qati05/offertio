import type { Land } from "./types";

export interface MwstOption {
  label: string;
  value: number;
}

export interface DachCompanyIdField {
  /** Profile key (must match Profile interface) */
  key: "uid_mwst" | "steuernummer" | "fn_nr";
  label: string;
  placeholder: string;
  /** Whether the field is required for legal compliance */
  required: boolean;
}

export interface DachConfig {
  land: Land;
  name: string;
  currency: string;
  currencySymbol: string;
  /** Form label for tax rate selector (e.g. "MWST" / "USt.") */
  mwstLabel: string;
  /** PDF label for tax line (e.g. "MWST" / "MwSt.") */
  mwstTermLabel: string;
  uidLabel: string;
  uidPlaceholder: string;
  mwstOptions: MwstOption[];
  defaultMwst: number;
  ibanPrefix: string;
  /** Whether this country uses Swiss QR-bill payment slips */
  hasQrBill: boolean;
  /** Whether this country uses SEPA bank transfers (DE/AT) */
  sepaEnabled: boolean;
  /** Whether invoices should follow ZUGFeRD-compatible layout (DE) */
  zugferdCompatible: boolean;
  /** Whether Leistungsdatum is legally required on invoices */
  leistungsdatumRequired: boolean;
  /** PDF header label for the primary company tax ID (uid field) */
  pdfUidLabel: string;
  /** PDF header label for the secondary tax number (mwst_nr field) */
  pdfMwstNrLabel: string;
  /** Ordered list of country-specific company ID / tax fields shown in profile UI */
  companyIdFields: DachCompanyIdField[];
  plzDigits: 4 | 5;
}

const DACH: Record<Land, DachConfig> = {
  CH: {
    land: "CH",
    name: "Schweiz",
    currency: "CHF",
    currencySymbol: "CHF",
    mwstLabel: "MWST",
    mwstTermLabel: "MWST",
    uidLabel: "UID / MWST-Nr.",
    uidPlaceholder: "CHE-123.456.789 MWST",
    mwstOptions: [
      { label: "0%", value: 0 },
      { label: "2.6%", value: 2.6 },
      { label: "8.1%", value: 8.1 },
    ],
    defaultMwst: 8.1,
    ibanPrefix: "CH",
    hasQrBill: true,
    sepaEnabled: false,
    zugferdCompatible: false,
    leistungsdatumRequired: false,
    pdfUidLabel: "UID",
    pdfMwstNrLabel: "MWST-Nr.",
    plzDigits: 4,
    companyIdFields: [
      { key: "uid_mwst", label: "UID / MWST-Nr.", placeholder: "CHE-123.456.789 MWST", required: false },
    ],
  },
  DE: {
    land: "DE",
    name: "Deutschland",
    currency: "EUR",
    currencySymbol: "EUR",
    mwstLabel: "USt.",
    mwstTermLabel: "MwSt.",
    uidLabel: "USt-IdNr.",
    uidPlaceholder: "DE123456789",
    mwstOptions: [
      { label: "0%", value: 0 },
      { label: "7%", value: 7 },
      { label: "19%", value: 19 },
    ],
    defaultMwst: 19,
    ibanPrefix: "DE",
    hasQrBill: false,
    sepaEnabled: true,
    zugferdCompatible: true,
    // §14 Abs. 4 Nr. 6 UStG: Leistungsdatum required on DE invoices
    leistungsdatumRequired: true,
    pdfUidLabel: "Steuernummer",
    pdfMwstNrLabel: "USt-IdNr.",
    plzDigits: 5,
    companyIdFields: [
      { key: "steuernummer", label: "Steuernummer", placeholder: "13/123/12345", required: true  },
      { key: "uid_mwst",     label: "USt-IdNr.",    placeholder: "DE123456789",  required: false },
    ],
  },
  AT: {
    land: "AT",
    name: "Österreich",
    currency: "EUR",
    currencySymbol: "EUR",
    mwstLabel: "USt.",
    mwstTermLabel: "MwSt.",
    uidLabel: "UID-Nummer",
    uidPlaceholder: "ATU12345678",
    mwstOptions: [
      { label: "0%", value: 0 },
      { label: "10%", value: 10 },
      { label: "13%", value: 13 },
      { label: "20%", value: 20 },
    ],
    defaultMwst: 20,
    ibanPrefix: "AT",
    hasQrBill: false,
    sepaEnabled: true,
    zugferdCompatible: false,
    // §11 UStG AT: Leistungsdatum required on AT invoices
    leistungsdatumRequired: true,
    pdfUidLabel: "Steuernummer / UID",
    pdfMwstNrLabel: "MWST-Nr.",
    plzDigits: 4,
    companyIdFields: [
      { key: "uid_mwst", label: "UID-Nummer",      placeholder: "ATU12345678", required: false },
      { key: "fn_nr",    label: "Firmenbuchnummer", placeholder: "FN 123456a",  required: false },
    ],
  },
};

export function getDachConfig(land?: Land | string): DachConfig {
  if (land && land in DACH) return DACH[land as Land];
  return DACH.CH;
}

export function getAllLands(): { value: Land; label: string }[] {
  return [
    { value: "CH", label: "Schweiz" },
    { value: "DE", label: "Deutschland" },
    { value: "AT", label: "Österreich" },
  ];
}

/** Returns the primary tax field config shown on onboarding step 0 for the given land. */
export function getOnboardingTaxField(land: Land | string): { key: "uid_mwst" | "steuernummer"; label: string; placeholder: string } | null {
  switch (land) {
    case "CH": return { key: "uid_mwst",     label: "MWST-Nr.",     placeholder: "CHE-123.456.789" };
    case "DE": return { key: "steuernummer", label: "Steuernummer", placeholder: "123/456/78901"  };
    case "AT": return { key: "uid_mwst",     label: "UID-Nummer",   placeholder: "ATU12345678"    };
    default:   return null;
  }
}

