import { describe, it, expect, beforeEach } from "vitest";
import { memoriserEnvoiOnglet, versionServeurEnvoyeeParCetOnglet } from "@/lib/answerPersistence";

describe("accusé perdu sur un quiz de module (Bilan examen VTC 505)", () => {
  beforeEach(() => sessionStorage.clear());
  it("version serveur envoyée par cet onglet : reconnue (ordre des clés indifférent)", () => {
    memoriserEnvoiOnglet("a", "module_5_exo_505", { "505-1": ["C"], "505-2": ["A"] });
    expect(versionServeurEnvoyeeParCetOnglet("a", "module_5_exo_505", { "505-2": ["A"], "505-1": ["C"] })).toBe(true);
  });
  it("version écrite ailleurs (autre appareil) : jamais reconnue", () => {
    memoriserEnvoiOnglet("a", "module_5_exo_505", { "505-1": ["C"] });
    expect(versionServeurEnvoyeeParCetOnglet("a", "module_5_exo_505", { "505-1": ["D"] })).toBe(false);
  });
  it("autre élève ou autre matière : jamais reconnue", () => {
    memoriserEnvoiOnglet("a", "module_5_exo_505", { "505-1": ["C"] });
    expect(versionServeurEnvoyeeParCetOnglet("b", "module_5_exo_505", { "505-1": ["C"] })).toBe(false);
    expect(versionServeurEnvoyeeParCetOnglet("a", "module_5_exo_506", { "505-1": ["C"] })).toBe(false);
  });
  it("onglet neuf (rechargement dans un autre onglet) : aucune reconnaissance", () => {
    expect(versionServeurEnvoyeeParCetOnglet("a", "module_5_exo_505", { "505-1": ["C"] })).toBe(false);
  });
});
