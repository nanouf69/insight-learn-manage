import { describe, expect, it } from "vitest";
import { PRATIQUE_VTC_LYON_SUPPORT, supportPratiqueVtcLyon } from "@/lib/pratiqueVtcLyonSupport";
import { activitesDuModule } from "@/lib/jeuxPedagogiques";

describe("Support Pratique VTC Lyon en consultation", () => {
  it("est limité au module Pratique VTC 8", () => {
    expect(supportPratiqueVtcLyon(8)).toBe(PRATIQUE_VTC_LYON_SUPPORT);
    for (const id of [6, 7, 64, 70, 71, 72, 73]) expect(supportPratiqueVtcLyon(id)).toBeNull();
  });
  it("expose 19 pages images, jamais le PDF téléchargeable", () => {
    expect(PRATIQUE_VTC_LYON_SUPPORT.consultationSeule).toBe(true);
    expect(PRATIQUE_VTC_LYON_SUPPORT.pages).toHaveLength(19);
    expect(new Set(PRATIQUE_VTC_LYON_SUPPORT.pages).size).toBe(19);
    for (const page of PRATIQUE_VTC_LYON_SUPPORT.pages) expect(page).toMatch(/\.jpg$/);
  });
  it("n'ajoute aucune obligation ni jalon aux modules terminés", () => {
    expect(activitesDuModule(8).map(a => a.id)).not.toContain(PRATIQUE_VTC_LYON_SUPPORT.id);
    expect(activitesDuModule(8)).toHaveLength(2);
  });
});