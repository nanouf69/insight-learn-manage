import { describe, expect, it } from "vitest";
import { PRATIQUE_TAXI_LYON_SUPPORT, supportPratiqueTaxiLyon } from "@/lib/pratiqueVtcLyonSupport";
import { activitesDuModule } from "@/lib/jeuxPedagogiques";

describe("Support Pratique TAXI Lyon en consultation", () => {
  it("est limité au module Pratique TAXI 6", () => {
    expect(supportPratiqueTaxiLyon(6)).toBe(PRATIQUE_TAXI_LYON_SUPPORT);
    for (const id of [8, 7, 64, 70, 71, 72, 73]) expect(supportPratiqueTaxiLyon(id)).toBeNull();
  });
  it("expose 19 pages images, jamais le PDF téléchargeable", () => {
    expect(PRATIQUE_TAXI_LYON_SUPPORT.consultationSeule).toBe(true);
    expect(PRATIQUE_TAXI_LYON_SUPPORT.pages).toHaveLength(19);
    expect(new Set(PRATIQUE_TAXI_LYON_SUPPORT.pages).size).toBe(19);
    for (const page of PRATIQUE_TAXI_LYON_SUPPORT.pages) expect(page).toMatch(/\.jpg$/);
  });
  it("n'ajoute aucune obligation ni jalon aux modules terminés", () => {
    expect(activitesDuModule(6).map(a => a.id)).not.toContain(PRATIQUE_TAXI_LYON_SUPPORT.id);
    expect(activitesDuModule(6)).toHaveLength(3);
  });
});