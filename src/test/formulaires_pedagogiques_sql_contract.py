"""Prepared context SQL on disposable PostgreSQL, synthetic records only."""
import os, pathlib, subprocess, tempfile, unittest
ROOT = pathlib.Path(__file__).resolve().parents[2]
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='formulaires-',dir='/tmp'); c.user=[] if os.geteuid() else ['setpriv','--reuid=1000','--regid=1000','--clear-groups']
  if c.user: os.chown(c.d,1000,1000)
  c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  for cmd in [c.user+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],c.user+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55519 -h ""','-w','start']]: subprocess.run(cmd,env=c.env,check=True,capture_output=True)
  c.sql("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.uid',true),'')::uuid$$; CREATE TYPE public.app_role AS ENUM('admin','user'); CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$SELECT $1='11111111-1111-1111-1111-111111111111'::uuid AND $2='admin'$$; GRANT USAGE ON SCHEMA auth TO authenticated; CREATE TABLE apprenants(id uuid primary key); CREATE TABLE sessions(id uuid primary key,nom text); CREATE TABLE session_apprenants(id uuid primary key,apprenant_id uuid,session_id uuid); CREATE TABLE apprenant_documents_completes(id uuid primary key,apprenant_id uuid,type_document text,donnees jsonb); INSERT INTO apprenants VALUES('22222222-2222-2222-2222-222222222222'); INSERT INTO apprenant_documents_completes VALUES('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','test-competences','{\"answers\":{\"0-0\":\"non\"},\"signature\":\"original\"}');"+(ROOT/'docs/formulaires-pedagogiques-schema-apercu.sql').read_text())
 @classmethod
 def tearDownClass(c): subprocess.run(c.user+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True)
 @classmethod
 def sql(c,q,check=True): return subprocess.run(['psql','-X','-At','-h',c.d,'-p','55519','-U','postgres','-v','ON_ERROR_STOP=1','-c',q],env=c.env,text=True,capture_output=True,check=check)
 def call(self,decision='NULL',date='NULL',uid='11111111-1111-1111-1111-111111111111',op='44444444-4444-4444-4444-444444444444',ins='NULL'):
  return f"SET ROLE authenticated; SET request.uid='{uid}'; SELECT public.formulaire_pedagogique_enregistrer('33333333-3333-3333-3333-333333333333',{ins},'TAXI',NULL,NULL,{decision},{date},'preuve réelle','{op}');"
 def test_01_context_preserves_original(self):
  self.sql(self.call()); self.assertEqual(self.sql("SELECT donnees FROM apprenant_documents_completes").stdout.strip(),'{"answers": {"0-0": "non"}, "signature": "original"}')
 def test_02_idempotence(self):
  self.sql(self.call()); self.assertEqual(self.sql('SELECT count(*) FROM formulaire_pedagogique_contextes').stdout.strip(),'1')
 def test_03_no_invented_admission(self): self.assertEqual(self.sql('SELECT decision IS NULL AND valide_le IS NULL AND session_id IS NULL FROM formulaire_pedagogique_contextes').stdout.strip(),'t')
 def test_04_stale_refused(self): self.assertNotEqual(self.sql(self.call(op='55555555-5555-5555-5555-555555555555'),False).returncode,0)
 def test_05_learner_refused(self): self.assertNotEqual(self.sql(self.call(uid='22222222-2222-2222-2222-222222222222'),False).returncode,0)
 def test_06_conflicting_replay_refused(self): self.assertNotEqual(self.sql(self.call(decision="'admis'",date='now()'),False).returncode,0)
 def test_07_immutable(self): self.assertNotEqual(self.sql("UPDATE formulaire_pedagogique_contextes SET formation='VTC'",False).returncode,0)
 def test_08_no_public_grant(self): self.assertEqual(self.sql("SELECT has_table_privilege('anon','formulaire_pedagogique_contextes','SELECT'),has_table_privilege('authenticated','formulaire_pedagogique_contextes','INSERT')").stdout.strip(),'f|f')
 def test_09_learner_no_read(self): self.assertEqual(self.sql("SET ROLE authenticated; SET request.uid='22222222-2222-2222-2222-222222222222'; SELECT count(*) FROM formulaire_pedagogique_contextes").stdout.strip().splitlines()[-1],'0')
if __name__=='__main__': unittest.main(verbosity=2)