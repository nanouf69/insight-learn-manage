"""Contrat réel de la progression des modules sur PostgreSQL JETABLE uniquement.

Pourquoi : la régression 0193 (23502) est passée parce que les anciens tests
mockaient l'appel RPC ou lisaient le texte SQL par regex ; aucun n'exécutait la
fonction contre la vraie colonne completed_at NOT NULL DEFAULT now().

Ici :
- la table apprenant_module_completion (colonnes, NOT NULL, défauts, contraintes,
  déclencheurs, fonctions de déclencheur, RLS, politiques, droits) et les RPC
  publiques sont recopiées depuis le CATALOGUE réel (lecture seule) ou depuis
  l'instantané figé avant 0197 (src/test/fixtures/module_completion_schema_avant_0197.sql) ;
- les dépendances annexes (apprenants, réponses, rôles…) sont réduites aux
  colonnes lues par ces fonctions ;
- aucune écriture n'est faite hors de la base jetable.

Usage : python3 src/test/module_completion_sql_contract.py [--capture]
  --capture : écrit l'instantané du catalogue réel actuel (lecture seule).
Variable MIGRATION_0197 : chemin du SQL de correction (défaut : fichier du dépôt).
"""
import glob
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX_AVANT = ROOT / 'src/test/fixtures/module_completion_schema_avant_0197.sql'
TABLE = 'apprenant_module_completion'
RPCS = ['save_module_completion', 'save_module_pages_progress', 'autovalidate_module_if_complete']

# ---------------------------------------------------------------- capture (lecture seule)
def live(q):
    return subprocess.check_output(['psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', q], text=True).strip()

def capture_live():
    out = []
    cols = live(f"""select string_agg(format('%I %s%s%s', a.attname, format_type(a.atttypid,a.atttypmod),
        case when d.adbin is not null then ' DEFAULT '||pg_get_expr(d.adbin,d.adrelid) else '' end,
        case when a.attnotnull then ' NOT NULL' else '' end), E',\\n  ' order by a.attnum)
        from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
        where a.attrelid='public.{TABLE}'::regclass and a.attnum>0 and not a.attisdropped""")
    out.append(f'CREATE TABLE public.{TABLE} (\n  {cols}\n);')
    for name, df in [l.split('\t', 1) for l in live(f"""select conname||E'\\t'||pg_get_constraintdef(oid) from pg_constraint
        where conrelid='public.{TABLE}'::regclass order by contype desc, conname""").splitlines()]:
        out.append(f'ALTER TABLE public.{TABLE} ADD CONSTRAINT {name} {df};')
    trig_fns = live(f"""select string_agg(distinct p.proname, ' ') from pg_trigger t join pg_proc p on p.oid=t.tgfoid
        where t.tgrelid='public.{TABLE}'::regclass and not t.tgisinternal""").split()
    for fn in trig_fns + RPCS:
        out.append(live(f"select pg_get_functiondef(oid) from pg_proc where proname='{fn}' and pronamespace='public'::regnamespace") + ';')
        acl = live(f"select coalesce(proacl::text,'') from pg_proc where proname='{fn}' and pronamespace='public'::regnamespace")
        out.append(f"REVOKE ALL ON FUNCTION public.{fn} FROM PUBLIC;" if acl else '')
        for g in [x for x in acl.strip('{}').split(',') if x]:
            grantee = g.split('=')[0] or 'PUBLIC'
            if grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role'):
                out.append(f'GRANT EXECUTE ON FUNCTION public.{fn} TO {grantee};')
    out.append(live(f"""select string_agg(pg_get_triggerdef(oid), E';\\n') || ';' from pg_trigger
        where tgrelid='public.{TABLE}'::regclass and not tgisinternal"""))
    out.append(f'ALTER TABLE public.{TABLE} ENABLE ROW LEVEL SECURITY;')
    for pol in live(f"""select format('CREATE POLICY %I ON public.{TABLE} AS %s FOR %s TO %s%s%s;', polname,
          case when polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end,
          case polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
          (select string_agg(case when r=0 then 'public' else quote_ident(rolname) end, ',') from unnest(polroles) r left join pg_roles on pg_roles.oid=r),
          coalesce(' USING ('||pg_get_expr(polqual,polrelid)||')',''), coalesce(' WITH CHECK ('||pg_get_expr(polwithcheck,polrelid)||')',''))
          from pg_policy where polrelid='public.{TABLE}'::regclass order by polname""").splitlines():
        out.append(pol)
    acl = live(f"select relacl::text from pg_class where oid='public.{TABLE}'::regclass")
    for g in acl.strip('{}').split(','):
        grantee, rest = g.split('=')
        if grantee in ('anon', 'authenticated', 'service_role'):
            privs = {'a': 'INSERT', 'r': 'SELECT', 'w': 'UPDATE', 'd': 'DELETE'}
            p = [v for k, v in privs.items() if k in rest.split('/')[0]]
            out.append(f"GRANT {', '.join(p)} ON public.{TABLE} TO {grantee};")
    return '\n\n'.join(x for x in out if x)

# ---------------------------------------------------------------- base jetable
TEMP = tempfile.mkdtemp(prefix='amc-sql-', dir='/tmp'); os.chown(TEMP, 1000, 1000)
DATA = TEMP + '/data'; PORT = '55447'
AS_USER = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']

def sql(q, db='t'):
    return subprocess.check_output(['psql', '-X', '-h', TEMP, '-p', PORT, '-U', 'lovable', '-d', db, '-At', '-v', 'ON_ERROR_STOP=1', '-c', q], text=True, stderr=subprocess.STDOUT).strip()

def err(q):
    try:
        sql(q); return None
    except subprocess.CalledProcessError as e:
        return e.output

STUBS = '''
CREATE SCHEMA auth; CREATE SCHEMA net;
DO $$BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END$$;
DO $$BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END$$;
DO $$BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END$$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
CREATE TABLE net.appels(url text, body jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net.appels VALUES (url, body) RETURNING 1::bigint $$;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles(user_id uuid, role app_role);
CREATE TABLE public.apprenants(id uuid PRIMARY KEY, auth_user_id uuid);
CREATE TABLE public.apprenant_connexions(apprenant_id uuid, user_id uuid, started_at timestamptz, last_seen_at timestamptz, last_action_at timestamptz, ended_at timestamptz);
CREATE TABLE public.comptes_test_techniques(apprenant_id uuid);
CREATE TABLE public.module_editor_state(module_id int, module_data jsonb);
CREATE TABLE public.module_regles_validation(module_id int, protection_serveur boolean, contient_questions boolean);
CREATE TABLE public.reponses_apprenants(apprenant_id uuid, exercice_id text, reponses jsonb);
CREATE TABLE public.quiz_valide_reecritures_refusees(table_cible text, apprenant_id uuid, cle text, champs text[], auteur uuid);
CREATE TABLE public.donnees_eleves_suppressions(table_nom text, apprenant_id uuid, ligne jsonb, auteur_uid uuid, auteur_role text, compte_test boolean, motif text);
CREATE FUNCTION public.examens_blancs_preuve_soumission(uuid, int) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
'''
# Fonctions lues par les politiques/déclencheurs, copiées telles quelles du catalogue réel.
DEPS = ['has_role', 'is_current_user_apprenant', 'est_compte_test', 'est_proprietaire_apprenant']

A = 'aaaaaaaa-0000-4000-8000-00000000000a'; U = 'bbbbbbbb-0000-4000-8000-00000000000b'
A2 = 'aaaaaaaa-0000-4000-8000-00000000002a'; U2 = 'bbbbbbbb-0000-4000-8000-00000000002b'
ADMIN = 'cccccccc-0000-4000-8000-00000000000c'
ISMAIL = 'c0844007-b999-4385-9665-918e5077c3b5'; UI = 'bbbbbbbb-0000-4000-8000-0000000000ff'

def learner(uid, q):
    return f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SET request.jwt.claim.role='authenticated'; {q}"

def smc(uid, mod, completed, progress=0, details='NULL'):
    return learner(uid, f"SELECT status||'|'||progress||'|'||coalesce(completed_at::text,'NULL') FROM public.save_module_completion('{A}', {mod}, {str(completed).lower()}, {progress}, NULL, NULL, {details});")

def row(mod, aid=A):
    return sql(f"SELECT status||'|'||progress||'|'||coalesce(completed_at::text,'NULL') FROM {TABLE} WHERE apprenant_id='{aid}' AND module_id={mod}")

def build(db, schema_sql, migration=None):
    sql(f'CREATE DATABASE {db}', 'postgres')
    sql(STUBS, db)
    for fn in DEPS:
        sql(DEPS_SQL[fn], db)
    sql(schema_sql, db)
    if migration: sql(migration, db)
    sql(f"""INSERT INTO apprenants VALUES ('{A}','{U}'),('{A2}','{U2}'),('{ISMAIL}','{UI}');
      INSERT INTO user_roles VALUES ('{ADMIN}','admin');
      INSERT INTO apprenant_connexions VALUES ('{A}','{U}',now(),now(),now(),NULL),('{A2}','{U2}',now(),now(),now(),NULL);
      INSERT INTO module_editor_state VALUES (2, '{{"exercices":[{{"questions":[{{"id":1}}]}}]}}');""", db)

class Avant0197(unittest.TestCase):
    """Reproduit la panne sur l'instantané figé du schéma de production avant correction."""
    def test_progression_refusee_23502_meme_sur_ligne_existante(self):
        global sql
        base = sql
        sql = lambda q, db='avant': base(q, db)
        try:
            e = err(smc(U, 2, False, 40))
            self.assertIn('23502', e or '') if e and 'SQLSTATE' in e else self.assertIn('null value in column "completed_at"', e or '')
            base(f"INSERT INTO {TABLE}(apprenant_id,module_id,status,progress) VALUES ('{A}',4,'in_progress',10)", 'avant')
            e2 = err(smc(U, 4, False, 50))
            self.assertIn('completed_at', e2 or '')
            self.assertEqual(base(f"SELECT progress FROM {TABLE} WHERE module_id=4", 'avant'), '10')
        finally:
            sql = base

class Apres0197(unittest.TestCase):
    """Contrat après correction : schéma réel actuel + SQL 0197, base jetable 't'."""
    def setUp(self):
        sql(f"SET app.suppression_eleve_autorisee='on'; ALTER TABLE {TABLE} DISABLE TRIGGER USER; DELETE FROM {TABLE}; ALTER TABLE {TABLE} ENABLE TRIGGER USER; DELETE FROM reponses_apprenants; DELETE FROM net.appels;")

    def test_01_nouvelle_progression_sans_fausse_date(self):
        self.assertEqual(sql(smc(U, 2, False, 40)), 'in_progress|40|NULL')
        self.assertEqual(row(2), 'in_progress|40|NULL')

    def test_02_ligne_existante_via_on_conflict(self):
        sql(smc(U, 2, False, 40))
        self.assertEqual(sql(smc(U, 2, False, 60)), 'in_progress|60|NULL')
        self.assertEqual(sql(smc(U, 2, False, 10)), 'in_progress|60|NULL')  # jamais de recul

    def test_03_ligne_heritee_date_creation_conservee_et_non_lue_comme_fin(self):
        sql(f"INSERT INTO {TABLE}(apprenant_id,module_id,status,progress,completed_at) VALUES ('{A}',2,'in_progress',20,'2026-09-01T10:00:00Z')")
        self.assertTrue(sql(smc(U, 2, False, 30)).startswith('in_progress|30|2026-09-01'))
        sql(f"INSERT INTO reponses_apprenants VALUES ('{A}','module_2_exo_1','{{\"1\":\"B\"}}')")
        res = sql(smc(U, 2, True, 100))
        self.assertTrue(res.startswith('completed|100|'))
        self.assertNotIn('2026-09-01', res)  # vraie date de validation, pas l'ancienne date de création

    def test_04_validation_reelle_relecture_puis_repetition_inchangee(self):
        e = err(smc(U, 2, True, 100))
        self.assertIn('MODULE_INCOMPLET', e or '')
        self.assertEqual(row(2), '')
        sql(f"INSERT INTO reponses_apprenants VALUES ('{A}','module_2_exo_1','{{\"1\":\"B\"}}')")
        t0 = sql('SELECT now()::text')
        res = sql(smc(U, 2, True, 100))
        self.assertTrue(res.startswith('completed|100|'))
        relu = sql(learner(U, f"SELECT status||'|'||progress||'|'||completed_at::text FROM {TABLE} WHERE apprenant_id='{A}' AND module_id=2"))
        self.assertEqual(relu, res)  # accusé réel = relecture élève sous RLS
        self.assertGreaterEqual(res.split('|')[2], t0[:19])
        self.assertEqual(sql(smc(U, 2, True, 100)), res)
        self.assertEqual(sql(smc(U, 2, False, 5)), res)  # progression après validation : ne rouvre pas

    def test_05_zero_ou_cent_pourcent_non_valide_sans_fin(self):
        self.assertEqual(sql(smc(U, 2, False, 0)), 'in_progress|0|NULL')
        self.assertEqual(sql(smc(U, 2, False, 100)), 'in_progress|100|NULL')

    def test_06_mauvais_compte_et_ismail_refuses(self):
        self.assertIn('not authorized', err(learner(U2, f"SELECT public.save_module_completion('{A}', 2, false, 10)")) or '')
        self.assertIn('not authorized', err(learner(U, f"SELECT public.save_module_completion('{ISMAIL}', 2, false, 10)")) or '')
        self.assertEqual(row(2), ''); self.assertEqual(row(2, ISMAIL), '')
        self.assertIn('permission denied', err(f"SET ROLE anon; SELECT public.save_module_completion('{A}', 2, false, 10)") or '')

    def test_07_ancienne_app_appels_partiels_et_pages(self):
        self.assertEqual(sql(learner(U, f"SELECT status||'|'||coalesce(completed_at::text,'NULL') FROM public.save_module_completion(_apprenant_id => '{A}', _module_id => 2, _completed => false)")), 'in_progress|NULL')
        self.assertEqual(sql(learner(U, f"SELECT status||'|'||coalesce(completed_at::text,'NULL') FROM public.save_module_pages_progress('{A}', 7, '[1,2]'::jsonb, 30)")), 'in_progress|NULL')
        self.assertEqual(sql(learner(U, f"SELECT pages_completees::text FROM public.save_module_pages_progress('{A}', 7, '[3]'::jsonb, 40)")), '[1, 2, 3]')

    def test_08_termine_sans_date_impossible_admin_deblocage_ok(self):
        self.assertIn('amc_terminee_a_une_date', err(f"INSERT INTO {TABLE}(apprenant_id,module_id,status,progress,completed_at) VALUES ('{A}',3,'completed',100,NULL)") or '')
        sql(learner(ADMIN, f"INSERT INTO {TABLE}(apprenant_id,module_id,status,progress,completed_at,score_obtenu,score_max) VALUES ('{A}',3,'completed',100,now(),0,0) ON CONFLICT (apprenant_id,module_id) DO UPDATE SET status='completed'"))
        self.assertTrue(row(3).startswith('completed|100|'))

    def test_09_autovalidation_preuve_complete(self):
        sql(smc(U, 2, False, 50))
        sql(f"INSERT INTO reponses_apprenants VALUES ('{A}','module_2_exo_1','{{\"1\":\"B\"}}')")
        self.assertEqual(sql(f"SELECT validated FROM public.autovalidate_module_if_complete('{A}', 2, 1)"), 't')
        self.assertTrue(row(2).startswith('completed|100|'))
        self.assertEqual(sql(f"SELECT validated FROM public.autovalidate_module_if_complete('{A}', 2, 2)"), 'f')

    def test_10_date_terminee_historique_intacte(self):
        sql(f"INSERT INTO {TABLE}(apprenant_id,module_id,status,progress,completed_at) VALUES ('{A}',2,'completed',100,'2026-09-17T08:00:00Z')")
        self.assertEqual(sql(smc(U, 2, False, 3)), 'completed|100|2026-09-17 08:00:00+00')
        self.assertEqual(sql(smc(U, 2, True, 100)), 'completed|100|2026-09-17 08:00:00+00')

def main():
    if '--capture' in sys.argv:
        print(capture_live()); return
    global DEPS_SQL
    have_live = bool(os.environ.get('PGHOST'))
    DEPS_SQL = {fn: (live(f"select pg_get_functiondef(oid) from pg_proc where proname='{fn}' and pronamespace='public'::regnamespace") + ';') if have_live
                else (ROOT / f'src/test/fixtures/fn_{fn}.sql').read_text() for fn in DEPS}
    mig = os.environ.get('MIGRATION_0197') or (sorted(glob.glob(str(ROOT / 'drizzle/migrations/0197_*.sql'))) or [None])[0]
    if not mig: raise SystemExit('SQL 0197 introuvable')
    migration = pathlib.Path(mig).read_text()
    schema_now = capture_live() if have_live else FIX_AVANT.read_text()
    subprocess.run(AS_USER + ['initdb', '-D', DATA, '-A', 'trust', '--no-locale', '-U', 'lovable'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(AS_USER + ['pg_ctl', '-D', DATA, '-l', TEMP + '/pg.log', '-o', f'-k {TEMP} -p {PORT} -h ""', '-w', 'start'], check=True, stdout=subprocess.DEVNULL)
    try:
        build('avant', FIX_AVANT.read_text())
        build('t', schema_now, migration)
        print('schéma source :', 'catalogue réel actuel' if have_live else 'instantané avant 0197', '| SQL appliqué :', mig)
        suite = unittest.TestSuite([unittest.defaultTestLoader.loadTestsFromTestCase(c) for c in (Avant0197, Apres0197)])
        if not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful(): raise SystemExit(1)
    finally:
        subprocess.run(AS_USER + ['pg_ctl', '-D', DATA, '-m', 'immediate', 'stop'], stdout=subprocess.DEVNULL)

if __name__ == '__main__':
    main()
