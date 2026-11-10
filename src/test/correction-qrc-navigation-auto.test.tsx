import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminCorrectionQrcV2Reel from "@/pages/AdminCorrectionQrcV2Reel";
import type { QrcReelle, SessionReelle, TentativeReelle } from "@/features/correction-qrc-v2/noyauReel";

const mocks = vi.hoisted(() => ({
  corriger: vi.fn(),
  reviser: vi.fn(),
  charger: vi.fn(),
  signaux: new Map<string, () => void>(),
  noterHistorique: vi.fn(),
  lireCommentaires: vi.fn(),
  commenter: vi.fn(),
  commenterHistorique: vi.fn(),
  lireHistoriqueHisto: vi.fn(),
}));

const etat = vi.hoisted(() => ({ session: null as SessionReelle | null }));
vi.mock("@/features/correction-qrc-v2/motsClesPersonnalises", () => ({
  MOTS_CLES_QUERY: ["qrc-mots-cles-admin"], lireMotsClesQrc: async () => [], enregistrerMotCleQrc: vi.fn(),
}));
const ecran = () => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminCorrectionQrcV2Reel /></QueryClientProvider>;

vi.mock("@/features/correction-qrc-v2/noyauReel", async (importOriginal) => {
  const reel = await importOriginal<typeof import("@/features/correction-qrc-v2/noyauReel")>();
  return {
    ...reel,
    listerGroupesCrm: async () => [{
      cle: "groupe-test",
      type: "crm",
      libelle: "Session fictive",
      periode: null,
      debut: null,
      fin: null,
      tri: "2026-01-01",
      nbCandidats: 2,
      examens: [{
        cle: "eb-test",
        exam_id: "EB-TEST",
        date: "01/01/2026",
        jour: "2026-01-01",
        heureMin: "09:00",
        heureMax: "10:00",
        attemptIds: ["a1", "a2"],
        circuit: "v2",
        dates: [],
        apprenantParAttempt: { a1: "apprenant-a1", a2: "apprenant-a2" },
      }],
    }],
    chargerSessionTest: mocks.charger,
    corrigerQrc: mocks.corriger,
    reviserQrc: mocks.reviser,
    commenterQrc: mocks.commenter,
    lireHistoriqueQrc: mocks.lireCommentaires,
    souscrireSignal: (_canal: string, table: string, cb: () => void) => {
      mocks.signaux.set(table, cb);
      return () => mocks.signaux.delete(table);
    },
  };
});

vi.mock("@/features/correction-qrc-v2/correctionIa", async (importOriginal) => {
  const reel = await importOriginal<typeof import("@/features/correction-qrc-v2/correctionIa")>();
  return {
    ...reel,
    lireConfigIa: async () => ({ actif: false }),
    lireCorrectionsIa: async () => [],
    lireDemandesVerification: async () => [],
  };
});

vi.mock("@/components/cours-en-ligne/CorrectionQRCTab", () => ({ default: () => null }));
vi.mock("@/features/correction-qrc-v2/eb2Consultation", async (importOriginal) => {
  const reel = await importOriginal<typeof import("@/features/correction-qrc-v2/eb2Consultation")>();
  return { ...reel, noterQrcHistorique: mocks.noterHistorique, commenterQrcHistorique: mocks.commenterHistorique, chargerConsultationEb2: async () => etat.session, lireHistoriqueQrcHistorique: mocks.lireHistoriqueHisto };
});
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { email: "admin@fictif.test" } } }) },
    from: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }),
    // Realtime double for the read-only global-grade alert mounted on /admin/ pages:
    // records subscriptions only, never emits events, never writes.
    channel: (nom: string) => {
      const canal = {
        nom,
        on: () => canal,
        subscribe: () => canal,
      };
      return canal;
    },
    removeChannel: async () => "ok",
  },
}));

const tentative = (id: string): TentativeReelle => ({
  attempt_id: id,
  apprenant_id: `apprenant-${id}`,
  exam_id: "EB-TEST",
  exam_version_id: "version-test",
  etat: "remis",
  snapshot_fingerprint: `empreinte-${id}`,
  candidat: `Candidat ${id}`,
  started_at: "2026-01-01T09:00:00Z",
  snapshot: {
    exam_id: "EB-TEST",
    matieres: [{ subject_id: "A", lettre: "A", titre: "Matière fictive", ordre: 1 }],
    questions: [{ id: "q1", matiere: "A", type: "QRC", enonce: "Question fictive", reponseQRC: "Corrigé fictif", points: 2 }],
  },
});

const qrc = (attempt_id: string): QrcReelle => ({
  qrc_instance_id: `${attempt_id}-q1`,
  attempt_id,
  question_id: "q1",
  apprenant_id: `apprenant-${attempt_id}`,
  reponse: `Réponse ${attempt_id}`,
  etat: "en_attente",
  note: null,
});

const sessionFictive = (): SessionReelle => ({
  tentatives: [tentative("a1"), tentative("a2")],
  qrc: [qrc("a1"), qrc("a2")],
  resultats: [],
  baremesRestaures: [],
});

const appliquerNote = (qrcInstanceId: string, note: number) => {
  if (!etat.session) throw new Error("Session fictive absente");
  etat.session = {
    ...etat.session,
    qrc: etat.session.qrc.map((q) => q.qrc_instance_id === qrcInstanceId
      ? { ...q, etat: "corrigee", note, corrige_email: "admin@fictif.test" }
      : q),
  };
};

const ouvrirCopie = async (qrcInstanceId: string) => {
  render(ecran());
  fireEvent.click(await screen.findByTestId(`cellule-${qrcInstanceId}`));
  await screen.findByTestId("panneau-correction");
};

beforeEach(() => {
  etat.session = sessionFictive();
  mocks.charger.mockReset().mockImplementation(async () => etat.session);
  mocks.corriger.mockReset().mockImplementation(async ({ qrcInstanceId, note }) => {
    appliquerNote(qrcInstanceId, note);
    return {};
  });
  mocks.reviser.mockReset();
  mocks.noterHistorique.mockReset();
  mocks.lireCommentaires.mockReset().mockResolvedValue([]);
  mocks.commenter.mockReset();
  mocks.commenterHistorique.mockReset();
  mocks.lireHistoriqueHisto.mockReset().mockResolvedValue([]);
  window.history.replaceState(null, "", "/admin/correction-qrc-v2");
  window.sessionStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("Correction QRC — passage automatique après confirmation de persistance", () => {
  it("note inchangée : commentaire seul refusé en succès si la relecture ne le confirme pas", async () => {
    appliquerNote("a1-q1", 1);
    mocks.lireCommentaires.mockResolvedValue([{ correction_event_id: 7, note_nouvelle: 1, created_at: "2026-11-10T13:00:00Z", commentaire: null }]);
    mocks.commenter.mockResolvedValue({});
    await ouvrirCopie("a1-q1");
    const modifier = await screen.findByTestId("modifier-note");
    await waitFor(() => expect(modifier).toBeEnabled());
    fireEvent.click(modifier);
    fireEvent.click(screen.getByRole("button", { name: "Précisez !!!" }));
    fireEvent.click(screen.getByTestId("revision-note-1"));
    expect(await screen.findByTestId("erreur-correction-copie")).toHaveTextContent("commentaire n’a pas été confirmé");
    expect(mocks.reviser).not.toHaveBeenCalled();
    expect(mocks.commenter.mock.calls[0][0]).toMatchObject({ qrcInstanceId: "a1-q1", noteAttendue: 1, dernierEvenementAttendu: 7, commentaire: "Précisez !!!" });
    expect(screen.getByPlaceholderText("Motif de la révision (facultatif)")).toHaveValue("Précisez !!!");
    expect(window.location.search).toContain("qrc=a1-q1");
  });
  it("QRC corrigée : 4 boutons, cumul, édition libre, enregistrement seul sans note, relu, double clic = un envoi", async () => {
    appliquerNote("a1-q1", 1);
    const journal: Array<Record<string, unknown>> = [{ correction_event_id: 7, note_nouvelle: 1, created_at: "2026-11-10T13:00:00Z", commentaire: null }];
    mocks.lireCommentaires.mockImplementation(async () => [...journal]);
    mocks.commenter.mockImplementation(async ({ commentaire, dernierEvenementAttendu }) => {
      if (dernierEvenementAttendu !== journal.at(-1)?.correction_event_id) throw new Error("COMMENTAIRE_CONFLIT");
      journal.push({ correction_event_id: 8, note_precedente: 1, note_nouvelle: 1, created_at: "2026-11-10T13:05:00Z", commentaire });
      return { commentaire_seul: true };
    });
    await ouvrirCopie("a1-q1");
    const bouton = await screen.findByTestId("enregistrer-commentaire");
    await waitFor(() => expect(screen.getByPlaceholderText("Commentaire pour l’élève (la note ne change pas)")).toBeEnabled());
    expect(bouton).toBeDisabled();
    for (const t of ["Précisez !!!", "Mal dit !!!", "Précisez permis de conduire hors période probatoire", "Attention aux fautes !!!"]) {
      fireEvent.click(screen.getByRole("button", { name: t }));
    }
    const champ = screen.getByPlaceholderText("Commentaire pour l’élève (la note ne change pas)");
    fireEvent.change(champ, { target: { value: `${(champ as HTMLTextAreaElement).value}\nRevoir le cours` } });
    const attendu = "Précisez !!!\nMal dit !!!\nPrécisez permis de conduire hors période probatoire\nAttention aux fautes !!!\nRevoir le cours";
    expect(champ).toHaveValue(attendu);
    fireEvent.click(bouton);
    fireEvent.click(bouton);
    expect(await screen.findByText("Commentaire enregistré — note inchangée.")).toBeInTheDocument();
    expect(mocks.commenter).toHaveBeenCalledOnce();
    expect(mocks.commenter.mock.calls[0][0]).toMatchObject({ qrcInstanceId: "a1-q1", noteAttendue: 1, dernierEvenementAttendu: 7, commentaire: attendu });
    expect(mocks.reviser).not.toHaveBeenCalled();
    expect(mocks.corriger).not.toHaveBeenCalled();
    expect(screen.getByTestId("points-attribues")).toHaveTextContent("1");
    expect(screen.getByTestId("commentaire-enregistre")).toHaveTextContent("Revoir le cours");
    expect(window.location.search).toContain("qrc=a1-q1");
  });
  it("ancienne copie corrigée : commentaire seul via le journal historique avec la révision relue", async () => {
    const t = { ...tentative("a1"), attempt_id: "consultation:r1", historique: { result_id: "r1", score_obtenu: 2, seuil: 6, provenance: "remise_identique" } };
    etat.session = { tentatives: [t as TentativeReelle], qrc: [{ ...qrc(t.attempt_id), apprenant_id: t.apprenant_id, qrc_instance_id: "consultation:r1:q1", etat: "corrigee", note: 1.5 }], resultats: [], baremesRestaures: [] };
    const journal: Array<Record<string, unknown>> = [{ revision: 1, note_nouvelle: 1.5, created_at: "2026-11-10T12:00:00Z", commentaire: "" }];
    mocks.lireHistoriqueHisto.mockImplementation(async () => [...journal]);
    mocks.commenterHistorique.mockImplementation(async ({ commentaire }) => {
      journal.push({ revision: 2, note_precedente: 1.5, note_nouvelle: 1.5, created_at: "2026-11-10T13:05:00Z", commentaire });
      return {};
    });
    await ouvrirCopie("consultation:r1:q1");
    await waitFor(() => expect(screen.getByPlaceholderText("Commentaire pour l’élève (la note ne change pas)")).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Mal dit !!!" }));
    fireEvent.click(screen.getByTestId("enregistrer-commentaire"));
    expect(await screen.findByText("Commentaire enregistré — note inchangée.")).toBeInTheDocument();
    expect(mocks.commenterHistorique.mock.calls[0][0]).toMatchObject({ resultId: "r1", questionId: "q1", noteAttendue: 1.5, revisionAttendue: 1, commentaire: "Mal dit !!!" });
    expect(mocks.noterHistorique).not.toHaveBeenCalled();
  });
  it("ajoute plusieurs commentaires sans doublon, envoie la bonne QRC et relit après réouverture", async () => {
    let persiste = "";
    mocks.lireCommentaires.mockImplementation(async (id) => id === "a1-q1" && persiste
      ? [{ note_nouvelle: 1, created_at: "2026-11-10T13:02:00Z", commentaire: persiste }]
      : []);
    mocks.corriger.mockImplementation(async ({ qrcInstanceId, note, commentaire }) => {
      persiste = commentaire;
      appliquerNote(qrcInstanceId, note);
    });
    await ouvrirCopie("a1-q1");
    fireEvent.change(screen.getByPlaceholderText("Commentaire (facultatif)"), { target: { value: "Retour personnel" } });
    fireEvent.click(screen.getByRole("button", { name: "Précisez !!!" }));
    fireEvent.click(screen.getByRole("button", { name: "Précisez !!!" }));
    fireEvent.click(screen.getByRole("button", { name: "Attention aux fautes !!!" }));
    expect(mocks.corriger).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("note-1"));
    await waitFor(() => expect(mocks.corriger).toHaveBeenCalledOnce());
    expect(mocks.corriger.mock.calls[0][0]).toMatchObject({ qrcInstanceId: "a1-q1", note: 1,
      commentaire: expect.stringContaining("Retour personnel\nPrécisez !!!\nAttention aux fautes !!!") });
    await waitFor(() => expect(window.location.search).toContain("qrc=a2-q1"));
    expect(screen.getByPlaceholderText("Commentaire (facultatif)")).toHaveValue("");
    fireEvent.click(screen.getByTestId("cellule-a1-q1"));
    expect(await screen.findByTestId("commentaire-enregistre")).toHaveTextContent("Précisez !!!");
    fireEvent.click(screen.getByTestId("modifier-note"));
    expect(screen.getByPlaceholderText("Motif de la révision (facultatif)")).toHaveValue(persiste);
    fireEvent.click(screen.getByRole("button", { name: "Mal dit !!!" }));
    expect(screen.getByPlaceholderText("Motif de la révision (facultatif)")).toHaveValue(`${persiste}\nMal dit !!!`);
  });
  const copieHistorique = (provenance: string) => {
    const t = { ...tentative("a1"), attempt_id: "consultation:r1", historique: { result_id: "r1", score_obtenu: 2, seuil: 6, provenance } };
    etat.session = { tentatives: [t as TentativeReelle], qrc: [{ ...qrc(t.attempt_id), apprenant_id: t.apprenant_id, qrc_instance_id: "consultation:r1:q1" }], resultats: [], baremesRestaures: [] };
  };
  it.each(["remise_identique", "remise_horodatage_divergent"])("copie historique %s : clic enregistré puis note relue sans confirmation", async (provenance) => {
    copieHistorique(provenance);
    mocks.noterHistorique.mockImplementation(async ({ note }) => { appliquerNote("consultation:r1:q1", note); return {}; });
    await ouvrirCopie("consultation:r1:q1");
    fireEvent.click(screen.getByTestId("note-1.5"));
    await waitFor(() => expect(mocks.noterHistorique).toHaveBeenCalledOnce());
    expect(mocks.noterHistorique.mock.calls[0][0]).toMatchObject({ resultId: "r1", questionId: "q1", note: 1.5, scoreAttendu: 2 });
    expect(window.confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("points-attribues")).toHaveTextContent("1,5"));
  });
  it("copie historique sans remise prouvée : erreur claire et aucune écriture", async () => {
    copieHistorique("resultat_seul");
    await ouvrirCopie("consultation:r1:q1");
    fireEvent.click(screen.getByTestId("note-1"));
    expect(await screen.findByTestId("erreur-correction-copie")).toHaveTextContent("aucune remise");
    expect(mocks.noterHistorique).not.toHaveBeenCalled();
    expect(mocks.corriger).not.toHaveBeenCalled();
  });
  it("liaison QRC vers un autre élève : refus avant tout envoi", async () => {
    if (!etat.session) throw new Error("Session absente");
    etat.session.qrc[0].apprenant_id = "autre-eleve";
    await ouvrirCopie("a1-q1");
    fireEvent.click(screen.getByTestId("note-1"));
    expect(await screen.findByTestId("erreur-correction-copie")).toHaveTextContent("liaison");
    expect(mocks.corriger).not.toHaveBeenCalled();
  });
  it("reclasse un passage terminé après signal serveur, sans enregistrer une note", async () => {
    if (!etat.session) throw new Error("Session absente");
    etat.session.tentatives[0] = { ...etat.session.tentatives[0], etat: "terminee", finished_at: "2026-11-09T19:27:00Z" };
    etat.session.tentatives[1] = { ...etat.session.tentatives[1], etat: "terminee", finished_at: "2026-11-09T19:59:00Z" };
    render(ecran());
    await screen.findByTestId("cellule-a2-q1");
    const lignes = () => Array.from(screen.getByTestId("matrice-A").querySelectorAll("tbody tr")).map(r => r.querySelector("a")?.getAttribute("data-testid"));
    expect(lignes()).toEqual(["lien-crm-a2", "lien-crm-a1"]);
    etat.session.tentatives[0] = { ...etat.session.tentatives[0], finished_at: "2026-11-09T20:01:00Z" };
    mocks.signaux.get("exam_attempts_v2")?.();
    await waitFor(() => expect(lignes()).toEqual(["lien-crm-a1", "lien-crm-a2"]), { timeout: 4000 });
    expect(mocks.corriger).not.toHaveBeenCalled();
    expect(mocks.reviser).not.toHaveBeenCalled();
  });
  it.each(['EB3', 'EB3-TAXI'])('valide automatiquement 2/2 une réponse littéralement identique %s, une seule écriture', async (examId) => {
    if (!etat.session) throw new Error('Session absente');
    for (const t of etat.session.tentatives) t.exam_id = examId;
    etat.session.tentatives[0].snapshot.questions[0].reponseQRC = 'Casier judiciaire vierge (B2)';
    etat.session.qrc[0].reponse = 'casier judiciaire vierge (B2).';
    await ouvrirCopie('a1-q1');
    await waitFor(() => expect(mocks.corriger).toHaveBeenCalledOnce());
    expect(mocks.corriger.mock.calls[0][0]).toMatchObject({ note: 2, qrcInstanceId: 'a1-q1', operationId: 'qrcv2:a1-q1:2', commentaire: expect.stringContaining('VALIDATION AUTO identique-conservateur-v2') });
    await waitFor(() => expect(window.location.search).toContain('qrc=a2-q1'));
    expect(mocks.corriger).toHaveBeenCalledOnce();
  });
  it('équivalence B2 : présélection 2/2 seulement, enregistrée au clic', async () => {
    if (!etat.session) throw new Error('Session absente');
    etat.session.tentatives[0].snapshot.questions[0].reponseQRC = 'Casier judiciaire vierge (B2)';
    etat.session.qrc[0].reponse = "C'est avoir un casier judiciaire b2 vierge";
    await ouvrirCopie('a1-q1');
    await new Promise((r) => setTimeout(r, 50));
    expect(mocks.corriger).not.toHaveBeenCalled();
    expect(screen.getByTestId('note-2')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('note-2'));
    await waitFor(() => expect(mocks.corriger).toHaveBeenCalledOnce());
    expect(mocks.corriger.mock.calls[0][0].note).toBe(2);
    expect(mocks.corriger.mock.calls[0][0].commentaire).not.toContain('VALIDATION AUTO');
  });
  it.each([
    ['−10 euros', '10 euros'],
    ['-10 euros', '10 euros'],
    ['10 %', '10 €'],
    ['Casier judiciaire B2', 'Casier judiciaire vierge (B2)'],
    ['Casier judiciaire B2 non vierge', 'Casier judiciaire vierge (B2)'],
    ['Réponse fausse', 'Casier judiciaire vierge (B2)'],
  ])('aucune note automatique (ni zéro) pour « %s » vs « %s » ; le clic sur une note l’enregistre immédiatement', async (rep, officiel) => {
    if (!etat.session) throw new Error('Session absente');
    etat.session.tentatives[0].snapshot.questions[0].reponseQRC = officiel;
    etat.session.qrc[0].reponse = rep;
    await ouvrirCopie('a1-q1');
    await new Promise((r) => setTimeout(r, 50));
    expect(mocks.corriger).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('note-1'));
    await waitFor(() => expect(mocks.corriger).toHaveBeenCalledOnce());
    expect(mocks.corriger.mock.calls[0][0].note).toBe(1);
  });
  it('garde la révision volontaire séparée sans proposition ni nouvelle première correction', async () => {
    appliquerNote('a1-q1', 1.5);
    mocks.reviser.mockImplementation(async ({ qrcInstanceId, note }) => { appliquerNote(qrcInstanceId, note); return {}; });
    await ouvrirCopie('a1-q1');
    fireEvent.click(screen.getByTestId('modifier-note'));
    expect(mocks.reviser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('revision-note-2'));
    await waitFor(() => expect(mocks.reviser).toHaveBeenCalledOnce());
    expect(mocks.reviser.mock.calls[0][0]).toMatchObject({ note: 2, noteAttendue: 1.5 });
    expect(mocks.corriger).not.toHaveBeenCalled();
  });
  it("n'affiche pas de pré-note sur une note déjà corrigée", async () => {
    appliquerNote('a1-q1', 1.5);
    await ouvrirCopie('a1-q1');
    expect(screen.queryByTestId('prenote-qrc')).not.toBeInTheDocument();
    expect(mocks.corriger).not.toHaveBeenCalled();
    expect(mocks.reviser).not.toHaveBeenCalled();
  });
  it("reste sur la copie pendant l'écriture puis avance après la relecture conforme", async () => {
    let terminer: (() => void) | undefined;
    mocks.corriger.mockImplementation(({ qrcInstanceId, note }) => new Promise((resolve) => {
      terminer = () => { appliquerNote(qrcInstanceId, note); resolve({}); };
    }));
    await ouvrirCopie("a1-q1");
    fireEvent.click(screen.getByTestId("note-1.5"));
    await waitFor(() => expect(mocks.corriger).toHaveBeenCalledOnce());
    expect(window.location.search).toContain("qrc=a1-q1");
    expect(screen.getByTestId("copie-suivante")).toBeDisabled();
    expect(screen.queryByTestId("reponse-eleve")).toHaveTextContent("Réponse a1");

    terminer?.();
    await waitFor(() => expect(window.location.search).toContain("qrc=a2-q1"));
    expect(screen.getByTestId("reponse-eleve")).toHaveTextContent("Réponse a2");
    expect(screen.getByText("Question fictive")).toBeInTheDocument();
  });

  it("reste sur la copie et affiche l'erreur si le serveur refuse", async () => {
    mocks.corriger.mockRejectedValue(new Error("Refus serveur fictif"));
    await ouvrirCopie("a1-q1");
    fireEvent.click(screen.getByTestId("note-1"));
    expect(await screen.findByTestId("erreur-correction-copie")).toHaveTextContent("Refus serveur fictif");
    expect(window.location.search).toContain("qrc=a1-q1");
    expect(screen.getByTestId("reponse-eleve")).toHaveTextContent("Réponse a1");
  });

  it("reste sur la copie si la relecture ne confirme pas la note choisie", async () => {
    mocks.corriger.mockResolvedValue({});
    await ouvrirCopie("a1-q1");
    fireEvent.click(screen.getByTestId("note-1"));
    expect(await screen.findByTestId("erreur-correction-copie")).toHaveTextContent("relecture");
    expect(window.location.search).toContain("qrc=a1-q1");
    expect(mocks.corriger).toHaveBeenCalledOnce();
  });

  it("reste sur la dernière copie et signale la fin de liste après confirmation", async () => {
    await ouvrirCopie("a2-q1");
    fireEvent.click(screen.getByTestId("note-2"));
    expect(await screen.findByTestId("fin-liste-copies")).toHaveTextContent("dernière copie de la liste");
    expect(window.location.search).toContain("qrc=a2-q1");
    expect(screen.getByTestId("copie-suivante")).toBeDisabled();
  });
});
