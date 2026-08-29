/**
 * What the send flow does with the answer from /api/dokument/save.
 *
 * This decision used to live inline in handleSend, where it read:
 *
 *   if (!saveRes.ok) {
 *     const saveData = await saveRes.json();   // parsed, never read
 *     cloudSaved = false;
 *   }
 *
 * The body was parsed and thrown away, so every server refusal — a missing
 * Swiss UID, a missing Leistungsdatum, an exhausted quota, a reverse-charge
 * rejection, an attempt to edit an issued invoice — produced the same silent
 * `cloudSaved = false`, and the user landed on the success page with confetti.
 *
 * The distinction that matters is not "did it work" but WHY it did not:
 *
 *   - The server REFUSED the document (4xx). The document is invalid. It must
 *     not be handed to the customer, because a PDF the customer holds and the
 *     system has no record of is worse than no PDF at all — the invoice number
 *     is burnt and the archive has a gap.
 *
 *   - The server was UNREACHABLE, or broke (network error, 5xx). The document
 *     is fine; only the save did not happen. Delivering the PDF locally is the
 *     friendlier answer and is the behaviour the flow already had.
 *
 * Extracted as a pure function so both branches are testable without standing
 * up the 2 400-line form component around them.
 */

export interface SavedDocument {
  id: string | null;
  nummer: string | null;
  share_token: string | null;
  customer_id: string | null;
  source_document_nummer: string | null;
}

export type SendOutcome =
  /** Saved. Deliver, and use the server's copy of the document. */
  | { action: "deliver"; document: SavedDocument }
  /** Rejected. Show `message`, deliver nothing. */
  | { action: "abort"; message: string }
  /** Save did not reach the server. Deliver locally, without a share link. */
  | { action: "deliver_offline" };

export interface SaveResponse {
  /** Response.ok — false for any non-2xx. */
  ok: boolean;
  status: number;
  /** Parsed JSON body, or null when the body was absent or unparseable. */
  body: unknown;
}

const GENERIC_REFUSAL =
  "Das Dokument konnte nicht gespeichert werden. Bitte prüfe deine Eingaben.";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * `networkError` covers the fetch itself throwing — offline, DNS, TLS, an
 * aborted request. There is no response to classify in that case.
 */
export function classifySaveResponse(
  response: SaveResponse | { networkError: true },
): SendOutcome {
  if ("networkError" in response) return { action: "deliver_offline" };

  const body = asRecord(response.body);

  if (!response.ok) {
    // 5xx is the server's fault, not the document's: the user's work is sound
    // and should still reach the customer. 4xx is a refusal of this specific
    // document and must stop the send.
    if (response.status >= 500) return { action: "deliver_offline" };

    return {
      action: "abort",
      // Every refusal in /api/dokument/save carries a German `error` written
      // for the user; the fallback only covers a malformed response.
      message: stringOrNull(body?.error) ?? GENERIC_REFUSAL,
    };
  }

  // The route answers 200 with metadataStored:false when the PDF reached
  // storage but the row did not — the document is not addressable, so there is
  // no share link to send.
  if (body?.metadataStored === false) return { action: "deliver_offline" };

  const document = asRecord(body?.document);

  return {
    action: "deliver",
    document: {
      id: stringOrNull(document?.id),
      nummer: stringOrNull(document?.nummer),
      share_token: stringOrNull(document?.share_token),
      customer_id: stringOrNull(document?.customer_id),
      source_document_nummer: stringOrNull(document?.source_document_nummer),
    },
  };
}
