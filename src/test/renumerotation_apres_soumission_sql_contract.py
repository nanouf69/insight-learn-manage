"""Renumérotation après soumission : captures SELECT réelles, exécution sur PostgreSQL JETABLE uniquement."""
import json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANDIDATE = ROOT / 'docs/sql-revue/2026-11-26-renumerotation-apres-soumission.sql'
DOSSIER = 'd51ba01f-6c6b-4073-afa1-d01fda236f4b'  # Seydou Norou BA (lecture seule)
A, U = 'aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b'
N, NU = 'eeeeeeee-0000-4000-8000-00000000000e', 'ffffffff-0000-4000-8000-00000000000f'
ADMIN, OTHER = 'cccccccc-0000-4000-8000-00000000000c', 'dddddddd-0000-4000-8000-00000000000d'

def capture(q):
    return subprocess.check_output(['psql', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-c', q], text=True).strip()

def main():
    if not os.environ.get('PGHOST'):
        raise SystemExit('NON PROUVÉ : catalogue réel non disponible.')
    fdef = lambda n: capture(f"SELECT pg_get_functiondef(oid) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='{n}'")
    source, hist, answer_fn = fdef('etat_completion_modules'), fdef('historique_obligations_modules'), fdef('reponse_enregistree')
    # Après mise en ligne du correctif, reconstituer l'état antérieur pour la reproduction.
    source = source.replace("  ), h_non_datees AS MATERIALIZED (\n    SELECT * FROM public.obligations_non_datees_anterieures(_apprenant_id)\n", "")
    source = source.replace("       AND NOT EXISTS (SELECT 1 FROM h_non_datees nd WHERE nd.module_id = q0.module_id\n             AND nd.exercice_id = q0.ex AND nd.question_id = q0.qid)\n", "")
    assert 'non_datees' not in source
    comp = json.loads(capture(f"SELECT coalesce(jsonb_agg(row_to_json(c)),'[]') FROM public.apprenant_module_completion c WHERE apprenant_id='{DOSSIER}'"))
    subs = json.loads(capture(f"SELECT coalesce(jsonb_agg(jsonb_build_object('e',exercice_id,'r',reponses,'s',status,'t',submitted_at,'c',created_at,'u',updated_at)),'[]') FROM public.reponses_apprenants WHERE apprenant_id='{DOSSIER}'"))
    mods = sorted({c['module_id'] for c in comp})
    audit = json.loads(capture(f"SELECT coalesce(jsonb_agg(jsonb_build_object('m',module_id,'e',exercice_id,'q',question_id,'f',field,'t',created_at)),'[]') FROM public.module_admin_audit_log WHERE module_id IN ({','.join(map(str,mods))}) AND field IN ('question_added','question_deleted')"))
    mes = capture(f"SELECT coalesce(jsonb_agg(jsonb_build_object('m',module_id,'d',module_data)),'[]') FROM public.module_editor_state WHERE module_id IN ({','.join(map(str,mods))})")
    real_md5 = capture(f"SELECT md5(string_agg(row_to_json(c)::text, '' ORDER BY module_id)) FROM public.apprenant_module_completion c WHERE apprenant_id='{DOSSIER}'")
    real_ans = capture(f"SELECT md5(string_agg(row_to_json(r)::text, '' ORDER BY exercice_id)) FROM public.reponses_apprenants r WHERE apprenant_id='{DOSSIER}'")
    env = {k: v for k, v in os.environ.items() if not k.startswith(('PG', 'SUPABASE', 'LOVABLE_', 'VITE_'))}
    tmp = tempfile.mkdtemp(prefix='renum-', dir='/tmp'); os.chown(tmp, 1000, 1000)
    run_as = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']; port = '55471'
    def sql(q):
        r = subprocess.run(['psql', '-X', '-q', '-h', tmp, '-p', port, '-U', 'lovable', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], input=q, env=env, text=True, capture_output=True)
        if r.returncode: raise subprocess.CalledProcessError(r.returncode, 'psql', output=r.stderr[-1500:])
        return r.stdout.strip()
    Q = lambda v: 'NULL' if v is None else "'" + str(v).replace("'", "''") + "'"
    actor = lambda uid, q: f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; {q}"
    def v(uid, who, m):
        return sql(actor(uid, f"SELECT questions_requises||'|'||questions_prouvees||'|'||preuve_complete||'|'||status_effectif FROM public.etat_completion_modules('{who}') WHERE module_id={m}"))
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
        CREATE TABLE public.apprenant_module_completion(apprenant_id uuid,module_id int,status text,completed_at timestamptz,progress numeric,details jsonb);
        CREATE TABLE public.reponses_apprenants(apprenant_id uuid,exercice_id text,reponses jsonb,status text,submitted_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
        CREATE TABLE public.quiz_lyon_cohortes(apprenant_id uuid);
        CREATE TABLE public.module_editor_state(module_id int, module_data jsonb);
        CREATE TABLE public.module_admin_audit_log(module_id int,exercice_id text,question_id text,field text,created_at timestamptz);
        GRANT SELECT ON public.apprenants,public.apprenant_module_completion,public.reponses_apprenants,public.quiz_lyon_cohortes,public.module_admin_audit_log TO authenticated;
        ALTER TABLE public.module_admin_audit_log ENABLE ROW LEVEL SECURITY;
        CREATE POLICY audit_admin_only ON public.module_admin_audit_log FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
        ALTER TABLE public.apprenant_module_completion ENABLE ROW LEVEL SECURITY;
        CREATE POLICY co ON public.apprenant_module_completion FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.apprenants a WHERE a.id=apprenant_id AND a.auth_user_id=auth.uid()));
        ALTER TABLE public.reponses_apprenants ENABLE ROW LEVEL SECURITY;
        CREATE POLICY ro ON public.reponses_apprenants FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.apprenants a WHERE a.id=apprenant_id AND a.auth_user_id=auth.uid()));''')
        sql(answer_fn + ';' + hist + ';' + source + ';')
        sql(f"INSERT INTO public.apprenants VALUES('{A}','{U}'),('{N}','{NU}'); INSERT INTO public.user_roles VALUES('{ADMIN}','admin');")
        for c in comp:
            sql(f"INSERT INTO public.apprenant_module_completion VALUES('{A}',{c['module_id']},{Q(c['status'])},{Q(c['completed_at'])},{c['progress']},{Q(json.dumps(c['details']))}::jsonb);")
        for s in subs:
            sql(f"INSERT INTO public.reponses_apprenants VALUES('{A}',{Q(s['e'])},{Q(json.dumps(s['r']))}::jsonb,{Q(s['s'])},{Q(s['t'])},{Q(s['c'])},{Q(s['u'])});")
        sql('INSERT INTO public.module_admin_audit_log VALUES ' + ','.join(f"({a['m']},{Q(a['e'])},{Q(a['q'])},{Q(a['f'])},{Q(a['t'])})" for a in audit) + ';')
        for r in json.loads(mes):
            sql(f"INSERT INTO public.module_editor_state VALUES({r['m']},{Q(json.dumps(r['d']))}::jsonb);")
        snap = "SELECT md5(string_agg(t::text,'' ORDER BY t::text)) FROM (SELECT row_to_json(c) t FROM public.apprenant_module_completion c UNION ALL SELECT row_to_json(r) FROM public.reponses_apprenants r) x"
        before_copy = sql(snap)
        before = {m: v(ADMIN, A, m) for m in mods}
        print('AVANT (copie de Seydou) :', before)
        assert before[4].split('|')[2] == 'false', before[4]
        sql(CANDIDATE.read_text())
        after = {m: v(ADMIN, A, m) for m in mods}
        print('APRÈS :', after)
        assert after[4].endswith('|true|completed'), after[4]
        assert v(U, A, 4) == after[4], 'parité élève/admin'
        for m in mods:
            if m != 4: assert after[m] == before[m], (m, before[m], after[m])
        assert sql(snap) == before_copy, 'copie mutée'
        # Nouvel apprenant sur les clés actuelles : une question requise vide reste bloquante.
        ids = [d['questionId'] for d in next(c for c in comp if c['module_id'] == 4)['details'] if str(d['exerciceId']) == '101']
        det = [{'exerciceId': '101', 'questionId': q, 'reponseEleve': ('A' if i else None), 'reponseCorrecte': ['A']} for i, q in enumerate(ids)]
        rep = {f'101-{q}': 'A' for q in ids[1:]}
        sql(f"INSERT INTO public.apprenant_module_completion VALUES('{N}',4,'completed',now(),100,{Q(json.dumps(det))}::jsonb); INSERT INTO public.reponses_apprenants VALUES('{N}','module_4_exo_101',{Q(json.dumps(rep))}::jsonb,'submitted',now());")
        nv = v(NU, N, 4); print('Nouvel apprenant, 1 question vide :', nv)
        assert nv == f'{len(ids)}|{len(ids)-1}|false|in_progress', nv
        # Ancien identifiant soumis APRÈS la suppression : jamais une dérogation.
        sql(f"UPDATE public.reponses_apprenants SET reponses='{{\"101-1\":\"A\"}}'::jsonb WHERE apprenant_id='{N}'")
        assert v(NU, N, 4).endswith('|false|in_progress')
        for who in (OTHER,):
            try:
                sql(actor(who, f"SELECT * FROM public.obligations_non_datees_anterieures('{A}')")); raise AssertionError('accès autre compte accepté')
            except subprocess.CalledProcessError as e: assert 'non autorisé' in e.output
        assert sql("SELECT NOT prosecdef FROM pg_proc WHERE proname='etat_completion_modules'") == 't'
        assert capture(f"SELECT md5(string_agg(row_to_json(c)::text, '' ORDER BY module_id)) FROM public.apprenant_module_completion c WHERE apprenant_id='{DOSSIER}'") == real_md5
        assert capture(f"SELECT md5(string_agg(row_to_json(r)::text, '' ORDER BY exercice_id)) FROM public.reponses_apprenants r WHERE apprenant_id='{DOSSIER}'") == real_ans
        # Preuve versionnée (lecture seule) : instantané module_editor_state_reference_20260928,
        # postérieur à la validation du 15/09. Ne fournit AUCUNE date exacte d'ajout.
        exemptes = sql(actor(ADMIN, f"SELECT coalesce(json_agg(json_build_array(module_id, exercice_id, question_id)),'[]') FROM public.obligations_non_datees_anterieures('{A}')"))
        exemptes = [tuple(map(str, x)) for x in json.loads(exemptes)]
        snap0928 = json.loads(capture("SELECT coalesce(jsonb_agg(jsonb_build_object('m',module_id,'ex',e->>'id','q',qq->>'id','cap',captured_at)),'[]') FROM public.module_editor_state_reference_20260928 r, jsonb_array_elements(r.module_data->'exercices') e, jsonb_array_elements(e->'questions') qq WHERE r.module_id=4"))
        dans_snap = {(str(x['m']), x['ex'], x['q']) for x in snap0928}
        cap = min(x['cap'] for x in snap0928)
        comp4 = next(c for c in comp if c['module_id'] == 4)
        assert cap > comp4['completed_at'], 'instantané non postérieur à la validation'
        soumis = {(str(int(s['e'].split('_')[1])), s['e'].split('_')[3], k.split('-', 1)[1]) for s in subs
                  if s['s'] == 'submitted' and s['e'].startswith('module_4_exo_') for k in s['r']}
        ex101 = [x for x in exemptes if x[1] == '101']
        assert len(ex101) == 144 and all(x in dans_snap for x in ex101), 'exemptions 101 hors instantané 28/09'
        assert not any(x in soumis for x in exemptes), 'une clé soumise serait dispensée'
        anciens = {x for x in soumis if x[1] == '101'}
        assert len(anciens) == 94 and not (anciens & set(ex101))
        # Chaque clé soumise existante reste exigée/prouvée : aucune n'est dispensée.
        print(f'PREUVE 28/09 : {len(ex101)} exemptions 101 toutes présentes dans l instantané (capturé {cap}), absentes des 94 clés soumises ; aucune date d ajout déduite.')
        print('PASS : Seydou module 4 prouvé, autres modules inchangés, copie et dossier réel intacts, nouveaux apprenants toujours bloqués, accès autre compte refusé.')
    finally:
        subprocess.run(run_as + ['pg_ctl', '-D', tmp + '/data', '-m', 'immediate', 'stop'], env=env, check=False, stdout=subprocess.DEVNULL)

if __name__ == '__main__':
    main()
