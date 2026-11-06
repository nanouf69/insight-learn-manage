/* Faux backend navigateur pour le scénario E2E isolé. Aucun accès réseau réel. */
type Attempt = { attempt_id: string; etat: string; snapshot: any; started_at: string; finished_at?: string | null };
type Db = {
  offline: boolean;
  resetDone: boolean;
  startCalls: number;
  attempts: Attempt[];
  answers: Record<string, Record<string, { valeur: unknown; revision: number }>>;
  results: Record<string, string>;
};

const KEY = "eb_reset_fake_db_v1";
const OLD = "ancienne-tentative";
const NEW = "nouvelle-tentative";
const snapshot = {
  matiere: "t3p",
  questions: [{ id: "t3p:1", matiere: "t3p", type: "QCM", enonce: "Question fictive" }],
};
const initial = (): Db => ({
  offline: true,
  resetDone: false,
  startCalls: 0,
  attempts: [{ attempt_id: OLD, etat: "en_cours", snapshot, started_at: "2026-11-06T10:00:00Z" }],
  answers: { [OLD]: {}, [NEW]: {} },
  results: {},
});
const read = (): Db => {
  try { return JSON.parse(localStorage.getItem(KEY) || "null") ?? initial(); } catch { return initial(); }
};
const write = (db: Db) => localStorage.setItem(KEY, JSON.stringify(db));
if (!localStorage.getItem(KEY)) write(initial());

const reset = () => {
  const db = read();
  const old = db.attempts.find((a) => a.attempt_id === OLD)!;
  old.etat = "abandonnee";
  old.finished_at = "2026-11-06T11:00:00Z";
  db.resetDone = true;
  db.offline = false;
  write(db);
  return db;
};
const state = () => ({
  db: read(),
  queue: JSON.parse(localStorage.getItem("noyau_v2_answer_queue_v1") || "[]"),
  parked: JSON.parse(localStorage.getItem("noyau_v2_answer_queue_parked_v1") || "[]"),
  finished: localStorage.getItem("eb_reset_fake_finished") === "oui",
});
(window as any).__ebFakeReset = reset;
(window as any).__ebFakeState = state;

class Query {
  filters: Record<string, unknown> = {};
  constructor(private table: string) {}
  select() { return this; }
  eq(column: string, value: unknown) { this.filters[column] = value; return this; }
  in() { return this; }
  is() { return this; }
  order() { return this; }
  limit() { return this; }
  insert() { return Promise.resolve({ data: null, error: null }); }
  maybeSingle() {
    if (this.table === "exam_attempts_v2") {
      const row = read().attempts.find((a) => a.attempt_id === this.filters.attempt_id) ?? null;
      return Promise.resolve({ data: row, error: null });
    }
    if (this.table === "core_exam_results") {
      const id = read().results[String(this.filters.attempt_id)];
      return Promise.resolve({ data: id ? { result_id: id } : null, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }
  then(ok: any, ko: any) {
    const db = read();
    let data: any[] = [];
    if (this.table === "exam_attempts_v2") data = db.attempts;
    if (this.table === "answer_state") {
      const answers = db.answers[String(this.filters.attempt_id)] ?? {};
      data = Object.entries(answers).map(([question_id, value]) => ({ question_id, ...value }));
    }
    return Promise.resolve({ data, error: null }).then(ok, ko);
  }
}

export const supabase = {
  from: (table: string) => new Query(table),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: "utilisateur-fictif" }, access_token: "jeton-fictif" } } }),
    getUser: async () => ({ data: { user: { id: "utilisateur-fictif", email: "fictif@example.test" } } }),
  },
  functions: { invoke: async () => ({ data: { ok: true }, error: null }) },
  rpc: async (name: string, params: any) => {
    const db = read();
    if (name === "core_bridge_actif_pour" || name === "core_sujet_publie") return { data: true, error: null };
    if (name === "start_or_get_exam_timer") return { data: [{ remaining_seconds: 1800 }], error: null };
    if (name === "core_start_attempt") {
      if (!db.resetDone) return { data: db.attempts[0], error: null };
      db.startCalls += 1;
      if (db.startCalls === 1) { write(db); return { data: db.attempts[0], error: null }; }
      let nouvelle = db.attempts.find((a) => a.attempt_id === NEW);
      if (!nouvelle) {
        nouvelle = { attempt_id: NEW, etat: "en_cours", snapshot, started_at: "2026-11-06T11:01:00Z" };
        db.attempts.push(nouvelle);
      }
      write(db);
      return { data: nouvelle, error: null };
    }
    if (name === "core_save_answer") {
      if (db.offline) return { data: null, error: { message: "Failed to fetch" } };
      const attempt = db.attempts.find((a) => a.attempt_id === params.p_attempt_id);
      if (!attempt || attempt.etat !== "en_cours") return { data: null, error: { message: "ATTEMPT_CLOSED" } };
      const answers = db.answers[params.p_attempt_id] ?? (db.answers[params.p_attempt_id] = {});
      const current = answers[params.p_question_id];
      if (current && params.p_expected_revision != null && params.p_expected_revision !== current.revision) {
        return { data: null, error: { message: "ANSWER_STALE_REVISION P0409" } };
      }
      const revision = (current?.revision ?? 0) + 1;
      answers[params.p_question_id] = { valeur: params.p_valeur, revision };
      write(db);
      return { data: { revision }, error: null };
    }
    if (name === "core_finalize_attempt") {
      const attempt = db.attempts.find((a) => a.attempt_id === params.p_attempt_id);
      if (!attempt || attempt.etat !== "en_cours") return { data: null, error: { message: "ATTEMPT_CLOSED" } };
      attempt.etat = "terminee";
      attempt.finished_at = "2026-11-06T11:02:00Z";
      db.results[params.p_attempt_id] = "resultat-fictif";
      write(db);
      return { data: {}, error: null };
    }
    if (name === "core_recalc_result") return { data: {}, error: null };
    return { data: null, error: null };
  },
};
