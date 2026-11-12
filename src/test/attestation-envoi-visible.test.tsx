import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AttestationFinFormationTab } from "@/components/crm/attestation-fin-validee/AttestationFinFormationTab";

vi.mock("@/components/crm/attestation-fin-validee/useApercuAttestation", () => ({ useApercuAttestation: () => ({
  q: { data: {}, isLoading: false, refetch: vi.fn() }, elearning: true, fin: { etat: "ok", date: "2026-10-31", startedAt: "2026-10-31T08:00:00Z", source: "Connexion fictive", connexionId: "c" },
  heures: null, signatures: null, modules: [], motifs: [], elementsPedagogiques: null, pret: true,
}) }));
vi.mock("@/lib/attestationFinValidee/serveur", () => ({ chargerAttestations: async () => [], appelAttestation: vi.fn(), lienSignature: vi.fn(), statutAffiche: vi.fn() }));
vi.mock("@/components/crm/attestation-fin-validee/ApercuPdfAttestation", () => ({ ApercuPdfAttestation: () => null }));

it("le brouillon non certifié ne peut pas déclencher l'envoi, même avec dates et dossier complets", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AttestationFinFormationTab apprenant={{ id: "fictif", prenom: "Camille", nom: "FICTIF", type_apprenant: "vtc-e", formation_choisie: "VTC", date_debut_formation: "2026-09-14", heures_totales: 60 }} /></QueryClientProvider>);
  const envoi = await screen.findByRole("button", { name: "Envoyer par mail" });
  expect(envoi).toBeDisabled();
  expect(screen.getByRole("button", { name: "Prévisualiser le brouillon (PDF)" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Enregistrer l'attestation" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Représentant du centre (signataire)" })).toBeEnabled();
});