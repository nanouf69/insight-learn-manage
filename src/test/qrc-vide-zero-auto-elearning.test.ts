// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Règle du 25/09/2026 : FUTURS passages e-learning V2 — QRC du snapshot laissée
// vide à la finalisation serveur = 0, sans IA, « QRC laissée sans réponse ».
const dir = join(process.cwd(), "drizzle/migrations");
const file = readdirSync(dir).find((f) => f.includes("qrc_vide_zero_auto_elearning"))!;
const sql = readFileSync(join(dir, file), "utf8");
const pont = readFileSync(join(process.cwd(), "src/features/noyau-passage/pontV2.ts"), "utf8");
const passage = readFileSync(join(process.cwd(), "src/components/cours-en-ligne/ExamenBlancsPassage.tsx"), "utf8");

describe("QRC laissée sans réponse → 0 automatique (e-learning V2, futurs passages)", () => {
  it("1. matière terminée + QRC réellement vide → 0, mention, sans IA", () => {
    expect(sql).toMatch(/SET etat = 'corrigee', note = 0/);
    expect(sql).toContain("QRC laissée sans réponse");
    expect(sql).toContain("auto:qrc_sans_reponse");
    expect(sql).not.toMatch(/gemini|qrc-ia-correction|ia:/i);
    // la QRC doit faire partie du snapshot (sinon refus)
    expect(sql).toContain("core_snapshot_has_question(att.snapshot, qid)");
  });

  it("2. QRC remplie → jamais remplacée par 0", () => {
    expect(sql).toMatch(/IF v_elearning AND v_inst IS NOT NULL AND public\.core_reponse_qrc_vide\(v_valeur\)/);
    // une trace d'une réponse non vide dans l'historique empêche aussi le 0 (réponse perdue)
    expect(sql).toMatch(/FROM public\.answer_events e[\s\S]*NOT public\.core_reponse_qrc_vide\(e\.valeur_nouvelle\)/);
  });

  it("3. tentative non terminée → pas de 0 (seulement dans la finalisation, tentative en_cours)", () => {
    expect(sql).toMatch(/IF att\.etat <> 'en_cours' THEN\s+RAISE EXCEPTION 'ATTEMPT_CLOSED/);
    // le client ne finalise pas tant que des réponses ne sont pas confirmées côté serveur
    expect(passage).toMatch(/reponsesNoyauEnAttente\(attemptId\) > 0[\s\S]*return false/);
    // aucun rattrapage historique : pas d'UPDATE global hors de la boucle de finalisation
    expect(sql.match(/UPDATE public\.qrc_instances_v2/g)?.length).toBe(1);
    expect(sql).toMatch(/WHERE qrc_instance_id = v_inst AND etat = 'en_attente'/);
  });

  it("4. tentative neutralisée → pas de 0", () => {
    expect(sql).toMatch(/NOT EXISTS \(SELECT 1 FROM public\.core_tentatives_neutralisees n WHERE n\.attempt_id = p_attempt_id\)/);
  });

  it("5. double clic / F5 → une seule écriture (rejeu idempotent + instance créée maintenant seulement)", () => {
    expect(sql).toContain("core_operation_replay(p_operation_id, 'attempt_finalize')");
    expect(sql).toMatch(/ON CONFLICT \(attempt_id, question_id\) DO NOTHING\s+RETURNING qrc_instance_id INTO v_inst/);
    expect(pont).toMatch(/operationId\(`finalize:\$\{params\.attemptId\}`\)/);
  });

  it("6. aucune réponse existante supprimée ni modifiée", () => {
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
    expect(sql).not.toMatch(/UPDATE public\.answer_state/i);
    expect(sql).not.toMatch(/SET[^;]*reponse\s*=/i);
  });

  it("7. une QRC vide notée 0 ne maintient pas l'attente (état corrigée, journalisée)", () => {
    expect(sql).toMatch(/etat = 'corrigee'/);
    expect(sql).toContain("set_config('core.qrc_commentaire', 'QRC laissée sans réponse', true)");
    expect(sql).toContain("'qrc_sans_reponse_zero', nb_vides");
  });

  it("uniquement e-learning", () => {
    expect(sql).toMatch(/core_est_elearning\(a\.type_apprenant\)/);
  });
});
