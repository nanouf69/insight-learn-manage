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
  if 'exam_subject_retakes' not in dump: cls.sql(Path('docs/subject-retake.sql').read_text())  # already live after 0212
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
 def q(self,sql,uid=None,check=True):
  pre=f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}';" if uid else ''
  return self.sql(pre+sql,check)
 def seed(self,exam):
  self.sql(f"""INSERT INTO module_editor_state(module_id,module_data) VALUES(9{exam[-1]}1,'{{"id":"{exam}","matieres":[{{"id":"gestion","duree":30,"questions":[{{"id":1,"type":"QCM","enonce":"Fictive","choix":[]}}]}}]}}');
  INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,tentative,reponses,completed,status,submitted_at,updated_at) VALUES
   ('{A}','{U}','{exam}__gestion','examen_blanc',1,'{{"1":["A"]}}',true,'submitted',now()-interval '49 hours',now()-interval '49 hours'),
   ('{A}','{U}','{exam}__anglais','examen_blanc',1,'{{"1":["B"]}}',true,'submitted',now()-interval '49 hours',now()-interval '49 hours');
  INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,quiz_type,details) VALUES
   ('{A}','{U}','{exam}','Fictif','gestion','Gestion',1,'examen_blanc','{{"historical":"T1"}}'),
   ('{A}','{U}','{exam}','Fictif','anglais','Anglais',1,'examen_blanc','{{"historical":"autre"}}');""")
 def history(self,exam):
  return self.sql(f"SELECT json_agg(x ORDER BY x::text) FROM (SELECT to_jsonb(r)-'updated_at' x FROM reponses_apprenants r WHERE exercice_id IN ('{exam}__gestion','{exam}__anglais') UNION ALL SELECT to_jsonb(q) FROM apprenant_quiz_results q WHERE quiz_id='{exam}' AND tentative=1) z").stdout
 def test_end_to_end_retake_close_reload_history(self):
  self.seed('EB1'); before=self.history('EB1')
  op='aaaaaaaa-0000-0000-0000-000000000001'
  call=lambda o:self.q(f"SELECT exercice_id||'|'||tentative FROM start_exam_subject_retake('{o}','{A}','EB1','gestion','EB1__gestion',NULL)",U).stdout.strip().splitlines()[-1]
  r=call(op); self.assertEqual(r,'EB1__gestion__t2|2')
  self.assertEqual(call('aaaaaaaa-0000-0000-0000-000000000002'),r)  # double clic
  self.q("UPDATE reponses_apprenants SET reponses='{\"1\":[\"C\"]}' WHERE exercice_id='EB1__gestion__t2'",U)
  self.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,quiz_type,details) VALUES('{A}','{U}','EB1','Fictif','gestion','Gestion',2,'examen_blanc','{{}}')")
  self.q("UPDATE reponses_apprenants SET completed=true,status='submitted',submitted_at=now() WHERE exercice_id='EB1__gestion__t2'",U)
  self.assertEqual(self.history('EB1'),before,'T1 et autres matières doivent rester identiques')
  self.assertEqual(self.sql(f"SELECT details->>'source_tentative' FROM apprenant_quiz_results WHERE quiz_id='EB1' AND matiere_id='gestion' AND tentative=2").stdout.strip(),'2')
  self.assertEqual(self.q(f"SELECT count(*) FROM exam_subject_retakes WHERE operation_id='{op}'",U).stdout.strip().splitlines()[-1],'1')  # rechargement
  O2='99999999-9999-9999-9999-999999999999'
  self.assertEqual(self.q("SELECT count(*) FROM exam_subject_retakes",O2).stdout.strip().splitlines()[-1],'0')
  self.assertNotEqual(self.q(f"SELECT start_exam_subject_retake(gen_random_uuid(),'{A}','EB1','gestion','EB1__gestion',NULL)",O2,False).returncode,0)
  self.assertEqual(self.sql("SELECT count(*) FROM reponses_apprenants WHERE exercice_id LIKE 'EB1__gestion%'").stdout.strip(),'2')
 def test_too_early_refused_live(self):
  self.seed('EB3'); self.sql("UPDATE reponses_apprenants SET submitted_at=now(),updated_at=now() WHERE exercice_id LIKE 'EB3__%'")
  r=self.q(f"SELECT start_exam_subject_retake(gen_random_uuid(),'{A}','EB3','gestion','EB3__gestion',NULL)",U,False)
  self.assertIn('autorisation',r.stderr)
 def test_legacy_completion_without_receipt_unchanged(self):
  # Non-regression hors nouveau flux : ancien comportement MAX(tentative) conservé.
  self.seed('EB2')
  self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,tentative) VALUES('{A}','{U}','EB2__francais','examen_blanc',1); INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,quiz_type,details) VALUES('{A}','{U}','EB2','Fictif','francais','Français',1,'examen_blanc','{{}}')")
  self.sql("UPDATE reponses_apprenants SET reponses='{\"1\":[\"A\"]}',completed=true WHERE exercice_id='EB2__francais'")
  self.assertEqual(self.sql("SELECT details->>'source_exercice_id' FROM apprenant_quiz_results WHERE quiz_id='EB2' AND matiere_id='francais'").stdout.strip(),'EB2__francais')
if __name__=='__main__':unittest.main(verbosity=2)
