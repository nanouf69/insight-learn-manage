"""Read-only preflight reproductions: only the socket-local disposable catalog.

Expected failures are installation blockers, NOT passing security guarantees.
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

 @unittest.expectedFailure
 def test_18_BLOCKER_edge_first_answer_without_timer_must_be_refused(self):
  # persist_answer_batch_v2/v3 both reach this INSERT when no stored row exists.
  # Isolate their exact insertion boundary; no fake successful Edge execution.
  self.set_access(False,expected=self.current())
  r=self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,reponses_meta,write_seq,completed,score,updated_at) VALUES('{base.A}','{base.U}','EB3__preflight_edge','examen_blanc','{{\"1\":[\"A\"]}}','{{}}',1,false,NULL,now())",False)
  self.assertNotEqual(r.returncode,0,'First Edge answer bypasses the closed gate without a timer')
  self.assertIn('fermé',r.stderr)

 @unittest.expectedFailure
 def test_19_BLOCKER_actual_import_en_cours_shape_must_remain_usable(self):
  # Production core_import_passage_finalise inserts en_cours then finalizes.
  # Candidate exemption currently requires NEW.etat <> en_cours, so it blocks.
  self.set_access(False,expected=self.current())
  version=str(uuid.uuid4())
  self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint) VALUES('{version}','VTC','3','EB3',1,'publiee','{{}}','f')")
  snapshot=json.dumps({'matiere':'preflight_import','source_historique':{'origine':'import-historique','result_id':str(uuid.uuid4()),'tentative':1}})
  r=self.sql(f"INSERT INTO exam_attempts_v2(apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,started_at,etat,is_test) VALUES('{base.A}','EB3','{version}','{snapshot}','f',now()-interval '5 days','en_cours',false)",False)
  self.assertEqual(r.returncode,0,'Existing finalized-copy import is blocked by the candidate')

 def test_20_anonymous_admin_calls_rejected(self):
  for q in [f"SELECT admin_session_exam_access_context('{base.S}')",
            f"SELECT admin_set_session_exam_access(gen_random_uuid(),'{base.S}','EB3',false,NULL,'VTC SOIR')"]:
   r=self.sql('SET ROLE anon;'+q,False)
   self.assertNotEqual(r.returncode,0)
   self.assertIn('permission denied',r.stderr)

 def test_21_live_core_start_refuses_closed_then_resumes_exact_copy(self):
  self.set_access(False,expected=self.current())
  version=str(uuid.uuid4())
  content={'matieres':[{'subject_id':'preflight_core','duree':30}],
           'questions':[{'id':'preflight_core:1','matiere':'preflight_core','type':'QCM','points':1,'choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint) VALUES('{version}','VTC','3','EB3',1,'publiee',{base.J(content)},'f')")
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


if __name__=='__main__':
 unittest.main(verbosity=2)