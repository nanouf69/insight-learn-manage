import { describe, expect, it } from "vitest";
import { observerNotesGlobales, confirmerAlertesNotes, type DefinitionSurveillee } from "@/features/surveillance-examens/noteGlobale";

const apprenant = { id: "a", nom: "Candidat", prenom: "Fictif" };
const examen: DefinitionSurveillee = { id: "EB2", type: "VTC", matieres: Array.from({ length: 7 }, (_, i) => ({ id: `m${i}`, nom: `Matière ${i}`, coefficient: 1, noteEliminatoire: 6 })) };
const q = { id: 1, questionId: 1, type: "QRC", enonce: "Question figée", reponseQRC: "Réponse" };
const correction = { validatedByAdmin: true, manuel: true, pointsObtenus: 0, correctedAt: "2026-11-10T09:00:00Z" };
const rows = () => examen.matieres.map(m => ({ id: `r-${m.id}`, apprenant_id: "a", quiz_id: "EB2", quiz_type: "examen_blanc", matiere_id: m.id, tentative: 1,
  completed_at: "2026-11-10T08:00:00Z", score_obtenu: 12, score_max: 20, reussi: true,
  details: { questions: [q], reponses: { 1: "Réponse" }, qrc_pending_correction: true, correctionsIA: { 1: correction } } }));
const observe = (rs = rows(), states: any[] = []) => observerNotesGlobales({ apprenant, rows: rs, states, nonFiables: new Set(), examens: [examen] });
const core = (r: any, pending = false) => ({ attemptId: `v-${r.id}`, apprenantId: "a", examId: "EB2", matiereId: r.matiere_id,
  tentative: 1, finishedAt: r.completed_at, resultId: r.id, historicalDetails: r.details, questions: [q], qrcTotal: 1,
  qrcRestantes: pending ? 1 : 0, qrcProofs: [{ questionId: "1", reponse: "Réponse", etat: "corrigee", note: 0 }],
  status: pending ? "provisoire" : "definitif", pending, note20: 12 });

describe("alerte globale EB sur sept matières de la même tentative", () => {
  it("7 matières corrigées + note absente : confirmation à 5 secondes, une seule alerte", () => {
    const rs = rows(); rs[6].score_obtenu = NaN;
    const observations = observe(rs);
    expect(observations[0].prete).toBe(true);
    expect(observations[0].publiee).toBe(false);
    const first = confirmerAlertesNotes(new Map(), observations, 100);
    expect(first.alertes).toHaveLength(0);
    expect(first.aConfirmer).toBe(true);
    expect(confirmerAlertesNotes(first.prochaines, observations, 5099).alertes).toHaveLength(0);
    const second = confirmerAlertesNotes(first.prochaines, observations, 5100);
    expect(second.alertes).toHaveLength(1);
    expect(second.alertes[0].matieres).toHaveLength(7);
    expect(confirmerAlertesNotes(second.prochaines, observations, 9000).alertes).toHaveLength(1);
  });
  it("note présente : aucune alerte et résolution automatique de l’anomalie", () => {
    const rs = rows(); rs[6].score_obtenu = NaN;
    const first = confirmerAlertesNotes(new Map(), observe(rs), 0);
    expect(confirmerAlertesNotes(first.prochaines, observe(), 5000).alertes).toHaveLength(0);
    expect(confirmerAlertesNotes(first.prochaines, observe(), 5000).prochaines.size).toBe(0);
    expect(observe()[0].publiee).toBe(true);
  });
  it("QRC encore en attente, même si une ancienne note existe : pas d’alerte globale", () => {
    const rs = rows(); rs[0].details.correctionsIA = {} as any;
    expect(observe(rs)[0].prete).toBe(false);
    expect(confirmerAlertesNotes(new Map(), observe(rs), 10000).aConfirmer).toBe(false);
  });
  it("nouvelle tentative : ne complète pas six matières avec une ancienne copie", () => {
    const rs = rows(); rs[6].tentative = 2;
    const obs = observe(rs);
    expect(obs).toHaveLength(2);
    expect(obs.every(o => !o.prete)).toBe(true);
    expect(obs[0].cle).not.toBe(obs[1].cle);
  });
  it("copies mixtes : V2 définitif autoritaire et drapeau historique obsolète ignoré", () => {
    const rs = rows();
    expect(observe(rs, [core(rs[0])])[0]).toMatchObject({ prete: true, publiee: true });
    const stale = core(rs[0], true);
    const o = observe(rs, [stale])[0];
    expect(o.prete).toBe(true);
    expect(o.publiee).toBe(false);
    expect(o.cause).toContain("Compteur QRC serveur obsolète");
  });
  it("QRC V2 non corrigée ou manquante : ne prétend jamais 7 corrections validées", () => {
    const rs = rows(), s = core(rs[0], true);
    s.qrcProofs[0].etat = "en_attente";
    expect(observe(rs, [s])[0].prete).toBe(false);
    s.qrcProofs = [];
    expect(observe(rs, [s])[0].matieres[0].qrc).toBe("inconnues");
  });
  it("copie V2 terminée sans résultat d’affichage : anomalie détectable sans création de note", () => {
    const rs = rows(), s = core(rs[0], true);
    s.resultId = null as any;
    expect(observe(rs.slice(1), [s])[0]).toMatchObject({ prete: true, publiee: false });
  });
  it("identité non prouvée : pas de note empruntée à un autre passage", () => {
    const rs = rows(), s = core(rs[0]); s.resultId = "autre-copie";
    expect(observe(rs, [s])[0].prete).toBe(false);
    expect(observe(rs, [s])[0].matieres[0].cause).toContain("ambiguë");
  });
  it("lecture suivante avec état changé : nouveau délai, pas de fausse confirmation", () => {
    const rs = rows(); rs[0].score_obtenu = NaN;
    const first = confirmerAlertesNotes(new Map(), observe(rs), 0);
    rs[1].score_obtenu = NaN;
    expect(confirmerAlertesNotes(first.prochaines, observe(rs), 6000).alertes).toHaveLength(0);
  });
  it("7 notes disponibles mais verdict indéterminé : anomalie globale signalée", () => {
    const rs = rows(); rs.forEach(r => { r.reussi = null as any; r.details = { ...r.details, snapshot: { questions: [q] } } as any; });
    const definitions = [{ ...examen, matieres: examen.matieres.map(m => ({ ...m, noteEliminatoire: undefined })) }];
    const obs = observerNotesGlobales({ apprenant, rows: rs, states: [], nonFiables: new Set(), examens: definitions });
    expect(obs[0].prete).toBe(true);
    expect(obs[0].publiee).toBe(false);
    expect(obs[0].cause).toContain("Verdict global");
  });
  it("TAXI sept matières : même règle, sans modification des sources", () => {
    const rs = rows().map(r => ({ ...r, quiz_id: "EB2-TAXI" })); rs[0].score_obtenu = NaN;
    const original = structuredClone(rs);
    const obs = observerNotesGlobales({ apprenant, rows: rs, states: [], nonFiables: new Set(), examens: [{ ...examen, id: "EB2-TAXI", type: "TAXI" }] });
    expect(obs[0]).toMatchObject({ prete: true, publiee: false, filiere: "TAXI" });
    expect(rs).toEqual(original);
  });
});