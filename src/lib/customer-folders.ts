import type { DokumentHistorie } from "@/lib/types";
import { getCustomerDisplayName, toCustomerSlug } from "@/lib/customers";

export { toCustomerSlug } from "@/lib/customers";

export interface CustomerFolder {
  slug: string;
  name: string;
  docs: DokumentHistorie[];
  latestDate: string;
  latestDoc: DokumentHistorie;
}

export function normalizeCustomerName(name?: string): string {
  return getCustomerDisplayName({ name });
}

export function groupDocumentsByCustomer(history: DokumentHistorie[]): CustomerFolder[] {
  const groups = new Map<string, CustomerFolder>();

  for (const doc of history) {
    const name = normalizeCustomerName(doc.kundenname);
    const slug = doc.customer_id || toCustomerSlug(name);

    const existing = groups.get(slug);
    if (!existing) {
      groups.set(slug, {
        slug,
        name,
        docs: [doc],
        latestDate: doc.datum,
        latestDoc: doc,
      });
      continue;
    }

    existing.docs.push(doc);
    if (new Date(doc.datum).getTime() >= new Date(existing.latestDate).getTime()) {
      existing.latestDate = doc.datum;
      existing.latestDoc = doc;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      docs: [...group.docs].sort(
        (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime(),
      ),
    }))
    .sort(
      (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime(),
    );
}

export function resolveSourceDocumentNumber(
  document: DokumentHistorie,
  history: DokumentHistorie[],
): string | null {
  if (document.source_document_nummer) {
    return document.source_document_nummer;
  }

  if (!document.source_document_id) {
    return null;
  }

  return history.find((entry) => entry.id === document.source_document_id)?.nummer || null;
}
