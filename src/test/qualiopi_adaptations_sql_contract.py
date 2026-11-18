"""Admin-only adaptation rules, on disposable PostgreSQL with synthetic data only."""
import os, pathlib, subprocess, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='qualiopi6-',dir='/tmp'); c.user=[] if os.geteuid() else ['setpriv','--reuid=1000','--regid=1000','--clear-groups']
  if c.user: os.chown(c.d,1000,1000)
  c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  for cmd in [c.user+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],c.user+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55509 -h ""','-w','start']]: subprocess.run(cmd,env=c.env,check=True,capture_output=True)
  c.sql("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.uid',true),'')::uuid$$; CREATE TYPE public.app_role AS ENUM('admin','user'); CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$SELECT $1='11111111-1111-1111-1111-111111111111'::uuid AND $2='admin'$$; GRANT USAGE ON SCHEMA auth TO authenticated; ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon,authenticated;"+(ROOT/'drizzle/migrations/0277_qualiopi_adaptations_confidentielles.sql').read_text()+(ROOT/'drizzle/migrations/0278_qualiopi_adaptations_droits_minimaux.sql').read_text())
 @classmethod
 def tearDownClass(c): subprocess.run(c.user+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True)
 @classmethod
 def sql(c,q,check=True): return subprocess.run(['psql','-X','-At','-h',c.d,'-p','55509','-U','postgres','-v','ON_ERROR_STOP=1','-c',q],env=c.env,text=True,capture_output=True,check=check)
 def insert(self,confirmed='true',date="current_date",uid='11111111-1111-1111-1111-111111111111'):
  return f"SET ROLE authenticated; SET request.uid='{uid}'; INSERT INTO public.qualiopi_adaptations(stagiaire_reference,session_reference,date_decision,besoin,adaptation,responsable,date_mise_en_place,preuve_application,verification_efficacite,suite,validation,mise_en_oeuvre_confirmee) VALUES('SYNTHETIC','TEST',current_date,'Support lisible','Support agrandi','TEST',{date},'TEST','TEST','TEST','TEST',{confirmed});"
 def test_01_real_admin_record(self):
  self.sql(self.insert()); self.assertEqual(self.sql('SELECT count(*) FROM public.qualiopi_adaptations').stdout.strip(),'1')
 def test_02_no_confirmation(self): self.assertNotEqual(self.sql(self.insert('false'),False).returncode,0)
 def test_03_future_refused(self): self.assertNotEqual(self.sql(self.insert(date='current_date+1'),False).returncode,0)
 def test_04_learner_insert_refused(self): self.assertNotEqual(self.sql(self.insert(uid='22222222-2222-2222-2222-222222222222'),False).returncode,0)
 def test_05_learner_cannot_read(self):
  self.assertEqual(self.sql("SET ROLE authenticated; SET request.uid='22222222-2222-2222-2222-222222222222'; SELECT count(*) FROM public.qualiopi_adaptations").stdout.strip().splitlines()[-1],'0')
 def test_06_no_update(self): self.assertNotEqual(self.sql("SET ROLE authenticated; UPDATE public.qualiopi_adaptations SET besoin='overwrite'",False).returncode,0)
 def test_07_no_delete(self): self.assertNotEqual(self.sql("SET ROLE authenticated; DELETE FROM public.qualiopi_adaptations",False).returncode,0)
 def test_08_no_public_grant(self): self.assertEqual(self.sql("SELECT has_table_privilege('service_role','public.qualiopi_adaptations','SELECT'),has_table_privilege('authenticated','public.qualiopi_adaptations','UPDATE')").stdout.strip(),'t|f')
 def test_09_anon_no_read(self): self.assertEqual(self.sql("SELECT has_table_privilege('anon','public.qualiopi_adaptations','SELECT')").stdout.strip(),'f')
if __name__=='__main__': unittest.main(verbosity=2)