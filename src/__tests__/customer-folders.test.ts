import { describe, expect, it } from "vitest";
import { groupDocumentsByCustomer } from "@/lib/customer-folders";
import type { DokumentHistorie } from "@/lib/types";

const docs: DokumentHistorie[] = [
  {
    typ: "offerte",
    nummer: "OF-2",
    objekt: "Objekt B",
    kundenname: "Mueller AG",
    customer_id: "cust-1",
    betrag: 250,
    datum: "2026-04-03",
    status: "gesendet",
  },
  {
    typ: "rechnung",
    nummer: "RE-1",
    objekt: "Objekt A",
    kundenname: "Mueller AG",
    customer_id: "cust-1",
    betrag: 150,
    datum: "2026-04-01",
    status: "bezahlt",
  },
  {
    typ: "offerte",
    nummer: "OF-3",
    objekt: "Objekt C",
    kundenname: "Keller GmbH",
    betrag: 500,
    datum: "2026-04-02",
    status: "entwurf",
  },
];

describe("customer folders", () => {
  it("groups documents by customer id first and sorts newest first", () => {
    const groups = groupDocumentsByCustomer(docs);

    expect(groups).toHaveLength(2);
    expect(groups[0].slug).toBe("cust-1");
    expect(groups[0].name).toBe("Mueller AG");
    expect(groups[0].docs[0].nummer).toBe("OF-2");
    expect(groups[0].docs[1].nummer).toBe("RE-1");
  });
});
