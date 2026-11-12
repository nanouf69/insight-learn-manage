import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AttestationFinFormationTab } from "@/components/crm/attestation-fin-validee/AttestationFinFormationTab";
import { appelAttestation } from "@/lib/attestationFinValidee/serveur";

vi.mock("@/components/crm/attestation-fin-validee/useApercuAttestation", () => ({ useApercuAttestation: () => ({
  q: { data: {}, isLoading: false, refetch: vi.fn() }, elearning: true, fin: { etat: "ok", date: "2026-10-31", startedAt: "2026-10-31T08:00:00Z", source: "Connexion fictive", connexionId: "c" },
  heures: null, signatures: null, modules: [], motifs: [], elementsPedagogiques: null, pret: true,
}) }));
vi.mock("@/lib/attestationFinValidee/serveur", () => ({ chargerAttestations: async () => [], appelAttestation: vi.fn(), lienSignature: vi.fn(), statutAffiche: vi.fn() }));
vi.mock("@/components/crm/attestation-fin-validee/ApercuPdfAttestation", () => ({ ApercuPdfAttestation: () => null }));

const monter = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AttestationFinFormationTab apprenant={{ id: "fictif", prenom: "Camille", nom: "FICTIF", email: "c@fictif.test", type_apprenant: "vtc-e", formation_choisie: "VTC", date_debut_formation: "2026-09-14", heures_totales: 60 }} /></QueryClientProvider>);
};

it("aucun champ nom du responsable ; envoi possible seulement après l'autorisation de signature du centre", async () => {
  monter();
  const envoi = await screen.findByRole("button", { name: "Envoyer par mail" });
  expect(screen.queryByRole("textbox", { name: /Représentant/ })).toBeNull();
  expect(envoi).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Autoriser la signature du centre" }));
  expect(envoi).toBeEnabled();
});

it("le clic enregistre sans nom de responsable puis demande confirmation avant tout envoi", async () => {
  vi.mocked(appelAttestation).mockResolvedValueOnce({ etat: "prepare", doc: { id: "d1", statut: "prepare", envoye_le: null, identite_figee: { email: "c@fictif.test" } } });
  monter();
  fireEvent.click(await screen.findByRole("checkbox", { name: "Autoriser la signature du centre" }));
  fireEvent.click(screen.getByRole("button", { name: "Envoyer par mail" }));
  await waitFor(() => expect(appelAttestation).toHaveBeenCalledTimes(1));
  expect(vi.mocked(appelAttestation).mock.calls[0][0]).toMatchObject({ action: "preparer", autoriseSignatureCentre: true });
  expect(vi.mocked(appelAttestation).mock.calls[0][0]).not.toHaveProperty("representant");
  expect(await screen.findByText("Envoyer l'attestation pour signature ?")).toBeTruthy();
  expect(appelAttestation).toHaveBeenCalledTimes(1); // aucun envoi sans confirmation
});
