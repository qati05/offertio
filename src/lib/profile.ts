import type { Profile } from "@/lib/types";
import type { DokumentTyp, Land } from "@/lib/types";
import { getDachConfig } from "@/lib/dach";

// ── UID format validators ──────────────────────────────────────────────────────

/** CHE-123.456.789 or CHE-123.456.789 MWST */
const CH_UID_REGEX = /^CHE-[0-9]{3}\.[0-9]{3}\.[0-9]{3}( MWST)?$/;
/** DE123456789 */
const DE_UID_REGEX = /^DE[0-9]{9}$/;
/** ATU12345678 */
const AT_UID_REGEX = /^ATU[0-9]{8}$/;

/**
 * Validates the UID/MWST-Nr. format for a given country.
 * Returns an error message if invalid, or null if valid (or empty — field is optional).
 */
export function validateUidFormat(uid: string | null | undefined, land: Land | string): string | null {
  if (!uid?.trim()) return null; // empty is fine — field is optional
  const value = uid.trim();
  switch (land) {
    case "CH":
      return CH_UID_REGEX.test(value)
        ? null
        : "Format: CHE-123.456.789 oder CHE-123.456.789 MWST";
    case "DE":
      return DE_UID_REGEX.test(value)
        ? null
        : "Format: DE123456789 (DE + 9 Ziffern)";
    case "AT":
      return AT_UID_REGEX.test(value)
        ? null
        : "Format: ATU12345678 (ATU + 8 Ziffern)";
    default:
      return null;
  }
}

export function isProfileComplete(profile: Partial<Profile> | null | undefined, land?: Land | string): boolean {
  if (!profile) return false;

  const landValue = land ?? profile.land;
  const dachConfig = getDachConfig(landValue);

  // OR-group: at least ONE field in the group must be present
  // (e.g. DE: §14 Abs. 4 Nr. 2 UStG — Steuernummer OR USt-IdNr. suffices)
  const orGroupFields = dachConfig.companyIdFields.filter((f) => f.taxIdOrGroup);
  const hasOrGroupField =
    orGroupFields.length === 0 ||
    orGroupFields.some((f) => !!(profile[f.key as keyof Profile] as string | undefined)?.trim());

  // Individual required fields (all must be present, excluding or-group members)
  const hasRequiredFields = dachConfig.companyIdFields
    .filter((f) => f.required && !f.taxIdOrGroup)
    .every((f) => !!(profile[f.key as keyof Profile] as string | undefined)?.trim());

  return Boolean(
    profile.firmenname?.trim() &&
    profile.beruf?.trim() &&
    profile.vorname?.trim() &&
    profile.iban?.trim() &&
    hasOrGroupField &&
    hasRequiredFields
  );
}

/**
 * Returns the country-required tax field key for the given land, or null if none required.
 * For OR-groups (e.g. DE: Steuernummer OR USt-IdNr.), returns the first group member
 * so the UI can point to it — the actual validation uses OR logic.
 */
export function getRequiredTaxField(land: Land | string): { key: string; label: string } | null {
  const dachConfig = getDachConfig(land);
  // Check individual required fields first
  const required = dachConfig.companyIdFields.find((f) => f.required && !f.taxIdOrGroup);
  if (required) return { key: required.key, label: required.label };
  // For OR-groups, return the first member as the representative field
  const orGroup = dachConfig.companyIdFields.filter((f) => f.taxIdOrGroup);
  if (orGroup.length > 0) return { key: orGroup[0].key, label: `${orGroup.map((f) => f.label).join(" oder ")}` };
  return null;
}

type TaxProfileInput = Pick<Profile, "land" | "uid_mwst" | "steuernummer" | "fn_nr">;

export function hasRequiredTaxId(
  profile: Partial<TaxProfileInput> | null | undefined,
  land?: Land | string,
): boolean {
  if (!profile) return false;

  const dachConfig = getDachConfig(land ?? profile.land);
  const orGroupFields = dachConfig.companyIdFields.filter((f) => f.taxIdOrGroup);
  if (orGroupFields.length > 0) {
    return orGroupFields.some((f) => !!(profile[f.key as keyof TaxProfileInput] as string | undefined)?.trim());
  }

  const requiredFields = dachConfig.companyIdFields.filter((f) => f.required);
  if (requiredFields.length === 0) return true;

  return requiredFields.every((f) => !!(profile[f.key as keyof TaxProfileInput] as string | undefined)?.trim());
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

    const dachConfig = getDachConfig(land ?? profile.land ?? "CH");

    // OR-group check: at least one field in the group must be present
    const orGroupFields = dachConfig.companyIdFields.filter((f) => f.taxIdOrGroup);
    if (orGroupFields.length > 0) {
      const hasAny = orGroupFields.some((f) => !!(profile[f.key as keyof Profile] as string | undefined)?.trim());
      if (!hasAny) {
        missing.push({
          key: orGroupFields[0].key as keyof Profile,
          label: orGroupFields.map((f) => f.label).join(" oder "),
        });
      }
    }

    // Individual required fields (non-or-group)
    for (const f of dachConfig.companyIdFields.filter((f) => f.required && !f.taxIdOrGroup)) {
      pushIfMissing(f.key as keyof Profile, f.label);
    }
  }

  return missing;
}
