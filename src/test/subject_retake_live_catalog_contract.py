"""Disposable live-catalog contract; never imports production rows or dispatches external effects."""
import os, subprocess, tempfile, unittest, shutil, json
from pathlib import Path
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
A='11111111-1111-1111-1111-111111111111';U='22222222-2222-2222-2222-222222222222'
class LiveCatalog(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.d=tempfile.mkdtemp(prefix='retake-catalog-',dir='/tmp');os.chown(cls.d,1000,1000)
  cls.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};cls.addClassCleanup(cls.cleanup)
  subprocess.run(AS+['initdb','-D',cls.d+'/db','-U','postgres','-A','trust','--no-locale'],check=True,capture_output=True,env=cls.env)
  subprocess.run(AS+['pg_ctl','-D',cls.d+'/db','-l',cls.d+'/log','-o',f'-k {cls.d} -p 55479 -h ""','-w','start'],check=True,capture_output=True,env=cls.env)
  cls.sql("""CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
  CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
  CREATE TABLE storage.buckets(id text PRIMARY KEY); CREATE TABLE storage.objects(id uuid);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated') $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('sub',auth.uid(),'role',auth.role()) $$;
  GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated,anon;""")
  dump=subprocess.check_output(['pg_dump','--schema-only','--schema=public','--no-owner'],text=True)
  # Local initdb already contains public. External extensions are not exercised.
  dump=dump.replace('CREATE SCHEMA public;','')
  result=cls.sql(dump,check=False);Path(cls.d+'/restore-errors.log').write_text(result.stderr)
  cls.sql(Path('docs/subject-retake.sql').read_text())
  cls.sql(f"INSERT INTO auth.users VALUES('{U}','fictif@example.invalid'); INSERT INTO apprenants(id,auth_user_id,nom,prenom,email) VALUES('{A}','{U}','FICTIF','ISOLÉ','fictif@example.invalid');")
 @classmethod
 def cleanup(cls):
  if os.path.exists(cls.d):
   subprocess.run(AS+['pg_ctl','-D',cls.d+'/db','-m','immediate','stop'],capture_output=True,env=cls.env)
   # Keep diagnostic files, never credentials or production data.
   shutil.rmtree(cls.d+'/db',ignore_errors=True)
 @classmethod
 def sql(cls,q,check=True):
  r=subprocess.run(['psql','-X','-At','-h',cls.d,'-p','55479','-U','postgres'],input=q,capture_output=True,text=True,env=cls.env)
  if 'ERROR:' in r.stderr: r.returncode=1
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 def test_relevant_triggers_match_live(self):
  q="SELECT string_agg(tgname||':'||pg_get_triggerdef(oid),E'\\n' ORDER BY tgname) FROM pg_trigger WHERE tgrelid='public.reponses_apprenants'::regclass AND NOT tgisinternal"
  expected=subprocess.check_output(['psql','-X','-At','-c',q],text=True)
  self.assertEqual(self.sql(q).stdout,expected)
 def test_learner_receipt_direct_insert_refused(self):
  r=self.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{U}'; INSERT INTO exam_subject_retakes(operation_id,apprenant_id,exam_id,matiere_id,source_exercice_id,exercice_id,tentative,moteur,matiere) VALUES(gen_random_uuid(),'{A}','EB1','gestion','EB1__gestion','EB1__gestion__t2',2,'ancien','{{}}')",False)
  self.assertNotEqual(r.returncode,0)
 def test_production_completion_preserves_other_tentative(self):
  # Demonstrates whether production trigger silently modifies T1 while T2 closes.
  self.sql(f"""INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,matiere_id,tentative,quiz_type,details) VALUES('{A}','{U}','EB1','gestion',1,'examen_blanc','{{"historical":"must-stay-identical"}}');
  INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,tentative) VALUES('{A}','{U}','EB1__gestion__t2','examen_blanc',2);""")
  before=self.sql(f"SELECT details FROM apprenant_quiz_results WHERE apprenant_id='{A}' AND tentative=1").stdout
  self.sql(f"SET request.jwt.claim.sub='{U}'; UPDATE reponses_apprenants SET reponses='{{\"1\":[\"A\"]}}',completed=true WHERE apprenant_id='{A}' AND exercice_id='EB1__gestion__t2'")
  after=self.sql(f"SELECT details FROM apprenant_quiz_results WHERE apprenant_id='{A}' AND tentative=1").stdout
  self.assertEqual(after,before,'BLOCKER: live completion trigger rewrites an earlier result details when a new subject closes')
if __name__=='__main__':unittest.main(verbosity=2)