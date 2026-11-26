"""Execute the staged six-function delta only on a disposable, socket-only cluster."""
import os, pathlib, subprocess, tempfile, unittest, uuid
ROOT = pathlib.Path(__file__).resolve().parents[2]
OWNER, OTHER, ADMIN, APP, ATT = [str(uuid.uuid4()) for _ in range(5)]

class Contract(unittest.TestCase):
    @classmethod
    def setUpClass(c):
        c.d = tempfile.mkdtemp(prefix='core-six-', dir='/tmp')
        c.as_user = ['setpriv','--reuid=1000','--regid=1000','--clear-groups'] if os.geteuid()==0 else []
        if c.as_user: os.chown(c.d,1000,1000)
        c.env = {k:v for k,v in os.environ.items() if not k.startswith('PG') and k not in ('DATABASE_URL','SUPABASE_SERVICE_ROLE_KEY')}
        subprocess.run(c.as_user+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale','--encoding=UTF8'],env=c.env,check=True,capture_output=True)
        subprocess.run(c.as_user+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55526 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
        c.addClassCleanup(lambda: subprocess.run(c.as_user+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True))
        c.sql("""
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE TYPE app_role AS ENUM ('admin','user');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.role',true),'')$$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
CREATE TABLE user_roles(user_id uuid,role app_role);
CREATE TABLE apprenants(id uuid,auth_user_id uuid,type_apprenant text);
CREATE FUNCTION has_role(u uuid,r app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=u AND role=r)$$;
CREATE FUNCTION core_est_proprietaire(a uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM apprenants WHERE id=a AND auth_user_id=auth.uid())$$;
CREATE FUNCTION core_est_elearning(t text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
CREATE FUNCTION core_snapshot_has_question(s jsonb,q text) RETURNS boolean LANGUAGE sql AS $$SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'questions') x WHERE x->>'id'=q)$$;
CREATE FUNCTION core_reponse_qrc_vide(v jsonb) RETURNS boolean LANGUAGE sql AS $$SELECT v IS NULL$$;
CREATE TABLE exam_content_versions(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,exam_id text,filiere text,exam_numero text,version_number int,statut text,content jsonb,fingerprint text,motif text,created_at timestamptz DEFAULT now(),retired_at timestamptz,published_at timestamptz,published_by uuid,published_email text,is_test boolean DEFAULT false);
CREATE TABLE exam_attempts_v2(attempt_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,apprenant_id uuid,exam_id text,exam_version_id uuid,snapshot jsonb,snapshot_fingerprint text,started_at timestamptz,etat text,finished_at timestamptz,is_test boolean DEFAULT false);
CREATE TABLE core_operations(operation_id uuid PRIMARY KEY,operation_type text,apprenant_id uuid,attempt_id uuid,auteur uuid,cible jsonb,resultat jsonb);
CREATE TABLE audit_journal(operation text,cible_type text,cible_id text,exam_id text,exam_version_id uuid,attempt_id uuid,apprenant_id uuid,auteur uuid,auteur_email text,avant jsonb,apres jsonb,origine text);
CREATE TABLE answer_state(attempt_id uuid,apprenant_id uuid,question_id text,valeur jsonb,revision int,session_origine text);
CREATE TABLE answer_events(attempt_id uuid,question_id text,valeur_nouvelle jsonb,valeur_precedente jsonb);
CREATE TABLE qrc_instances_v2(qrc_instance_id uuid DEFAULT gen_random_uuid(),attempt_id uuid,question_id text,apprenant_id uuid,reponse jsonb,etat text,note numeric,corrige_par uuid,corrige_email text,corrige_at timestamptz,UNIQUE(attempt_id,question_id));
CREATE TABLE core_tentatives_neutralisees(attempt_id uuid);
CREATE TABLE core_exam_results(attempt_id uuid); CREATE TABLE qrc_correction_events(attempt_id uuid);
CREATE TABLE apprenant_quiz_results(id uuid,quiz_type text,quiz_id text,matiere_id text,matiere_nom text,apprenant_id uuid,tentative int,details jsonb,completed_at timestamptz);
CREATE TABLE reponses_apprenants(apprenant_id uuid,exercice_type text,exercice_id text,status text,completed boolean);
CREATE FUNCTION exam_numero_from_id(t text) RETURNS text LANGUAGE sql AS $$SELECT t$$;
""")
        # Exact SELECT capture then candidate: no substitute implementation of the six RPCs.
        c.sql((ROOT/'src/test/fixtures/core-six-functions-20261126.sql').read_text())
        c.sql((ROOT/'docs/sql-revue/2026-11-26-six-fonctions.sql').read_text())
        c.sql(f"INSERT INTO user_roles VALUES('{ADMIN}','admin'); INSERT INTO apprenants VALUES('{APP}','{OWNER}','vtc'); INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,snapshot,etat) VALUES('{ATT}','{APP}','EB5','{{\"questions\":[]}}','en_cours');")

    @classmethod
    def sql(c,s,ok=True):
        r=subprocess.run(['psql','-X','-At','-h',c.d,'-p','55526','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],input=s,env=c.env,text=True,capture_output=True)
        if ok and r.returncode: raise AssertionError(r.stderr)
        return r
    def call(self,role,uid,s,allowed):
        r=self.sql(f"BEGIN; SET LOCAL ROLE {role}; SET LOCAL request.jwt.claim.role='{role}'; SET LOCAL request.jwt.claim.sub='{uid}'; {s}; ROLLBACK;",False)
        self.assertEqual(r.returncode==0,allowed,r.stderr)
        if not allowed: self.assertRegex(r.stderr,r'42501|P0484')
        return r.stdout
    def test_01_anon_no_six_rpc_access(self):
        calls=["core_publish_exam_version(gen_random_uuid(),gen_random_uuid(),NULL)","core_operation_replay(gen_random_uuid(),'x')",f"core_finalize_attempt(gen_random_uuid(),'{ATT}')","core_import_passage_finalise(gen_random_uuid())","core_import_passages_finalises('EB',10)","core_purge_donnees_test()"]
        for f in calls: self.call('anon','','SELECT '+f,False)
    def test_02_finalize_owner_admin_service_and_exact_idempotence(self):
        for role,uid in [('authenticated',OWNER),('authenticated',ADMIN),('service_role','')]:
            op=str(uuid.uuid4())
            out=self.call(role,uid,f"SELECT core_finalize_attempt('{op}','{ATT}'); SELECT core_finalize_attempt('{op}','{ATT}')",True)
            self.assertEqual(out.count('"etat": "terminee"'),2)
        for uid in [OTHER,'']:
            self.call('authenticated',uid,f"SELECT core_finalize_attempt(gen_random_uuid(),'{ATT}')",False)
        self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{ATT}'").stdout.strip(),'en_cours')
    def test_03_replay_private_and_wrong_attempt_refused(self):
        op=str(uuid.uuid4()); other_att=str(uuid.uuid4())
        self.sql(f"INSERT INTO core_operations VALUES('{op}','attempt_finalize','{APP}','{other_att}','{OWNER}','{{}}','{{\"secret\":1}}')")
        self.call('authenticated',OWNER,f"SELECT core_finalize_attempt('{op}','{ATT}')",False)
        self.call('authenticated',OTHER,f"SELECT core_finalize_attempt('{op}','{ATT}')",False)
        for role,uid in [('authenticated',OWNER),('authenticated',ADMIN),('service_role','')]:
            self.call(role,uid,f"SELECT core_operation_replay('{op}','attempt_finalize')",False)
        self.call('authenticated',OTHER,f"SELECT core_import_passage_finalise(gen_random_uuid())",False)
    def test_04_import_admin_service_only(self):
        for uid in [OWNER,OTHER,'']:
            for f in ["core_import_passage_finalise(gen_random_uuid())","core_import_passages_finalises('EB',10)"]:
                self.call('authenticated',uid,'SELECT '+f,False)
        for role,uid in [('authenticated',ADMIN),('service_role','')]:
            self.assertIn('SOURCE_INTROUVABLE',self.call(role,uid,'SELECT core_import_passage_finalise(gen_random_uuid())',True))
            self.assertIn('"importes": 0',self.call(role,uid,"SELECT core_import_passages_finalises('EB',10)",True))
    def test_05_service_publication_only_synthetic(self):
        v=str(uuid.uuid4()); self.sql(f"INSERT INTO exam_content_versions(id,exam_id,version_number,statut) VALUES('{v}','FICTIF',1,'brouillon')")
        for uid in [OWNER,OTHER,ADMIN,'']: self.call('authenticated',uid,f"SELECT core_publish_exam_version(gen_random_uuid(),'{v}')",False)
        self.assertIn('"version_number": 1',self.call('service_role','',f"SELECT core_publish_exam_version(gen_random_uuid(),'{v}')",True))
        self.assertEqual(self.sql(f"SELECT statut FROM exam_content_versions WHERE id='{v}'").stdout.strip(),'brouillon')
    def test_06_service_purge_only_synthetic_rollback(self):
        for uid in [OWNER,OTHER,ADMIN,'']: self.call('authenticated',uid,'SELECT core_purge_donnees_test()',False)
        self.assertIn('"tentatives": 0',self.call('service_role','','SELECT core_purge_donnees_test()',True))
        self.assertEqual(self.sql('SELECT count(*) FROM exam_attempts_v2').stdout.strip(),'1')

if __name__=='__main__': unittest.main(verbosity=2)