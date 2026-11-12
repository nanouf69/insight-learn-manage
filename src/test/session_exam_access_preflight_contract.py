"""Read-only preflight reproductions: only the socket-local disposable catalog.

Controlled import and creation-boundary regression tests.
Run alongside session_exam_access_contract.py; no Cloud credentials are used.
"""
import json
import unittest
import uuid
from pathlib import Path
import session_exam_access_contract as base


class Preflight(base.Access):
 @classmethod
 def setUpClass(c):
  super().setUpClass()
  # V2/retake/save/finalize catalog is archived. Timer definitions have matching
  # live pg_get_functiondef MD5s on 12/11; external effects are not exercised.
  c.sql("GRANT USAGE ON SCHEMA auth TO anon;GRANT EXECUTE ON FUNCTION auth.uid() TO anon;")
  c.sql("CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'::text$$;CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('sub',auth.uid(),'role',auth.role())$$;")
  live=json.loads(Path('src/test/fixtures/session-exam-access-preflight-20261112.json').read_text())
  for definition in live['dependencies'].values():c.sql(definition)
  c.sql(Path('docs/sql-revue/2026-11-11-subject-reset.sql').read_text())
  c.sql(Path('docs/sql-revue/2026-11-11-subject-reset-expired-empty.sql').read_text())
  for name,definition in live['functions'].items():
   if name.startswith(('core_start_attempt','start_exam_subject_retake')):c.sql(definition)
  c.sql("CREATE FUNCTION canonical_get_quiz_questions(text) RETURNS jsonb LANGUAGE sql AS $$SELECT '[]'::jsonb$$;")
  c.sql(live['functions']['canonical_start_exam_attempt(text,text,integer)'])
  c.sql(Path('docs/sql-revue/2026-11-12-session-exam-import.sql').read_text())
  c.sql("CREATE TABLE reponses_apprenants_journal(event_id uuid PRIMARY KEY,apprenant_id uuid,user_id uuid,module_id int,exercice_id text,exercice_type text,question_id text,valeur jsonb,valeur_originale jsonb,tentative int,client_saved_at timestamptz);")
  for definition in json.loads(Path('src/test/fixtures/session-exam-persistence-20261112.json').read_text()).values():c.sql(definition)
  c.sql("INSERT INTO core_bridge_flags(cle,actif) VALUES('passage_v2_apprenants_reels',true);")

 def test_17_both_real_timer_overloads_block_new_start_keep_resume(self):
  self.set_access(False,expected=self.current())
  for args in [f"'{base.A}','EB3__preflight_timer',1800",
               f"'{base.A}','EB3__preflight_timer',1800,1"]:
   r=self.call(f"SELECT * FROM start_or_get_exam_timer({args})",base.U,False)
   self.assertNotEqual(r.returncode,0)
   self.assertIn('fermé',r.stderr)
  self.set_access(True,expected=self.current())
  self.call(f"SELECT * FROM start_or_get_exam_timer('{base.A}','EB3__preflight_timer',1800,1)",base.U)
  before=self.sql("SELECT to_jsonb(t) FROM apprenant_examen_timers t WHERE exercice_id='EB3__preflight_timer'").stdout
  self.set_access(False,expected=self.current())
  self.call(f"SELECT * FROM start_or_get_exam_timer('{base.A}','EB3__preflight_timer',1800)",base.U)
  self.call(f"SELECT * FROM start_or_get_exam_timer('{base.A}','EB3__preflight_timer',1800,1)",base.U)
  self.assertEqual(before,self.sql("SELECT to_jsonb(t) FROM apprenant_examen_timers t WHERE exercice_id='EB3__preflight_timer'").stdout)

 def test_18_edge_first_answer_without_timer_must_be_refused(self):
  # persist_answer_batch_v2/v3 both reach this INSERT when no stored row exists.
  # Isolate their exact insertion boundary; no fake successful Edge execution.
  self.set_access(False,expected=self.current())
  r=self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,reponses_meta,write_seq,completed,score,updated_at) VALUES('{base.A}','{base.U}','EB3__preflight_edge','examen_blanc','{{\"1\":[\"A\"]}}','{{}}',1,false,NULL,now())",False)
  self.assertNotEqual(r.returncode,0,'First Edge answer bypasses the closed gate without a timer')
  self.assertIn('fermé',r.stderr)

 def test_19_actual_controlled_import_after_closure(self):
  self.set_access(True,expected=self.current())
  version=str(uuid.uuid4())
  self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif) VALUES('{version}','VTC','3','EB3',(SELECT coalesce(max(version_number),0)+1 FROM exam_content_versions WHERE exam_id='EB3'),'brouillon','{{}}','f','IMPORT HISTORIQUE test')")
  details={'snapshot':{'questions':[{'id':'1','type':'QCM','enonce':'Fictif','choix':[{'id':'A','texte':'Oui','correct':True}],'points':1}]},'reponses':{'1':['A']}}
  result=str(uuid.uuid4())
  self.sql(f"SET request.jwt.claim.sub='{base.ADMIN}';INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at) VALUES('{base.A}','{base.U}','EB3__preflight_import','examen_blanc','{{\"1\":[\"A\"]}}',true,'submitted','2026-10-01 10:00:00+00');INSERT INTO apprenant_quiz_results(id,apprenant_id,user_id,quiz_id,quiz_titre,matiere_id,matiere_nom,details,completed_at) VALUES('{result}','{base.A}','{base.U}','EB3','Fictif','preflight_import','A - Fictif',{base.J(details)},'2026-10-01 10:00:00+00')")
  before=self.sql(f"SELECT to_jsonb(r) FROM apprenant_quiz_results r WHERE id='{result}'").stdout
  self.set_access(False,expected=self.current())
  r=json.loads(self.call(f"SELECT core_import_passage_finalise('{result}')").stdout.splitlines()[-1])
  self.assertEqual(r['statut'],'importe')
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{r['attempt_id']}'").stdout.strip(),'terminee')
  self.assertEqual(before,self.sql(f"SELECT to_jsonb(r) FROM apprenant_quiz_results r WHERE id='{result}'").stdout)
  replay=json.loads(self.call(f"SELECT core_import_passage_finalise('{result}')").stdout.splitlines()[-1])
  self.assertEqual(replay['attempt_id'],r['attempt_id'])
  self.assertEqual(self.sql(f"SELECT count(*) FROM session_exam_import_permits WHERE result_id='{result}'").stdout.strip(),'1')

 def test_20_anonymous_admin_calls_rejected(self):
  for q in [f"SELECT admin_session_exam_access_context('{base.S}')",
            f"SELECT admin_set_session_exam_access(gen_random_uuid(),'{base.S}','EB3',false,NULL,'VTC SOIR')"]:
   r=self.sql('SET ROLE anon;'+q,False)
   self.assertNotEqual(r.returncode,0)
   self.assertIn('permission denied',r.stderr)

 def test_21_live_core_start_refuses_closed_then_resumes_exact_copy(self):
  self.set_access(False,expected=self.current())
  version=str(uuid.uuid4())
  content={'matieres':[{'subject_id':'preflight_core','duree':30},{'subject_id':'preflight_retake','duree':30}],
           'questions':[{'id':'preflight_core:1','matiere':'preflight_core','type':'QCM','points':1,'choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  content['questions'].append({'id':'preflight_retake:1','matiere':'preflight_retake','type':'QCM','points':1,'choix':[{'id':'A','texte':'Oui','correct':True}]})
  self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint) VALUES('{version}','VTC','3','EB3',(SELECT coalesce(max(version_number),0)+1 FROM exam_content_versions WHERE exam_id='EB3'),'publiee',{base.J(content)},'f')")
  # Prior fixtures already created versions: choose this one as the only active.
  self.sql(f"UPDATE exam_content_versions SET retired_at=now() WHERE exam_id='EB3' AND id<>'{version}'")
  op=str(uuid.uuid4())
  q=f"SELECT row_to_json(a) FROM core_start_attempt('{op}','{base.A}','EB3','preflight_core',false) a"
  r=self.call(q,base.U,False);self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr)
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_operations WHERE operation_id='{op}'").stdout.strip(),'0')
  self.set_access(True,expected=self.current())
  started=json.loads(self.call(q,base.U).stdout.splitlines()[-1])
  self.set_access(False,expected=self.current())
  self.assertEqual(json.loads(self.call(q,base.U).stdout.splitlines()[-1]),started)
  resumed=json.loads(self.call(f"SELECT row_to_json(a) FROM core_start_attempt(gen_random_uuid(),'{base.A}','EB3','preflight_core',false) a",base.U).stdout.splitlines()[-1])
  self.assertEqual(resumed['attempt_id'],started['attempt_id'])
  self.assertEqual(resumed['snapshot'],started['snapshot'])

 def test_22_live_scoped_retake_refused_without_consuming_authorization(self):
  self.set_access(True,expected=self.current())
  subject={'id':'EB3','matieres':[{'id':'preflight_retake','nom':'Fictif','duree':30,'questions':[{'id':1,'type':'QCM','enonce':'Fictif','choix':[{'id':'A','texte':'Oui','correct':True}]}]}]}
  self.sql(f"INSERT INTO module_editor_state(module_id,module_data) VALUES(999,{base.J(subject)})")
  context=json.loads(self.call(f"SELECT exam_subject_reset_context('{base.A}','EB3','preflight_retake')").stdout.splitlines()[-1])
  authorization=str(uuid.uuid4())
  self.call(f"SELECT admin_authorize_exam_subject_reset('{authorization}','{base.A}','EB3','vtc','preflight_retake','Élève FICTIF','{context['source_token']}','{context['version_token']}')")
  self.set_access(False,expected=self.current())
  before=self.sql(f"SELECT to_jsonb(a) FROM exam_subject_reset_authorizations a WHERE operation_id='{authorization}'").stdout
  op=str(uuid.uuid4())
  q=f"SELECT row_to_json(r) FROM start_exam_subject_retake('{op}','{base.A}','EB3','preflight_retake','EB3__preflight_retake',NULL) r"
  r=self.call(q,base.U,False);self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr)
  self.assertEqual(self.sql(f"SELECT count(*) FROM exam_subject_retakes WHERE operation_id='{op}'").stdout.strip(),'0')
  self.assertEqual(before,self.sql(f"SELECT to_jsonb(a) FROM exam_subject_reset_authorizations a WHERE operation_id='{authorization}'").stdout)
  self.set_access(True,expected=self.current())
  receipt=json.loads(self.call(q,base.U).stdout.splitlines()[-1])
  self.set_access(False,expected=self.current())
  self.assertEqual(json.loads(self.call(q,base.U).stdout.splitlines()[-1]),receipt)

 def persist(self,key,version=2,answers=None):
  args=f"'{base.A}','{base.U}',35,'{key}','examen_blanc',{base.J(answers or {'1':['A']})},false,NULL,999,'[]'"
  if version==3:args+=",'{}'"
  return f"SELECT row_to_json(r) FROM persist_answer_batch_v{version}({args}) r"

 def test_23_real_persist_rpcs_first_answer_refused_then_late_save_allowed(self):
  self.set_access(False,expected=self.current())
  for version in [2,3]:
   key=f'EB3__persist{version}'
   r=self.call(self.persist(key,version),base.U,False)
   self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr)
   self.assertEqual(self.sql(f"SELECT count(*) FROM reponses_apprenants WHERE exercice_id='{key}'").stdout.strip(),'0')
   self.set_access(True,expected=self.current())
   self.call(self.persist(key,version),base.U)
   self.set_access(False,expected=self.current())
   saved=json.loads(self.call(self.persist(key,version,{'1':['B']}),base.U).stdout.splitlines()[-1])
   self.assertEqual(saved['stored_reponses'],{'1':['B']})
   self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses) VALUES('{base.A}','{base.U}','{key}','examen_blanc','{{}}') ON CONFLICT(apprenant_id,exercice_id) DO NOTHING")

 def test_24_exact_timer_identity_not_other_subject_or_tentative(self):
  self.set_access(True,expected=self.current())
  self.call(f"SELECT * FROM start_or_get_exam_timer('{base.A}','EB3__identity',1800,2)",base.U)
  self.set_access(False,expected=self.current())
  for key in ['EB3__otheridentity','EB3__identity__t3','EB3__identity__t2']:
   r=self.call(self.persist(key),base.U,False)
   self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr)
  # Same exact exercise key + tentative 2 is a legitimate continuation.
  self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,tentative) VALUES('{base.A}','{base.U}','EB3__identity','examen_blanc',2)")

 def test_25_fabricated_import_json_and_private_capability_refused(self):
  self.set_access(False,expected=self.current())
  v=self.sql("SELECT id FROM exam_content_versions WHERE exam_id='EB3' LIMIT 1").stdout.strip()
  r=self.call(f"INSERT INTO exam_attempts_v2(apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint) VALUES('{base.A}','EB3','{v}','{{\"source_historique\":{{\"result_id\":\"00000000-0000-0000-0000-000000000001\"}}}}','f')",base.U,False)
  self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr)
  r=self.call("INSERT INTO session_exam_import_permits VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'EB3',txid_current(),pg_backend_pid())",base.U,False)
  self.assertNotEqual(r.returncode,0);self.assertIn('permission denied',r.stderr)
  result=self.sql("SELECT result_id FROM session_exam_import_permits LIMIT 1").stdout.strip()
  r=self.call(f"SELECT core_import_passage_finalise('{result}')",base.U,False)
  self.assertNotEqual(r.returncode,0);self.assertIn('IMPORT_NON_AUTORISE',r.stderr)

 def test_26_canonical_no_new_eb_but_exact_existing_replay(self):
  self.set_access(False,expected=self.current())
  for ref in [base.A,'not-an-owner']:
   r=self.call(f"SELECT canonical_start_exam_attempt('EB3','{ref}',1)",base.U,False)
   self.assertNotEqual(r.returncode,0);self.assertIn('inactif',r.stderr)
  # Simulate an immutable record predating installation, never a live row.
  self.sql("ALTER TABLE canonical_exam_attempts DISABLE TRIGGER session_exam_new_canonical;INSERT INTO canonical_exam_attempts(quiz_id,apprenant_ref,tentative,snapshot,snapshot_versions) VALUES('EB3','preexisting',1,'[]','{}');ALTER TABLE canonical_exam_attempts ENABLE TRIGGER session_exam_new_canonical;")
  before=self.sql("SELECT to_jsonb(a) FROM canonical_exam_attempts a WHERE apprenant_ref='preexisting'").stdout.strip()
  replay=self.call("SELECT canonical_start_exam_attempt('EB3','preexisting',1)",base.U).stdout.splitlines()[-1]
  self.assertEqual(json.loads(before),json.loads(replay))
  r=self.call("SELECT canonical_start_exam_attempt('EB3','preexisting',2)",base.U,False)
  self.assertNotEqual(r.returncode,0)

 def test_27_import_source_mismatch_rolls_back_without_permit(self):
  self.set_access(True,expected=self.current())
  result=str(uuid.uuid4())
  details={'snapshot':{'questions':[{'id':'1','type':'QCM','enonce':'Fictif'}]},'reponses':{'1':['B']}}
  self.sql(f"SET request.jwt.claim.sub='{base.ADMIN}';INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at) VALUES('{base.A}','{base.U}','EB3__badimport','examen_blanc','{{\"1\":[\"A\"]}}',true,'submitted','2026-10-01 10:00:00+00');INSERT INTO apprenant_quiz_results(id,apprenant_id,user_id,quiz_id,quiz_titre,matiere_id,matiere_nom,details,completed_at) VALUES('{result}','{base.A}','{base.U}','EB3','Fictif','badimport','A - Fictif',{base.J(details)},'2026-10-01 10:00:00+00')")
  self.set_access(False,expected=self.current())
  r=self.call(f"SELECT core_import_passage_finalise('{result}')",check=False)
  self.assertNotEqual(r.returncode,0);self.assertIn('non concordante',r.stderr)
  self.assertEqual(self.sql(f"SELECT count(*) FROM session_exam_import_permits WHERE result_id='{result}'").stdout.strip(),'0')

 def test_28_existing_answer_only_allows_exact_timer_recovery(self):
  self.set_access(True,expected=self.current())
  self.call(self.persist('EB3__answeronly'),base.U)
  self.set_access(False,expected=self.current())
  self.call(f"SELECT * FROM start_or_get_exam_timer('{base.A}','EB3__answeronly',1800,1)",base.U)
  r=self.call(f"SELECT * FROM start_or_get_exam_timer('{base.A}','EB3__answeronly',1800,2)",base.U,False)
  self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr)
  r=self.call(self.persist('EB3__answeronly__t2'),base.U,False)
  self.assertNotEqual(r.returncode,0)

 def test_29_import_wrong_instant_and_reused_permit_refused(self):
  result=self.sql("SELECT id FROM apprenant_quiz_results WHERE matiere_id='badimport'").stdout.strip()
  # Match answers but not the persisted submission instant.
  self.sql(f"SET request.jwt.claim.sub='{base.ADMIN}';UPDATE apprenant_quiz_results SET details=jsonb_set(details,'{{reponses}}','{{\"1\":[\"A\"]}}'),completed_at='2026-10-01 10:00:01+00' WHERE id='{result}'")
  r=self.call(f"SELECT core_import_passage_finalise('{result}')",check=False)
  self.assertNotEqual(r.returncode,0);self.assertIn('non concordante',r.stderr)
  permit=self.sql("SELECT attempt_id FROM session_exam_import_permits LIMIT 1").stdout.strip()
  original=self.sql(f"SELECT row_to_json(a) FROM exam_attempts_v2 a WHERE attempt_id='{permit}'").stdout.strip()
  a=json.loads(original)
  a['snapshot']['source_historique']['result_id']=self.sql("SELECT result_id FROM session_exam_import_permits LIMIT 1").stdout.strip()
  r=self.call(f"INSERT INTO exam_attempts_v2(apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint) VALUES('{base.A}','EB3','{a['exam_version_id']}',{base.J(a['snapshot'])},'f')",base.U,False)
  self.assertNotEqual(r.returncode,0);self.assertIn('fermé',r.stderr)

 def test_30_guard_is_insert_only_and_non_eb_unchanged(self):
  triggers=self.sql("SELECT tgname FROM pg_trigger WHERE tgfoid='session_exam_start_guard()'::regprocedure AND (tgtype & 16)<>0").stdout.strip()
  self.assertEqual(triggers,'')
  self.call(self.persist('module_2_exo_1'),base.U)
  self.call("SELECT canonical_start_exam_attempt('PILOT_CANONICAL_TEST','fictif',1)",base.U)


if __name__=='__main__':
 unittest.main(verbosity=2)