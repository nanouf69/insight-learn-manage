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
  remaining: 0,
  rpcCalls: 0,
  flush: [] as Array<() => Promise<boolean>>,
  enqueue: [] as any[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const b: any = {
      select: () => b, eq: () => b, in: () => b, order: () => b, limit: () => b,
      maybeSingle: () => {
        if (table === "reponses_apprenants") {
          const next = h.lectures.shift();
          return next ? next() : Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then: (ok: any, ko: any) => Promise.resolve({ data: [], error: null }).then(ok, ko),
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
  enfilerReponseNoyau: vi.fn(),
  viderFileNoyau: vi.fn(async () => ({ restantes: 0 })),
  finaliserMatiere: vi.fn(async () => ({ ok: true })),
  reponsesNoyauEnAttente: () => 0,
  reponsesNoyauEcartees: () => 0,
  questionsNoyauEcartees: () => new Set(),
  remapperFileApresReouverture: () => ({ ok: true, correspondance: 0 }),
  archiverMarqueursObsoletes: vi.fn(),
  recommencerMatiereNoyau: vi.fn(),
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

beforeEach(() => {
  h.lectures = []; h.routage = null; h.remaining = 0; h.rpcCalls = 0; h.flush = []; h.enqueue = [];
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
});
