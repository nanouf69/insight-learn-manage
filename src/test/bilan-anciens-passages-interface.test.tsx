import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ReponsesHistoriquesVerrouillees } from "@/components/cours-en-ligne/ReponsesHistoriquesVerrouillees";
import { reponsesVerrouilleesDepuis, separerQuestionsVerrouillees } from "@/components/cours-en-ligne/bilanReponsesVerrouillees";

// ---- Données fictives (4 scénarios) ----
const questions = [1, 2, 3, 4, 5].map((id) => ({
  id, enonce: `Q${id} fictive`, type: "qcm",
  choix: [{ lettre: "A", texte: "a", correct: id !== 2 }, { lettre: "B", texte: "b", correct: id === 2 }],
}));
const cats = {
  VERT: [{ exercice_id: 1, tentative: 1, categorie: "VERT" as const }],
  ORANGE: [{ exercice_id: 1, tentative: 1, categorie: "ORANGE" as const }],
  ROUGE: [{ exercice_id: 1, tentative: 1, categorie: "ROUGE" as const }],
};
const statuts = {
  VERT: [
    { exercice_id: 1, tentative: 1, cle: "1-1", statut: "CERTAINE" as const, reponse: "A" },
    { exercice_id: 1, tentative: 1, cle: "1-2", statut: "CERTAINE" as const, reponse: "B" },
  ],
  ORANGE: [
    { exercice_id: 1, tentative: 1, cle: "1-1", statut: "CERTAINE" as const, reponse: "A" },
    { exercice_id: 1, tentative: 1, cle: "1-3", statut: "VERSION_NON_PROUVEE" as const, reponse: "B" },
  ],
  ROUGE_DISPARUE: [
    { exercice_id: 1, tentative: 1, cle: "1-1", statut: "CERTAINE" as const, reponse: "A" },
    { exercice_id: 1, tentative: 1, cle: "1-6", statut: "ORPHELINE" as const, reponse: "C" },
  ],
  ROUGE_REUTILISE: [
    { exercice_id: 1, tentative: 1, cle: "1-4", statut: "LITIGIEUSE" as const, reponse: "A" },
  ],
};

describe("Vue élève — réponses historiques verrouillées", () => {
  it("VERT : aucune réponse verrouillée, toutes les questions restent interactives", () => {
    const v = reponsesVerrouilleesDepuis(statuts.VERT, cats.VERT);
    expect(v).toEqual({});
    expect(separerQuestionsVerrouillees(1, questions, v).actives).toHaveLength(5);
  });

  it("ORANGE : Q3 verrouillée, retirée de la correction, affichée en lecture seule sans correction", () => {
    const v = reponsesVerrouilleesDepuis(statuts.ORANGE, cats.ORANGE);
    expect(v).toEqual({ "1-3": "B" });
    const { actives, verrouillees } = separerQuestionsVerrouillees(1, questions, v);
    expect(actives.map((q) => q.id)).toEqual([1, 2, 4, 5]);
    expect(verrouillees.map((q) => q.id)).toEqual([3]);
    render(<ReponsesHistoriquesVerrouillees exoId={1} questions={verrouillees} reponses={v} />);
    const bloc = screen.getByTestId("reponses-historiques-verrouillees");
    expect(within(bloc).getByText("Réponses conservées de votre passage précédent")).toBeInTheDocument();
    expect(within(bloc).getByText("Q3 fictive")).toBeInTheDocument();
    expect(within(bloc).getByText("Votre réponse")).toBeInTheDocument();
    // aucune information technique ni correction affichée à l'élève
    const texte = bloc.textContent ?? "";
    for (const mot of ["VERSION_NON_PROUVEE", "uid", "1-3", "Correct", "Incorrect", "À VÉRIFIER"]) expect(texte).not.toContain(mot);
    // aucun bouton cliquable : non modifiable
    expect(within(bloc).queryAllByRole("button")).toHaveLength(0);
  });

  it("ROUGE : rien de verrouillé ni de repris côté élève (orpheline/litigieuse jamais appliquées)", () => {
    for (const s of [statuts.ROUGE_DISPARUE, statuts.ROUGE_REUTILISE]) {
      const v = reponsesVerrouilleesDepuis(s, cats.ROUGE);
      expect(v).toEqual({});
      expect(v["1-4"]).toBeUndefined();
    }
  });

  it("ORANGE puis tentative ROUGE plus récente : l'ancien verrou ne s'applique pas à la nouvelle tentative", () => {
    const v = reponsesVerrouilleesDepuis(statuts.ORANGE, [...cats.ORANGE, { exercice_id: 1, tentative: 2, categorie: "VERT" }]);
    expect(v).toEqual({});
  });
});

// ---- Vue Admin (composant réel, serveur simulé) ----
const rpc = vi.fn();
let tables: Record<string, any[]> = {};
vi.mock("@/integrations/supabase/client", () => {
  const q = (t: string) => ({ select: () => ({ eq: async () => ({ data: tables[t] ?? [], error: null }) }) });
  return { supabase: { from: (t: string) => q(t), rpc: (...a: any[]) => rpc(...a) } };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { BilanPassagesStatutsPanel } from "@/components/crm/apprenant-sections/BilanPassagesStatutsPanel";
const withMod = (rows: any[]) => rows.map((r) => ({ module_id: 5, uid: r.statut === "CERTAINE" || r.statut === "VERSION_NON_PROUVEE" ? "u" : null, ...r }));

describe("Vue Admin — statuts et autorisation ROUGE", () => {
  beforeEach(() => { rpc.mockReset(); });

  it("ORANGE : badge « À VÉRIFIER — version historique non prouvée », aucun bouton de rattachement", async () => {
    tables = {
      bilan_passage_categories: [{ module_id: 5, exercice_id: 1, tentative: 1, categorie: "ORANGE", created_at: "" }],
      bilan_reponse_statuts: withMod(statuts.ORANGE),
      bilan_nouvelle_tentative_autorisations: [],
    };
    render(<BilanPassagesStatutsPanel apprenantId="fictif" />);
    expect(await screen.findByText("À VÉRIFIER — version historique non prouvée")).toBeInTheDocument();
    expect(screen.getByText("Réponse certaine")).toBeInTheDocument();
    expect(screen.queryByText("Autoriser une nouvelle tentative")).toBeNull();
    expect(screen.queryByText(/rattacher/i)).toBeNull();
  });

  it("ROUGE disparue + réutilisée : orpheline / litigieuse distinguées, non rattachables", async () => {
    tables = {
      bilan_passage_categories: [{ module_id: 5, exercice_id: 1, tentative: 1, categorie: "ROUGE", created_at: "" }],
      bilan_reponse_statuts: withMod([...statuts.ROUGE_DISPARUE, ...statuts.ROUGE_REUTILISE]),
      bilan_nouvelle_tentative_autorisations: [],
    };
    render(<BilanPassagesStatutsPanel apprenantId="fictif" />);
    expect(await screen.findByText("Orpheline — question disparue")).toBeInTheDocument();
    expect(screen.getByText("Litigieuse — numéro réutilisé")).toBeInTheDocument();
    expect(screen.getAllByText("Non rattachable à une question actuelle")).toHaveLength(2);
    expect(screen.getByText("Passage conservé en historique")).toBeInTheDocument();
  });

  it("ROUGE : autorisation avec confirmation + motif, double-clic = un seul envoi", async () => {
    tables = {
      bilan_passage_categories: [{ module_id: 5, exercice_id: 1, tentative: 1, categorie: "ROUGE", created_at: "" }],
      bilan_reponse_statuts: [], bilan_nouvelle_tentative_autorisations: [],
    };
    let resolve!: (v: any) => void;
    rpc.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<BilanPassagesStatutsPanel apprenantId="fictif" />);
    fireEvent.click(await screen.findByText("Autoriser une nouvelle tentative"));
    const confirmer = screen.getByText("Confirmer l'autorisation");
    expect(confirmer).toBeDisabled(); // motif obligatoire
    fireEvent.change(screen.getByLabelText("Motif"), { target: { value: "Passage ROUGE, reprise propre" } });
    fireEvent.click(confirmer); fireEvent.click(confirmer);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_confirmation: "AUTORISER", p_module_id: 5, p_exercice_id: 1 });
    tables.bilan_nouvelle_tentative_autorisations = [{ module_id: 5, exercice_id: 1, tentative_source: 1, tentative_autorisee: 2, motif: "Passage ROUGE, reprise propre", created_at: new Date().toISOString() }];
    resolve({ data: {}, error: null });
    await waitFor(() => expect(screen.getByText(/Nouvelle tentative 2 autorisée/)).toBeInTheDocument());
    expect(screen.queryByText("Autoriser une nouvelle tentative")).toBeNull();
  });
});
