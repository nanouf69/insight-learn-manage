import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminCorrectionQrcV2Reel from "@/pages/AdminCorrectionQrcV2Reel";
import type { QrcReelle, SessionReelle, TentativeReelle } from "@/features/correction-qrc-v2/noyauReel";

const mocks = vi.hoisted(() => ({
  corriger: vi.fn(),
  reviser: vi.fn(),
  charger: vi.fn(),
}));

const etat = vi.hoisted(() => ({ session: null as SessionReelle | null }));

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
    lireHistoriqueQrc: async () => [],
    souscrireSignal: () => () => undefined,
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
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { email: "admin@fictif.test" } } }) },
    from: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }),
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
  render(<AdminCorrectionQrcV2Reel />);
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
  window.history.replaceState(null, "", "/admin/correction-qrc-v2");
  window.sessionStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("Correction QRC — passage automatique après confirmation de persistance", () => {
  it.each(['EB3', 'EB3-TAXI'])('présélectionne sans écriture dans le panneau natif %s et ne mélange pas les copies', async (examId) => {
    if (!etat.session) throw new Error('Session absente');
    for (const t of etat.session.tentatives) t.exam_id = examId;
    etat.session.tentatives[0].snapshot.questions[0].reponseQRC = 'Casier judiciaire vierge (B2)';
    etat.session.qrc[0].reponse = 'avoir un casier judiciaire B2 vierge';
    await ouvrirCopie('a1-q1');
    expect(screen.getByTestId('note-2')).toHaveAttribute('aria-pressed', 'true');
    expect(mocks.corriger).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('copie-suivante'));
    expect(screen.getByTestId('enregistrer-correction')).toBeDisabled();
    expect(mocks.corriger).not.toHaveBeenCalled();
  });
  it('laisse une réponse partielle sans sélection jusqu’au choix humain', async () => {
    if (!etat.session) throw new Error('Session absente');
    etat.session.tentatives[0].snapshot.questions[0].reponseQRC = 'Casier judiciaire vierge (B2)';
    etat.session.qrc[0].reponse = 'Casier judiciaire B2';
    await ouvrirCopie('a1-q1');
    expect(screen.getByTestId('enregistrer-correction')).toBeDisabled();
    fireEvent.click(screen.getByTestId('note-0.5'));
    expect(mocks.corriger).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('enregistrer-correction'));
    await waitFor(() => expect(mocks.corriger).toHaveBeenCalledOnce());
    expect(mocks.corriger.mock.calls[0][0].note).toBe(0.5);
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
  it("la pré-note ne déclenche aucune écriture sans validation humaine et trace le choix", async () => {
    if (!etat.session) throw new Error('Session absente');
    etat.session.tentatives[0].snapshot.questions[0].reponseQRC = "Casier judiciaire vierge (B2)";
    etat.session.qrc[0].reponse = "C'est avoir un casier judiciaire b2 vierge";
    await ouvrirCopie('a1-q1');
    expect(mocks.corriger).not.toHaveBeenCalled();
    expect(screen.getByTestId('note-2')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('note-1.5'));
    expect(mocks.corriger).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('enregistrer-correction'));
    await waitFor(() => expect(mocks.corriger).toHaveBeenCalledOnce());
    expect(mocks.corriger.mock.calls[0][0]).toMatchObject({ note: 1.5, qrcInstanceId: 'a1-q1', commentaire: expect.stringContaining('validation humaine 1.5/2') });
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
    fireEvent.click(screen.getByTestId('enregistrer-correction'));
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
    fireEvent.click(screen.getByTestId('enregistrer-correction'));
    expect(await screen.findByTestId("erreur-correction-copie")).toHaveTextContent("Refus serveur fictif");
    expect(window.location.search).toContain("qrc=a1-q1");
    expect(screen.getByTestId("reponse-eleve")).toHaveTextContent("Réponse a1");
  });

  it("reste sur la copie si la relecture ne confirme pas la note choisie", async () => {
    mocks.corriger.mockResolvedValue({});
    await ouvrirCopie("a1-q1");
    fireEvent.click(screen.getByTestId("note-1"));
    fireEvent.click(screen.getByTestId('enregistrer-correction'));
    expect(await screen.findByTestId("erreur-correction-copie")).toHaveTextContent("relecture");
    expect(window.location.search).toContain("qrc=a1-q1");
    expect(mocks.corriger).toHaveBeenCalledOnce();
  });

  it("reste sur la dernière copie et signale la fin de liste après confirmation", async () => {
    await ouvrirCopie("a2-q1");
    fireEvent.click(screen.getByTestId("note-2"));
    fireEvent.click(screen.getByTestId('enregistrer-correction'));
    expect(await screen.findByTestId("fin-liste-copies")).toHaveTextContent("dernière copie de la liste");
    expect(window.location.search).toContain("qrc=a2-q1");
    expect(screen.getByTestId("copie-suivante")).toBeDisabled();
  });
});
