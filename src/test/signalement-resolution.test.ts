import { describe, expect, it } from "vitest";
import { etatResolution } from "@/lib/signalements/resolution";
describe("etatResolution", () => {
  it("Reçu = Non résolu", () => expect(etatResolution("recu")).toBe("Non résolu"));
  it("En cours = Non résolu", () => expect(etatResolution("en_cours")).toBe("Non résolu"));
  it("Traité = Résolu", () => expect(etatResolution("traite")).toBe("Résolu"));
});
