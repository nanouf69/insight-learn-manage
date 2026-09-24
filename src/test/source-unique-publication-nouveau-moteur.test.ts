/** @vitest-environment node */
/**
 * NON-RÉGRESSION BLOQUANTE — SOURCE UNIQUE DE PUBLICATION.
 *
 * Règle : un passage existant dans le nouveau système (exam_attempts_v2)
 * impose son état serveur (QRC restantes, statut, note) à TOUS les écrans.
 * L'ancien moteur n'est qu'un repli quand aucun passage nouveau système
 * n'existe. La règle ne dépend jamais du numéro de l'examen.
 *
 * Inclut l'incident réel du 24/09/2026 (anonymisé « CANDIDAT-A », EB4) :
 * 16 QRC corrigées côté correction, carte élève restée « En attente ».
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isExamAttemptPublicationPending } from "@/components/cours-en-ligne/exam-helpers";
import {
  computeMatiereScoreForAttempt,
  computeResultatMatiereScore,
} from "@/components/cours-en-ligne/examens-blancs-scoring";
import { matchCoreState, coreStateScore, type CoreMatiereState } from "@/lib/coreExamPublication";

const FIN = "2026-09-23T17:52:10.367Z";
const LIGNE = "2026-09-23T17:52:11.032Z"; // ligne de résultat écrite ~1 s après la fin

const core = (over: Partial<CoreMatiereState> = {}): CoreMatiereState => ({
  attemptId: "att-1", examId: "EB4", matiereId: "t3p", finishedAt: FIN,
  qrcTotal: 5, qrcRestantes: 0, status: "definitif", note20: 7, pending: false, ...over,
});

const matiere = {
  id: "t3p", nom: "A - T3P", noteSur: 20, noteEliminatoire: 6, coefficient: 1,
  questions: [1, 2, 3, 4, 5].map((id) => ({ id, type: "QRC", enonce: `Q${id}` })),
} as any;
const examen = { matieres: [matiere] };

/** Ligne ANCIEN système telle que trouvée dans l'incident : drapeau en attente,
 *  corrections automatiques sans validation formateur. */
const ligneAncienne = (extra: Record<string, any> = {}) => ({
  matiere_id: "t3p", matiereId: "t3p", quiz_id: "EB4", completed_at: LIGNE,
  score_obtenu: 12, score_max: 20, note_sur_20: 12,
  details: {
    qrc_pending_correction: true,
    questions: matiere.questions.map((q: any) => ({ ...q, reponseEleve: "réponse" })),
    reponses: { 1: "r", 2: "r", 3: "r", 4: "r", 5: "r" },
    correctionsIA: Object.fromEntries([1, 2, 3, 4, 5].map((id) => [id, { estCorrect: true, pointsObtenus: 2, explication: "Correction déterministe" }])),
  },
  ...extra,
});

describe("Source unique : nouveau passage = nouveau moteur partout", () => {
  it("INCIDENT CANDIDAT-A (EB4) : toutes les QRC corrigées → résultat définitif, jamais « En attente »", () => {
    const rows = [ligneAncienne({ __core: core() })];
    expect(isExamAttemptPublicationPending(rows, examen)).toBe(false);
  });

  it("sans le passage nouveau système, la même ligne reste sur l'ancien circuit (repli)", () => {
    expect(isExamAttemptPublicationPending([ligneAncienne()], examen)).toBe(true);
  });

  it("1 QRC restante → reste en attente, même si l'ancien système semblait terminé", () => {
    const valide = ligneAncienne({ __core: core({ qrcRestantes: 1, pending: true, status: "provisoire" }) });
    valide.details.correctionsIA = Object.fromEntries([1, 2, 3, 4, 5].map((id) => [id, { validatedByAdmin: true }]));
    valide.details.qrc_pending_correction = false;
    expect(isExamAttemptPublicationPending([valide], examen)).toBe(true);
  });

  it("impossible : 0 QRC restante côté correction et « En attente » côté élève", () => {
    for (const examId of ["EB1", "EB4", "EB6-TAXI", "EB42-FUTUR"]) {
      const c = core({ examId });
      const row = ligneAncienne({ quiz_id: examId, __core: matchCoreState([c], examId, "t3p", LIGNE) });
      expect(row.__core).not.toBeNull();
      expect(isExamAttemptPublicationPending([row], examen)).toBe(false);
    }
  });

  it("nouvel EB futur : même règle, aucune configuration par numéro d'examen", () => {
    const c = core({ examId: "EB99" });
    expect(matchCoreState([c], "EB99", "t3p", LIGNE)?.attemptId).toBe("att-1");
    const src = fs.readFileSync(path.resolve(__dirname, "../lib/coreExamPublication.ts"), "utf8");
    expect(src).not.toMatch(/["'`]EB\d/);
    expect(src).not.toMatch(/qrc_engine_flags|isQrcEngineEnabled/);
  });

  it("correction / révision : l'état suit immédiatement le serveur (même entrée → même sortie)", () => {
    const avant = [ligneAncienne({ __core: core({ qrcRestantes: 1, pending: true }) })];
    const apres = [ligneAncienne({ __core: core({ qrcRestantes: 0, pending: false, note20: 8 }) })];
    const revise = [ligneAncienne({ __core: core({ qrcRestantes: 1, pending: true }) })];
    expect(isExamAttemptPublicationPending(avant, examen)).toBe(true);
    expect(isExamAttemptPublicationPending(apres, examen)).toBe(false);
    expect(isExamAttemptPublicationPending(revise, examen)).toBe(true);
  });

  it("F5 / reconnexion : état identique après sérialisation", () => {
    const rows = [ligneAncienne({ __core: core() })];
    const recharge = JSON.parse(JSON.stringify(rows));
    expect(isExamAttemptPublicationPending(recharge, examen)).toBe(isExamAttemptPublicationPending(rows, examen));
  });

  it("impossible : notes différentes entre Admin et élève pour le même passage définitif", () => {
    const c = core({ note20: 7 });
    const admin = computeMatiereScoreForAttempt(matiere, ligneAncienne({ __core: c }) as any);
    const eleveListe = computeMatiereScoreForAttempt(matiere, { ...ligneAncienne(), __core: c } as any);
    const eleveResultats = computeResultatMatiereScore(matiere, {
      reponses: {}, noteObtenue: 12, maxPoints: 20, correctionsIA: {}, __core: c,
    } as any);
    expect(admin?.noteSur20).toBe(7);
    expect(eleveListe?.noteSur20).toBe(7);
    expect(eleveResultats?.noteSur20).toBe(7);
  });

  it("une note provisoire du nouveau système n'est jamais publiée", () => {
    expect(coreStateScore(core({ pending: true }))).toBeNull();
  });

  it("rapprochement strict : autre matière, autre examen ou autre passage → aucun état emprunté", () => {
    const c = core();
    expect(matchCoreState([c], "EB4", "gestion", LIGNE)).toBeNull();
    expect(matchCoreState([c], "EB5", "t3p", LIGNE)).toBeNull();
    expect(matchCoreState([c], "EB4", "t3p", "2026-09-23T19:00:00Z")).toBeNull();
  });

  it("architecture : carte élève, résultats détaillés et fiche Admin lisent tous la même source", () => {
    const files = [
      "../components/cours-en-ligne/ExamenBlancsListe.tsx",
      "../components/cours-en-ligne/ExamenBlancsResultats.tsx",
      "../components/crm/apprenant-sections/ResultatsApprenantTab.tsx",
    ];
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(__dirname, f), "utf8");
      expect(src, f).toContain("fetchCoreMatiereStates");
      expect(src, f).toContain("matchCoreState");
      expect(src, f).toContain("useCoreChangeTick");
      expect(src, f).toContain("isExamAttemptPublicationPending");
    }
  });
});
