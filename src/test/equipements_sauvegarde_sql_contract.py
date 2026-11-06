"""Replays SELECT-captured Cloud functions locally. No live DB connection or writes."""
import json, os, pathlib, shutil, subprocess, tempfile, unittest
ROOT = pathlib.Path(__file__).resolve().parent
AS = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
A = 'aaaaaaaa-0000-0000-0000-000000000001'
B = 'bbbbbbbb-0000-0000-0000-000000000002'
ID = 'quiz_taxi_equipements_m64_sanctions_v1'
VERSION = '2026-10-27-m64-sanctions-v1'

class Contrat(unittest.TestCase):
    @classmethod
    def setUpClass(c):
        c.d = tempfile.mkdtemp(dir='/tmp'); os.chown(c.d, 1000, 1000)
        c.env = {k:v for k,v in os.environ.items() if not k.startswith('PG')}
        subprocess.run(AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],env=c.env,check=True,capture_output=True)
        subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55493 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
        c.sql("""CREATE TABLE reponses_apprenants(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        apprenant_id uuid,user_id uuid,exercice_id text,exercice_type text,reponses jsonb,
        reponses_meta jsonb,write_seq bigint,completed boolean DEFAULT false,score numeric,
        tentative int DEFAULT 1,status text,updated_at timestamptz DEFAULT now());
        CREATE TABLE reponses_apprenants_journal(event_id uuid PRIMARY KEY,apprenant_id uuid,user_id uuid,module_id int,
        exercice_id text,exercice_type text,question_id text,valeur jsonb,tentative int,client_saved_at timestamptz);""")
        for f in ['equipements_guard_live_20261104.sql','answer_batch_live_20261104.sql']:
            c.sql((ROOT/'fixtures'/f).read_text())
        c.sql('CREATE TRIGGER garde BEFORE INSERT OR UPDATE ON reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_quiz_equipements_m64_sanctions_v1()')
        c.sql("""CREATE ROLE authenticated; CREATE ROLE anon; ALTER TABLE reponses_apprenants ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON reponses_apprenants TO authenticated;
        CREATE POLICY own ON reponses_apprenants TO authenticated USING (user_id=nullif(current_setting('test.uid',true),'')::uuid);
        REVOKE ALL ON FUNCTION persist_answer_batch_v2 FROM PUBLIC;""")
    @classmethod
    def tearDownClass(c):
        subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True); shutil.rmtree(c.d)
    @classmethod
    def sql(c,q):
        p=subprocess.run(['psql','-X','-q','-At','-h',c.d,'-p','55493','-U','postgres','-v','ON_ERROR_STOP=1'],input='\\set VERBOSITY verbose\n'+q,text=True,capture_output=True,env=c.env)
        if p.returncode: raise RuntimeError(p.stderr)
        return p.stdout.strip()
    def setUp(self): self.sql('TRUNCATE reponses_apprenants,reponses_apprenants_journal')
    def payload(self,revision='r1',partial=False):
        return {'version':VERSION,'revision':revision,'valeurs':{f'q{i:02d}':str(i%3) for i in range(1, 10 if partial else 21)}}
    def save(self,p,done=False,score='NULL',seq=0):
        data=json.dumps(p).replace("'","''")
        return self.sql(f"SELECT saved,stored_write_seq,frozen FROM persist_answer_batch_v2('{A}','{A}',null,'{ID}','jeu','{data}',{str(done).lower()},{score},{seq},'[]')")
    def test_before_score_refusal_and_after_null(self):
        self.save(self.payload())
        before=self.sql('SELECT row_to_json(r)::text FROM reponses_apprenants r')
        for score in ['0','60','100']:
            with self.assertRaisesRegex(RuntimeError,'23514.*Questions complémentaires non notées'): self.save(self.payload(),True,score,1)
            self.assertEqual(before,self.sql('SELECT row_to_json(r)::text FROM reponses_apprenants r'))
        self.assertIn('t|2|f',self.save(self.payload(),True,seq=1))
        self.assertEqual(self.sql('SELECT completed AND score IS NULL FROM reponses_apprenants'),'t')
    def test_missing_question(self):
        with self.assertRaisesRegex(RuntimeError,'23514.*incomplètes : q10'): self.save(self.payload(partial=True),True)
    def test_number_is_not_string(self):
        p=self.payload(); p['valeurs']['q01']=0
        with self.assertRaisesRegex(RuntimeError,'23514.*incomplètes : q01'): self.save(p,True)
    def test_version_revision_and_object(self):
        for key,value in [('version','other'),('revision',''),('valeurs',[])]:
            p=self.payload(); p[key]=value
            with self.assertRaisesRegex(RuntimeError,'23514.*Version ou identité'): self.save(p)
    def test_completed_immutable_and_retry(self):
        p=self.payload(); self.save(p,True)
        before=self.sql('SELECT row_to_json(r)::text FROM reponses_apprenants r')
        self.assertIn('t|1|t',self.save(p,True)); self.save(self.payload('late',True))
        self.assertEqual(before,self.sql('SELECT row_to_json(r)::text FROM reponses_apprenants r'))
    def test_stale_final_never_blanks_draft(self):
        self.save(self.payload(partial=True))
        before=self.sql('SELECT row_to_json(r)::text FROM reponses_apprenants r')
        with self.assertRaisesRegex(RuntimeError,'23514.*incomplètes'): self.save(self.payload('final'),True,seq=0)
        self.assertEqual(before,self.sql('SELECT row_to_json(r)::text FROM reponses_apprenants r'))
        self.save(self.payload('final'),True,seq=1)
    def test_stale_whole_state_never_overwrites_newer_server_version(self):
        self.save(self.payload('device-a'))
        self.save(self.payload('device-b'), seq=1)
        before=self.sql("SELECT reponses->>'revision' FROM reponses_apprenants")
        self.assertEqual(before,'device-b')
        result=self.save(self.payload('late-a'),seq=1)
        self.assertIn('t|2|f',result)
        self.assertEqual(self.sql("SELECT reponses->>'revision' FROM reponses_apprenants"),'device-b')
    def test_other_account_rls_and_rpc_denied(self):
        self.save(self.payload())
        self.assertEqual(self.sql(f"SET ROLE authenticated; SET test.uid='{B}'; SELECT count(*) FROM reponses_apprenants"),'0')
        self.assertEqual(self.sql(f"SET ROLE authenticated; SET test.uid='{A}'; SELECT count(*) FROM reponses_apprenants"),'1')
        with self.assertRaisesRegex(RuntimeError,'42501.*permission denied'): self.sql('SET ROLE anon; SELECT * FROM reponses_apprenants')

if __name__=='__main__': unittest.main(verbosity=2)