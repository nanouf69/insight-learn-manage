// @vitest-environment node
//
// RÈGLE DE RÉFÉRENCE FIGÉE (ne pas assouplir sans accord explicite de l'utilisateur) :
//
//   NOTE /20 d'une matière = points QCM réellement obtenus dans la tentative
//                          + dernière note validée de chaque QRC de cette tentative,
//                            rapportés au barème total du SNAPSHOT de cette tentative.
//
//   Admin et apprenant lisent la MÊME ligne serveur (core_exam_results) :
//   il n'existe qu'un seul calcul, côté base, jamais un calcul côté navigateur.
//
// Ce test est un garde-fou de non-régression : s'il échoue, le déploiement est
// NON VALIDE (retour possible du bug où seuls les points QRC étaient comptés).
// Il est 100 % lecture seule : il n'écrit ni ne modifie aucune donnée.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const DOSSIER_MIGRATIONS = path.join(RACINE, "drizzle", "migrations");

function migrations(): { nom: string; sql: string }[] {
  return readdirSync(DOSSIER_MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((nom) => ({ nom, sql: readFileSync(path.join(DOSSIER_MIGRATIONS, nom), "utf8") }));
}

/** Dernière définition SQL d'une fonction (la migration la plus récente gagne). */
function derniereDefinition(nomFonction: string): string {
  let trouvee = "";
  for (const { sql } of migrations()) {
    const i = sql.toLowerCase().lastIndexOf(`function public.${nomFonction}(`);
    if (i >= 0) trouvee = sql.slice(i);
  }
  return trouvee;
}

function lire(relatif: string): string {
  return readFileSync(path.join(RACINE, relatif), "utf8");
}

describe("NOTE /20 = QCM + QRC sur le snapshot de la tentative (règle figée)", () => {
  it("core_note_attempt existe et calcule QCM + QRC à partir du snapshot uniquement", () => {
    const sql = derniereDefinition("core_note_attempt");
    expect(sql, "core_note_attempt doit exister").not.toBe("");

    // Le barème et les bonnes réponses viennent du snapshot de la tentative.
    expect(sql).toMatch(/att\.snapshot->'questions'/);
    // Points QCM comptés (et pas seulement les QRC).
    expect(sql).toMatch(/answer_state/);
    expect(sql).toMatch(/v_qcm\s*:=\s*v_qcm\s*\+/);
    // Points QRC issus des corrections actives.
    expect(sql).toMatch(/qrc_instances_v2/);
    // Conversion sur le barème total du snapshot.
    expect(sql).toMatch(/\(v_qcm \+ v_qrc\) \/ v_total \* 20/);
    // Jamais la version actuelle de l'examen pour noter une ancienne tentative.
    expect(sql).not.toMatch(/exam_content_versions|module_editor_state|canonical_questions/);
    // Lecture seule.
    expect(sql).toMatch(/\bSTABLE\b/);
    expect(sql).not.toMatch(/\b(UPDATE|DELETE|INSERT)\b\s+(public\.)?(answer_state|qrc_instances_v2|exam_attempts_v2)/i);
  });

  it("core_recalc_result délègue à core_note_attempt (source unique du calcul)", () => {
    const sql = derniereDefinition("core_recalc_result");
    expect(sql).toMatch(/core_note_attempt\(p_attempt_id\)/);
    expect(sql).toMatch(/core_exam_results/);
  });

  it("toute correction ET toute révision d'une QRC recalculent la matière", () => {
    for (const fonction of ["core_correct_qrc_publish", "core_revise_qrc_publish"]) {
      const sql = derniereDefinition(fonction);
      expect(sql, `${fonction} doit exister`).not.toBe("");
      expect(sql, `${fonction} doit appeler core_recalc_result`).toMatch(
        /public\.core_recalc_result\(/,
      );
    }
  });

  it("le recalcul ne touche ni la réponse de l'élève, ni la correction, ni le snapshot", () => {
    const sql = derniereDefinition("core_recalc_result");
    expect(sql).not.toMatch(/UPDATE\s+public\.answer_state/i);
    expect(sql).not.toMatch(/UPDATE\s+public\.exam_attempts_v2/i);
    expect(sql).not.toMatch(/UPDATE\s+public\.qrc_instances_v2/i);
  });

  it("Admin et apprenant lisent la même ligne serveur, aucun calcul dans le navigateur", () => {
    const noyau = lire("src/features/correction-qrc-v2/noyauReel.ts");
    const ecran = lire("src/pages/AdminCorrectionQrcV2Reel.tsx");

    // Une seule fonction de lecture du résultat, branchée sur core_exam_results.
    expect(noyau).toMatch(/export async function lireResultat/);
    expect(noyau).toMatch(/from\("core_exam_results"\)/);

    // L'écran Admin affiche la note venue du serveur : il ne la recalcule pas lui-même.
    expect(ecran).not.toMatch(/\/\s*total\s*\)\s*\*\s*20/);
    expect(ecran).not.toMatch(/localStorage\.setItem\([^)]*note/i);
  });
});
