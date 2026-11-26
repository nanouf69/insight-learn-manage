"""Parité de la projection : captures SELECT réelles, exécution uniquement PostgreSQL jetable."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
CANDIDATE = ROOT / 'docs/sql-revue/2026-11-26-module-history-role-parity.sql'
DOSSIER = 'a9bbbcc9-f5bf-441d-a534-ac0e1241899c'
A = 'aaaaaaaa-0000-4000-8000-00000000000a'
U = 'bbbbbbbb-0000-4000-8000-00000000000b'
ADMIN = 'cccccccc-0000-4000-8000-00000000000c'
OTHER = 'dddddddd-0000-4000-8000-00000000000d'


def capture(query):
    return subprocess.check_output(['psql', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], text=True).strip()


def main():
    if not os.environ.get('PGHOST'):
        raise SystemExit('NON PROUVÉ : catalogue réel non disponible ; aucune connexion de remplacement tentée.')
    source = capture("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='etat_completion_modules'")
    # Reconstruct only the former role-filtered audit read after the fix ships.
    if 'historique_obligations_modules' in source:
        source = source.replace("WITH h_obligations AS MATERIALIZED (\n    SELECT * FROM public.historique_obligations_modules(_apprenant_id)\n  ), c AS (", "WITH c AS (")
        source = source.replace("LEFT JOIN h_obligations h ON h.module_id = q0.module_id\n        AND h.exercice_id = q0.ex AND h.question_id = q0.qid", "LEFT JOIN LATERAL (SELECT max(l.created_at) FILTER (WHERE l.field='question_added') AS ajout, max(l.created_at) FILTER (WHERE l.field='question_deleted') AS supp FROM public.module_admin_audit_log l WHERE l.module_id=q0.module_id AND l.exercice_id=q0.ex AND l.question_id=q0.qid) h ON true")
    answer_fn = capture("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='reponse_enregistree'")
    completion = json.loads(capture(f"SELECT row_to_json(c) FROM public.apprenant_module_completion c WHERE apprenant_id='{DOSSIER}' AND module_id=2"))
    submissions = json.loads(capture(f"SELECT coalesce(jsonb_agg(jsonb_build_object('exercice_id',exercice_id,'reponses',reponses,'status',status,'submitted_at',submitted_at)),'[]'::jsonb) FROM public.reponses_apprenants WHERE apprenant_id='{DOSSIER}' AND exercice_id ~ '^module_2_exo_[0-9]+$' AND status='submitted' AND submitted_at IS NOT NULL"))
    audit = json.loads(capture("SELECT coalesce(jsonb_agg(jsonb_build_object('module_id',module_id,'exercice_id',exercice_id,'question_id',question_id,'field',field,'created_at',created_at)),'[]'::jsonb) FROM public.module_admin_audit_log WHERE module_id=2 AND field IN ('question_added','question_deleted')"))
    assert completion['status'] == 'completed' and completion['progress'] == 100
    env = {k: v for k, v in os.environ.items() if not k.startswith(('PG', 'SUPABASE', 'LOVABLE_', 'VITE_'))}
    tmp = tempfile.mkdtemp(prefix='module-role-parity-', dir='/tmp')
    os.chown(tmp, 1000, 1000)
    run_as = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
    port = '55464'

    def sql(query):
        result = subprocess.run(['psql', '-X', '-q', '-h', tmp, '-p', port, '-U', 'lovable', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], input=query, env=env, text=True, capture_output=True)
        if result.returncode:
            diagnostic = '\n'.join(line[:300] for line in result.stderr.splitlines() if any(marker in line for marker in ('ERROR:', 'DETAIL:', 'HINT:')))
            raise subprocess.CalledProcessError(result.returncode, ['psql', 'base jetable'], output=diagnostic)
        return result.stdout.strip()

    def quote(value):
        return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"

    def actor(uid, query):
        return f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; {query}"

    def verdict(uid):
        return sql(actor(uid, f"SELECT questions_requises||'|'||questions_prouvees||'|'||preuve_complete||'|'||status_effectif||'|'||progress_effectif FROM public.etat_completion_modules('{A}') WHERE module_id=2"))

    def refuse(query):
        try:
            sql(query)
        except subprocess.CalledProcessError as e:
            assert 'permission denied' in e.output or 'non autorisé' in e.output, e.output
            return
        raise AssertionError('Accès interdit accepté')

    subprocess.run(run_as + ['initdb', '-D', tmp + '/data', '-A', 'trust', '--no-locale', '-E', 'UTF8', '-U', 'lovable'], env=env, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(run_as + ['pg_ctl', '-D', tmp + '/data', '-l', tmp + '/pg.log', '-o', f'-k {tmp} -p {port} -h ""', '-w', 'start'], env=env, check=True, stdout=subprocess.DEVNULL)
    try:
        sql('''CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
        GRANT USAGE ON SCHEMA auth,public TO authenticated,anon,service_role;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.role',true),'')$$;
        CREATE TYPE public.app_role AS ENUM ('admin','user','moderator');
        CREATE TABLE public.user_roles(user_id uuid,role public.app_role);
        CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)$$;
        CREATE TABLE public.apprenants(id uuid PRIMARY KEY,auth_user_id uuid);
        CREATE TABLE public.apprenant_module_completion(apprenant_id uuid,module_id int,status text,completed_at timestamptz,progress numeric,details jsonb,score_obtenu numeric,score_max numeric);
        CREATE TABLE public.reponses_apprenants(apprenant_id uuid,exercice_id text,reponses jsonb,status text,submitted_at timestamptz);
        CREATE TABLE public.quiz_lyon_cohortes(apprenant_id uuid);
        CREATE TABLE public.module_admin_audit_log(module_id int,exercice_id text,question_id text,field text,created_at timestamptz);
        GRANT SELECT ON public.apprenants,public.apprenant_module_completion,public.reponses_apprenants,public.quiz_lyon_cohortes,public.module_admin_audit_log TO authenticated;
        ALTER TABLE public.module_admin_audit_log ENABLE ROW LEVEL SECURITY;
        CREATE POLICY audit_admin_only ON public.module_admin_audit_log FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
        ALTER TABLE public.apprenant_module_completion ENABLE ROW LEVEL SECURITY;
        CREATE POLICY completion_owner ON public.apprenant_module_completion FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.apprenants a WHERE a.id=apprenant_id AND a.auth_user_id=auth.uid()));
        ALTER TABLE public.reponses_apprenants ENABLE ROW LEVEL SECURITY;
        CREATE POLICY answers_owner ON public.reponses_apprenants FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.apprenants a WHERE a.id=apprenant_id AND a.auth_user_id=auth.uid()));''')
        sql(answer_fn + ';' + source + ';')
        sql(f"INSERT INTO public.apprenants VALUES('{A}','{U}'); INSERT INTO public.user_roles VALUES('{ADMIN}','admin');")
        details = quote(json.dumps(completion['details'])) + '::jsonb'
        sql(f"INSERT INTO public.apprenant_module_completion VALUES('{A}',2,'completed',{quote(completion['completed_at'])},100,{details},{completion['score_obtenu']},{completion['score_max']});")
        for row in submissions:
            sql(f"INSERT INTO public.reponses_apprenants VALUES('{A}',{quote(row['exercice_id'])},{quote(json.dumps(row['reponses']))}::jsonb,{quote(row['status'])},{quote(row['submitted_at'])});")
        for row in audit:
            sql(f"INSERT INTO public.module_admin_audit_log VALUES(2,{quote(row['exercice_id'])},{quote(row['question_id'])},{quote(row['field'])},{quote(row['created_at'])});")
        before = sql('SELECT md5(row_to_json(c)::text) FROM public.apprenant_module_completion c')
        admin_before, learner_before = verdict(ADMIN), verdict(U)
        assert admin_before == '839|839|true|completed|100', admin_before
        assert learner_before != admin_before, (learner_before, admin_before)
        print('REPRODUCTION réelle sur copie jetable : admin', admin_before, '; apprenant', learner_before)
        sql(CANDIDATE.read_text())
        assert verdict(U) == verdict(ADMIN) == '839|839|true|completed|100'
        assert sql(actor(U, 'SELECT count(*) FROM public.module_admin_audit_log')) == '0'
        refuse(actor(OTHER, f"SELECT * FROM public.historique_obligations_modules('{A}')"))
        refuse("SET ROLE anon; SELECT * FROM public.historique_obligations_modules('" + A + "')")
        assert sql('SELECT md5(row_to_json(c)::text) FROM public.apprenant_module_completion c') == before
        assert sql("SELECT NOT prosecdef FROM pg_proc WHERE proname='etat_completion_modules'") == 't'
        # Une obligation réellement manquante reste refusée, sans changer une copie réelle.
        sql("UPDATE public.apprenant_module_completion SET details='[{\"exerciceId\":999,\"questionId\":1,\"reponseEleve\":null,\"reponseCorrecte\":[\"A\"]}]'::jsonb")
        assert verdict(U).startswith('1|0|false|in_progress|0')
        print('PASS : 839/839 même verdict admin/élève, audit toujours privé, autre compte/anon refusés, RPC invoker, copie intacte, vrai manque toujours bloquant.')
    finally:
        subprocess.run(run_as + ['pg_ctl', '-D', tmp + '/data', '-m', 'immediate', 'stop'], env=env, check=False, stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.output or 'ÉCHEC SQL jetable : diagnostic absent')
        raise SystemExit(1)