"""Disposable PostgreSQL with the live guard function and trigger; never touches real rows."""
import os, subprocess, tempfile, shutil, unittest
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
def live(q): return subprocess.check_output(['psql','-X','-At','-v','ON_ERROR_STOP=1','-c',q],text=True)
ADMIN='aaaaaaaa-0000-0000-0000-00000000000a'; ELEVE='bbbbbbbb-0000-0000-0000-00000000000b'
class Garde(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(dir='/tmp');os.chown(c.d,1000,1000);c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  subprocess.run(AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],check=True,capture_output=True,env=c.env)
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55491 -h ""','-w','start'],check=True,capture_output=True,env=c.env)
  c.sql("""CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
  CREATE TABLE user_roles(user_id uuid, role text);
  CREATE FUNCTION has_role(u uuid, r text) RETURNS boolean LANGUAGE sql AS $$SELECT exists(SELECT 1 FROM user_roles WHERE user_id=u AND role=r)$$;
  CREATE TABLE apprenant_documents_completes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), apprenant_id uuid, type_document text, donnees jsonb);""")
  c.sql(f"INSERT INTO user_roles VALUES('{ADMIN}','admin')")
  t=live("select pg_get_functiondef('public.garde_brouillon_apres_validation'::regproc)").replace("public.has_role(auth.uid(), 'admin')","public.has_role(auth.uid(), 'admin'::text)")
  cols=live("select string_agg(column_name||' '||data_type||coalesce(' DEFAULT '||column_default,''),',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='documents_completes_brouillons_refuses'").strip()
  c.sql(f"CREATE TABLE documents_completes_brouillons_refuses({cols})"); c.sql(t)
  c.sql(live("select pg_get_triggerdef(oid) from pg_trigger where tgname='trg_00_garde_brouillon_apres_validation'"))
 @classmethod
 def tearDownClass(c):
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],capture_output=True,env=c.env);shutil.rmtree(c.d)
 @classmethod
 def sql(c,q,uid=''):
  r=subprocess.run(['psql','-X','-q','-At','-h',c.d,'-p','55491','-U','postgres','-v','ON_ERROR_STOP=1'],input=f"SET test.uid='{uid}';"+q,capture_output=True,text=True,env=c.env)
  if r.returncode: raise RuntimeError(r.stderr)
  return r.stdout.strip()
 def setUp(self):
  self.sql("TRUNCATE apprenant_documents_completes, documents_completes_brouillons_refuses")
  self.id=self.sql("""INSERT INTO apprenant_documents_completes(apprenant_id,type_document,donnees) VALUES(gen_random_uuid(),'analyse-besoin','{"nom":"final","signature":"sig","_status":"completed"}') RETURNING id""").splitlines()[-1]
 def donnees(self): return self.sql(f"SELECT donnees::text FROM apprenant_documents_completes WHERE id='{self.id}'").splitlines()[-1]
 def test_brouillon_tardif_ignore_et_journalise(self):
  avant=self.donnees()
  self.sql(f"""UPDATE apprenant_documents_completes SET donnees='{{"nom":"brouillon"}}' WHERE id='{self.id}'""",ELEVE)
  self.assertEqual(self.donnees(),avant)
  self.assertEqual(self.sql("SELECT count(*) FROM documents_completes_brouillons_refuses").splitlines()[-1],'1')
 def test_brouillon_tardif_sans_session_service(self):
  avant=self.donnees(); self.sql(f"""UPDATE apprenant_documents_completes SET donnees='{{"nom":"b"}}' WHERE id='{self.id}'""")
  self.assertEqual(self.donnees(),avant)
 def test_revalidation_acceptee(self):
  self.sql(f"""UPDATE apprenant_documents_completes SET donnees='{{"nom":"v2","_status":"completed"}}' WHERE id='{self.id}'""",ELEVE)
  self.assertIn('"v2"',self.donnees())
 def test_admin_peut_modifier(self):
  self.sql(f"""UPDATE apprenant_documents_completes SET donnees='{{"nom":"admin"}}' WHERE id='{self.id}'""",ADMIN)
  self.assertIn('"admin"',self.donnees())
 def test_brouillon_avant_validation_libre(self):
  self.sql(f"""UPDATE apprenant_documents_completes SET donnees='{{"nom":"d1"}}' WHERE id='{self.id}'""",ADMIN)
  self.sql(f"""UPDATE apprenant_documents_completes SET donnees='{{"nom":"d2"}}' WHERE id='{self.id}'""",ELEVE)
  self.assertIn('"d2"',self.donnees())
if __name__=='__main__':unittest.main(verbosity=2)
