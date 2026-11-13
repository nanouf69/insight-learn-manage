"""Contrat SQL jetable : une clôture portée par une version ignorée ne fige jamais un état ancien.
Cluster PostgreSQL local neuf (variables PG héritées retirées) ; aucune base réelle touchée.
Le schéma des tables est copié depuis le catalogue réel en lecture seule."""
import os, subprocess, tempfile, json, sys, shutil, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
live = {k: v for k, v in os.environ.items()}
def live_sql(q):
    return subprocess.run(["psql", "-At", "-c", q], env=live, capture_output=True, text=True, check=True).stdout
ddl = []
for t in ["reponses_apprenants", "reponses_apprenants_journal"]:
    cols = live_sql(f"""select string_agg(format('%I %s%s%s', column_name, case when data_type='ARRAY' then udt_name::regtype::text when data_type='USER-DEFINED' then 'text' else data_type end,
      case when column_default is not null and column_default not like 'nextval%' then ' default '||column_default else '' end,
      case when is_nullable='NO' then ' not null' else '' end), ', ' order by ordinal_position)
      from information_schema.columns where table_schema='public' and table_name='{t}'""").strip()
    ddl.append(f"create table public.{t} ({cols});")
ddl.append("alter table public.reponses_apprenants_journal add unique (event_id);")
fonctions = {"v3": live_sql("select pg_get_functiondef('public.persist_answer_batch_v3'::regproc)"),
             "v2": live_sql("select pg_get_functiondef('public.persist_answer_batch_v2'::regproc)")}
cand = {"v3": (ROOT/"docs/candidats-sql/persist_answer_batch_v3_cloture_sure.sql").read_text(),
        "v2": (ROOT/"docs/candidats-sql/persist_answer_batch_v2_cloture_sure.sql").read_text()}
d = tempfile.mkdtemp(prefix="pgjetable_")
env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
subprocess.run(["initdb", "-D", d+"/data", "-A", "trust", "-U", "postgres"], env=env, check=True, capture_output=True)
port = "55439"
subprocess.run(["pg_ctl", "-D", d+"/data", "-o", f"-p {port} -k {d} -c listen_addresses=''", "-w", "start"], env=env, check=True, capture_output=True)
def q(sql):
    r = subprocess.run(["psql", "-h", d, "-p", port, "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], env=env, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()
ok = True
try:
    q("create extension if not exists pgcrypto;" + "\n".join(ddl))
    A, U = "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"
    def call(v, base, completed, state, score=None):
        args = f"'{A}','{U}',null,'revision_fausses_EB5__r2','revision_fausses','{json.dumps({'revisionState': state})}'::jsonb,{str(completed).lower()},{'null' if score is None else score},{base},'[]'::jsonb"
        if v == "v3": args += ",'{}'::jsonb"
        return q(f"select skipped_questions from public.persist_answer_batch_{v}({args})")
    for v in ["v2", "v3"]:
        for label, fn in [("actuelle", fonctions[v]), ("candidate", cand[v])]:
            q("truncate public.reponses_apprenants, public.reponses_apprenants_journal;")
            q(fn)
            call(v, 0, False, {"correctedQuestions": ["a"], "n": 1})        # seq 1
            call(v, 1, False, {"correctedQuestions": ["a", "b"], "n": 2})   # seq 2 (accusé perdu côté client)
            sk = call(v, 1, True, {"correctedQuestions": ["a", "b", "c"], "n": 3}, 45)  # base périmée + clôture
            row = q("select completed||'|'||coalesce(score::text,'')||'|'||jsonb_array_length(reponses->'revisionState'->'correctedQuestions') from public.reponses_apprenants")
            completed, score, corr = row.split("|")
            print(v, label, "ignorées=", sk, "clôturée=", completed, "score=", score, "validées=", corr)
            if label == "actuelle":
                ok &= (completed == "true" and corr == "2")  # incident reproduit : clôture d'un état ancien
            else:
                ok &= (completed == "false" and score == "" and corr == "2")
                sk2 = call(v, 2, True, {"correctedQuestions": ["a", "b", "c"], "n": 3}, 45)  # renvoi rebasé
                row = q("select completed||'|'||score||'|'||jsonb_array_length(reponses->'revisionState'->'correctedQuestions') from public.reponses_apprenants")
                print(v, label, "après rebase", sk2, row); ok &= row == "true|45|3"
                # copie close : un renvoi tardif ne réécrit rien
                call(v, 0, False, {"correctedQuestions": [], "n": 0})
                ok &= q("select jsonb_array_length(reponses->'revisionState'->'correctedQuestions') from public.reponses_apprenants") == "3"
finally:
    subprocess.run(["pg_ctl", "-D", d+"/data", "-m", "immediate", "stop"], env=env, capture_output=True)
    shutil.rmtree(d, ignore_errors=True)
print("PASS" if ok else "FAIL"); sys.exit(0 if ok else 1)
