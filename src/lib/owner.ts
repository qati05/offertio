/**
 * Single-user lock.
 *
 * This installation belongs to one person, named by the OWNER_EMAIL
 * environment variable. Anyone else who ends up with a Supabase session — by
 * signing up directly against the public Auth API, which the browser is
 * allowed to do — is refused by the middleware.
 *
 * Two deliberate choices:
 *
 *  - Fails closed. If OWNER_EMAIL is missing, nobody is the owner. A forgotten
 *    variable locks the owner out loudly instead of opening the app quietly.
 *  - Requires a confirmed address. Someone who signs up with the owner's
 *    address has not shown that they control it.
 */
export interface OwnerCandidate {
  email?: string | null;
  email_confirmed_at?: string | null;
}

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isOwner(user: OwnerCandidate, ownerEmail: string | undefined): boolean {
  const owner = normalise(ownerEmail);
  if (!owner) return false;
  if (!user.email_confirmed_at) return false;
  return normalise(user.email) === owner;
}
