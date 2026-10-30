import { describe, expect, it, vi } from "vitest";
import { buildOperatorEmail, sendOperatorEmail, type OperatorNotice } from "@/lib/operator-mail";

const notice: OperatorNotice = {
  submissionId: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  firmenname: "Muster <GmbH>",
  adresse: "Werkstrasse 1",
  plz: "8000",
  ort: "Zürich",
  telefon: "",
  email: "inhaber@beispiel.ch",
  iban: "",
  uidMwst: "",
  submittedAt: "2026-11-01T10:00:00.000Z",
  guaranteeStartedAt: "2026-11-01T10:00:00.000Z",
  logoPath: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/logo.png",
  preislistePath: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/preisliste.csv",
  logoUrl: "https://files.example/logo",
  preislisteUrl: null,
};

describe("operator email", () => {
  it("escapes company names and keys the message on the submission", () => {
    const email = buildOperatorEmail(notice, { from: "offerte@getoffertio.ch", to: "ops@getoffertio.ch" });
    expect(email.subject).toContain("Muster <GmbH>");
    expect(email.html).toContain("Muster &lt;GmbH&gt;");
    expect(email.html).not.toContain("<GmbH>");
    expect(email.idempotencyKey).toBe(`founder-setup/${notice.submissionId}`);
    expect(email.text).toContain("48-Stunden-Garantie");
  });

  it("does not call Resend when the operator address is unset", async () => {
    const fetchImpl = vi.fn();
    const result = await sendOperatorEmail(notice, { RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "offerte@getoffertio.ch" }, fetchImpl);
    expect(result.sent).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to Resend with an idempotency key", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));
    const result = await sendOperatorEmail(
      notice,
      {
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "offerte@getoffertio.ch",
        OPERATOR_EMAIL: "ops@getoffertio.ch",
      },
      fetchImpl as typeof fetch,
    );
    expect(result.sent).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const init = calls[0][1];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(`founder-setup/${notice.submissionId}`);
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["ops@getoffertio.ch"]);
    expect(body.reply_to).toBe("inhaber@beispiel.ch");
  });
});
