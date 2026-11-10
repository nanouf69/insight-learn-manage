import { describe, expect, it } from "vitest";
import { commentaireQrcPersistant } from "@/lib/commentaireQrcPersistant";
import { correctionOfficielleQrc } from "@/lib/correctionOfficielleQrc";

const q = { qrc_instance_id: "instance", attempt_id: "passage", question_id: "gestion:1", apprenant_id: "eleve", note: 1 };
const ancien = { ...q, correction_event_id: "ancien", note_nouvelle: 0, commentaire: "Ancien retour", created_at: "2026-11-09T13:00:00Z" };
const recent = { ...q, correction_event_id: "recent", note_nouvelle: 1, commentaire: "Précisez !!!\nAttention aux fautes !!!", created_at: "2026-11-10T13:00:00Z" };

describe("Retour pédagogique persisté pour le candidat", () => {
  it("relit le dernier commentaire exact, sans modifier la note partielle", () => {
    const commentaire = commentaireQrcPersistant([recent, ancien], q);
    expect(commentaire).toBe("Précisez !!!\nAttention aux fautes !!!");
    const correction = correctionOfficielleQrc({ qrcProofs: [{ questionId: q.question_id, note: q.note, etat: "corrigee", commentaire }] }, "gestion", 1, 2);
    expect(correction?.pointsObtenus).toBe(1);
    expect(correction?.explication).toContain("Précisez !!!\nAttention aux fautes !!!");
  });
  it.each(["apprenant_id", "attempt_id", "question_id", "qrc_instance_id"] as const)("refuse un autre %s", (champ) => {
    expect(commentaireQrcPersistant([{ ...recent, [champ]: "autre" }], q)).toBeNull();
  });
  it("ne reprend pas un ancien commentaire quand la note actuelle ne correspond pas", () => {
    expect(commentaireQrcPersistant([ancien], q)).toBeNull();
  });
  it("un commentaire vidé explicitement ne ressuscite pas l'ancien", () => {
    expect(commentaireQrcPersistant([ancien, { ...recent, commentaire: "" }], q)).toBe("");
  });
});