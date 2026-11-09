// Local synthetic transport. No Cloud client or credentials are used.
const KEY = "eb2-test-fixture";
type State = { rows: any[]; results: any[]; lost: boolean; saves: any[] };
const read = (): State => JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { rows: [], results: [], lost: false, saves: [] };
const write = (state: State) => localStorage.setItem(KEY, JSON.stringify(state));
(window as any).__fixture = { read, write };
window.fetch = async (_input, init) => {
  const body = JSON.parse(String(init?.body ?? "{}"));
  const st = read();
  let row = st.rows.find(r => r.exercice_id === body.exercice_id);
  st.saves.push({ base: body.base_seq, id: body.exercice_id });
  const skipped: string[] = [];
  if (!row) {
    row = { apprenant_id: body.apprenant_id, exercice_id: body.exercice_id, exercice_type: body.exercice_type, reponses: {}, score: 0, completed: false, write_seq: 0 };
    st.rows.push(row);
  }
  if (!row.completed && Number(body.base_seq ?? 0) >= row.write_seq) {
    row.reponses = body.reponses;
    row.score = body.score;
    row.completed = body.completed === true;
    row.write_seq++;
  } else if (!row.completed) skipped.push(...Object.keys(body.reponses ?? {}));
  write(st);
  return new Response(JSON.stringify({ success: true, confirmed: true, write_seq: row.write_seq,
    accepted_event_ids: (body.events ?? []).map((e: any) => e.event_id), skipped_questions: skipped,
    stored_reponses: row.reponses }), { status: 200 });
};
class Query {
  filters: Record<string, unknown> = {};
  constructor(private table: string) {}
  select() { return this; }
  eq(k: string, v: unknown) { this.filters[k] = v; return this; }
  like() { return this; }
  order() { return this; }
  limit() { return this; }
  async maybeSingle() { return { data: read().rows.find(r => r.exercice_id === this.filters.exercice_id) ?? null, error: null }; }
  then(ok: any, fail: any) { return Promise.resolve({ data: this.table === "reponses_apprenants" ? read().rows : read().results, error: null }).then(ok, fail); }
}
export const supabase = {
  from: (table: string) => new Query(table),
  rpc: async (_name: string, args: any) => {
    const st = read();
    let result = st.results.find(r => r.details.revision_exercice_id === args.p_revision_exercice_id);
    const row = st.rows.find(r => r.exercice_id === args.p_revision_exercice_id);
    if (!result) {
      if (!row || row.write_seq !== args.p_expected_write_seq || JSON.stringify(row.reponses) !== JSON.stringify(args.p_expected_state)) return { data: null, error: { message: "stale fixture" } };
      row.completed = true;
      result = { id: "fixture-receipt", apprenant_id: args.p_apprenant_id, quiz_id: args.p_examen_id,
        score_obtenu: row.score, details: { revision_exercice_id: row.exercice_id, reponses: row.reponses.revisionState.answers, questionOrder: row.reponses.revisionState.questionOrder } };
      st.results.push(result);
    }
    if (st.lost) { st.lost = false; write(st); return { data: null, error: { message: "lost simulated ACK" } }; }
    write(st);
    return { data: result, error: null };
  },
  auth: { getSession: async () => ({ data: { session: { access_token: "fixture-only", user: { id: "fixture-user" } } } }) },
};