/**
 * Lightweight i18n for public recipient-view endpoints.
 *
 * The recipient has no app session so we can't read their stored locale —
 * we fall back to Accept-Language. Keep the surface deliberately tiny:
 * only user-facing error messages, no marketing copy.
 */
export type PublicViewLocale = "de" | "fr" | "it";

export type PublicViewErrorKey =
  | "rate_limited"
  | "invalid_body"
  | "invalid_token"
  | "invalid_signature"
  | "invalid_reason"
  | "not_found"
  | "not_an_offer"
  | "cannot_sign_now"
  | "cannot_reject_now"
  | "db_error"
  | "save_failed";

const MESSAGES: Record<PublicViewLocale, Record<PublicViewErrorKey, string>> = {
  de: {
    rate_limited: "Zu viele Anfragen. Bitte versuche es in einer Minute erneut.",
    invalid_body: "Ungültiger Request-Body.",
    invalid_token: "Ungültiger Token.",
    invalid_signature: "Unterschrift fehlt oder ist ungültig.",
    invalid_reason: "Begründung ist zu lang.",
    not_found: "Dokument nicht gefunden.",
    not_an_offer: "Nur Offerten können digital angenommen oder abgelehnt werden.",
    cannot_sign_now: "Diese Offerte kann nicht mehr angenommen werden.",
    cannot_reject_now: "Diese Offerte kann nicht mehr abgelehnt werden.",
    db_error: "Datenbankfehler.",
    save_failed: "Fehler beim Speichern.",
  },
  fr: {
    rate_limited: "Trop de requêtes. Réessayez dans une minute.",
    invalid_body: "Requête invalide.",
    invalid_token: "Jeton invalide.",
    invalid_signature: "Signature manquante ou invalide.",
    invalid_reason: "Motif trop long.",
    not_found: "Document introuvable.",
    not_an_offer: "Seuls les devis peuvent être acceptés ou refusés.",
    cannot_sign_now: "Ce devis ne peut plus être accepté.",
    cannot_reject_now: "Ce devis ne peut plus être refusé.",
    db_error: "Erreur de base de données.",
    save_failed: "Erreur lors de l'enregistrement.",
  },
  it: {
    rate_limited: "Troppe richieste. Riprova tra un minuto.",
    invalid_body: "Richiesta non valida.",
    invalid_token: "Token non valido.",
    invalid_signature: "Firma mancante o non valida.",
    invalid_reason: "Motivo troppo lungo.",
    not_found: "Documento non trovato.",
    not_an_offer: "Solo le offerte possono essere accettate o rifiutate.",
    cannot_sign_now: "Questa offerta non può più essere accettata.",
    cannot_reject_now: "Questa offerta non può più essere rifiutata.",
    db_error: "Errore del database.",
    save_failed: "Errore nel salvataggio.",
  },
};

export function publicViewError(
  key: PublicViewErrorKey,
  locale: PublicViewLocale = "de",
): string {
  return MESSAGES[locale][key] ?? MESSAGES.de[key];
}
