// @vitest-environment node
/**
 * Faux verdicts « EXAMEN ÉCHOUÉ » (09/11) — notes serveur définitives dont le
 * snapshot ne porte pas de seuil et sans champ `reussi` transmis par la carte.
 * Le seuil configuré de la matière (6/20, anglais 4/20) doit être utilisé ;
 * un seuil vraiment introuvable donne « à vérifier », jamais une éliminatoire.
 * Lecture seule : aucune donnée réelle, uniquement les fonctions de calcul.
 */
import { describe, it, expect } from "vitest";
import {
  EXAMENS_BLANCS_TAXI,
  EXAMENS_BLANCS_VTC,
  EXAMENS_BLANCS_TA,
  EXAMENS_BLANCS_VA,
} from "@/components/cours-en-ligne/examens-blancs-data";
import {
  computeMatiereScoreForAttempt,
  computeMoyenneExamen,
  computeResultatMatiereScore,
} from "@/components/cours-en-ligne/examens-blancs-scoring";
import { isExamAttemptPublicationPending } from "@/components/cours-en-ligne/exam-helpers";
import type { ExamenBlanc, Matiere } from "@/components/cours-en-ligne/examens-blancs-types";

const LETTRES = ["A", "B", "C", "D", "E", "F", "G"];

/** Ligne construite EXACTEMENT comme la carte (pas de `reussi`, snapshot sans seuil). */
const coreRow = (note20: number | null, pending = false, extra: Record<string, unknown> = {}) => ({
  details: {},
  score_obtenu: note20,
  score_max: 20,
  note_sur_20: note20,
  __core: { note20, pending, noteSur: 20, coefficient: undefined, noteEliminatoire: null, ...extra },
});

function bilanCarte(examen: ExamenBlanc, notes: Array<number | null>, opts: { pending?: number[] } = {}) {
  return computeMoyenneExamen(examen, (m: Matiere) => {
    const i = examen.matieres.indexOf(m);
    if (notes[i] === undefined) return null;
    return computeMatiereScoreForAttempt(m, coreRow(notes[i], opts.pending?.includes(i)) as any);
  });
}

function bilanDetail(examen: ExamenBlanc, notes: number[]) {
  return computeMoyenneExamen(examen, (m: Matiere) => {
    const i = examen.matieres.indexOf(m);
    return computeResultatMatiereScore(m, { __core: coreRow(notes[i]).__core } as any);
  });
}

const taxi = (n: number) => EXAMENS_BLANCS_TAXI.find((e) => e.numero === n)!;

describe("Barème officiel déjà configuré (TAXI EB1/EB2)", () => {
  it("coefficients 3/2/3/2/1/3/3 et seuils 6, anglais 4", () => {
    for (const n of [1, 2]) {
      const e = taxi(n);
      expect(e.matieres.map((m) => m.coefficient)).toEqual([3, 2, 3, 2, 1, 3, 3]);
      expect(e.matieres.map((m) => m.noteEliminatoire)).toEqual([6, 6, 6, 6, 4, 6, 6]);
    }
  });
});

describe("Captures Ilies MEMDOUH — doivent être RÉUSSIES sans éliminatoire", () => {
  it("TAXI EB1 14,8/20 : réussi, zéro éliminatoire (carte et détail)", () => {
    const notes = [14.5, 15, 12, 15, 6, 16.5, 19];
    for (const b of [bilanCarte(taxi(1), notes), bilanDetail(taxi(1), notes)]) {
      expect(b.moyenne).toBe(14.8);
      expect(b.eliminatoires).toEqual([]);
      expect(b.seuilsInconnus).toEqual([]);
      expect(b.admisGlobal).toBe(true);
      expect(b.verdict).toBe("reussi");
    }
  });

  it("TAXI EB2 13,4/20 : réussi, anglais 4 admis à la frontière", () => {
    const notes = [17.5, 17.5, 13, 9, 4, 14.5, 12];
    for (const b of [bilanCarte(taxi(2), notes), bilanDetail(taxi(2), notes)]) {
      expect(b.moyenne).toBe(13.4);
      expect(b.eliminatoires).toEqual([]);
      expect(b.verdict).toBe("reussi");
    }
  });
});

describe("Pogos SARKISIAN — échecs et attentes légitimes conservés", () => {
  it("TAXI EB1 7,5/20 : reste ÉCHOUÉ avec C seule éliminatoire", () => {
    const b = bilanCarte(taxi(1), [8.5, 6, 5, 7, 7, 9, 9]);
    expect(b.moyenne).toBe(7.5);
    expect(b.eliminatoires).toEqual(["C"]);
    expect(b.admisGlobal).toBe(false);
    expect(b.verdict).toBe("echoue");
  });

  it("TAXI EB2 avec six QRC F/G en attente : reste EN ATTENTE", () => {
    const e = taxi(2);
    const rows = [13, 10, 11, 4, 4, 7, 10].map((n, i) => ({
      matiereId: e.matieres[i].id,
      ...coreRow(i >= 5 ? null : n, i >= 5),
    }));
    expect(isExamAttemptPublicationPending(rows, e)).toBe(true);
    // La carte affiche « En attente » AVANT tout verdict ; la note serveur en attente n'est jamais lue.
    expect(rows.filter((r) => r.__core.pending).map((r) => r.matiereId)).toEqual([e.matieres[5].id, e.matieres[6].id]);
    // Une fois F/G corrigées (7 et 10), plus d'attente et le verdict est calculable.
    const corriges = rows.map((r, i) => ({ ...r, ...coreRow([13, 10, 11, 4, 4, 7, 10][i]) }));
    expect(isExamAttemptPublicationPending(corriges, e)).toBe(false);
  });
});

describe("Frontières 6/4", () => {
  it("6 admis, 5,9 éliminatoire ; anglais 4 admis, 3,9 éliminatoire", () => {
    const e = taxi(1);
    const s = (i: number, n: number) => computeMatiereScoreForAttempt(e.matieres[i], coreRow(n) as any)!.admis;
    expect(s(0, 6)).toBe(true);
    expect(s(0, 5.9)).toBe(false);
    expect(s(4, 4)).toBe(true);
    expect(s(4, 3.9)).toBe(false);
  });
});

describe("États indéterminés conservés", () => {
  const sansSeuil = (e: ExamenBlanc): ExamenBlanc => ({
    ...e,
    matieres: e.matieres.map((m, i) => (i === 2 ? ({ ...m, noteEliminatoire: undefined } as any) : m)),
  });

  it("seuil introuvable partout et statut absent : « indetermine », jamais échoué ni réussi", () => {
    const b = bilanCarte(sansSeuil(taxi(1)), [14.5, 15, 12, 15, 6, 16.5, 19]);
    expect(b.eliminatoires).toEqual([]);
    expect(b.seuilsInconnus).toEqual(["C"]);
    expect(b.admisGlobal).toBe(false);
    expect(b.verdict).toBe("indetermine");
  });

  it("seuil figé du passage prioritaire sur la configuration", () => {
    const m = taxi(1).matieres[0];
    const r = computeMatiereScoreForAttempt(m, coreRow(7, false, { noteEliminatoire: 8 }) as any)!;
    expect(r.admis).toBe(false);
  });

  it("statut enregistré explicite utilisé seulement si aucun seuil", () => {
    const m = { ...taxi(1).matieres[0], noteEliminatoire: undefined } as any;
    expect(computeMatiereScoreForAttempt(m, { ...coreRow(3), reussi: true } as any)!.admis).toBe(true);
    expect(computeMatiereScoreForAttempt(m, { ...coreRow(18), reussi: false } as any)!.admis).toBe(false);
  });

  it("matière manquante sans échec prouvé : « incomplet » (pas échoué)", () => {
    const b = bilanCarte(taxi(1), [14.5, 15, 12, 15, 6, 16.5]);
    expect(b.verdict).toBe("incomplet");
    expect(b.admisGlobal).toBe(false);
  });

  it("matière manquante mais éliminatoire prouvée : échoué", () => {
    const b = bilanCarte(taxi(1), [14.5, 15, 5]);
    expect(b.verdict).toBe("echoue");
    expect(b.eliminatoires).toEqual(["C"]);
  });

  it("moyenne < 10 complète : échoué même sans éliminatoire", () => {
    const b = bilanCarte(taxi(1), [9, 9, 9, 9, 9, 9, 9]);
    expect(b.eliminatoires).toEqual([]);
    expect(b.verdict).toBe("echoue");
  });
});

describe("VTC/TAXI/TA/VA EB1–EB6 : notes hautes jamais éliminatoires, notes basses toujours", () => {
  const familles: Array<[string, ExamenBlanc[]]> = [
    ["VTC", EXAMENS_BLANCS_VTC],
    ["TAXI", EXAMENS_BLANCS_TAXI],
    ["TA", EXAMENS_BLANCS_TA],
    ["VA", EXAMENS_BLANCS_VA],
  ];
  for (const [nom, liste] of familles) {
    it(`${nom} : ${liste.length} examens`, () => {
      expect(liste.length).toBeGreaterThan(0);
      for (const e of liste) {
        const n = e.matieres.length;
        expect(n).toBeGreaterThan(0);
        for (const m of e.matieres) {
          expect(typeof m.noteEliminatoire).toBe("number");
        }
        const haut = bilanCarte(e, Array(n).fill(14));
        expect(haut.eliminatoires, `${nom} ${e.id}`).toEqual([]);
        expect(haut.verdict, `${nom} ${e.id}`).toBe("reussi");
        const bas = bilanCarte(e, Array(n).fill(2));
        expect(bas.verdict, `${nom} ${e.id}`).toBe("echoue");
        expect(bas.eliminatoires.length, `${nom} ${e.id}`).toBe(n);
      }
    });
  }
});

describe("Rechargement : même calcul à chaque relecture", () => {
  it("dix relectures identiques (aucun état caché)", () => {
    const notes = [14.5, 15, 12, 15, 6, 16.5, 19];
    const first = JSON.stringify(bilanCarte(taxi(1), notes));
    for (let i = 0; i < 10; i++) expect(JSON.stringify(bilanCarte(taxi(1), notes))).toBe(first);
  });
});

void LETTRES;
