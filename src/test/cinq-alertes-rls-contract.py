"""Disposable PostgreSQL role tests. No production writes or identities are used."""
import os, pathlib, re, subprocess, tempfile, uuid, unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'drizzle/migrations/0281_restreindre_cinq_alertes_rls.sql'
ADMIN, LEARNER, OTHER, APP, OTHER_APP, ATT = [str(uuid.uuid4()) for _ in range(6)]

class Roles(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.mkdtemp(prefix='five-rls-', dir='/tmp')
        cls.user = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups'] if os.geteuid() == 0 else []
        if cls.user: os.chown(cls.directory, 1000, 1000)
        cls.env = {k:v for k,v in os.environ.items() if not k.startswith('PG')}
        subprocess.run(cls.user + ['initdb','-D',cls.directory+'/data','-U','postgres','-A','trust','--no-locale'],env=cls.env,check=True,capture_output=True)
        subprocess.run(cls.user + ['pg_ctl','-D',cls.directory+'/data','-o',f'-k {cls.directory} -p 55487 -h ""','-w','start','-l',cls.directory+'/log'],env=cls.env,check=True,capture_output=True)
        cls.must(f"""
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
CREATE TABLE user_roles(user_id uuid,role app_role);
CREATE TABLE apprenants(id uuid,auth_user_id uuid);
CREATE TABLE exam_attempts_v2(attempt_id uuid,apprenant_id uuid,etat text,snapshot jsonb,exam_id text);
CREATE FUNCTION has_role(_user_id uuid,_role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE FUNCTION core_est_proprietaire(p_apprenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM apprenants WHERE id=p_apprenant_id AND auth_user_id=auth.uid()) $$;
CREATE TABLE qrc_instances_v2(qrc_instance_id uuid DEFAULT gen_random_uuid(),attempt_id uuid NOT NULL,question_id text NOT NULL,apprenant_id uuid NOT NULL,reponse jsonb,etat text DEFAULT 'en_attente' NOT NULL,note numeric,corrige_par uuid,corrige_email text,corrige_at timestamptz,created_at timestamptz DEFAULT now() NOT NULL);
CREATE TABLE audit_journal(event_id bigserial,operation text NOT NULL,cible_type text NOT NULL,auteur uuid,created_at timestamptz DEFAULT now());
CREATE TABLE exam_content_write_log(id uuid DEFAULT gen_random_uuid(),created_at timestamptz DEFAULT now(),module_id integer,exam_id text,matiere_id text,action text NOT NULL,origine text,statut text DEFAULT 'accepte',motif_refus text,questions_avant integer,questions_apres integer,signature_avant text,signature_apres text,examen_source_suspecte text,author_user_id uuid DEFAULT auth.uid(),author_email text,editor_schema_version text,details jsonb);
CREATE TABLE qrc_engine_flags(quiz_id text,enabled boolean,note text,created_at timestamptz DEFAULT now());
CREATE TABLE app_version(id uuid DEFAULT gen_random_uuid(),version text,updated_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now());
GRANT ALL ON qrc_instances_v2,audit_journal,exam_content_write_log,qrc_engine_flags,app_version TO anon,authenticated,service_role;
GRANT ALL ON SEQUENCE audit_journal_event_id_seq TO anon,authenticated,service_role;
ALTER TABLE qrc_instances_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_content_write_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE qrc_engine_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_version ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creation de QRC authentifiee" ON qrc_instances_v2 FOR INSERT TO authenticated WITH CHECK(true);
CREATE POLICY "Lecture des QRC par proprietaire ou admin" ON qrc_instances_v2 FOR SELECT TO authenticated USING(core_est_proprietaire(apprenant_id) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Correction de QRC par admin" ON qrc_instances_v2 FOR UPDATE TO authenticated USING(has_role(auth.uid(),'admin')) WITH CHECK(has_role(auth.uid(),'admin'));
CREATE POLICY "Ajout au journal d audit" ON audit_journal FOR INSERT TO authenticated WITH CHECK(true);
CREATE POLICY "Lecture du journal d audit admin" ON audit_journal FOR SELECT TO authenticated USING(has_role(auth.uid(),'admin'));
CREATE POLICY "Utilisateurs authentifies journalisent les refus" ON exam_content_write_log FOR INSERT TO authenticated WITH CHECK(true);
CREATE POLICY "Admins lisent le journal d ecriture examens" ON exam_content_write_log FOR SELECT TO authenticated USING(has_role(auth.uid(),'admin'));
CREATE POLICY "Lecture des drapeaux QRC" ON qrc_engine_flags FOR SELECT TO authenticated USING(true);
CREATE POLICY "Anyone can read app_version" ON app_version FOR SELECT USING(true);
CREATE POLICY "Admins can manage app_version" ON app_version FOR ALL TO authenticated USING(has_role(auth.uid(),'admin')) WITH CHECK(has_role(auth.uid(),'admin'));
INSERT INTO user_roles VALUES('{ADMIN}','admin');
INSERT INTO apprenants VALUES('{APP}','{LEARNER}'),('{OTHER_APP}','{OTHER}');
INSERT INTO exam_attempts_v2 VALUES('{ATT}','{APP}','en_cours','{{"questions":[{{"id":"Q1","type":"QRC"}}]}}','EB3');
INSERT INTO qrc_instances_v2(attempt_id,question_id,apprenant_id,reponse) VALUES('{ATT}','Q1','{APP}','"original"');
INSERT INTO qrc_engine_flags VALUES('EB2',true,'private note',now()),('DISABLED',false,'internal reason',now());
INSERT INTO app_version(version) VALUES('202611231546');
INSERT INTO audit_journal(operation,cible_type) VALUES('server_original','exam');
""")
        cls.must(MIGRATION.read_text())
        source = (ROOT / 'src/test/fixtures/eb3-20261110/fonctions_live.sql').read_text()
        for name in ['core_snapshot_question_ids', 'core_snapshot_has_question', 'core_assert_session_owner', 'core_enforce_qrc_context']:
            match = re.search(r'CREATE OR REPLACE FUNCTION public\.' + name + r'\([\s\S]*?\$function\$\s*;', source)
            if not match: raise AssertionError('Missing real guard: '+name)
            cls.must(match.group())
        cls.must('CREATE TRIGGER trg_qrc_v2_context BEFORE INSERT OR UPDATE ON qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION core_enforce_qrc_context();')

    @classmethod
    def query(cls,sql):
        r=subprocess.run(['psql','-X','-At','-h',cls.directory,'-p','55487','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',sql],env=cls.env,text=True,capture_output=True)
        return r.returncode,(r.stdout+r.stderr).strip()
    @classmethod
    def must(cls,sql):
        c,o=cls.query(sql)
        if c: raise AssertionError(o)
        return o
    def role(self,role,uid,sql,allowed=True):
        code,out=self.query(f"BEGIN; SET LOCAL ROLE {role}; SET LOCAL request.jwt.claim.sub='{uid}'; {sql}; ROLLBACK;")
        self.assertEqual(code==0,allowed,out)
        return out
    @classmethod
    def tearDownClass(cls):
        subprocess.run(cls.user+['pg_ctl','-D',cls.directory+'/data','-m','immediate','stop'],env=cls.env,capture_output=True)

    def test_learner_qrc_insert_own_pending_only(self):
        self.role('authenticated',LEARNER,f"INSERT INTO qrc_instances_v2(attempt_id,question_id,apprenant_id,reponse) VALUES('{ATT}','Q1','{APP}','\"answer\"')")
        self.role('authenticated',OTHER,f"INSERT INTO qrc_instances_v2(attempt_id,question_id,apprenant_id,reponse) VALUES('{ATT}','Q1','{APP}','\"forged\"')",False)
        self.role('authenticated',LEARNER,f"INSERT INTO qrc_instances_v2(attempt_id,question_id,apprenant_id,note) VALUES('{ATT}','Q1','{APP}',20)",False)
        self.role('authenticated',LEARNER,f"INSERT INTO qrc_instances_v2(attempt_id,question_id,apprenant_id,created_at) VALUES('{ATT}','Q1','{APP}','2000-01-01')",False)
    def test_qrc_read_owner_admin_service(self):
        for uid,count in [(LEARNER,1),(OTHER,0),(ADMIN,1)]:
            self.assertIn(f'\n{count}\n',self.role('authenticated',uid,'SELECT count(*) FROM qrc_instances_v2'))
        self.role('anon','', 'SELECT * FROM qrc_instances_v2',False)
        self.role('service_role','', 'SELECT * FROM qrc_instances_v2')
    def test_real_guard_refuses_wrong_snapshot_closed_attempt_and_cross_owner(self):
        insert=f"INSERT INTO qrc_instances_v2(attempt_id,question_id,apprenant_id,reponse) VALUES('{ATT}','Q1','{APP}','\"answer\"')"
        self.role('authenticated',LEARNER,insert.replace("'Q1'","'UNKNOWN'"),False)
        self.role('authenticated',LEARNER,insert.replace(f"'{APP}'",f"'{OTHER_APP}'"),False)
        self.role('authenticated',LEARNER,f"SELECT 1;",True)
        self.role('service_role','',"UPDATE exam_attempts_v2 SET etat='terminee'; "+insert,False)
        self.role('service_role','',insert)
    def test_audit_only_trusted_server_insert(self):
        for uid in [LEARNER,OTHER,ADMIN]:
            self.role('authenticated',uid,"INSERT INTO audit_journal(operation,cible_type) VALUES('fake','exam')",False)
        self.role('anon','',"INSERT INTO audit_journal(operation,cible_type) VALUES('fake','exam')",False)
        self.role('service_role','',"INSERT INTO audit_journal(operation,cible_type) VALUES('server','exam')")
        self.role('authenticated',LEARNER,'SELECT * FROM audit_journal')
        self.role('authenticated',ADMIN,'SELECT * FROM audit_journal')
    def test_admin_client_refusal_cannot_forge_official_log(self):
        insert="INSERT INTO exam_content_write_log(module_id,action,origine,statut,motif_refus,editor_schema_version) VALUES(35,'ecriture_contenu','editor','refuse','test','2')"
        self.role('authenticated',ADMIN,insert)
        self.role('authenticated',LEARNER,insert,False)
        self.role('authenticated',ADMIN,insert.replace("'refuse'","'accepte'"),False)
        for column,value in [('author_user_id',f"'{OTHER}'"),('created_at',"'2000-01-01'"),('details',"'{}'")]:
            self.role('authenticated',ADMIN,f"INSERT INTO exam_content_write_log(action,{column}) VALUES('ecriture_contenu',{value})",False)
        self.role('service_role','',"INSERT INTO exam_content_write_log(action,statut,details) VALUES('trusted','accepte','{}')")
    def test_flags_metadata_is_minimal(self):
        self.assertIn('EB2|t',self.role('authenticated',LEARNER,'SELECT quiz_id,enabled FROM qrc_engine_flags'))
        self.assertNotIn('DISABLED',self.role('authenticated',LEARNER,'SELECT quiz_id,enabled FROM qrc_engine_flags'))
        self.assertIn('DISABLED|f',self.role('authenticated',ADMIN,'SELECT quiz_id,enabled FROM qrc_engine_flags'))
        for uid in [LEARNER,ADMIN]: self.role('authenticated',uid,'SELECT note FROM qrc_engine_flags',False)
        self.role('anon','', 'SELECT quiz_id,enabled FROM qrc_engine_flags',False)
        self.role('service_role','', 'SELECT * FROM qrc_engine_flags')
    def test_version_admin_only(self):
        self.role('anon','', 'SELECT version FROM app_version',False)
        self.assertNotIn('202611231546',self.role('authenticated',LEARNER,'SELECT version FROM app_version'))
        self.assertIn('202611231546',self.role('authenticated',ADMIN,'SELECT version FROM app_version'))
        self.role('service_role','', 'SELECT * FROM app_version')
    def test_no_client_deletes_or_log_updates(self):
        for table in ['qrc_instances_v2','audit_journal','exam_content_write_log','qrc_engine_flags']:
            self.role('authenticated',ADMIN,f'DELETE FROM {table}',False)
        self.role('authenticated',ADMIN,"UPDATE audit_journal SET operation='forged'",False)
    def test_admin_correction_retained_learner_cannot_grade(self):
        self.assertNotIn('20',self.role('authenticated',LEARNER,'UPDATE qrc_instances_v2 SET note=20 RETURNING note'))
        self.assertIn('\n2\n',self.role('authenticated',ADMIN,'UPDATE qrc_instances_v2 SET note=2 RETURNING note'))
        self.role('authenticated',ADMIN,'UPDATE qrc_instances_v2 SET reponse=\'"overwritten"\'',False)
    def test_audit_owner_restriction(self):
        self.assertNotIn('server_original',self.role('authenticated',LEARNER,'SELECT operation FROM audit_journal'))
        self.assertIn('server_original',self.role('authenticated',ADMIN,'SELECT operation FROM audit_journal'))

if __name__=='__main__': unittest.main(verbosity=2)