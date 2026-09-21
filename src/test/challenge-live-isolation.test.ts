import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const lib = readFileSync("src/lib/liveChallenge.ts", "utf8");
const hook = readFileSync("src/hooks/useLiveChallengeState.ts", "utf8");
const formateur = readFileSync("src/pages/ChallengeLive.tsx", "utf8");
const apprenant = readFileSync("src/pages/ChallengePublic.tsx", "utf8");
const migration = readFileSync("drizzle/migrations/0040_live_challenge_engine.sql", "utf8");

const FORBIDDEN = [
  "apprenant_quiz_results",
  "reponses_apprenants",
  "qrc_instances",
  "module_editor_state",
  "apprenant_module_completion",
  "qrc_engine_flags",
];

describe("Challenge en direct — isolation stricte", () => {
  it("n'utilise aucune table des examens blancs / e-learning", () => {
    for (const source of [lib, hook, formateur, apprenant]) {
      for (const table of FORBIDDEN) {
        expect(source).not.toContain(table);
      }
    }
  });

  it("n'utilise que les tables live_*", () => {
    const tables = [...lib.matchAll(/from\("([a-z_]+)"\)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) expect(t.startsWith("live_")).toBe(true);
  });

  it("garantit 1 réponse = 1 identifiant unique en base", () => {
    expect(migration).toContain("UNIQUE (live_session_id, participant_id, question_id)");
    expect(migration).toContain("UNIQUE (live_session_id, device_token)");
    expect(migration).toContain("ON CONFLICT (live_session_id, participant_id, question_id) DO NOTHING");
  });

  it("fige un snapshot des questions au lancement", () => {
    expect(migration).toContain("questions_snapshot");
    expect(lib).toContain("questions_snapshot: params.questions");
  });

  it("utilise le temps réel avec rattrapage serveur et nettoyage du canal", () => {
    expect(hook).toContain("postgres_changes");
    expect(hook).toContain("supabase.removeChannel");
    expect(hook).toContain('window.addEventListener("online"');
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.live_responses");
  });

  it("corrige une QRC par identifiant de réponse, jamais par texte ou date", () => {
    expect(lib).toContain("live_correct_response");
    expect(lib).toContain("_response_id: responseId");
  });
});
