import { describe, expect, it } from "vitest";
import {
  buildCustomerLookupKeys,
  findReusableCustomer,
  getCustomerDisplayName,
  mergeCustomerIntoDraft,
  toCustomerSlug,
} from "@/lib/customers";
import type { CustomerRecord, KundenInfo } from "@/lib/types";

const records: CustomerRecord[] = [
  {
    id: "cust-1",
    user_id: "user-1",
    display_name: "Mueller AG",
    email: "info@mueller.example",
    adresse: "Bahnhofstrasse 1",
    adresse2: "",
    plz: "8001",
    ort: "Zuerich",
    uid_mwst: "CHE-123",
    lookup_key: "email:info@mueller.example",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-03T00:00:00Z",
  },
];

describe("customer reuse helpers", () => {
  it("creates stable slugs and display names", () => {
    expect(toCustomerSlug("Mueller AG")).toBe("mueller-ag");
    expect(getCustomerDisplayName({ firma: "Keller GmbH" })).toBe("Keller GmbH");
  });

  it("builds lookup keys and finds a reusable customer by email", () => {
    const keys = buildCustomerLookupKeys({ name: "Mueller AG", email: "info@mueller.example" });

    expect(keys[0]).toBe("email:info@mueller.example");
    expect(findReusableCustomer(records, { email: "info@mueller.example" })).toEqual(records[0]);
  });

  it("merges only missing fields from a reusable customer", () => {
    const draft: KundenInfo = {
      name: "Mueller AG",
      firma: "",
      adresse: "",
      adresse2: "",
      plz: "",
      ort: "",
      email: "",
    };

    const { next, reusedFields } = mergeCustomerIntoDraft(draft, records[0]);

    expect(next.adresse).toBe("Bahnhofstrasse 1");
    expect(next.plz).toBe("8001");
    expect(next.email).toBe("info@mueller.example");
    expect(reusedFields).toEqual(expect.arrayContaining(["adresse", "plz", "email"]));
  });
});
