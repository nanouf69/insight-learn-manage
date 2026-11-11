"""Execute candidate against live schema on a disposable cluster. No production rows."""
import os,subprocess,tempfile,unittest,json,shutil
from pathlib import Path
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
U='22222222-2222-2222-2222-222222222222'; A='11111111-1111-1111-1111-111111111111'; ADMIN='33333333-3333-3333-3333-333333333333'
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='admin-subject-',dir='/tmp');os.chown(c.d,1000,1000);c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};c.addClassCleanup(c.cleanup)
  subprocess.run(AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],env=c.env,check=True,capture_output=True)
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55487 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
  c.sql("""CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text); CREATE TABLE storage.buckets(id text PRIMARY KEY);CREATE TABLE storage.objects(id uuid);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'::text$$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('sub',auth.uid(),'role',auth.role())$$;
  GRANT USAGE ON SCHEMA auth TO authenticated,anon;GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated,anon;""")
  catalog=json.loads(Path('src/test/fixtures/subject-reset-catalog-20261111.json').read_text())
  c.sql(catalog['schema'])
  for definition in catalog['functions']:c.sql(definition)
  c.sql(catalog['rls']);c.sql(catalog['triggers'])
  c.sql(Path('docs/sql-revue/2026-11-11-subject-reset.sql').read_text())
  c.sql(f"INSERT INTO auth.users VALUES('{U}','learner@example.invalid'),('{ADMIN}','admin@example.invalid');INSERT INTO apprenants(id,auth_user_id,nom,prenom,email) VALUES('{A}','{U}','FICTIF','Élève','learner@example.invalid');UPDATE apprenants SET modules_autorises=ARRAY[35,36,37,38];INSERT INTO user_roles(user_id,role) VALUES('{ADMIN}','admin');")
 @classmethod
 def sql(c,q,check=True):
  r=subprocess.run(['psql','-X','-At','-h',c.d,'-p','55487','-U','postgres','-v','ON_ERROR_STOP=1'],input=q,env=c.env,text=True,capture_output=True)
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 @classmethod
 def cleanup(c):
  if hasattr(c,'d'):
   subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True);shutil.rmtree(c.d,ignore_errors=True)
 def call(self,q,uid=ADMIN,check=True):return self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';"+q,check)
 def seed(self,exam,mid):
  s={'id':exam,'matieres':[{'id':mid,'nom':'A T3P','duree':45,'questions':[{'id':1,'enonce':'Fictif','type':'QCM','choix':[{'id':'A','texte':'Oui','correct':True}]}]},{'id':'anglais','nom':'E Anglais','duree':30,'questions':[{'id':1,'enonce':'Other','type':'QCM'}]}]}
  self.sql(f"INSERT INTO examens_blancs_parcours(module_id,exam_id) VALUES({36 if '-TAXI' in exam else 37 if '-ta' in exam else 38 if '-va' in exam else 35},'{exam}') ON CONFLICT DO NOTHING")
  self.sql(f"INSERT INTO module_editor_state(module_id,module_data) VALUES({len(exam)*100+len(mid)},'{json.dumps(s)}')")
 def context(self,exam,mid,uid=ADMIN):return json.loads(self.call(f"SELECT exam_subject_reset_context('{A}','{exam}','{mid}')",uid).stdout.splitlines()[-1])
 def authorize(self,c,op=None,uid=ADMIN,check=True):
  op=op or 'aaaaaaaa-1111-1111-1111-111111111111'
  return self.call(f"SELECT row_to_json(r) FROM admin_authorize_exam_subject_reset('{op}','{A}','{c['exam_id']}','{c['filiere']}','{c['matiere_id']}','Élève FICTIF','{c['source_token']}','{c['version_token']}')r",uid,check)
 def start(self,c,op=None):
  attempt="'%s'"%c['source_attempt_id'] if c['source_attempt_id'] else 'NULL'
  return self.call(f"SELECT row_to_json(r) FROM start_exam_subject_retake('{op or 'bbbbbbbb-1111-1111-1111-111111111111'}','{A}','{c['exam_id']}','{c['matiere_id']}','{c['source_exercice_id']}',{attempt})r",U)
 def test_01_unstarted_admin_then_learner_no_zero_timer_deferred_replay(self):
  self.seed('EB3','t3p');c=self.context('EB3','t3p');self.assertEqual(c['status'],'non_commencee')
  self.authorize(c);self.assertEqual(self.sql('SELECT count(*) FROM apprenant_examen_timers').stdout.strip(),'0');self.assertEqual(self.sql('SELECT count(*) FROM apprenant_quiz_results').stdout.strip(),'0')
  r=json.loads(self.start(c).stdout.splitlines()[-1]);self.assertEqual(r['tentative'],1);self.assertEqual(r['exercice_id'],'EB3__t3p');self.assertEqual(json.loads(self.start(c).stdout.splitlines()[-1]),r);self.assertEqual(self.sql('SELECT count(*) FROM apprenant_examen_timers').stdout.strip(),'1')
  self.assertEqual(self.sql('SELECT count(*) FROM apprenant_quiz_results').stdout.strip(),'0')
 def test_02_rights_and_identity(self):
  c=self.context('EB3','anglais');self.assertNotEqual(self.authorize(c,uid=U,check=False).returncode,0)
  wrong={**c,'filiere':'taxi'};self.assertNotEqual(self.authorize(wrong,check=False).returncode,0)
  self.assertNotEqual(self.call(f"SELECT exam_subject_reset_context('{A}','EB3','t3p')",'44444444-4444-4444-4444-444444444444',False).returncode,0)
 def test_03_scoped_48h_other_subject_and_history_intact(self):
  self.seed('EB4-TAXI','reglementation_taxi')
  self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at) VALUES('{A}','{U}','EB4-TAXI__reglementation_taxi','examen_blanc','{{\"1\":[\"A\"]}}',true,'submitted',now()),('{A}','{U}','EB4-TAXI__anglais','examen_blanc','{{\"1\":\"old\"}}',true,'submitted',now())")
  before=self.sql("SELECT json_agg(r ORDER BY exercice_id) FROM reponses_apprenants r WHERE exercice_id IN ('EB4-TAXI__reglementation_taxi','EB4-TAXI__anglais')").stdout
  c=self.context('EB4-TAXI','reglementation_taxi');self.authorize(c,'aaaaaaaa-2222-1111-1111-111111111111');r=json.loads(self.start(c,'bbbbbbbb-2222-1111-1111-111111111111').stdout.splitlines()[-1]);self.assertEqual(r['tentative'],2)
  self.assertEqual(before,self.sql("SELECT json_agg(r ORDER BY exercice_id) FROM reponses_apprenants r WHERE exercice_id IN ('EB4-TAXI__reglementation_taxi','EB4-TAXI__anglais')").stdout)
  other=self.context('EB4-TAXI','anglais');self.assertNotEqual(self.call(f"SELECT start_exam_subject_retake(gen_random_uuid(),'{A}','EB4-TAXI','anglais','EB4-TAXI__anglais',NULL)",U,False).returncode,0)
 def test_04_current_passage_refused(self):
  c=self.context('EB3','t3p');self.assertEqual(c['status'],'en_cours');self.assertNotEqual(self.authorize(c,'aaaaaaaa-3333-1111-1111-111111111111',check=False).returncode,0)
 def test_05_ta_va_real_compositions_no_cross_track(self):
  for i,(exam,mid) in enumerate([('eb5-ta','reglementation_taxi'),('eb6-va','reglementation_vtc')]):
   self.seed(exam,mid);c=self.context(exam,mid);self.authorize(c,f'aaaaaaaa-444{i}-1111-1111-111111111111');r=json.loads(self.start(c,f'bbbbbbbb-444{i}-1111-1111-111111111111').stdout.splitlines()[-1]);self.assertEqual(r['matiere_id'],mid)
   self.assertNotEqual(self.call(f"SELECT exam_subject_reset_context('{A}','{exam}','t3p')",U,False).returncode,0)
 def test_06_append_only_direct_write_and_replay(self):
  self.assertNotEqual(self.call("INSERT INTO exam_subject_reset_authorizations(operation_id) VALUES(gen_random_uuid())",U,False).returncode,0)
  self.assertNotEqual(self.sql("UPDATE exam_subject_reset_authorizations SET learner_name='bad'",False).returncode,0)
 def test_07_v2_native_published_snapshot_preserved_and_no_ai(self):
  self.seed('EB2','gestion')
  content={'exam_id':'EB2','exam_libelle':'Fictif EB2','matieres':[{'subject_id':'gestion','titre':'B Gestion','ordre':1,'duree':30,'coefficient':2,'note_sur':20,'note_eliminatoire':6}], 'questions':[{'id':'gestion:1','matiere':'gestion','ordre':1,'type':'QCM','enonce':'Fictif','points':1,'choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  version='cccccccc-1111-1111-1111-111111111111';attempt='dddddddd-1111-1111-1111-111111111111'
  snap={**content,'matiere':'gestion','tentative':1}
  self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif,is_test) VALUES('{version}','VTC','2','EB2',1,'publiee','{json.dumps(content)}','test','isolated',true);INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,finished_at,is_test) VALUES('{attempt}','{A}','EB2','{version}','{json.dumps(snap)}','old','terminee',now(),true)")
  before=self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{attempt}'").stdout
  c=self.context('EB2','gestion');self.assertEqual(c['source_attempt_id'],attempt);self.authorize(c,'aaaaaaaa-5555-1111-1111-111111111111')
  r=json.loads(self.start(c,'bbbbbbbb-5555-1111-1111-111111111111').stdout.splitlines()[-1]);self.assertEqual(r['moteur'],'v2');self.assertNotEqual(r['attempt_id'],attempt)
  self.assertEqual(before,self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{attempt}'").stdout)
  self.assertEqual(self.sql("SELECT count(*) FROM qrc_ia_corrections").stdout.strip(),'0')
 def test_08_concurrency_single_authorization(self):
  from concurrent.futures import ThreadPoolExecutor
  c=self.context('EB3','anglais')
  with ThreadPoolExecutor(max_workers=2) as pool:
   results=list(pool.map(lambda op:json.loads(self.authorize(c,op).stdout.splitlines()[-1]),['aaaaaaaa-6666-1111-1111-111111111111','aaaaaaaa-7777-1111-1111-111111111111']))
  self.assertEqual(results[0]['operation_id'],results[1]['operation_id'])
  self.assertEqual(self.sql(f"SELECT count(*) FROM exam_subject_reset_authorizations WHERE apprenant_id='{A}' AND exam_id='EB3' AND matiere_id='anglais'").stdout.strip(),'1')
 def test_09_first_start_then_real_retake_does_not_replay_initial_copy(self):
  self.seed('EB6','t3p');c=self.context('EB6','t3p');self.authorize(c,'aaaaaaaa-8888-1111-1111-111111111111')
  first=json.loads(self.start(c,'bbbbbbbb-8888-1111-1111-111111111111').stdout.splitlines()[-1])
  self.sql(f"UPDATE reponses_apprenants SET completed=true,status='submitted',submitted_at=now(),reponses='{{\"1\":[\"A\"]}}' WHERE apprenant_id='{A}' AND exercice_id='EB6__t3p';INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,score_obtenu) VALUES('{A}','{U}','EB6','Fictif','t3p','T3P',1,20)")
  before=self.sql("SELECT to_jsonb(r) FROM reponses_apprenants r WHERE exercice_id='EB6__t3p'").stdout
  c=self.context('EB6','t3p');self.authorize(c,'aaaaaaaa-9999-1111-1111-111111111111')
  second=json.loads(self.start(c,'bbbbbbbb-9999-1111-1111-111111111111').stdout.splitlines()[-1])
  self.assertEqual(second['tentative'],2);self.assertEqual(second['exercice_id'],'EB6__t3p__t2');self.assertNotEqual(second['operation_id'],first['operation_id'])
  self.assertEqual(before,self.sql("SELECT to_jsonb(r) FROM reponses_apprenants r WHERE exercice_id='EB6__t3p'").stdout)
  self.assertEqual(json.loads(self.start(c,'bbbbbbbb-9999-1111-1111-111111111111').stdout.splitlines()[-1]),second)
  self.assertEqual(self.sql("SELECT count(*) FROM apprenant_quiz_results WHERE quiz_id='EB6'").stdout.strip(),'1')
if __name__=='__main__':unittest.main(verbosity=2)
