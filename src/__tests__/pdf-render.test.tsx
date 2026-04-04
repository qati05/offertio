/** @vitest-environment node */

import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import OffertePDF from "@/components/OffertePDF";
import type { Profile } from "@/lib/types";

const sampleProfile: Profile = {
  id: "user-1",
  email: "demo@example.com",
  firmenname: "Muster AG",
  vorname: "Max",
  nachname: "Muster",
  adresse: "Bahnhofstrasse 12",
  plz: "8000",
  ort: "Zürich",
  telefon: "+41 79 123 45 67",
  iban: "CH9300762011623852957",
  uid_mwst: "CHE-123.456.789 MWST",
  logo_url: "",
  land: "CH",
  sprache: "de",
  beruf: "Handwerk / Bau",
  zahlungsfrist: 30,
  plan: "free",
  created_at: new Date().toISOString(),
};

describe("OffertePDF", () => {
  it("renders a PDF buffer without throwing", async () => {
    const instance = pdf(
      createElement(OffertePDF as any, {
        profil: sampleProfile,
        kunde: {
          name: "Kunde GmbH",
          firma: "Kunde GmbH",
          adresse: "Marktgasse 1",
          adresse2: "",
          plz: "3000",
          ort: "Bern",
          email: "kunde@example.com",
        },
        positionen: [{ bezeichnung: "Service", einheit: "Std.", menge: 2, preis: 120 }],
        nummer: "OF-2026-001",
        datum: "2026-04-03",
        gueltigBis: "2026-05-03",
        mwstSatz: 8.1,
        notiz: "Testnotiz",
        dokumentTyp: "offerte",
        currency: "CHF",
        preisMode: "exkl",
      }) as any,
    );

    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });
});

