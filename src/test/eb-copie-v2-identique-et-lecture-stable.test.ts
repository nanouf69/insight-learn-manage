// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// Pages serveur volontairement renvoyées dans un ordre différent si aucun tri n'est demandé.
const orders: Record<string, string[]> = {};
const tables: Record<string, any[]> = {};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  let rows = [...(tables[table] ?? [])];
  let sorted: string | null = null;
  const q: any = {
    select: () => q,
    in: (k: string, v: unknown[]) => { rows = rows.filter((r) => v.includes(r[k])); return q; },
    eq: (k: string, v: unknown) => { rows = rows.filter((r) => r[k] === v); return q; },
    order: (col: string) => { sorted = col; (orders[table] ||= []).push(col); return q; },
    range: async (from: number, to: number) => {
      const base = sorted ? [...rows].sort((a, b) => String(a[sorted!]).localeCompare(String(b[sorted!]))) : [...rows].reverse();
      return { data: base.slice(from, to + 1), error: null };
    },
  };
  return q;
} } }));

import { attacherSourceUnique, fichesIdentiques, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import { fetchCoreMatiereStatesBulk, type CoreMatiereState } from "@/lib/coreExamPublication";
import { lignesExamenAffichees } from "@/lib/ebLignesAffichees";

// Ancienne fiche résumée (sans choix, « reponseCorrecte ») copiée telle quelle en V2.
const fiche = {
  questions: [
    { type: "QRC", enonce: "Citez trois conditions", questionId: 1, reponseEleve: "B2 vierge", reponseCorrecte: "Examen, carte, aptitude" },
    { type: "QCM", enonce: "Choisir", questionId: 2, reponseEleve: "A", reponseCorrecte: "A" },
  ],
  reponses: { 1: "B2 vierge", 2: ["A"] },
};
const row = (details: any, id = "res-1") => ({ id, quiz_type: "examen_blanc", quiz_id: "EB2", matiere_id: "t3p", completed_at: "2026-10-01T10:00:00Z", score_obtenu: 9, score_max: 20, note_sur_20: 9, details });
const core = (o: Partial<CoreMatiereState> = {}): CoreMatiereState => ({
  attemptId: "att-1", examId: "EB2", matiereId: "t3p", finishedAt: "2026-10-01T10:00:00Z", qrcTotal: 1, qrcRestantes: 0,
  status: "definitif", pending: false, note20: 12, resultId: "res-1", historicalDetails: JSON.parse(JSON.stringify(fiche)),
  answers: { "t3p:1": "B2 vierge", "t3p:2": ["A"] },
  qrcProofs: [{ questionId: "t3p:1", reponse: "B2 vierge", etat: "corrigee", note: 2 }], ...o,
} as any);

describe("Copie V2 identique à la ligne d'origine", () => {
  it("QRC corrigées en V2 : note définitive affichée, plus « en attente »", () => {
    const r = attacherSourceUnique(row(fiche), [core()], new Set());
    expect(r.__core).not.toBeNull();
    expect(noteExamenAffichee(r)).toMatchObject({ etat: "note", source: "noyau", note20: 12 });
  });
  it("copie V2 encore en correction : jamais rattachée (aucun résultat publié remis en attente)", () => {
    expect(attacherSourceUnique(row(fiche), [core({ pending: true, note20: null, qrcRestantes: 1 })], new Set()).__core).toBeNull();
  });
  it("fiche modifiée après la copie : rattachement refusé", () => {
    const modifiee = { ...fiche, correctionsIA: { 1: { points: 1 } } };
    expect(attacherSourceUnique(row(modifiee), [core()], new Set()).__core).toBeNull();
  });
  it("copie d'une autre ligne : rattachement refusé", () => {
    expect(attacherSourceUnique(row(fiche, "res-2"), [core()], new Set()).__core).toBeNull();
  });
  it("passage V2 déclaré non fiable : rattachement refusé", () => {
    expect(attacherSourceUnique(row(fiche), [core()], new Set(["att-1"])).__core).toBeNull();
  });
  it("l'ordre des clés ne compte pas, une valeur différente si", () => {
    expect(fichesIdentiques({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(fichesIdentiques({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe("Lecture des copies V2 au-delà de 1000 lignes", () => {
  it("chaque table est paginée sur sa clé primaire (ordre stable)", async () => {
    tables.exam_attempts_v2 = [{ attempt_id: "a1", apprenant_id: "u1", exam_id: "EB1", finished_at: "2026-10-01T10:00:00Z", etat: "terminee", matiere: "t3p", questions: [] }];
    tables.core_exam_results = [{ result_id: "r1", attempt_id: "a1", apprenant_id: "u1", result_revision: 1, status: "definitif", score: 12, total: 20, qrc_restantes: 0 }];
    tables.answer_state = Array.from({ length: 2500 }, (_, i) => ({ response_id: String(i).padStart(5, "0"), attempt_id: "a1", apprenant_id: "u1", question_id: `t3p:${i}`, valeur: i }));
    const map = await fetchCoreMatiereStatesBulk(["u1"]);
    expect(Object.keys(map!.get("u1")![0].answers ?? {})).toHaveLength(2500);
    for (const t of ["exam_attempts_v2", "qrc_instances_v2", "core_exam_results", "core_tentatives_neutralisees", "apprenant_quiz_results", "answer_state", "core_exam_resets"]) {
      expect(orders[t]?.length, t).toBeGreaterThan(0);
    }
  });
});

describe("Même tentative affichée côté élève et admin", () => {
  const r = (id: string, matiere: string, tentative: number, at: string) => ({ id, quiz_type: "examen_blanc", quiz_id: "EB1", matiere_id: matiere, tentative, completed_at: at, created_at: at, score_obtenu: 10, score_max: 20, details: {} });
  it("tentative la plus récente, matières manquantes complétées par l'ancienne", () => {
    const rows = [r("n1", "t3p", 2, "2026-11-02T10:00:00Z"), r("o1", "t3p", 1, "2026-10-01T10:00:00Z"), r("o2", "gestion", 1, "2026-10-01T11:00:00Z")];
    expect(lignesExamenAffichees(rows, []).map((x) => x.id).sort()).toEqual(["n1", "o2"]);
  });
  it("lignes antérieures à une remise à zéro écartées", () => {
    const rows = [r("o1", "t3p", 1, "2026-10-01T10:00:00Z")];
    expect(lignesExamenAffichees(rows, [{ exam_id: "EB1", cutoff_at: "2026-10-05T00:00:00Z" }])).toEqual([]);
  });
});
