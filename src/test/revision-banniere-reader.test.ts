import { expect, it } from "vitest";
import { lireBanniereRevision } from "@/lib/revisionBannierePreuve";
const expected = { "gestion:1": "original" };
const revision = { id: "draft", apprenant_id: "owner", exercice_type: "revision_fausses", exercice_id: "revision_fausses_EB1", completed: true, score: 0,
  reponses: { revisionState: { examenId: "EB1", questionOrder: ["gestion:1"], correctedQuestions: ["gestion:1"], answers: { "gestion:1": "QRC imparfaite" }, sourceResultIds: expected } } };
const result = { id: "result", apprenant_id: "owner", quiz_id: "EB1", quiz_type: "revision_fausses", score_obtenu: 0, score_max: 1,
  details: { revision_exercice_id: revision.exercice_id, questionOrder: ["gestion:1"], reponses: revision.reponses.revisionState.answers } };
function client(fail: boolean, reads: string[]) {
  return { from: (table: string) => {
    const q: any = { select: () => q, eq: () => q, like: () => q, order: () => q, range: async (start: number) => {
      reads.push(`${table}:${start}`);
      return { data: start === 0 ? Array.from({ length: 100 }, (_, i) => ({ id: `unrelated-${i}` })) : table === "apprenant_quiz_results" ? [result] : [revision], error: fail ? { message: "offline" } : null };
    } }; return q;
  } };
}
it("refresh et réouverture relisent les deux preuves, y compris après 100 lignes", async () => {
  const reads: string[] = [];
  expect(await lireBanniereRevision(client(false, reads), "owner", "EB1", expected)).toBe(true);
  expect(await lireBanniereRevision(client(false, reads), "owner", "EB1", expected)).toBe(true);
  expect(reads.filter(x => x.endsWith(":100"))).toHaveLength(4);
});
it("réseau coupé ne devient jamais un achèvement ni une liste vide réussie", async () => {
  await expect(lireBanniereRevision(client(true, []), "owner", "EB1", expected)).rejects.toThrow("non relu");
});