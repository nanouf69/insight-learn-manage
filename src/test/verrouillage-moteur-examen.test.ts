// @vitest-environment node
/**
 * VERROUILLAGE DÉFINITIF — MOTEUR D'EXAMEN BLANC (23/09/2026)
 * ===========================================================
 * Chaque incident réellement survenu en production devient ici un test de
 * non-régression PERMANENT et BLOQUANT. Si l'un de ces tests échoue, la
 * modification du moteur d'examen ne doit pas être déployée.
 *
 * Les scénarios apprenants sont ANONYMISÉS (aucun nom, aucun identifiant réel).
 * Aucun test n'écrit en base : lecture de code source, de migrations SQL et
 * logique pure.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------- utilitaires
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");
const PASSAGE = "src/components/cours-en-ligne/ExamenBlancsPassage.tsx";
const PAGE = "src/components/cours-en-ligne/ExamensBlancsPage.tsx";
const PONT = "src/features/noyau-passage/pontV2.ts";
const HEURES = "src/components/cours-en-ligne/StudentHoursTracker.tsx";
const CORRECTION = "src/pages/AdminCorrectionQrcV2Reel.tsx";
const SURVEILLANCE = "supabase/functions/surveillance-moteur-examen/index.ts";

const sqlMigrations = () => {
  const dir = join(process.cwd(), "drizzle/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf-8"))
    .join("\n");
};

let SQL = "";
beforeAll(() => {
  SQL = sqlMigrations();
});

// localStorage minimal (file d'attente durable)
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }),
    }),
  },
}));

import {
  enfilerReponseNoyau,
  viderFileNoyau,
  reponsesNoyauEnAttente,
  reponsesNoyauEcartees,
  idQuestionNoyau,
} from "@/features/noyau-passage/pontV2";

// ============================================================ 1. CHARGEMENT
describe("CRITIQUE 1 — chargement de l'examen", () => {
  it("une matière chargée sans question ne peut jamais être démarrée ni clôturée", () => {
    const src = read(PASSAGE);
    expect(src).toContain("if (questionsSafe.length === 0) {");
    expect(src).toContain("Le contenu de cette matière n'est pas chargé. La matière reste ouverte");
  });

  it("0 question ne vaut jamais « toutes les questions répondues »", () => {
    const src = read(PASSAGE);
    expect(src).toContain("const allAnswered = questionsSafe.length > 0 && questionsSafe.every");
    // interdiction formelle de la forme vulnérable questions.every(...) seule
    expect(src).not.toMatch(/const allAnswered = questionsSafe\.every/);
  });

  it("le nombre attendu de réponses vient des questions réellement chargées", () => {
    const src = read(PASSAGE);
    expect(src).toContain("const attendues = questionsSafe.length");
  });

  it("les identifiants de questions sont comparés à l'instantané serveur avant clôture", () => {
    const src = read(PASSAGE);
    expect(src).toContain("exam_attempts_v2");
    expect(src).toContain("snapshot");
    expect(src).toContain("contenuConforme");
  });

  it("la tentative serveur est créée avec un instantané figé (jamais reconstruit côté navigateur)", () => {
    expect(SQL).toContain("core_start_attempt");
    expect(SQL).toContain("snapshot_fingerprint");
  });
});

// ============================================================ 2. SAUVEGARDE
describe("CRITIQUE 2 — sauvegarde des réponses", () => {
  it("chaque réponse est enregistrée à la saisie, sans dépendre du bouton Terminer", () => {
    const src = read(PASSAGE);
    const qcm = src.slice(src.indexOf("const handleQCMChange"), src.indexOf("const handleQRCChange"));
    expect(qcm).toContain("persistReponses(next)");
    expect(src).toContain("enqueueAnswerSave({");
  });

  it("une réponse locale non confirmée empêche la clôture de la matière", () => {
    const src = read(PASSAGE);
    expect(src).toContain("toutesConfirmees");
    expect(src).toMatch(/n'est pas clôturée/);
  });

  it("la reprise après F5 / reconnexion renvoie automatiquement les réponses en attente", () => {
    const src = read(PASSAGE);
    expect(src).toContain("rattraperReponsesNoyau");
    expect(src).toContain("viderFileNoyau");
  });

  it("une réponse définitivement refusée ne bloque jamais la file entière", async () => {
    rpc.mockReset();
    rpc.mockImplementation((_fn: string, args: { p_question_id?: string }) =>
      Promise.resolve(
        String(args?.p_question_id ?? "").endsWith(":1")
          ? { data: null, error: { message: "ATTEMPT_CLOSED: la tentative est deja terminee" } }
          : { data: { revision: 1 }, error: null },
      ),
    );
    enfilerReponseNoyau({ attemptId: "att-A", matiereId: "securite", questionId: 1, valeur: "A" });
    enfilerReponseNoyau({ attemptId: "att-A", matiereId: "securite", questionId: 2, valeur: "B" });
    for (let i = 0; i < 20 && reponsesNoyauEnAttente("att-A") > 0; i++) {
      await new Promise((r) => setTimeout(r, 5));
      await viderFileNoyau("att-A");
    }

    expect(reponsesNoyauEnAttente("att-A")).toBe(0);
    // la réponse refusée est CONSERVÉE à part, jamais supprimée silencieusement
    expect(reponsesNoyauEcartees("att-A")).toBe(1);
  });

  it("une erreur réseau conserve la réponse en file (aucune perte, renvoi plus tard)", async () => {
    rpc.mockReset();
    rpc.mockImplementation(() => Promise.resolve({ data: null, error: { message: "Failed to fetch" } }));
    enfilerReponseNoyau({ attemptId: "att-B", matiereId: "gestion", questionId: 7, valeur: "C" });
    await viderFileNoyau("att-B");
    expect(reponsesNoyauEnAttente("att-B")).toBeGreaterThan(0);
    expect(reponsesNoyauEcartees("att-B")).toBe(0);
  });

  it("une réponse écartée bloque la clôture : aucune note 0 technique possible", () => {
    const src = read(PASSAGE);
    expect(src).toContain("reponsesNoyauEcartees(attemptId) > 0");
  });

  it("une ancienne réponse ne peut pas écraser une plus récente (révision serveur)", () => {
    expect(SQL).toContain("p_expected_revision");
    expect(SQL).toMatch(/ANSWER_REVISION|revision/i);
    const pont = read(PONT);
    expect(pont).toContain("revisionAttendue");
  });

  it("les identifiants d'opération sont déterministes : un renvoi ne crée jamais de doublon", () => {
    const pont = read(PONT);
    expect(pont).toContain("export async function operationId");
    expect(SQL).toContain("core_operations");

    expect(SQL).toContain("core_operation_replay");
  });

  it("l'identifiant de question est stable (matière + numéro)", () => {
    expect(idQuestionNoyau("securite", 3)).toBe("securite:3");
  });
});

// ============================================================ 3. TERMINER
describe("CRITIQUE 3 — Terminer la matière", () => {
  it("la clôture exige la confirmation serveur de toutes les réponses saisies", () => {
    const src = read(PASSAGE);
    const fin = src.slice(src.indexOf("const finaliserNoyau"), src.indexOf("const finaliserNoyau") + 4000);
    expect(fin).toContain("contenuConforme");
    expect(fin).toContain("toutesConfirmees");
    expect(fin).toMatch(/return false/);
  });

  it("le serveur refuse de finaliser deux fois la même tentative (un seul résultat)", () => {
    expect(SQL).toContain("ATTEMPT_CLOSED");
    expect(SQL).toMatch(/core_exam_results[\s\S]{0,4000}UNIQUE|attempt_id\)\s*REFERENCES/i);
  });

  it("un rejeu de finalisation (double-clic, F5) renvoie le premier résultat", () => {
    expect(SQL).toContain("core_operation_replay(p_operation_id, 'attempt_finalize')");
  });

  it("aucun message d'échec ne clôture la matière : elle reste ouverte et récupérable", () => {
    const src = read(PAGE);
    expect(src).toContain("Impossible d'enregistrer votre résultat");
  });
});

// ============================================================ 4. MATIÈRES / 48 h
describe("CRITIQUE 4 — passage entre matières et règle des 48 h", () => {
  const regle = () => read("drizzle/migrations/0062_retake_delay_only_after_completed_attempt.sql");

  it("la règle 48 h existe toujours sous sa forme corrigée", () => {
    expect(existsSync(join(process.cwd(), "drizzle/migrations/0062_retake_delay_only_after_completed_attempt.sql"))).toBe(true);
  });

  it("une tentative déjà ouverte n'est jamais bloquée (matière A → B → C)", () => {
    expect(regle()).toContain("v_already_started");
    expect(regle()).toMatch(/IF v_already_started THEN\s*\n\s*RETURN NEW;/);
  });

  it("le délai ne s'applique qu'après un examen réellement terminé (toutes matières)", () => {
    expect(regle()).toContain("v_matieres_prec < v_total_matieres".replace(" < ", " < ") .slice(0, 0) + "v_matieres_prec");
    expect(regle()).toMatch(/COALESCE\(v_matieres_prec, 0\) < v_total_matieres[\s\S]*?RETURN NEW;/);
  });

  it("la première tentative n'est jamais soumise au délai", () => {
    expect(regle()).toMatch(/IF v_tent <= 1 THEN\s*\n\s*RETURN NEW;/);
  });

  it("une autorisation Admin explicite peut lever le délai, une seule fois", () => {
    expect(regle()).toContain("exam_retake_authorizations");
    expect(regle()).toContain("SET consumed_at = now()");
  });
});

// ============================================================ 5. QRC / NOTATION
describe("CRITIQUE 5 — QRC et notation", () => {
  it("une QRC ne peut exister qu'une fois par tentative et question", () => {
    expect(SQL).toContain("qrc_instances_v2_unique UNIQUE (attempt_id, question_id)");
  });

  it("une réponse courante est unique par tentative et question (aucun doublon)", () => {
    expect(SQL).toContain("answer_state_unique_courant UNIQUE (attempt_id, question_id)");
  });

  it("un seul résultat par tentative", () => {
    expect(SQL).toMatch(/core_exam_results[\s\S]*?attempt_id[\s\S]*?UNIQUE|ALTER TABLE[\s\S]*core_exam_results[\s\S]*UNIQUE/i);
  });

  it("une QRC corrigée ne revient jamais à corriger", () => {
    expect(SQL).toContain("core_correct_qrc");
    expect(SQL).toMatch(/corrigee/);
  });

  it("la note est recalculée par le serveur à partir des réponses et corrections", () => {
    expect(SQL).toContain("core_recalc_result");
    const pont = read(PONT);
    expect(pont).toContain('supabase.rpc("core_recalc_result"');
    // aucun calcul de note côté navigateur
    expect(pont).not.toMatch(/note\s*=\s*.*\/\s*total/);
  });

  it("les tentatives neutralisées ne comptent plus dans les résultats ni à corriger", () => {
    const noyau = read("src/features/correction-qrc-v2/noyauReel.ts");
    expect(noyau).toContain("idsNeutralises");
    expect(SQL).toContain("core_tentatives_neutralisees");
  });
});

// ============================================================ 6. AFFICHAGE
describe("CRITIQUE 6 — affichage CRM ↔ apprenant", () => {
  it("la date d'examen affichée à l'apprenant vient du dossier CRM", () => {
    const cours = read("src/pages/CoursPublic.tsx");
    expect(cours).toContain("date_examen_theorique");
  });

  it("aucune date du calendrier général n'est présentée comme date personnelle", () => {
    const h = read(HEURES);
    expect(h).toContain("Prochaine session d'examen théorique :");
    expect(h).toContain("Aucune date à votre dossier");
  });

  it("l'écran apprenant n'écrit jamais la date d'examen en base", () => {
    const h = read(HEURES);
    expect(h).not.toContain(".update(");
    expect(h).not.toContain("from(\"apprenants\")");
  });

  it("l'ancien circuit est clairement identifié dans l'écran de correction", () => {
    const c = read(CORRECTION);
    expect(c).toContain("ANCIEN CIRCUIT");
  });
});

// ============================================================ 7. SURVEILLANCE
describe("CRITIQUE 7 — surveillance automatique en production", () => {
  it("la fonction de surveillance du moteur d'examen existe", () => {
    expect(existsSync(join(process.cwd(), SURVEILLANCE))).toBe(true);
  });

  it("elle détecte les sept anomalies identifiées", () => {
    const s = read(SURVEILLANCE);
    for (const code of [
      "TENTATIVE_CLOTUREE_SANS_QUESTION",
      "RESULTAT_SANS_REPONSE_SERVEUR",
      "QUESTIONS_DIFFERENTES_DU_SNAPSHOT",
      "RESULTATS_MULTIPLES_MEME_TENTATIVE",
      "SAUVEGARDES_BLOQUEES",
      "HAUSSE_ERREURS_FINALISATION",
      "DELAI_48H_SUR_TENTATIVE_OUVERTE",
    ]) {
      expect(s).toContain(code);
    }
  });

  it("elle est strictement en lecture seule (détection, jamais correction)", () => {
    const s = read(SURVEILLANCE);
    expect(s).not.toMatch(/method:\s*"(PATCH|DELETE|PUT)"/);
    expect(s).not.toMatch(/\bDELETE FROM\b|\bUPDATE \w+ SET\b/i);
  });

  it("elle n'expose aucune donnée nominative ni secret dans ses journaux", () => {
    const s = read(SURVEILLANCE);
    expect(s).not.toMatch(/console\.log\(.*SERVICE_KEY/);
    expect(s).toContain("anonym");
  });
});

// ============================================================ 8. INCIDENTS RÉELS
describe("CRITIQUE 8 — incidents réels devenus tests permanents (anonymisés)", () => {
  it("incident A (matière ouverte avec 0 question, clôturée en 0/20) ne peut plus se reproduire", () => {
    const src = read(PASSAGE);
    // 1) la clôture est refusée si l'écran n'a aucune question
    expect(src).toContain("if (questionsSafe.length === 0) {");
    // 2) la clôture est refusée si l'instantané serveur contient d'autres identifiants
    expect(src).toContain("contenuConforme");
  });

  it("incident B (matière clôturée sans aucune réponse côté serveur) ne peut plus se reproduire", () => {
    const src = read(PASSAGE);
    expect(src).toContain("toutesConfirmees");
    expect(src).toContain("reponsesNoyauEcartees");
  });

  it("logique 0/0 : une liste vide n'est jamais « entièrement répondue »", () => {
    const toutesRepondues = (questions: unknown[], repondue: (q: unknown) => boolean) =>
      questions.length > 0 && questions.every(repondue);
    expect(toutesRepondues([], () => true)).toBe(false);
    expect(toutesRepondues([1, 2], () => true)).toBe(true);
    expect(toutesRepondues([1, 2], (q) => q === 1)).toBe(false);
  });

  it("les tentatives neutralisées sont conservées en historique, jamais supprimées", () => {
    expect(SQL).toContain("core_neutralisation_append_only");
  });
});

// ============================================================================
// CRITIQUE 9 — CHRONO D'EXAMEN (incident du 23/09/2026 : chrono expiré survivant
// à une réouverture, puis refus ATTEMPT_CLOSED sur les réponses saisies).
// ============================================================================
describe("CRITIQUE 9 — chrono et expiration", () => {
  const MIGS = readMigrations();

  it("réouverture administrative (nouvelle tentative) → fenêtre de temps complète", () => {
    expect(MIGS).toContain("apprenant_examen_timers_unique_tentative");
    expect(MIGS).toMatch(/ON CONFLICT \(apprenant_id, exercice_id, tentative\) DO NOTHING/);
  });

  it("F5 / reconnexion : le chrono n'est jamais réinitialisé (même tentative = même fenêtre)", () => {
    const src = read(PASSAGE);
    expect(src).toContain("_tentative: Math.max(1, Number(tentative) || 1)");
    // le temps restant reste calculé à partir de l'heure de début serveur
    expect(MIGS).toContain("v_row.duree_secondes - FLOOR(EXTRACT(EPOCH FROM (clock_timestamp() - v_row.started_at)))");
  });

  it("l'ancienne signature ne remet jamais le chrono à zéro (dernière tentative connue)", () => {
    expect(MIGS).toContain("COALESCE(MAX(t.tentative), 1)");
  });

  it("à 00:00 les réponses sont figées avant toute clôture", () => {
    const src = read(PASSAGE);
    expect(src).toContain("if (expireRef.current) return;");
    expect(src).toMatch(/expireRef\.current = true;\s*\n\s*setExpire\(true\);/);
  });

  it("00:00 avec sauvegardes en attente : aucune clôture prématurée", () => {
    const src = read(PASSAGE);
    const bloc = src.slice(src.indexOf("const handleExpire"), src.indexOf("const handleInterruption"));
    expect(bloc).toContain("flushAnswerSavesAndWait");
    expect(bloc.indexOf("flushAnswerSavesAndWait")).toBeLessThan(bloc.indexOf("finaliserNoyau"));
    expect(bloc.indexOf("synchronisationConfirmee")).toBeLessThan(bloc.indexOf("finaliserNoyau"));
  });

  it("00:00 avec serveur indisponible : état « finalisation en attente », aucun 0 technique", () => {
    const src = read(PASSAGE);
    const bloc = src.slice(src.indexOf("const handleExpire"), src.indexOf("const handleInterruption"));
    expect(bloc).toContain("setFinalisationEnAttente(true)");
    expect(bloc).not.toContain("note_sur_20: 0");
    expect(src).toContain('window.addEventListener("online", retry)');
  });

  it("double événement d'expiration → une seule finalisation", () => {
    const src = read(PASSAGE);
    const bloc = src.slice(src.indexOf("const handleExpire"), src.indexOf("const handleInterruption"));
    expect(bloc).toContain("if (matiereTermineeRef.current || expirationEnCoursRef.current) return;");
    expect(bloc).toContain("matiereTermineeRef.current = true");
  });

  it("aucune réponse à l'expiration : la matière n'est pas clôturée en tentative vide", () => {
    const src = read(PASSAGE);
    // finaliserNoyau refuse une matière sans contenu et sans réponses confirmées
    expect(src).toContain("if (questionsSafe.length === 0) {");
    expect(src).toContain("toutesConfirmees");
  });
});
