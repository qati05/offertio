import type { CustomerRecord, KundenInfo } from "@/lib/types";

function normalizeValue(value?: string | null): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getCustomerDisplayName(customer: Partial<KundenInfo> | Partial<CustomerRecord>): string {
  const name =
    ("name" in customer && typeof customer.name === "string" ? customer.name : "") ||
    ("firma" in customer && typeof customer.firma === "string" ? customer.firma : "") ||
    ("display_name" in customer && typeof customer.display_name === "string" ? customer.display_name : "");

  return name.trim() || "Unbekannter Kunde";
}

export function toCustomerSlug(value?: string | null): string {
  return normalizeValue(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildCustomerLookupKeys(customer: Partial<KundenInfo> | Partial<CustomerRecord>): string[] {
  const displayName = getCustomerDisplayName(customer);
  const nameSlug = toCustomerSlug(displayName);
  const email = normalizeValue(customer.email);
  const plz = normalizeValue(customer.plz);
  const ort = toCustomerSlug(customer.ort);

  const keys = [
    email ? `email:${email}` : "",
    nameSlug && plz ? `name:${nameSlug}:${plz}` : "",
    nameSlug && ort ? `name:${nameSlug}:${ort}` : "",
    nameSlug ? `name:${nameSlug}` : "",
  ].filter(Boolean);

  return Array.from(new Set(keys));
}

export function makePrimaryCustomerLookupKey(customer: Partial<KundenInfo> | Partial<CustomerRecord>): string {
  return buildCustomerLookupKeys(customer)[0] || "name:unbekannter-kunde";
}

export function findReusableCustomer(
  records: CustomerRecord[],
  draft: Partial<KundenInfo>,
): CustomerRecord | null {
  const lookupKeys = buildCustomerLookupKeys(draft);
  if (lookupKeys.length === 0) return null;

  const byLookup = new Map<string, CustomerRecord>();
  for (const record of records) {
    for (const key of [record.lookup_key, ...buildCustomerLookupKeys(record)]) {
      byLookup.set(key, record);
    }
  }
  for (const key of lookupKeys) {
    const record = byLookup.get(key);
    if (record) return record;
  }

  const normalizedName = toCustomerSlug(getCustomerDisplayName(draft));
  if (!normalizedName) return null;

  return records.find((record) => toCustomerSlug(record.display_name) === normalizedName) ?? null;
}

export function mergeCustomerIntoDraft(
  draft: KundenInfo,
  record: CustomerRecord,
): { next: KundenInfo; reusedFields: string[] } {
  const reusedFields: string[] = [];
  const next = { ...draft };

  const copyIfMissing = (key: keyof KundenInfo, value?: string | null) => {
    if (!value?.trim()) return;
    if (!next[key]?.trim()) {
      next[key] = value;
      reusedFields.push(String(key));
    }
  };

  copyIfMissing("name", record.display_name);
  copyIfMissing("email", record.email);
  copyIfMissing("adresse", record.adresse);
  copyIfMissing("adresse2", record.adresse2);
  copyIfMissing("plz", record.plz);
  copyIfMissing("ort", record.ort);
  copyIfMissing("uid_mwst", record.uid_mwst);

  return { next, reusedFields };
}
