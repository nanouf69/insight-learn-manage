"""Candidate only; new socket-only PostgreSQL, no inherited credentials or real rows."""
import os,subprocess,tempfile,shutil,unittest,json,uuid
from pathlib import Path
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
A='11111111-1111-1111-1111-111111111111';U='22222222-2222-2222-2222-222222222222';ADMIN='33333333-3333-3333-3333-333333333333';S='44444444-4444-4444-4444-444444444444';S2='55555555-5555-5555-5555-555555555555'
J=lambda o:"'"+json.dumps(o).replace("'","''")+"'"
class Access(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='session-exam-',dir='/tmp');os.chown(c.d,1000,1000)
  c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};c.addClassCleanup(c.cleanup)
  for cmd in [AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55489 -h ""','-w','start']]:subprocess.run(cmd,env=c.env,check=True,capture_output=True)
  c.sql("CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO authenticated;")
  cat=json.loads(Path('src/test/fixtures/subject-reset-catalog-20261111.json').read_text());c.sql(cat['schema'])
  for f in cat['functions']:c.sql(f)
  c.sql(cat['rls']);c.sql(cat['triggers'])
  c.sql("CREATE TABLE sessions(id uuid PRIMARY KEY,nom text,type_session text,types_apprenant text[]);CREATE TABLE session_apprenants(session_id uuid,apprenant_id uuid,liste_attente boolean);")
  c.sql(Path('docs/sql-revue/2026-11-11-session-exam-access.sql').read_text())
  c.sql(f"INSERT INTO apprenants(id,auth_user_id,nom,prenom,type_apprenant,modules_autorises) VALUES('{A}','{U}','FICTIF','Élève','vtc',ARRAY[35]);INSERT INTO user_roles(user_id,role) VALUES('{ADMIN}','admin');INSERT INTO sessions VALUES('{S}','VTC SOIR','theorique',ARRAY['VTC','TAXI']),('{S2}','TAXI JOUR','theorique',ARRAY['TAXI','TA']);INSERT INTO session_apprenants VALUES('{S}','{A}',false),('{S2}','{A}',false);INSERT INTO examens_blancs_parcours VALUES(35,'EB3'),(36,'EB3-TAXI'),(37,'EB3-ta'),(38,'EB3-va');")
 @classmethod
 def sql(c,q,check=True):
  r=subprocess.run(['psql','-X','-At','-h',c.d,'-p','55489','-U','postgres','-v','ON_ERROR_STOP=1'],input=q,env=c.env,text=True,capture_output=True)
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 @classmethod
 def cleanup(c):
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True);shutil.rmtree(c.d,ignore_errors=True)
 def call(self,q,uid=ADMIN,check=True):return self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';"+q,check)
 def set_access(self,opened,session=S,expected=None,op=None,check=True,uid=ADMIN):
  op=op or str(uuid.uuid4());name='VTC SOIR' if session==S else 'TAXI JOUR'
  expected_sql="'"+expected+"'" if expected else 'NULL'
  r=self.call(f"SELECT admin_set_session_exam_access('{op}','{session}','EB3',{str(opened).lower()},{expected_sql},'{name}')",uid,check)
  return op,r
 def current(self,session=S):return self.sql(f"SELECT operation_id FROM session_exam_access_events WHERE session_id='{session}' AND exam_id='EB3' ORDER BY revision DESC LIMIT 1").stdout.strip() or None
 def gate(self,exam='EB3',check=True):return self.sql(f"SELECT assert_session_exam_start('{A}','{exam}')",check)
 def test_01_default_no_row_no_change(self):
  self.gate();self.assertEqual(self.sql('SELECT count(*) FROM session_exam_access_events').stdout.strip(),'0')
 def test_02_closed_refuses_before_attempt_or_timer(self):
  op,_=self.set_access(False,expected=self.current());self.assertNotEqual(self.gate(check=False).returncode,0)
  r=self.sql(f"INSERT INTO apprenant_examen_timers(apprenant_id,exercice_id,duree_secondes,tentative) VALUES('{A}','EB3__t3p',2700,1)",False)
  self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr);self.assertEqual(self.sql('SELECT count(*) FROM apprenant_examen_timers').stdout.strip(),'0')
 def test_03_open_allows_only_existing_entitlement(self):
  self.set_access(True,expected=self.current());self.gate()
  self.assertEqual(self.sql(f"SELECT modules_autorises FROM apprenants WHERE id='{A}'").stdout.strip(),'{35}')
 def test_04_closure_during_legacy_keeps_exact_timer(self):
  self.set_access(True,expected=self.current());self.sql(f"INSERT INTO apprenant_examen_timers(apprenant_id,exercice_id,duree_secondes,tentative) VALUES('{A}','EB3__anglais',1800,1)")
  before=self.sql("SELECT to_jsonb(t) FROM apprenant_examen_timers t WHERE exercice_id='EB3__anglais'").stdout
  self.set_access(False,expected=self.current());self.sql(f"INSERT INTO apprenant_examen_timers(apprenant_id,exercice_id,duree_secondes,tentative) VALUES('{A}','EB3__anglais',1800,1) ON CONFLICT(apprenant_id,exercice_id,tentative) DO NOTHING")
  self.assertEqual(before,self.sql("SELECT to_jsonb(t) FROM apprenant_examen_timers t WHERE exercice_id='EB3__anglais'").stdout)
 def test_05_permissions_and_no_direct_journal_write(self):
  self.assertNotEqual(self.set_access(True,expected=self.current(),uid=U,check=False)[1].returncode,0)
  self.assertNotEqual(self.call("INSERT INTO session_exam_access_events(operation_id,session_id,exam_id,opened,author) SELECT gen_random_uuid(),id,'EB3',true,auth.uid() FROM sessions LIMIT 1",U,False).returncode,0)
  self.assertNotEqual(self.call(f"SELECT assert_session_exam_start('{A}','EB3')",U,False).returncode,0)
 def test_06_elearning_unchanged(self):
  self.set_access(False,expected=self.current());self.sql(f"UPDATE apprenants SET type_apprenant='vtc-e' WHERE id='{A}'")
  self.gate();self.sql(f"UPDATE apprenants SET type_apprenant='vtc' WHERE id='{A}'")
 def test_07_cross_enrollment_closure_wins(self):
  self.set_access(False,session=S2,expected=self.current(S2));self.set_access(True,expected=self.current())
  r=self.gate(check=False);self.assertNotEqual(r.returncode,0);self.assertIn('TAXI JOUR',r.stderr)
  self.set_access(True,session=S2,expected=self.current(S2));self.gate()
 def test_08_outside_track_session_not_affected(self):
  self.sql(f"UPDATE sessions SET types_apprenant=ARRAY['TA'] WHERE id='{S2}'")
  self.gate();self.assertEqual(self.gate('EB3-TAXI',False).returncode,0)
  self.sql(f"UPDATE sessions SET types_apprenant=ARRAY['TAXI','TA'] WHERE id='{S2}'")
 def test_09_replay_cas_and_immutable_journal(self):
  prev=self.current();op,r=self.set_access(False,expected=prev);self.assertEqual(r.stdout,self.set_access(False,expected=prev,op=op)[1].stdout)
  self.assertNotEqual(self.set_access(True,expected=prev,check=False)[1].returncode,0)
  self.assertNotEqual(self.sql('UPDATE session_exam_access_events SET opened=true',False).returncode,0)
 def test_10_v2_continuation_save_and_finish_not_gated(self):
  self.set_access(True,expected=self.current());version=str(uuid.uuid4());attempt=str(uuid.uuid4())
  snap={'matiere':'gestion','tentative':2,'matieres':[{'subject_id':'gestion','duree':30}], 'questions':[{'id':'gestion:1','matiere':'gestion','type':'QCM','points':1,'choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint) VALUES('{version}','VTC','3','EB3',1,'publiee','{{}}','f');INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint) VALUES('{attempt}','{A}','EB3','{version}',{J(snap)},'f')")
  self.set_access(False,expected=self.current())
  self.sql(f"INSERT INTO apprenant_examen_timers(apprenant_id,exercice_id,duree_secondes,tentative) VALUES('{A}','EB3__gestion',1800,2)")
  self.call(f"SELECT core_save_answer(gen_random_uuid(),'{attempt}','gestion:1','[\"A\"]',0,NULL);SELECT core_finalize_attempt(gen_random_uuid(),'{attempt}',ARRAY[]::text[],'{{}}')",U)
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{attempt}'").stdout.strip(),'terminee')
  bad=self.sql(f"INSERT INTO exam_attempts_v2(apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint) VALUES('{A}','EB3','{version}','{{\"matiere\":\"gestion\"}}','f')",False)
  self.assertNotEqual(bad.returncode,0)
 def test_11_waiting_list_and_other_session_untouched(self):
  self.sql(f"UPDATE session_apprenants SET liste_attente=true WHERE apprenant_id='{A}'")
  self.gate();self.sql(f"UPDATE session_apprenants SET liste_attente=false WHERE apprenant_id='{A}'")
 def test_12_new_retake_closed_rolls_back(self):
  before=self.sql('SELECT count(*) FROM exam_subject_retakes').stdout
  r=self.sql(f"INSERT INTO exam_subject_retakes(operation_id,apprenant_id,exam_id,matiere_id,source_exercice_id,exercice_id,tentative,moteur,matiere) VALUES(gen_random_uuid(),'{A}','EB3','t3p','EB3__t3p','EB3__t3p__t2',2,'ancien','{{}}')",False)
  self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr);self.assertEqual(before,self.sql('SELECT count(*) FROM exam_subject_retakes').stdout)
 def test_13_concurrent_admin_confirmation_only_one_wins(self):
  from concurrent.futures import ThreadPoolExecutor
  previous=self.current()
  with ThreadPoolExecutor(max_workers=2) as pool:
   outcomes=list(pool.map(lambda opened:self.set_access(opened,expected=previous,check=False)[1].returncode,[True,False]))
  self.assertEqual(sum(x==0 for x in outcomes),1)
 def test_14_start_lock_serializes_closure_until_commit(self):
  # First prove the exact lock is held by the gate, then prove a concurrent closure waits.
  import time
  self.set_access(True,expected=self.current())
  child=subprocess.Popen(['psql','-X','-At','-h',self.d,'-p','55489','-U','postgres','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=self.env,text=True)
  child.stdin.write(f"BEGIN;SELECT assert_session_exam_start('{A}','EB3');\\echo gate_locked\n")
  child.stdin.flush()
  while child.stdout.readline().strip()!='gate_locked':
   if child.poll() is not None:self.fail('gate failed')
  lock=self.sql("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND mode='ShareLock' AND granted").stdout.strip();self.assertGreater(int(lock),0)
  from concurrent.futures import ThreadPoolExecutor
  with ThreadPoolExecutor(max_workers=1) as pool:
   future=pool.submit(self.set_access,False,S,self.current())
   deadline=time.monotonic()+5;waiting=False
   while time.monotonic()<deadline:
    if self.sql("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND NOT granted").stdout.strip()!='0':waiting=True;break
   self.assertTrue(waiting);self.assertFalse(future.done())
   child.stdin.write('COMMIT;\\q\n');child.stdin.flush();child.wait(timeout=5)
   self.assertEqual(future.result(timeout=5)[1].returncode,0)
  self.assertNotEqual(self.gate(check=False).returncode,0)
  child.stdin.close();child.stdout.close();child.stderr.close()
 def test_15_unknown_and_distanciel_preserve_access(self):
  for kind,slot in [('vtc','en ligne'),('',''),('vtc-e-presentiel','')]:
   self.sql(f"UPDATE apprenants SET type_apprenant='{kind}',creneau_horaire='{slot}' WHERE id='{A}'")
   self.gate()
  self.sql(f"UPDATE apprenants SET type_apprenant='vtc',creneau_horaire=NULL WHERE id='{A}'")
 def test_16_unit_does_not_require_batch_or_touch_other_exam(self):
  self.assertEqual(self.sql("SELECT count(*) FROM pg_proc WHERE proname='admin_set_sessions_exam_access'").stdout.strip(),'0')
  before=self.sql(f"SELECT to_jsonb(e) FROM session_exam_access_events e WHERE session_id<>'{S}' OR exam_id<>'EB3' ORDER BY revision").stdout
  self.set_access(False,expected=self.current());self.assertNotEqual(self.gate(check=False).returncode,0)
  self.assertEqual(self.gate('EB3-TAXI',False).returncode,0)
  after=self.sql(f"SELECT to_jsonb(e) FROM session_exam_access_events e WHERE session_id<>'{S}' OR exam_id<>'EB3' ORDER BY revision").stdout
  self.assertEqual(before,after)
if __name__=='__main__':unittest.main(verbosity=2)