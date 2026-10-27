"""Real SQL execution on disposable PostgreSQL only; live catalog reads never mutate learners."""
import json, os, shutil, subprocess, tempfile, unittest
from pathlib import Path

A='11111111-1111-1111-1111-111111111111'
U='22222222-2222-2222-2222-222222222222'
O='33333333-3333-3333-3333-333333333333'
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
def live(q): return subprocess.check_output(['psql','-X','-At','-v','ON_ERROR_STOP=1','-c',q],text=True).strip()

class SubjectRetake(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d=tempfile.mkdtemp(dir='/tmp'); os.chown(cls.d,1000,1000)
        cls.addClassCleanup(cls.tearDownClass)
        cls.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
        subprocess.run(AS+['initdb','-D',cls.d+'/db','-U','postgres','-A','trust','--no-locale'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=cls.env)
        subprocess.run(AS+['pg_ctl','-D',cls.d+'/db','-l',cls.d+'/log','-o',f'-k {cls.d} -p 55478 -h ""','-w','start'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=cls.env)
        cls.sql("""CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
        CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
        CREATE TABLE apprenants(id uuid,auth_user_id uuid); CREATE TABLE module_editor_state(module_data jsonb);
        CREATE TABLE apprenant_quiz_results(apprenant_id uuid,quiz_id text,tentative integer,matiere_id text,details jsonb);
        CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;""")
        for table in ['reponses_apprenants','exam_attempts_v2','apprenant_examen_timers','exam_retake_authorizations']:
            cols=json.loads(live(f"SELECT json_agg(t) FROM (SELECT column_name,data_type,column_default,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='{table}' ORDER BY ordinal_position)t"))
            definitions=[f"{c['column_name']} {c['data_type']}"+(f" DEFAULT {c['column_default']}" if c['column_default'] else '')+(' NOT NULL' if c['is_nullable']=='NO' else '') for c in cols]
            cls.sql(f"CREATE TABLE {table} ({','.join(definitions)})")
        cls.sql('ALTER TABLE reponses_apprenants ADD UNIQUE(apprenant_id,exercice_id); ALTER TABLE apprenant_examen_timers ADD UNIQUE(apprenant_id,exercice_id,tentative)')
        for name in ['core_est_proprietaire','core_assert_session_owner','enforce_exam_retake_delay','enforce_attempt_v2_immutability']:
            cls.sql(live(f"SELECT pg_get_functiondef('public.{name}'::regproc)"))
        cls.sql('CREATE TRIGGER delay BEFORE INSERT ON reponses_apprenants FOR EACH ROW EXECUTE FUNCTION enforce_exam_retake_delay(); CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON exam_attempts_v2 FOR EACH ROW EXECUTE FUNCTION enforce_attempt_v2_immutability()')
        cls.sql(Path('docs/subject-retake.sql').read_text())
    @classmethod
    def tearDownClass(cls):
        if not os.path.exists(cls.d): return
        subprocess.run(AS+['pg_ctl','-D',cls.d+'/db','-m','immediate','stop'],capture_output=True,env=cls.env);shutil.rmtree(cls.d)
    @classmethod
    def sql(cls,q,check=True):
        result = subprocess.run(['psql','-X','-At','-h',cls.d,'-p','55478','-U','postgres','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True,check=False,env=cls.env)
        if check and result.returncode: raise RuntimeError(result.stderr)
        return result
    def setUp(self):
        self.sql(f"""TRUNCATE apprenants,module_editor_state,reponses_apprenants,exam_attempts_v2,apprenant_examen_timers,exam_retake_authorizations,exam_subject_retakes,apprenant_quiz_results;
        INSERT INTO apprenants VALUES('{A}','{U}');
        INSERT INTO module_editor_state VALUES('{{"id":"EB1","matieres":[{{"id":"gestion","duree":30,"questions":[{{"id":1,"type":"QCM","enonce":"Fictive","choix":[]}}]}}]}}');
        INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at,updated_at) VALUES
        ('{A}','{U}','EB1__gestion','examen_blanc','{{"1":["A"]}}',true,'submitted',now()-interval '48 hours',now()-interval '48 hours'),
        ('{A}','{U}','EB1__anglais','examen_blanc','{{"1":"conservé"}}',true,'submitted',now()-interval '48 hours',now()-interval '48 hours');""")
    def call(self,uid=U,op=O,source='EB1__gestion',attempt='NULL',check=True):
        return self.sql(f"SET test.uid='{uid}'; SELECT row_to_json(r) FROM start_exam_subject_retake('{op}','{A}','EB1','gestion','{source}',{attempt})r",check)
    def receipt(self,**kw): return json.loads(self.call(**kw).stdout.splitlines()[-1])
    def evidence(self): return self.sql("SELECT json_agg(r ORDER BY exercice_id) FROM reponses_apprenants r WHERE exercice_id IN ('EB1__gestion','EB1__anglais')").stdout
    def test_48h_boundary_and_history_other_subject_unchanged(self):
        before=self.evidence(); r=self.receipt(); self.assertEqual(r['tentative'],2); self.assertEqual(r['exercice_id'],'EB1__gestion__t2');self.assertEqual(self.evidence(),before)
        self.assertEqual(self.sql("SELECT reponses FROM reponses_apprenants WHERE exercice_id='EB1__gestion__t2'").stdout.strip(),'{}')
    def test_too_early_refused(self):
        self.sql("UPDATE reponses_apprenants SET submitted_at=now()-interval '47 hours 59 minutes'")
        r=self.call(check=False);self.assertNotEqual(r.returncode,0);self.assertIn('autorisation',r.stderr); self.assertEqual(self.sql('SELECT count(*) FROM exam_subject_retakes').stdout.strip(),'0')
    def test_admin_authorization_consumed_once(self):
        self.sql(f"UPDATE reponses_apprenants SET submitted_at=now(); INSERT INTO exam_retake_authorizations(apprenant_id,exam_id) VALUES('{A}','EB1')")
        r=self.receipt();self.assertIsNotNone(r['authorization_id']);self.assertEqual(self.sql('SELECT count(*) FROM exam_retake_authorizations WHERE consumed_at IS NOT NULL').stdout.strip(),'1')
        self.assertEqual(self.receipt()['exercice_id'],r['exercice_id'])
    def test_rights_and_signed_out(self):
        for uid in ['',O]: self.assertNotEqual(self.call(uid=uid,check=False).returncode,0)
    def test_double_click_other_operation_same_source(self):
        a=self.receipt();b=self.receipt(op='44444444-4444-4444-4444-444444444444');self.assertEqual(a,b)
        self.assertEqual(self.sql('SELECT count(*) FROM exam_subject_retakes').stdout.strip(),'1')
    def test_expired_timer_no_fabricated_old_result(self):
        self.sql(f"UPDATE reponses_apprenants SET completed=false,status='in_progress',submitted_at=NULL; INSERT INTO apprenant_examen_timers(apprenant_id,exercice_id,duree_secondes,started_at) VALUES('{A}','EB1__gestion',1800,now()-interval '49 hours')")
        before=self.evidence();self.assertEqual(self.receipt()['tentative'],2);self.assertEqual(self.evidence(),before)
    def test_still_running_refused(self):
        self.sql("UPDATE reponses_apprenants SET completed=false,status='in_progress',submitted_at=NULL")
        self.assertNotEqual(self.call(check=False).returncode,0)
    def test_new_save_then_next_attempt_keeps_all_copies(self):
        self.receipt();self.sql("UPDATE reponses_apprenants SET reponses='{\"1\":[\"B\"]}',completed=true,status='submitted',submitted_at=now()-interval '48 hours' WHERE exercice_id='EB1__gestion__t2'")
        r=self.receipt(source='EB1__gestion__t2',op='44444444-4444-4444-4444-444444444444');self.assertEqual(r['tentative'],3)
        self.assertEqual(self.sql("SELECT count(*) FROM reponses_apprenants WHERE exercice_id LIKE 'EB1__gestion%'").stdout.strip(),'3')
    def test_v2_snapshot_and_source_intact(self):
        s='55555555-5555-5555-5555-555555555555'
        self.sql(f"INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,finished_at) VALUES('{s}','{A}','EB1','{O}','{{\"matiere\":\"gestion\",\"tentative\":1,\"source_historique\":{{\"exercice_id\":\"EB1__gestion\"}},\"questions\":[{{\"id\":\"gestion:1\",\"type\":\"QCM\",\"enonce\":\"Fictive\",\"choix\":[]}}]}}','old','terminee',now()-interval '48 hours')")
        self.sql(f"INSERT INTO exam_subject_retakes(operation_id,apprenant_id,exam_id,matiere_id,source_exercice_id,attempt_id,exercice_id,tentative,moteur,matiere) VALUES('{O}','{A}','EB1','gestion','seed__isolated','{s}','EB1__gestion',1,'v2','{{}}')")
        before=self.sql(f"SELECT row_to_json(a) FROM exam_attempts_v2 a WHERE attempt_id='{s}'").stdout
        r=self.receipt(attempt=f"'{s}'",op='44444444-4444-4444-4444-444444444444');self.assertNotEqual(r['attempt_id'],s);self.assertEqual(r['moteur'],'v2')
        self.assertEqual(self.sql(f"SELECT row_to_json(a) FROM exam_attempts_v2 a WHERE attempt_id='{s}'").stdout,before)
    def test_ambiguous_identity_refused(self):
        self.assertNotEqual(self.call(attempt=f"'{O}'",check=False).returncode,0)
    def test_receipt_cannot_be_rewritten_or_deleted(self):
        self.receipt()
        self.assertNotEqual(self.sql("UPDATE exam_subject_retakes SET tentative=99",check=False).returncode,0)
        self.assertNotEqual(self.sql("DELETE FROM exam_subject_retakes",check=False).returncode,0)
    def test_regex_subject_injection_refused(self):
        r=self.sql(f"SET test.uid='{U}'; SELECT start_exam_subject_retake('{O}','{A}','EB1','.*','EB1__gestion')",check=False)
        self.assertNotEqual(r.returncode,0)
    def test_same_tentative_without_exact_v2_binding_refused(self):
        self.sql(f"INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,finished_at) VALUES('{O}','{A}','EB1','{O}','{{\"matiere\":\"gestion\",\"tentative\":1,\"questions\":[]}}','old','terminee',now()-interval '48 hours')")
        self.assertNotEqual(self.call(attempt=f"'{O}'",check=False).returncode,0)
    def test_concurrent_calls_single_receipt(self):
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda op:self.receipt(op=op),[O,'44444444-4444-4444-4444-444444444444']))
        self.assertEqual(results[0]['exercice_id'],results[1]['exercice_id'])
        self.assertEqual(self.sql('SELECT count(*) FROM exam_subject_retakes').stdout.strip(),'1')

if __name__=='__main__': unittest.main(verbosity=2)