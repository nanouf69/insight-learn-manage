/**
 * Tests COMPORTEMENTAUX (fictifs, aucune écriture réelle) de la clôture d'une
 * matière : promesses différées pour la lecture, le routage, le chrono et la
 * sauvegarde. Base, noyau V2 et file locale sont entièrement simulés.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};

const h = vi.hoisted(() => ({
  lectures: [] as Array<() => Promise<any>>,
  routage: null as null | (() => Promise<any>),
  remaining: 1800,
  rpcCalls: 0,
  flush: [] as Array<() => Promise<boolean>>,
  enqueue: [] as any[],
  reponsesNoyau: [] as any[],
  tentativesListe: [] as any[],
  tentativeUne: null as any,
  resultatUne: null as any,
  finaliser: null as null | (() => Promise<any>),
  noyauEnfile: [] as any[],
  remappageAppels: [] as any[],
  pendingNative: {} as Record<string, unknown>,
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const b: any = {
      selection: "",
      select: (colonnes: string) => { b.selection = colonnes; return b; },
      eq: () => b, in: () => b, order: () => b, limit: () => b,
      maybeSingle: () => {
        if (table === "reponses_apprenants") {
          const next = h.lectures.shift();
          return next ? next() : Promise.resolve({ data: null, error: null });
        }
        if (table === "exam_attempts_v2") {
          return Promise.resolve({ data: h.tentativeUne, error: null });
        }
        if (table === "core_exam_results") {
          return Promise.resolve({ data: h.resultatUne, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then: (ok: any, ko: any) => {
        const data = table === "answer_state"
          ? h.reponsesNoyau
          : table === "exam_attempts_v2"
            ? h.tentativesListe
            : [];
        return Promise.resolve({ data, error: null }).then(ok, ko);
      },
    };
    return b;
  };
  return {
    supabase: {
      from: (t: string) => chain(t),
      rpc: () => { h.rpcCalls++; return Promise.resolve({ data: [{ remaining_seconds: h.remaining }], error: null }); },
      auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "u-fictif" }, access_token: "x" } } }) },
    },
  };
});

vi.mock("@/features/noyau-passage/pontV2", () => ({
  routerPassage: () => (h.routage ? h.routage() : Promise.resolve({ moteur: "legacy" })),
  enfilerReponseNoyau: (params: any) => { h.noyauEnfile.push(params); },
  viderFileNoyau: vi.fn(async () => ({ restantes: 0 })),
  finaliserMatiere: () => h.finaliser ? h.finaliser() : Promise.resolve({ ok: true }),
  reponsesNoyauEnAttente: () => 0,
  valeursNoyauEnAttente: () => h.pendingNative,
  reponsesNoyauEcartees: () => 0,
  questionsNoyauEcartees: () => new Set(),
  remapperFileApresReouverture: (params: any) => {
    h.remappageAppels.push(params);
    return { ok: true, correspondance: params.questionIdsSnapshot.length };
  },
  archiverMarqueursObsoletes: vi.fn(),
  recommencerMatiereNoyau: vi.fn(),
  surveillerFileNoyau: () => () => {},
  etatStockageFileNoyau: () => "durable",
}));

vi.mock("@/lib/answerPersistence", () => ({
  enqueueAnswerSave: (p: any) => { h.enqueue.push(p); },
  answersAreEqual: (a: any, b: any) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {}),
  flushAnswerSavesAndWait: () => { const f = h.flush.shift(); return f ? f() : Promise.resolve(true); },
  flushAnswerSavesOnUnload: () => {},
  mergeSavedAndPendingAnswers: (raw: any) => raw ?? {},
  getPendingAnswerSavesFor: () => 0,
  getAnswerSaveRejectionFor: () => null,
  getBlockedAnswerSavesFor: () => 0,
  getConfirmedWriteSeq: () => 0,
  subscribeAnswerSaveState: () => () => {},
}));
vi.mock("@/lib/monitoring/errorLogger", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/learnerPreviewGuard", () => ({ blockLearnerWrite: () => false }));
vi.mock("@/components/cours-en-ligne/AnswerSaveIndicator", () => ({ AnswerSaveIndicator: () => null }));

import { PassageMatiere } from "@/components/cours-en-ligne/ExamenBlancsPassage";

const matiere: any = {
  id: "reglementation_vtc", nom: "Réglementation", duree: 30, noteSur: 20,
  questions: [{ id: 1, type: "QCM", enonce: "Question fictive", choix: [{ lettre: "A", texte: "a" }, { lettre: "B", texte: "b" }] }],
};
const ligne = (reponses: any, completed = false) => () => Promise.resolve({ data: { reponses, completed }, error: null });
const terminales = () => h.enqueue.filter((p) => p.completed === true);

const monter = (props: Partial<any> = {}) => {
  const onTerminer = vi.fn();
  const onSansReponse = vi.fn();
  const r = render(
    <PassageMatiere matiere={matiere} numero={1} total={1} onTerminer={onTerminer} onSansReponse={onSansReponse}
      apprenantId="a-fictif" userId="u-fictif" examenId="EB-FICTIF" tentative={1} {...props} />,
  );
  return { ...r, onTerminer, onSansReponse };
};
const flushAll = async () => { for (let i = 0; i < 8; i++) await act(async () => { await Promise.resolve(); }); };

const preparerV2 = (valeur: any = ["A"]) => {
  h.remaining = 1800;
  // Copie figée complète, telle qu'écrite par le serveur à l'ouverture (une copie
  // incomplète est désormais refusée : « Examen indisponible », jamais devinée).
  const snapshot = {
    matiere: matiere.id,
    matieres: [{ subject_id: matiere.id, titre: matiere.nom, duree: 30, coefficient: 3, note_sur: 20, note_eliminatoire: 6 }],
    questions: [{ id: `${matiere.id}:1`, matiere: matiere.id, type: "QCM", enonce: "Question fictive", points: 1,
      choix: [{ lettre: "A", texte: "a", correct: true }, { lettre: "B", texte: "b" }] }],
  };
  h.routage = () => Promise.resolve({ moteur: "v2", attemptId: "nouvelle" });
  h.tentativesListe = [{ attempt_id: "nouvelle", etat: "en_cours", snapshot }];
  h.tentativeUne = { etat: "terminee", snapshot };
  h.reponsesNoyau = [{ question_id: `${matiere.id}:1`, valeur }];
  h.lectures.push(ligne({ 1: valeur }));
  return snapshot;
};

beforeEach(() => {
  h.lectures = []; h.routage = null; h.remaining = 0; h.rpcCalls = 0; h.flush = []; h.enqueue = [];
  h.reponsesNoyau = []; h.tentativesListe = []; h.tentativeUne = null; h.resultatUne = null;
  h.finaliser = null; h.noyauEnfile = []; h.remappageAppels = []; h.pendingNative = {};
});

describe("clôture d'une matière — comportement", () => {
  it("SELECT en erreur + chrono expiré : aucune clôture, erreur visible, relecture puis finalisation avec les vraies réponses", async () => {
    h.lectures.push(() => Promise.resolve({ data: null, error: { message: "panne" } }));
    const { onTerminer } = monter();
    await flushAll();
    expect(screen.getByText("Lecture de vos réponses impossible")).toBeInTheDocument();
    expect(h.rpcCalls).toBe(0);
    expect(terminales()).toHaveLength(0);
    expect(onTerminer).not.toHaveBeenCalled();

    h.lectures.push(ligne({ 1: ["A"] }));               // relecture réussie
    h.lectures.push(ligne({ 1: ["A"] }, true));         // relecture de confirmation
    fireEvent.click(screen.getByText("Réessayer la lecture"));
    await waitFor(() => expect(onTerminer).toHaveBeenCalledTimes(1));
    expect(onTerminer).toHaveBeenCalledWith({ 1: ["A"] });
    expect(terminales()).toHaveLength(1);
    expect(terminales()[0].reponses).toEqual({ 1: ["A"] });
  });

  it("SELECT qui lève une exception : jamais « sans réponse »", async () => {
    h.lectures.push(() => Promise.reject(new Error("réseau")));
    const { onSansReponse } = monter();
    await flushAll();
    expect(screen.getByText("Lecture de vos réponses impossible")).toBeInTheDocument();
    expect(screen.queryByText("Temps écoulé sans réponse")).toBeNull();
    expect(onSansReponse).not.toHaveBeenCalled();
    expect(terminales()).toHaveLength(0);
  });

  it("routage lent : chrono non lu, aucune écriture ; après routage, expiration sans réponse = écran explicite, rien écrit", async () => {
    const r = deferred<any>();
    h.routage = () => r.promise;
    h.lectures.push(ligne(null));
    const { onTerminer } = monter();
    await flushAll();
    expect(h.rpcCalls).toBe(0);
    expect(terminales()).toHaveLength(0);
    await act(async () => { r.resolve({ moteur: "legacy" }); });
    await waitFor(() => expect(screen.getByText("Temps écoulé sans réponse")).toBeInTheDocument());
    expect(terminales()).toHaveLength(0);
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("routage bloqué : écran de blocage, jamais de repli ancien circuit ni de clôture", async () => {
    h.routage = () => Promise.resolve({ moteur: "bloque", message: "Blocage fictif" });
    h.lectures.push(ligne({ 1: ["A"] }));
    const { onTerminer } = monter();
    await flushAll();
    expect(screen.getByText("Blocage fictif")).toBeInTheDocument();
    expect(h.rpcCalls).toBe(0);
    expect(terminales()).toHaveLength(0);
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("clé déjà terminée côté serveur : aucune réécriture", async () => {
    h.lectures.push(ligne({ 1: ["B"] }, true));
    const { onTerminer } = monter();
    await waitFor(() => expect(screen.getByText("Matière déjà terminée")).toBeInTheDocument());
    expect(terminales()).toHaveLength(0);
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("démontage (changement de clé) pendant la sauvegarde : aucun onTerminer obsolète", async () => {
    const f = deferred<boolean>();
    h.flush.push(() => f.promise);
    h.lectures.push(ligne({ 1: ["A"] }));
    h.lectures.push(ligne({ 1: ["A"] }, true));
    const { onTerminer, unmount } = monter();
    await waitFor(() => expect(terminales()).toHaveLength(1));
    unmount();
    await act(async () => { f.resolve(true); });
    await flushAll();
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("panne réseau puis retour : une seule finalisation, même clé de ligne", async () => {
    h.flush.push(() => Promise.resolve(false)); // 1er envoi échoue
    h.lectures.push(ligne({ 1: ["A"] }));
    h.lectures.push(ligne({ 1: ["A"] }, true));
    const { onTerminer } = monter();
    await waitFor(() => expect(terminales()).toHaveLength(1));
    await flushAll();
    expect(onTerminer).not.toHaveBeenCalled();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(onTerminer).toHaveBeenCalledTimes(1));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await flushAll();
    expect(onTerminer).toHaveBeenCalledTimes(1);
    expect(new Set(terminales().map((p) => p.exercice_id)).size).toBe(1);
  });

  it("un nouveau passage ne remappe jamais les réponses d'une ancienne copie même avec le même snapshot", async () => {
    const snapshot = preparerV2();
    h.tentativesListe.push({ attempt_id: "ancienne-abandonnee", etat: "abandonnee", snapshot });
    monter();
    await screen.findByRole('button', {name: 'Terminer la matière'});
    expect(h.remappageAppels).toHaveLength(0);
    expect(h.noyauEnfile.every(r => r.attemptId === 'nouvelle')).toBe(true);
  });

  it('HADDOU : ancienne projection renseignée, nouveau passage vide = aucune réponse empruntée', async () => {
    preparerV2(); h.lectures = [ligne({1:['B']})]; h.reponsesNoyau = [];
    const {onTerminer} = monter();
    await screen.findByRole('button', {name: 'Terminer la matière'});
    expect(h.noyauEnfile).toEqual([]);
    fireEvent.click(screen.getByRole('button', {name: 'Terminer la matière'}));
    expect(onTerminer).not.toHaveBeenCalled();
    expect(terminales()).toEqual([]);
  });

  it("une ancienne valeur serveur ne suffit pas : la dernière valeur locale est renvoyée et la clôture reste bloquée", async () => {
    preparerV2(["A"]); // serveur encore à A
    h.pendingNative = {1: ['B']}; // this attempt's unconfirmed tablet journal
    h.lectures = [ligne({ 1: ["B"] })];
    const fin = vi.fn(async () => ({ ok: true }));
    h.finaliser = fin;
    const { onTerminer } = monter();
    await flushAll();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la matière" }));
    await waitFor(() => expect(h.noyauEnfile.some((r) => JSON.stringify(r.valeur) === JSON.stringify(["B"]))).toBe(true));
    expect(fin).not.toHaveBeenCalled();
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("ATTEMPT_CLOSED sur tentative abandonnée : jamais assimilé à une réussite", async () => {
    preparerV2();
    h.tentativeUne.etat = "abandonnee";
    h.resultatUne = null;
    const fin = vi.fn(async () => ({ ok: false, message: "ATTEMPT_CLOSED" }));
    h.finaliser = fin;
    const { onTerminer } = monter();
    await flushAll();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la matière" }));
    await waitFor(() => expect(fin).toHaveBeenCalledTimes(1));
    await flushAll();
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("ATTEMPT_CLOSED sur tentative terminée avec résultat : relecture puis succès idempotent", async () => {
    preparerV2();
    h.resultatUne = { result_id: "resultat-fictif" };
    h.finaliser = () => Promise.resolve({ ok: false, message: "ATTEMPT_CLOSED" });
    const { onTerminer } = monter();
    await flushAll();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la matière" }));
    await waitFor(() => expect(onTerminer).toHaveBeenCalledTimes(1));
  });
});
