"""Contrat d'autorisation des fonctions de correction/notation V2 — PostgreSQL JETABLE uniquement.

Charge les définitions de PRODUCTION figées le 07/11/2026 (src/test/fixtures/*_live_20261107.sql),
prouve la faille actuelle, applique docs/sql-revue/2026-11-07-securiser-fonctions-correction-notes.sql
puis vérifie la matrice anon / élève / autre élève / admin / service IA / tâche interne.
Aucune connexion à la base réelle.  Usage : python3 src/test/core_correction_securite_contract.py
"""
import json, os, pathlib, subprocess, tempfile, unittest, uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / 'src/test/fixtures'
MIG = ROOT / 'docs/sql-revue/2026-11-07-securiser-fonctions-correction-notes.sql'
FNS = ['core_operation_replay', 'core_note_attempt', 'core_recalc_result', 'core_correct_qrc', 'core_correct_qrc_publish', 'core_revise_qrc_publish']

ADMIN, ELEVE_UID, AUTRE_UID = (str(uuid.uuid4()) for _ in range(3))
APP, APP2, ATT = (str(uuid.uuid4()) for _ in range(3))
Q1, Q2 = str(uuid.uuid4()), str(uuid.uuid4())

SCHEMA = f"""
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE ROLE authenticator NOLOGIN NOINHERIT; CREATE ROLE untrusted NOLOGIN;
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
CREATE TABLE public.apprenants (id uuid PRIMARY KEY, auth_user_id uuid);
CREATE TABLE public.exam_attempts_v2 (attempt_id uuid PRIMARY KEY, apprenant_id uuid, snapshot jsonb);
CREATE TABLE public.answer_state (attempt_id uuid, question_id text, valeur text);
CREATE TABLE public.qrc_instances_v2 (qrc_instance_id uuid PRIMARY KEY, attempt_id uuid, apprenant_id uuid, etat text DEFAULT 'en_attente', note numeric, corrige_par uuid, corrige_email text, corrige_at timestamptz);
CREATE TABLE public.core_exam_results (result_id uuid DEFAULT gen_random_uuid(), attempt_id uuid UNIQUE, apprenant_id uuid, result_revision int, status text, score numeric, total numeric, qrc_restantes int, published_at timestamptz, updated_at timestamptz);
CREATE TABLE public.core_operations (operation_id uuid PRIMARY KEY, operation_type text, apprenant_id uuid, attempt_id uuid, auteur uuid, cible jsonb, resultat jsonb);
CREATE TABLE public.audit_journal (operation text, cible_type text, cible_id text, attempt_id uuid, apprenant_id uuid, auteur uuid, auteur_email text, avant jsonb, apres jsonb, origine text);
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE FUNCTION public.core_est_proprietaire(p_apprenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = p_apprenant_id AND a.auth_user_id = auth.uid()) $$;
INSERT INTO public.user_roles VALUES ('{ADMIN}','admin');
INSERT INTO public.apprenants VALUES ('{APP}','{ELEVE_UID}'), ('{APP2}','{AUTRE_UID}');
INSERT INTO public.exam_attempts_v2 VALUES ('{ATT}','{APP}', '{{"questions":[{{"id":"1","type":"QCM","points":2,"choix":[{{"lettre":"A","correct":true}},{{"lettre":"B","correct":false}}]}},{{"id":"2","type":"QRC","points":2}},{{"id":"3","type":"QRC","points":2}}]}}');
INSERT INTO public.answer_state VALUES ('{ATT}','1','A');
INSERT INTO public.qrc_instances_v2 (qrc_instance_id, attempt_id, apprenant_id) VALUES ('{Q1}','{ATT}','{APP}'), ('{Q2}','{ATT}','{APP}');
"""

class Pg:
    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix='pg-secu-', dir='/tmp')
        self.user = [] if os.geteuid() else ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
        if self.user: os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ['initdb', '-D', self.dir + '/d', '-U', 'postgres', '-A', 'trust', '--no-locale'], check=True, capture_output=True)
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-o', f"-k {self.dir} -p 55461 -h ''", '-w', 'start', '-l', self.dir + '/log'], check=True, capture_output=True)
    def sql(self, q):
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        r = subprocess.run(['psql', '-X', '-At', '-h', self.dir, '-p', '55461', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', q], capture_output=True, text=True, env=env)
        return r.returncode, (r.stdout + r.stderr).strip()
    def stop(self):
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-m', 'immediate', 'stop'], capture_output=True)

def as_ctx(role, claims, call):
    c = '' if claims is None else (claims if isinstance(claims, str) else json.dumps(claims)).replace("'", "''")
    setc = '' if claims is None else f"SELECT set_config('request.jwt.claims', '{c}', false);"
    setr = '' if role is None else f'SET ROLE {role};'
    return f"{setc} SET SESSION AUTHORIZATION authenticator; {setr} {call}"

def correct(op, q, note=1):
    return f"SELECT public.core_correct_qrc_publish('{op}','{q}',{note},'c','x@y');"

class Contrat(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = Pg()
        code, out = cls.pg.sql(SCHEMA); assert code == 0, out
        for f in FNS:
            code, out = cls.pg.sql((FIX / f'{f}_live_20261107.sql').read_text()); assert code == 0, (f, out)
        # Reproduit les droits de production (EXECUTE public/anon/authenticated).
        cls.pg.sql('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;')
    @classmethod
    def tearDownClass(cls):
        cls.pg.stop()

    def test_1_faille_puis_correction(self):
        pg = self.pg
        # AVANT : un appel anonyme corrige réellement une QRC (faille prouvée, base jetable).
        code, out = pg.sql("BEGIN; " + as_ctx('anon', {'role': 'anon'}, f"SELECT public.core_correct_qrc('{uuid.uuid4()}','{Q1}',2,null,null);") + " ROLLBACK;")
        self.assertEqual(code, 0, out)
        code, out = pg.sql("BEGIN; " + as_ctx('authenticated', {'role': 'authenticated', 'sub': AUTRE_UID}, f"SELECT score20 FROM public.core_note_attempt('{ATT}');") + " ROLLBACK;")
        self.assertEqual(code, 0, out)  # autre élève lit la note : faille
        code, out = pg.sql(MIG.read_text()); self.assertEqual(code, 0, out)

        def refuse(role, claims, call, msg):
            c, o = pg.sql("BEGIN; " + as_ctx(role, claims, call) + " ROLLBACK;")
            self.assertNotEqual(c, 0, f'{msg} devait être refusé : {o}')
            return o
        def ok(role, claims, call):
            c, o = pg.sql("BEGIN; " + as_ctx(role, claims, call) + " ROLLBACK;")
            self.assertEqual(c, 0, o); return o

        anon = {'role': 'anon'}; eleve = {'role': 'authenticated', 'sub': ELEVE_UID}
        autre = {'role': 'authenticated', 'sub': AUTRE_UID}; admin = {'role': 'authenticated', 'sub': ADMIN}
        sans_id = {'role': 'authenticated'}; service = {'role': 'service_role'}
        self.assertIn('permission denied', refuse('anon', anon, f"SELECT public.core_correct_qrc('{uuid.uuid4()}','{Q1}',2,null,null);", 'anon correct'))
        self.assertIn('permission denied', refuse('authenticated', eleve, f"SELECT public.core_correct_qrc('{uuid.uuid4()}','{Q1}',2,null,null);", 'élève correct brut'))
        refuse('anon', anon, correct(uuid.uuid4(), Q1), 'anon publish')
        self.assertIn('CORRECTION_NON_AUTORISEE', refuse('authenticated', eleve, correct(uuid.uuid4(), Q1), 'élève publish'))
        self.assertIn('CORRECTION_NON_AUTORISEE', refuse('authenticated', sans_id, correct(uuid.uuid4(), Q1), 'JWT sans identité'))
        self.assertIn('permission denied', refuse('authenticated', autre, f"SELECT * FROM public.core_note_attempt('{ATT}');", 'note autre'))
        self.assertIn('TENTATIVE_NON_AUTORISEE', refuse('authenticated', autre, f"SELECT (public.core_recalc_result('{ATT}')).status;", 'recalc autre'))
        refuse('anon', anon, f"SELECT (public.core_recalc_result('{ATT}')).status;", 'recalc anon')
        self.assertIn('REVISION_NON_AUTORISEE', refuse('authenticated', eleve, f"SELECT public.core_revise_qrc_publish('{uuid.uuid4()}','{Q1}',1,1,'c','x');", 'révision élève'))
        # Élève propriétaire : fin de passage (pontV2) toujours possible, note provisoire.
        self.assertIn('provisoire', ok('authenticated', eleve, f"SELECT (public.core_recalc_result('{ATT}')).status;"))
        # Formateur/admin : correction réelle, puis rejeu idempotent ; un élève ne peut pas lire le rejeu.
        op = str(uuid.uuid4())
        c, o = pg.sql(as_ctx('authenticated', admin, correct(op, Q1, 1.5)) + " RESET ROLE;")
        self.assertEqual(c, 0, o); self.assertIn('provisoire', o)
        self.assertIn('CORRECTION_NON_AUTORISEE', refuse('authenticated', eleve, correct(op, Q1), 'rejeu par élève'))
        # Rejeu (double-clic/F5) : aucune nouvelle écriture, état corrigé renvoyé (comportement existant).
        self.assertIn('"corrigee"', ok('authenticated', admin, correct(op, Q1, 1.5)))
        # Service IA (qrc_ia_publier_* via service_role) : dernière QRC -> note définitive.
        c, o = pg.sql(as_ctx('service_role', service, correct(uuid.uuid4(), Q2, 2)) + " RESET ROLE;")
        self.assertEqual(c, 0, o); self.assertIn('"definitif"', o)
        # (QCM 2 + QRC 1.5 + 2) / 6 * 20 = 18.33 : calcul inchangé.
        self.assertIn('18.33', o)
        # Aucun JWT ne prouve une identité interne : même postgres sans claims échoue.
        c, o = pg.sql(f"SELECT (public.core_recalc_result('{ATT}')).score;")
        self.assertNotEqual(c, 0, o); self.assertIn('TENTATIVE_NON_AUTORISEE', o)
        for role in ('anon', 'authenticated'):
            refuse(role, None, correct(uuid.uuid4(), Q1), 'claims manquants')
            refuse(role, None, f"SELECT (public.core_recalc_result('{ATT}')).score;", 'recalc sans JWT')
        for claims in ('{malformed', {'role':'authenticated','sub':'invalid'}, {'role':'service_role','sub':ADMIN}, {'role':'unexpected','sub':ADMIN}):
            refuse('authenticated', claims, correct(uuid.uuid4(), Q1), 'claims invalides ou rôle usurpé')
            refuse('authenticated', claims, f"SELECT (public.core_recalc_result('{ATT}')).score;", 'identité invalide')
        # Session SQL non fiable, même avec des claims admin forgés : refus.
        c, o = pg.sql(f"SET request.jwt.claims = '{json.dumps(admin)}'; SET SESSION AUTHORIZATION untrusted; SELECT public.core_correct_qrc_publish('{uuid.uuid4()}','{Q1}',1,null,null);")
        self.assertNotEqual(c, 0, o)
        # Chemin IA réel : qrc_ia_publier_* (SECURITY DEFINER, propriétaire postgres) imbriqué,
        # appelé par la fonction serveur avec la clé service (authenticator + SET ROLE service_role).
        pg.sql("CREATE FUNCTION public.qrc_ia_publier_fictif(p_op uuid, p_q uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN RETURN public.core_correct_qrc_publish(p_op, p_q, 2, 'ia', 'ia@fictif'); END $$; REVOKE ALL ON FUNCTION public.qrc_ia_publier_fictif(uuid,uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.qrc_ia_publier_fictif(uuid,uuid) TO service_role;")
        q3 = str(uuid.uuid4())
        c, o = pg.sql(f"BEGIN; INSERT INTO public.qrc_instances_v2 (qrc_instance_id, attempt_id, apprenant_id) VALUES ('{q3}','{ATT}','{APP}'); " + as_ctx('service_role', service, f"SELECT public.qrc_ia_publier_fictif('{uuid.uuid4()}','{q3}');") + " ROLLBACK;")
        self.assertEqual(c, 0, o); self.assertIn('corrigee', o)
        # Même fonction imbriquée appelée par une tâche planifiée (session postgres) : refus par défaut.
        c, o = pg.sql(f"BEGIN; INSERT INTO public.qrc_instances_v2 (qrc_instance_id, attempt_id, apprenant_id) VALUES ('{q3}','{ATT}','{APP}'); SELECT public.qrc_ia_publier_fictif('{uuid.uuid4()}','{q3}'); ROLLBACK;")
        self.assertNotEqual(c, 0, o); self.assertIn('CORRECTION_NON_AUTORISEE', o)
        # Aucun rôle cron dédié n'est créé (aucune tâche réelle n'en dépend).
        self.assertEqual(pg.sql("SELECT count(*) FROM pg_roles WHERE rolname = 'ftransport_qrc_cron'")[1], '0')
        # Matrice EXECUTE : helper interne inaccessible et brut réservé au service.
        for role in ('anon','authenticated','service_role'):
            c, o = pg.sql(f"SELECT has_function_privilege('{role}', 'public.core_identite_api_verifiee()', 'EXECUTE');")
            self.assertEqual(o, 'f')
        for role, expected in [('anon','f'),('authenticated','f'),('service_role','t')]:
            self.assertEqual(pg.sql(f"SELECT has_function_privilege('{role}', 'public.core_correct_qrc(uuid,uuid,numeric,text,text)', 'EXECUTE');")[1], expected)
        c, o = pg.sql("SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'core_%' AND proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp'];")
        self.assertEqual(c, 0, o); self.assertEqual(o, '8')
        # Révision admin avec CAS : autorisée.
        ok('authenticated', admin, f"SELECT public.core_revise_qrc_publish('{uuid.uuid4()}','{Q1}',2,1.5,'c','x');")
        # Retour arrière préparé : rétablit exactement définitions et droits d'origine.
        c, o = pg.sql((ROOT / 'docs/sql-revue/2026-11-07-securiser-fonctions-RETOUR-ARRIERE.sql').read_text()); self.assertEqual(c, 0, o)
        self.assertEqual(pg.sql("SELECT has_function_privilege('anon', 'public.core_correct_qrc(uuid,uuid,numeric,text,text)', 'EXECUTE')")[1], 't')
        for f in FNS:
            live = (FIX / f'{f}_live_20261107.sql').read_text()
            nom = live.split('FUNCTION public.')[1].split('(')[0]
            c, o = pg.sql(f"SELECT md5(prosrc) FROM pg_proc WHERE proname = '{nom}'")
            corps = live.split('$function$')[1]
            self.assertEqual(o, pg.sql("SELECT md5(" + "$x$" + corps + "$x$" + ")")[1], nom)
        self.assertEqual(pg.sql("SELECT count(*) FROM pg_proc WHERE proname LIKE 'core_contexte_%' OR proname = 'core_identite_api_verifiee'")[1], '0')

if __name__ == '__main__':
    unittest.main(verbosity=2)
