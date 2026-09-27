// @vitest-environment node
import { describe, it, expect } from "vitest";
import { attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import type { CoreMatiereState } from "@/lib/coreExamPublication";

const row = { id: "r1", quiz_type: "examen_blanc", quiz_id: "EB4", matiere_id: "securite", completed_at: "2026-09-26T10:00:30Z", score_obtenu: 18, score_max: 20, note_sur_20: 18, details: {} };
const core = (o: Partial<CoreMatiereState>): CoreMatiereState => ({
  attemptId: "a1", examId: "EB4", matiereId: "securite", finishedAt: "2026-09-26T10:00:00Z",
  qrcTotal: 0, qrcRestantes: 0, status: "definitif", note20: 11, pending: false, ...o,
});

describe("Fonction commune note/statut (Mes notes = écran admin)", () => {
  it("passage publié : la note serveur remplace la note de l'ancien système", () => {
    const n = noteExamenAffichee(attacherSourceUnique(row, [core({})], new Set()));
    expect(n).toMatchObject({ etat: "note", note20: 11, source: "noyau" });
  });
  it("passage non corrigé : En attente", () => {
    const n = noteExamenAffichee(attacherSourceUnique(row, [core({ pending: true, note20: null })], new Set()));
    expect(n.etat).toBe("en_attente");
  });
  it("sans passage nouveau moteur : affichage inchangé", () => {
    const n = noteExamenAffichee(attacherSourceUnique(row, [], new Set()));
    expect(n).toMatchObject({ etat: "note", note20: 18, source: "ancien", mention: null });
  });
  it("lecture impossible : Note en attente, jamais une note douteuse", () => {
    expect(noteExamenAffichee(attacherSourceUnique(row, null, new Set())).etat).toBe("lecture_impossible");
    expect(noteExamenAffichee(attacherSourceUnique(row, [core({})], null)).etat).toBe("lecture_impossible");
  });
  it("passage non fiable : note de l'ancien système avec la mention", () => {
    const n = noteExamenAffichee(attacherSourceUnique(row, [core({})], new Set(["a1"])));
    expect(n).toMatchObject({ etat: "note", note20: 18, source: "ancien", mention: "note recalculée depuis les réponses complètes" });
  });
  it("une ligne hors examen blanc n'est jamais touchée", () => {
    const quiz = { ...row, quiz_type: "quiz" };
    expect(attacherSourceUnique(quiz, null, null).__core).toBeNull();
  });
});
