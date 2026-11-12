import { it, expect } from "vitest";
import { correspondFiltre } from "@/lib/attestationFinValidee/filtres";
it("filtres À envoyer / En attente / Signée", () => {
  expect(correspondFiltre("brouillon", "a_envoyer")).toBe(true);
  expect(correspondFiltre("a_verifier", "a_envoyer")).toBe(true);
  expect(correspondFiltre("a_signer", "a_envoyer")).toBe(false);
  expect(correspondFiltre("a_signer", "en_attente")).toBe(true);
  expect(correspondFiltre("signee", "signee")).toBe(true);
  expect(correspondFiltre("revoquee", "a_envoyer")).toBe(false);
  expect(correspondFiltre("revoquee", "toutes")).toBe(true);
});
