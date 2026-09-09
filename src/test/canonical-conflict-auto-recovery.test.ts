import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  rebaseCanonicalActions,
  toRpcCanonicalActions,
  isStaleCanonicalQuestionError,
  type CanonicalActionLike,
  type CanonicalRowLike,
} from "@/components/cours-en-ligne/canonical-conflict-rebase";

const row = (over: Partial<CanonicalRowLike> = {}): CanonicalRowLike => ({
  quiz_id: "reglementation-nationale",
  section_id: 71,
  legacy_question_id: 15,
  active: true,
  updated_at: "2026-09-09T10:00:00.000Z",
  ...over,
});

const upsert = (over: Partial<CanonicalActionLike> = {}): CanonicalActionLike => ({
  action: "upsert",
  quiz_id: "reglementation-nationale",
  section_id: 71,
  legacy_question_id: 15,
  expected_updated_at: "2026-09-09T09:00:00.000Z",
  local_edited_at: "2026-09-09T10:05:00.000Z",
  enonce: "Q15 modifiée",
  choix: [{ lettre: "A" }, { lettre: "B" }, { lettre: "C" }],
  ...over,
});

describe("détection du conflit P0409", () => {
  it("reconnaît le code et les messages serveur", () => {
    expect(isStaleCanonicalQuestionError({ code: "P0409" })).toBe(true);
    expect(isStaleCanonicalQuestionError({ message: "stale_canonical_question_write" })).toBe(true);
    expect(isStaleCanonicalQuestionError({ message: "canonical_question_deleted" })).toBe(true);
    expect(isStaleCanonicalQuestionError({ code: "22023" })).toBe(false);
  });
});

describe("rebase automatique après P0409", () => {
  it("rejoue la modification que l'utilisateur vient de faire avec la version fraîche", () => {
    const out = rebaseCanonicalActions([upsert()], [row({ updated_at: "2026-09-09T10:00:00.000Z" })]);
    expect(out).toHaveLength(1);
    expect(out[0].expected_updated_at).toBe("2026-09-09T10:00:00.000Z");
    expect(out[0].enonce).toBe("Q15 modifiée");
  });

  it("abandonne une copie locale obsolète au lieu de réécrire la base", () => {
    const stale = upsert({ local_edited_at: "2026-09-09T08:00:00.000Z", enonce: "vieille version" });
    const out = rebaseCanonicalActions([stale], [row({ updated_at: "2026-09-09T10:00:00.000Z" })]);
    expect(out).toHaveLength(0);
  });

  it("ne réactive jamais une question supprimée en base", () => {
    const out = rebaseCanonicalActions([upsert()], [row({ active: false })]);
    expect(out).toHaveLength(0);
  });

  it("ne réintroduit pas une réponse supprimée via une copie sans horodatage local", () => {
    const withD = upsert({
      local_edited_at: null,
      choix: [{ lettre: "A" }, { lettre: "B" }, { lettre: "C" }, { lettre: "D" }],
    });
    const out = rebaseCanonicalActions([withD], [row()]);
    expect(out).toHaveLength(0);
  });

  it("abandonne une suppression déjà appliquée et rejoue celle qui reste à faire", () => {
    const actions: CanonicalActionLike[] = [
      { action: "deactivate", quiz_id: "q", section_id: 1, legacy_question_id: 10, expected_updated_at: "2026-09-09T09:00:00.000Z" },
      { action: "deactivate", quiz_id: "q", section_id: 1, legacy_question_id: 11, expected_updated_at: "2026-09-09T09:00:00.000Z" },
    ];
    const out = rebaseCanonicalActions(actions, [
      row({ quiz_id: "q", section_id: 1, legacy_question_id: 10, active: false }),
      row({ quiz_id: "q", section_id: 1, legacy_question_id: 11, active: true, updated_at: "2026-09-09T10:00:00.000Z" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].legacy_question_id).toBe(11);
    expect(out[0].expected_updated_at).toBe("2026-09-09T10:00:00.000Z");
  });

  it("insère une question réellement nouvelle sans verrou de version", () => {
    const out = rebaseCanonicalActions([upsert({ legacy_question_id: 999 })], [row()]);
    expect(out).toHaveLength(1);
    expect(out[0].expected_updated_at).toBeNull();
  });

  it("n'envoie pas le champ interne local_edited_at au serveur", () => {
    const [payload] = toRpcCanonicalActions([upsert()]);
    expect(payload).not.toHaveProperty("local_edited_at");
    expect(payload).toHaveProperty("expected_updated_at");
  });
});

describe("branchement dans les éditeurs", () => {
  it("l'éditeur admin rebase et rejoue sans demander de rechargement", () => {
    const source = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    expect(source).toContain("rebaseCanonicalActions(appliedActions, freshRows)");
    expect(source).toContain("toRpcCanonicalActions(appliedActions)");
    expect(source).toContain("local_edited_at: question._editedAt ?? null");
  });

  it("le portail fournisseur relit puis rejoue l'action en cas de conflit", () => {
    const source = readFileSync("src/components/fournisseurs/EditableQuizViewer.tsx", "utf8");
    expect(source).toContain("isStaleCanonicalQuestionError");
    expect(source).toContain("await fetchCanonicalRows()");
    expect(source).toContain("return await send(freshRow.updated_at)");
  });
});
