"""New blocker tests ONLY, socket-only disposable cluster; no Cloud writes."""
import json,uuid,unittest,subprocess,time
from pathlib import Path
import exam_reset_cancel_live_contract as base
from admin_subject_reset_sql_contract import A,U,ADMIN
J=lambda x:"'"+json.dumps(x).replace("'","''")+"'"
class Integration(base.Integrated):
 @classmethod
 def setUpClass(c):
  super().setUpClass()
  c.sql(Path('docs/sql-revue/2026-11-11-exam-reset-cancellation-integration.sql').read_text())
  base.base.Live.env['PGCLIENTENCODING']='UTF8'
  c.sql(Path('src/test/fixtures/core_correct_qrc_live_20261107.sql').read_text())
  # Fresh read-only live policy inspection: catalog fixture omitted QRC RLS.
  c.sql("ALTER TABLE qrc_instances_v2 ENABLE ROW LEVEL SECURITY;CREATE POLICY fixture_live_qrc_read ON qrc_instances_v2 FOR SELECT TO authenticated USING(core_est_proprietaire(apprenant_id) OR has_role(auth.uid(),'admin'));CREATE POLICY fixture_live_qrc_insert ON qrc_instances_v2 FOR INSERT TO authenticated WITH CHECK(true);CREATE POLICY fixture_live_qrc_update ON qrc_instances_v2 FOR UPDATE TO authenticated USING(has_role(auth.uid(),'admin')) WITH CHECK(has_role(auth.uid(),'admin'));")
 def setup_exam(self,exam):
  mids=['t3p','gestion','securite','francais','anglais','reglementation_taxi','reglementation_taxi2']
  version=str(uuid.uuid4());reset=str(uuid.uuid4());ats=[];rs=[];ls=[]
  content={'exam_id':exam,'exam_libelle':'FICTIF', 'matieres':[{'subject_id':m,'titre':m,'ordre':i+1,'duree':30,'coefficient':3,'note_sur':20,'note_eliminatoire':6} for i,m in enumerate(mids)],'questions':[{'id':m+':1','matiere':m,'ordre':1,'type':'QRC','enonce':'FICTIF '+m,'reponseQRC':'FICTIF attendu','points':4} for m in mids]}
  self.sql(f"INSERT INTO examens_blancs_parcours(module_id,exam_id) VALUES(36,'{exam}') ON CONFLICT DO NOTHING;INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,is_test) VALUES('{version}','TAXI','3','{exam}',1,'publiee',{J(content)},'fictif',true)")
  for i,m in enumerate(mids):
   att=str(uuid.uuid4());result=str(uuid.uuid4());legacy=str(uuid.uuid4());ats.append(att);rs.append(result);ls.append(legacy)
   snap={**content,'matiere':m,'tentative':1,'questions':[content['questions'][i]],'matieres':[content['matieres'][i]]}
   self.sql(f"INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,started_at,finished_at,is_test) VALUES('{att}','{A}','{exam}','{version}',{J(snap)},'f','en_cours',now()-interval '3 days',NULL,true);INSERT INTO core_exam_results(result_id,attempt_id,apprenant_id,score,total,status,qrc_restantes,result_revision) VALUES('{result}','{att}','{A}',17,20,'definitif',0,1);INSERT INTO qrc_instances_v2(qrc_instance_id,attempt_id,apprenant_id,question_id,reponse,etat,note) VALUES(gen_random_uuid(),'{att}','{A}','{m}:1',{J('FICTIF answer')},'en_attente',NULL);UPDATE exam_attempts_v2 SET etat='terminee',finished_at=now()-interval '3 days' WHERE attempt_id='{att}';INSERT INTO apprenant_quiz_results(id,apprenant_id,user_id,quiz_id,quiz_type,quiz_titre,matiere_id,matiere_nom,score_obtenu,score_max,note_sur_20,tentative,created_at,completed_at) VALUES('{legacy}','{A}','{U}','{exam}','examen_blanc','FICTIF','{m}','{m}',17,20,17,1,now()-interval '3 days',now()-interval '3 days');")
  for att in ats:
   qid=self.scalar(f"SELECT qrc_instance_id FROM qrc_instances_v2 WHERE attempt_id='{att}'")
   self.call(f"SELECT core_correct_qrc('{uuid.uuid4()}','{qid}',4,'FICTIF human','admin@example.invalid')")
  before=self.fingerprint(exam)
  self.sql(f"INSERT INTO core_exam_resets(reset_id,operation_id,apprenant_id,exam_id,archived_attempt_ids,archived_core_result_ids,archived_legacy_result_ids,motif) VALUES('{reset}',gen_random_uuid(),'{A}','{exam}',{J(ats)},{J(rs)},{J(ls)},'fixture');INSERT INTO core_tentatives_neutralisees(attempt_id,apprenant_id,exam_id,motif) SELECT attempt_id,apprenant_id,exam_id,'Archive par remise a zero administrative {reset}' FROM exam_attempts_v2 WHERE exam_id='{exam}';INSERT INTO exam_retake_authorizations(apprenant_id,exam_id,reset_id,motif) VALUES('{A}','{exam}','{reset}','fixture')")
  return reset,before
 def fingerprint(self,exam):
  return self.scalar(f"SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,'')) FROM (SELECT to_jsonb(a) x FROM exam_attempts_v2 a WHERE exam_id='{exam}' UNION ALL SELECT to_jsonb(r) FROM core_exam_results r JOIN exam_attempts_v2 a USING(attempt_id) WHERE a.exam_id='{exam}' UNION ALL SELECT to_jsonb(q) FROM apprenant_quiz_results q WHERE quiz_id='{exam}' UNION ALL SELECT to_jsonb(q) FROM qrc_instances_v2 q JOIN exam_attempts_v2 a USING(attempt_id) WHERE a.exam_id='{exam}')s")
 def cancel_it(self,exam,reset,check=True):
  cutoff=self.scalar(f"SELECT cutoff_at FROM core_exam_resets WHERE reset_id='{reset}'")
  return self.call(f"SELECT admin_cancel_exam_reset('{uuid.uuid4()}','{A}','{reset}','{exam}','{cutoff}')",check=check)
 def test_01_seven_copies_restored_reads_and_v2_no_cancelled_grant(self):
  exam='EB3-TAXI';reset,before=self.setup_exam(exam)
  query=f"SELECT count(*) FROM core_exam_results c JOIN exam_attempts_v2 a USING(attempt_id) WHERE a.exam_id='{exam}' AND NOT EXISTS(SELECT 1 FROM core_exam_neutralisations_effective n WHERE n.attempt_id=a.attempt_id)"
  self.assertEqual(self.scalar(query),'0');self.cancel_it(exam,reset);self.assertEqual(self.scalar(query),'7')
  self.assertEqual(before,self.fingerprint(exam))
  # Real authenticated RLS readers; no admin-as-superuser shortcut.
  for uid in [ADMIN,U]:
   self.assertEqual(self.api(query,uid).stdout.strip().splitlines()[-1],'7')
   self.assertEqual(self.api(f"SELECT count(*) FROM apprenant_quiz_results q WHERE quiz_id='{exam}' AND NOT EXISTS(SELECT 1 FROM core_exam_resets_effective r WHERE r.archived_legacy_result_ids ? q.id::text)",uid).stdout.strip().splitlines()[-1],'7')
   self.assertEqual(self.api(f"SELECT count(*) FROM qrc_instances_v2 q JOIN exam_attempts_v2 a USING(attempt_id) WHERE a.exam_id='{exam}' AND NOT EXISTS(SELECT 1 FROM core_exam_neutralisations_effective n WHERE n.attempt_id=a.attempt_id)",uid).stdout.strip().splitlines()[-1],'7')
  # Export ONLY fictitious projection rows for exercising existing TS readers.
  tables={}
  for table in ['core_exam_resets','core_exam_resets_effective','core_tentatives_neutralisees','core_exam_neutralisations_effective','exam_retake_authorizations','exam_retake_authorizations_effective','qrc_instances_v2','core_exam_results','apprenant_quiz_results','answer_state']:
   tables[table]=json.loads(self.scalar(f"SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') FROM {table} t"))
  tables['exam_attempts_v2']=json.loads(self.scalar("SELECT coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('matiere',snapshot->>'matiere','matieres',snapshot->'matieres','questions',snapshot->'questions','tentative',snapshot->>'tentative','result_id',snapshot->'source_historique'->>'result_id','historique',snapshot->'source_historique')),'[]') FROM exam_attempts_v2 t"))
  Path('/tmp/exam-reset-cancel-reader-fixture.json').write_text(json.dumps(tables))
  out=self.call(f"SELECT core_start_attempt('{uuid.uuid4()}','{A}','{exam}','t3p')",U,False)
  self.assertEqual(out.returncode,0,out.stderr)
  self.assertEqual(self.scalar(f"SELECT count(*) FROM exam_retake_authorizations WHERE reset_id='{reset}' AND consumed_at IS NULL"),'1')
  self.assertEqual(self.scalar(f"SELECT count(*) FROM exam_attempts_v2 WHERE snapshot->>'reset_authorization_id'=(SELECT id::text FROM exam_retake_authorizations WHERE reset_id='{reset}')"),'0')
  self.assertEqual(self.scalar("SELECT count(*) FROM _effets_externes"),'0')
 def test_05_other_owner_cannot_read_restore_or_see_qrc(self):
  other='77777777-7777-4777-8777-777777777777';uid='88888888-8888-4888-8888-888888888888'
  self.sql(f"INSERT INTO auth.users(id,email) VALUES('{uid}','other@example.invalid');INSERT INTO apprenants(id,auth_user_id,nom,prenom,email) VALUES('{other}','{uid}','OTHER','FICTIF','other@example.invalid')")
  self.assertEqual(self.api("SELECT count(*) FROM core_exam_reset_cancellations",uid).stdout.strip().splitlines()[-1],'0')
  self.assertEqual(self.api("SELECT count(*) FROM qrc_instances_v2",uid).stdout.strip().splitlines()[-1],'0')
  reset=self.scalar(f"SELECT reset_id FROM core_exam_resets WHERE exam_id='EB3-TAXI' AND apprenant_id='{A}'")
  self.assertNotEqual(self.api(f"SELECT admin_exam_reset_cancel_context('{A}','{reset}')",uid,False).returncode,0)
 def test_02_legacy_timer_new_start_refuses_restoration(self):
  exam='EB4-TAXI';reset,before=self.setup_exam(exam)
  out=self.api(f"SELECT start_or_get_exam_timer('{A}','{exam}__t3p__t2',1800,2)",U,False)
  self.assertEqual(out.returncode,0,out.stderr)
  refused=self.cancel_it(exam,reset,False);self.assertNotEqual(refused.returncode,0);self.assertIn('chronomètre',refused.stderr)
  self.assertEqual(before,self.fingerprint(exam))
 def test_03_legacy_start_wins_concurrent_cancel(self):
  exam='EB5-TAXI';reset,_=self.setup_exam(exam)
  from concurrent.futures import ThreadPoolExecutor
  child=subprocess.Popen(['psql','-X','-At','-h',base.base.Live.d,'-p','55487','-U','postgres','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=base.base.Live.env)
  child.stdin.write(f"BEGIN;SET request.jwt.claim.sub='{U}';SELECT start_or_get_exam_timer('{A}','{exam}__t3p__t2',1800,2);\\echo LOCKED\n");child.stdin.flush()
  while child.stdout.readline().strip()!='LOCKED':
   if child.poll() is not None:self.fail('legacy start failed')
  with ThreadPoolExecutor(max_workers=1) as pool:
   future=pool.submit(self.cancel_it,exam,reset,False);deadline=time.monotonic()+4;waiting=False
   while time.monotonic()<deadline:
    if int(self.scalar("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND NOT granted"))>0:waiting=True;break
   self.assertTrue(waiting);child.stdin.write('COMMIT;\\q\n');child.stdin.flush();child.wait(timeout=5)
   self.assertNotEqual(future.result(timeout=5).returncode,0)
  self.assertEqual(self.scalar(f"SELECT count(*) FROM core_exam_reset_cancellations WHERE reset_id='{reset}'"),'0')
  child.stdin.close();child.stdout.close();child.stderr.close()
 def test_04_restoration_wins_legacy_start_does_not_consume_cancelled_grant(self):
  exam='EB6-TAXI';reset,_=self.setup_exam(exam)
  self.cancel_it(exam,reset)
  out=self.api(f"SELECT start_or_get_exam_timer('{A}','{exam}__t3p__t2',1800,2)",U,False)
  self.assertEqual(out.returncode,0,out.stderr)
  self.assertEqual(self.scalar(f"SELECT count(*) FROM exam_retake_authorizations WHERE reset_id='{reset}' AND consumed_at IS NULL"),'1')
  self.assertEqual(self.scalar("SELECT count(*) FROM _effets_externes"),'0')
if __name__=='__main__':
 # Load only new scenarios; no inherited acquired tests.
 suite=unittest.TestSuite(Integration(n) for n in ['test_01_seven_copies_restored_reads_and_v2_no_cancelled_grant','test_02_legacy_timer_new_start_refuses_restoration','test_03_legacy_start_wins_concurrent_cancel','test_04_restoration_wins_legacy_start_does_not_consume_cancelled_grant','test_05_other_owner_cannot_read_restore_or_see_qrc'])
 result=unittest.TextTestRunner(verbosity=2).run(suite)
 raise SystemExit(not result.wasSuccessful())