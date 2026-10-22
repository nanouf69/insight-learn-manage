import { describe, expect, it } from "vitest";
import { dateDuJourDocument } from "@/components/documents/DocumentZoneEditor";

describe("Date du jour du document", () => {
  it("insère la date française du jour", () => {
    expect(dateDuJourDocument(new Date("2026-10-22T15:59:00Z"))).toBe("22/10/2026");
  });
  it("utilise le jour de Paris même à la limite UTC", () => {
    expect(dateDuJourDocument(new Date("2026-10-22T22:30:00Z"))).toBe("23/10/2026");
  });
});