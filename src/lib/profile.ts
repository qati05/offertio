import type { Profile } from "@/lib/types";
import type { DokumentTyp, Land } from "@/lib/types";
import { getDachConfig } from "@/lib/dach";

export function isProfileComplete(profile: Partial<Profile> | null | undefined, land?: Land | string): boolean {
  if (!profile) return false;

  const landValue = land ?? profile.land;
  const dachConfig = getDachConfig(landValue);

  // Check country-specific required tax field
  const hasRequiredTaxField = dachConfig.companyIdFields
    .filter((f) => f.required)
    .every((f) => !!(profile[f.key as keyof Profile] as string | undefined)?.trim());

  return Boolean(
    profile.firmenname?.trim() &&
    profile.beruf?.trim() &&
    profile.vorname?.trim() &&
    profile.iban?.trim() &&
    hasRequiredTaxField
  );
}

/** Returns the country-required tax field key for the given land, or null if none required. */
export function getRequiredTaxField(land: Land | string): { key: string; label: string } | null {
  const dachConfig = getDachConfig(land);
  const required = dachConfig.companyIdFields.find((f) => f.required);
  return required ? { key: required.key, label: required.label } : null;
}

export function getMissingProfileFieldsForDocument(
  profile: Partial<Profile> | null | undefined,
  dokumentTyp: DokumentTyp,
  land?: Land | string,
): { key: keyof Profile; label: string }[] {
  if (!profile) {
    return [
      { key: "firmenname", label: "Firmenname" },
      { key: "adresse", label: "Adresse" },
      { key: "plz", label: "PLZ" },
      { key: "ort", label: "Ort" },
    ];
  }

  const missing: { key: keyof Profile; label: string }[] = [];
  const pushIfMissing = (key: keyof Profile, label: string) => {
    if (!(profile[key] as string | undefined)?.trim()) {
      missing.push({ key, label });
    }
  };

  pushIfMissing("firmenname", "Firmenname");
  pushIfMissing("adresse", "Adresse");
  pushIfMissing("plz", "PLZ");
  pushIfMissing("ort", "Ort");

  if (dokumentTyp === "rechnung") {
    pushIfMissing("iban", "IBAN");

    // Only block on truly required tax fields (e.g. DE Steuernummer).
    // Optional fields like CH uid_mwst must never prevent invoice creation.
    const requiredTaxField = getRequiredTaxField(land ?? profile.land ?? "CH");
    if (requiredTaxField) {
      pushIfMissing(requiredTaxField.key as keyof Profile, requiredTaxField.label);
    }
  }

  return missing;
}
