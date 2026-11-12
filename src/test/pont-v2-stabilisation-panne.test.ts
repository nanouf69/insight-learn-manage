// @vitest-environment node
/**
 * Stabilisation 12/11/2026 — panne serveur pendant un examen blanc.
 * Cause confirmée : chaque lettre tapée devenait une écriture (1 638 écritures pour 148 questions
 * en 4 min à la reprise de 20:38) et chaque frappe relançait un envoi pendant la panne.
 * Faux serveur reprenant les règles de core_save_answer ; aucune donnée réelle.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
type Ligne = { valeur: unknown; revision: number };
const serveur = new Map<string, Ligne>();
const ops = new Map<string, unknown>();
let panne = false;
let appels = 0;
let ecrituresEffectives = 0;
const k = (a: string, q: string) => `${a}|${q}`;
function coreSaveAnswer(p: any) {
  appels += 1;
  if (panne) return { data: null, error: { message: "TypeError: Failed to fetch" } };
  if (ops.has(p.p_operation_id)) return { data: ops.get(p.p_operation_id), error: null };
  const cle = k(p.p_attempt_id, p.p_question_id);
  const courant = serveur.get(cle);
  const exp = p.p_expected_revision;
  let res;
  if (!courant) {
    if ((exp ?? 0) !== 0) return { data: null, error: { message: "ANSWER_STALE_REVISION P0409" } };
    serveur.set(cle, { valeur: p.p_valeur, revision: 1 }); ecrituresEffectives += 1; res = { revision: 1 };
  } else {
    if (exp == null && JSON.stringify(courant.valeur) === JSON.stringify(p.p_valeur)) { res = { revision: courant.revision }; ops.set(p.p_operation_id, res); return { data: res, error: null }; }
    if (exp !== courant.revision) return { data: null, error: { message: "ANSWER_STALE_REVISION P0409" } };
    serveur.set(cle, { valeur: p.p_valeur, revision: courant.revision + 1 }); ecrituresEffectives += 1; res = { revision: courant.revision + 1 };
  }
  ops.set(p.p_operation_id, res);
  return { data: res, error: null };
}
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (_n: string, p: any) => coreSaveAnswer(p),
    from: () => {
      const f: Record<string, string> = {};
      const q: any = {
        select: () => q, eq: (c: string, v: string) => { f[c] = v; return q; },
        maybeSingle: async () => { const l = serveur.get(k(f.attempt_id, f.question_id)); return { data: l ? { ...l } : null, error: null }; },
        then: (ok: any) => ok({ data: [...serveur.entries()].filter(([c]) => c.startsWith(`${f.attempt_id}|`)).map(([c, l]) => ({ question_id: c.split("|")[1], revision: l.revision, valeur: l.valeur })), error: panne ? { message: "Failed to fetch" } : null }),
      };
      return q;
    },
  },
}));

import { enfilerReponseNoyau, viderFileNoyau, reponsesNoyauEnAttente, delaiReessai, __simulerRechargementPourTests } from "@/features/noyau-passage/pontV2";

const TEXTE = "Je l’appelle très vite pour lui rendre son objet";
const attendre = () => new Promise((r) => setTimeout(r, 0));
async function vider() { for (let i = 0; i < 2000 && reponsesNoyauEnAttente() > 0; i++) { await viderFileNoyau(null, { forcer: true }); await attendre(); } }

beforeEach(() => { store.clear(); serveur.clear(); ops.clear(); panne = false; appels = 0; ecrituresEffectives = 0; __simulerRechargementPourTests(); });

describe("Panne serveur pendant un examen blanc", () => {
  for (const n of [10, 20, 30]) {
    it(`${n} candidats tapent 3 QRC pendant la panne : zéro perte, une seule écriture par question, pas de rafale`, async () => {
      panne = true;
      for (let c = 0; c < n; c++) for (let q = 1; q <= 3; q++)
        for (let i = 1; i <= TEXTE.length; i++) { enfilerReponseNoyau({ attemptId: `att-${c}`, matiereId: "francais", questionId: q, valeur: TEXTE.slice(0, i) }); await attendre(); }
      const appelsPendantPanne = appels;
      // Avant : ~1 envoi par frappe (n×3×48). Maintenant : le délai croissant coupe la rafale.
      expect(appelsPendantPanne).toBeLessThanOrEqual(n * 3); // ≤ 3 essais par candidat pendant toute la saisie (avant : n × 144)
      expect(reponsesNoyauEnAttente()).toBe(n * 3); // une seule valeur en attente par question, la plus récente
      // Rechargement de page pendant la panne : la file locale survit.
      __simulerRechargementPourTests();
      expect(reponsesNoyauEnAttente()).toBe(n * 3);
      panne = false;
      await vider();
      expect(reponsesNoyauEnAttente()).toBe(0);
      for (let c = 0; c < n; c++) for (let q = 1; q <= 3; q++) expect(serveur.get(k(`att-${c}`, `francais:${q}`))).toEqual({ valeur: TEXTE, revision: 1 });
      expect(ecrituresEffectives).toBe(n * 3); // avant : n×3×48 écritures
    }, 60_000);
  }

  it("changement de réponse : l'ancienne valeur n'écrase jamais la nouvelle", async () => {
    enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 1, valeur: ["A"] }); await vider();
    panne = true;
    enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 1, valeur: ["B"] });
    enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 1, valeur: ["B", "C"] });
    for (let i = 0; i < 20; i++) await attendre(); // l'envoi de ["B"] déjà en vol échoue pendant la panne
    panne = false; await vider();
    expect(serveur.get(k("a", "m:1"))).toEqual({ valeur: ["B", "C"], revision: 2 });
  });

  it("rejeu après coupure en plein envoi : aucune double écriture ayant effet", async () => {
    enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 2, valeur: "texte" }); await vider();
    __simulerRechargementPourTests();
    enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 2, valeur: "texte" }); await vider();
    expect(serveur.get(k("a", "m:2"))).toEqual({ valeur: "texte", revision: 1 });
    expect(ecrituresEffectives).toBe(1);
  });

  it("délai de nouvel essai : croissant, borné à 30 s, avec aléa", () => {
    expect(delaiReessai(1, 0.5)).toBe(1000);
    expect(delaiReessai(3, 0.5)).toBe(4000);
    expect(delaiReessai(20, 0.5)).toBe(30000);
    expect(delaiReessai(20, 1)).toBeLessThanOrEqual(39000);
    expect(delaiReessai(1, 0)).toBe(700);
  });

  it("panne de six minutes, 30 candidats et rechargement : les 90 réponses finales sont conservées", async () => {
    vi.useFakeTimers();
    try {
      panne = true;
      for (let c = 0; c < 30; c++) for (let q = 1; q <= 3; q++) {
        enfilerReponseNoyau({ attemptId: `six-${c}`, matiereId: "qrc", questionId: q, valeur: TEXTE });
      }
      await vi.advanceTimersByTimeAsync(360_000);
      expect(ecrituresEffectives).toBe(0);
      expect(reponsesNoyauEnAttente()).toBe(90);
      const appelsPanne = appels;
      expect(appelsPanne).toBeLessThan(1000);
      __simulerRechargementPourTests();
      expect(reponsesNoyauEnAttente()).toBe(90);
      panne = false;
      await viderFileNoyau(null, { forcer: true });
      expect(reponsesNoyauEnAttente()).toBe(0);
      expect(ecrituresEffectives).toBe(90);
      for (let c = 0; c < 30; c++) for (let q = 1; q <= 3; q++) {
        expect(serveur.get(k(`six-${c}`, `qrc:${q}`))).toEqual({ valeur: TEXTE, revision: 1 });
      }
    } finally {
      __simulerRechargementPourTests();
      vi.useRealTimers();
    }
  });
});
