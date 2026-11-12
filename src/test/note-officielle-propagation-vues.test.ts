/**
 * Révision d'une note QRC officielle (fictive) : la même source V2 alimente
 * la note matière affichée (Mes notes élève, fiche CRM, Correction/Résultats — fonction commune
 * noteExamenAffichee) et Notes par session (notesMatieresSession / noteGeneraleSession).
 * Jamais la note en cache de l'ancienne fiche ni une autre tentative.
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import { notesMatieresSession, noteGeneraleSession } from "@/features/correction-qrc-v2/notesSession";

const questions = [{ id: 1, type: "QRC", enonce: "Q", reponseQRC: "x" }];
for (const [exam, filiere] of [["EB4", "VTC"], ["EB4-TAXI", "TAXI"]] as const) {
  describe(`${exam} (${filiere})`, () => {
    const def = { id: exam, type: filiere, titre: exam, matieres: [{ id: "gestion", nom: "Gestion", duree: 30, coefficient: 1, noteEliminatoire: 6, noteSur: 20, questions }] } as any;
    // Fiche legacy : score en cache 18 (ancien) ; tentatives V2 : t1 ancienne (note 4) et t2 courante.
    const row = { id: "r2", quiz_type: "examen_blanc", quiz_id: exam, matiere_id: "gestion", matiere_nom: "Gestion", completed_at: "2026-11-11T10:00:30Z", score_obtenu: 18, score_max: 20, note_sur_20: 18, details: { reponses: { 1: "x" }, questions } };
    const core = (note20: number | null, pending: boolean, attemptId = "t2", finishedAt = "2026-11-11T10:00:00Z") =>
      ({ attemptId, resultId: "r2", historicalDetails: row.details, examId: exam, matiereId: "gestion", finishedAt, qrcProofs: [{ questionId: "gestion:1", etat: pending ? "en_attente" : "corrigee", note: pending ? null : note20, reponse: "x" }], qrcTotal: 1, qrcRestantes: pending ? 1 : 0, status: pending ? "attente" : "definitif", note20, pending, answers: { "gestion:1": "x" }, questions }) as any;
    const vues = (cores: any[]) => {
      const r = attacherSourceUnique(row, cores, new Set());
      return { matiere: noteExamenAffichee(r), session: notesMatieresSession(def, [r]).gestion, generale: noteGeneraleSession(def, [r]) };
    };
    it("avant correction : en attente partout, pas le 18 en cache", () => {
      const v = vues([core(null, true)]);
      expect(v.matiere.etat).toBe("en_attente");
      expect(v.session.etat).toBe("attente");
      expect(v.generale.etat).toBe("attente");
    });
    it("correction 12/20 puis révision 15/20 : toutes les vues suivent la dernière note officielle", () => {
      for (const n of [12, 15]) {
        const v = vues([core(n, false)]);
        expect(v.matiere).toMatchObject({ etat: "note", note20: n, source: "noyau" });
        expect(v.session).toEqual({ etat: "definitif", note: n });
        expect(v.generale).toMatchObject({ etat: "definitif", note: n });
      }
    });
  });
}
