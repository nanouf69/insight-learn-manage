// @vitest-environment node
import { describe, it, expect } from "vitest";
import { resolveOverrideConflict, buildAdminEditJournalMap } from "@/components/fournisseurs/quiz-editor-utils";

/**
 * Règle validée : la modification réellement la plus récente gagne, qu'elle
 * vienne de l'Admin ou du fournisseur/formateur. Jamais « Admin gagne toujours ».
 */
describe("Priorité Admin ↔ Fournisseur : la version la plus récente gagne", () => {
  it("Admin ancien → fournisseur récent : le fournisseur gagne", () => {
    expect(resolveOverrideConflict("2026-01-10T09:00:00Z", "2026-03-01T09:00:00Z")).toBe("fournisseur");
  });

  it("Fournisseur ancien → Admin récent : l'Admin gagne", () => {
    expect(resolveOverrideConflict("2026-03-01T09:00:00Z", "2026-01-10T09:00:00Z")).toBe("admin");
  });

  it("Admin sans date de modification mais écriture réelle en base plus récente : l'Admin gagne", () => {
    expect(resolveOverrideConflict(undefined, "2026-02-01T09:00:00Z", "2026-02-20T09:00:00Z")).toBe("admin");
  });

  it("Correction récente d'une formatrice face à un Admin réellement plus ancien : le fournisseur gagne", () => {
    expect(resolveOverrideConflict("2026-01-05T09:00:00Z", "2026-04-05T09:00:00Z", "2026-01-06T09:00:00Z")).toBe(
      "fournisseur",
    );
  });

  it("Aucune date exploitable des deux côtés : aucun écrasement automatique", () => {
    expect(resolveOverrideConflict(undefined, "", undefined)).toBe("admin"); // fournisseur sans date = ancien
    expect(resolveOverrideConflict(undefined, "pas-une-date", null)).toBe("admin");
    expect(resolveOverrideConflict(undefined, "2026-04-05T09:00:00Z", "pas-une-date")).toBe("conflit");
  });

  it("Version fournisseur sans horodatage exploitable : jamais prioritaire", () => {
    expect(resolveOverrideConflict("2026-04-05T09:00:00Z", "")).toBe("admin");
  });

  it("Journal des modifications : retient la date la plus récente par question", () => {
    const map = buildAdminEditJournalMap([
      { exercice_id: "exo1", question_id: "5", created_at: "2026-02-01T09:00:00Z" },
      { exercice_id: "exo1", question_id: "5", created_at: "2026-05-01T09:00:00Z" },
      { exercice_id: "exo1", question_id: "6", created_at: "2026-03-01T09:00:00Z" },
      { exercice_id: null, question_id: "7", created_at: "2026-03-01T09:00:00Z" },
    ]);
    expect(map.get("exo1-5")).toBe("2026-05-01T09:00:00Z");
    expect(map.get("exo1-6")).toBe("2026-03-01T09:00:00Z");
    expect(map.size).toBe(2);
  });

  it("Le contenu réellement le plus récent est toujours conservé (journal prioritaire sur l'absence de marqueur)", () => {
    const journal = buildAdminEditJournalMap([
      { exercice_id: "exo1", question_id: "5", created_at: "2026-06-10T09:00:00Z" },
    ]);
    const fallback = journal.get("exo1-5");
    expect(resolveOverrideConflict(undefined, "2026-06-01T09:00:00Z", fallback)).toBe("admin");
    expect(resolveOverrideConflict(undefined, "2026-06-20T09:00:00Z", fallback)).toBe("fournisseur");
  });
});
