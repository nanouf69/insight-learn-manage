/* Backend strictement fictif pour le test navigateur des révisions. */
type Row = { apprenant_id: string; exercice_id: string; exercice_type: string; reponses: any; score: number; completed: boolean; write_seq: number };
type Db = { online: boolean; rows: Row[]; results: any[] };
const KEY = "revision_fausses_fake_db_v1";
const read = (): Db => JSON.parse(localStorage.getItem(KEY) || "null") ?? { online: false, rows: [], results: [] };
const write = (db: Db) => localStorage.setItem(KEY, JSON.stringify(db));
if (!localStorage.getItem(KEY)) write(read());
const online = (value: boolean) => { const db = read(); db.online = value; write(db); };
const state = () => ({ ...read(), queue: JSON.parse(localStorage.getItem("answer_save_queue_v1") || "[]"), finished: localStorage.getItem("revision_fake_finished") === "oui" });
const network = (payload: any) => {
  const db = read();
  if (!db.online) return { status: 503, body: { message: "offline" } };
  let row = db.rows.find((r) => r.exercice_id === payload.exercice_id);
  const currentSeq = row?.write_seq ?? 0;
  if (row?.completed) return { status: 200, body: { success: true, confirmed: true, frozen: true, write_seq: currentSeq } };
  const base = Number(payload.base_seq ?? 0);
  if (!row) {
    row = { apprenant_id: payload.apprenant_id, exercice_id: payload.exercice_id, exercice_type: payload.exercice_type, reponses: {}, score: 0, completed: false, write_seq: 0 };
    db.rows.push(row);
  }
  if (base >= currentSeq) {
    row.reponses = { ...row.reponses, ...(payload.reponses ?? {}) };
    row.completed = row.completed || payload.completed === true;
    row.score = payload.score ?? row.score;
    row.write_seq += 1;
  }
  write(db);
  return { status: 200, body: { success: true, confirmed: true, write_seq: row.write_seq } };
};
const clearLocalQueue = () => {
  localStorage.removeItem("answer_save_queue_v1");
  localStorage.removeItem("answer_write_seq_v1");
};
(window as any).__revisionOnline = online;
(window as any).__revisionState = state;
(window as any).__revisionNetwork = network;
(window as any).__revisionClearLocalQueue = clearLocalQueue;

class Query {
  filters: Record<string, any> = {};
  constructor(private table: string) {}
  select() { return this; }
  eq(key: string, value: any) { this.filters[key] = value; return this; }
  like() { return this; }
  order() { return this; }
  limit() { return this; }
  maybeSingle() {
    if (this.table !== "reponses_apprenants") return Promise.resolve({ data: null, error: null });
    const row = read().rows.find((r) => r.exercice_id === this.filters.exercice_id) ?? null;
    const data = this.filters.completed === false && row?.completed ? null : row;
    return Promise.resolve({ data, error: null });
  }
  insert(payload: any) {
    const db = read(); db.results.push(payload); write(db);
    return Promise.resolve({ data: payload, error: null });
  }
  then(ok: any, ko: any) {
    const data = this.table === "reponses_apprenants" ? read().rows : [];
    return Promise.resolve({ data, error: null }).then(ok, ko);
  }
}
export const supabase = {
  from: (table: string) => new Query(table),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: "utilisateur-fictif" }, access_token: "fictif" } } }),
    getUser: async () => ({ data: { user: { id: "utilisateur-fictif" } } }),
  },
};
