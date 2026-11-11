"""Integrated cancellation with captured live schema/triggers. All data fictitious.
Production coverage gate stays false; only this disposable cluster enables it.
"""
import json, unittest, uuid
from pathlib import Path
import admin_subject_reset_live_contract as base

A=base.A; U=base.U; ADMIN=base.ADMIN

class Integrated(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  base.Live.setUpClass()
  cls.addClassCleanup(base.Live.cleanup)
  cls.sql=base.Live.sql
  cls.api=base.Live().api
  cls.call=base.Live().call
  # Latest whole reset schema with rights/append-only, then dedicated candidate.
  cls.sql("ALTER TABLE core_exam_resets ADD COLUMN IF NOT EXISTS created_by uuid;ALTER TABLE core_exam_resets ADD COLUMN IF NOT EXISTS created_email text;")
  migration=Path('drizzle/migrations/0069_admin_exam_reset_archive.sql').read_text()
  cls.sql(migration[migration.index('GRANT SELECT'):migration.index('CREATE OR REPLACE FUNCTION public.core_admin_reset_exam')])
  cls.sql("ALTER TABLE exam_retake_authorizations ADD COLUMN IF NOT EXISTS reset_id uuid;")
  cls.sql(Path('docs/sql-revue/2026-11-11-exam-reset-cancellation.sql').read_text())
  cls.sql("CREATE OR REPLACE FUNCTION exam_reset_cancellation_coverage_ready() RETURNS boolean LANGUAGE sql AS $$SELECT true$$")
  cls.sql("INSERT INTO core_bridge_flags(cle,actif) SELECT 'passage_v2_apprenants_reels',true WHERE NOT EXISTS(SELECT 1 FROM core_bridge_flags WHERE cle='passage_v2_apprenants_reels');UPDATE core_bridge_flags SET actif=true WHERE cle='passage_v2_apprenants_reels';")

 def scalar(self,q):return self.sql(q).stdout.strip().splitlines()[-1]
 def test_integrated_visibility_rights_legacy_and_v2_starts(self):
  owner2='77777777-7777-4777-8777-777777777777'; user2='88888888-8888-4888-8888-888888888888'
  self.sql(f"INSERT INTO auth.users(id,email) VALUES('{user2}','other@example.invalid'); INSERT INTO apprenants(id,auth_user_id,nom,prenom,email,modules_autorises) VALUES('{owner2}','{user2}','OTHER FICTIF','Test','other@example.invalid',ARRAY[35]);")
  # A complete immutable QCM copy/result and matching legacy result.
  exam='EB5'; attempt=str(uuid.uuid4()); version=str(uuid.uuid4()); result=str(uuid.uuid4()); legacy=str(uuid.uuid4()); reset=str(uuid.uuid4())
  content={'exam_id':exam,'exam_libelle':'Fictif','matieres':[{'subject_id':'t3p','titre':'T3P','ordre':0,'duree':45,'coefficient':3,'note_sur':20,'note_eliminatoire':6}],'questions':[{'id':'t3p:1','matiere':'t3p','ordre':0,'type':'QCM','enonce':'Fictif','points':1,'choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  snapshot={**content,'matiere':'t3p','tentative':1}
  self.sql(f"INSERT INTO examens_blancs_parcours(module_id,exam_id) VALUES(35,'{exam}') ON CONFLICT DO NOTHING;INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif,is_test) VALUES('{version}','VTC','5','{exam}',1,'publiee','{json.dumps(content)}','fixture','fixture',true);")
  self.sql(f"INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,started_at,finished_at,is_test) VALUES('{attempt}','{A}','{exam}','{version}','{json.dumps(snapshot)}','fixture','terminee',now()-interval '3 days',now()-interval '3 days',true);")
  self.sql(f"INSERT INTO core_exam_results(result_id,attempt_id,apprenant_id,score,total,status,qrc_restantes,result_revision) VALUES('{result}','{attempt}','{A}',17,20,'definitif',0,1);")
  self.sql(f"INSERT INTO apprenant_quiz_results(id,apprenant_id,user_id,quiz_id,quiz_type,quiz_titre,matiere_id,matiere_nom,score_obtenu,score_max,note_sur_20,tentative,created_at,completed_at,details) VALUES('{legacy}','{A}','{U}','{exam}','examen_blanc','Fictif','t3p','T3P',17,20,17,1,now()-interval '3 days',now()-interval '3 days','{{}}');")
  self.sql(f"INSERT INTO core_exam_resets(reset_id,operation_id,apprenant_id,exam_id,archived_attempt_ids,archived_core_result_ids,archived_legacy_result_ids,motif) VALUES('{reset}',gen_random_uuid(),'{A}','{exam}','[\"{attempt}\"]','[\"{result}\"]','[\"{legacy}\"]','fixture'); INSERT INTO core_tentatives_neutralisees(attempt_id,apprenant_id,exam_id,motif) VALUES('{attempt}','{A}','{exam}','Archive par remise a zero administrative {reset}');INSERT INTO exam_retake_authorizations(apprenant_id,exam_id,reset_id,motif) VALUES('{A}','{exam}','{reset}','fixture');")
  self.assertEqual(self.scalar('SELECT count(*) FROM core_exam_resets_effective'), '1')
  before=self.scalar(f"SELECT md5(jsonb_build_array((SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{attempt}'),(SELECT to_jsonb(r) FROM core_exam_results r WHERE result_id='{result}'),(SELECT to_jsonb(q) FROM apprenant_quiz_results q WHERE id='{legacy}'))::text)")
  # Fresh server auth via RLS: other account sees no event and cannot invoke admin.
  refused=self.api(f"SELECT admin_exam_reset_cancel_context('{A}','{reset}')",uid=user2,check=False)
  self.assertNotEqual(refused.returncode,0)
  self.assertEqual(self.api('SELECT count(*) FROM core_exam_reset_cancellations',uid=user2).stdout.strip().splitlines()[-1],'0')
  op=str(uuid.uuid4()); cutoff=self.scalar(f"SELECT cutoff_at FROM core_exam_resets WHERE reset_id='{reset}'")
  out=self.call(f"SELECT admin_cancel_exam_reset('{op}','{A}','{reset}','{exam}','{cutoff}')")
  first=json.loads(out.stdout.strip().splitlines()[-1]); self.assertEqual(first['reset_id'],reset)
  replay=json.loads(self.call(f"SELECT admin_cancel_exam_reset('{op}','{A}','{reset}','{exam}','{cutoff}')").stdout.strip().splitlines()[-1]);self.assertEqual(first,replay)
  self.assertEqual(self.api('SELECT count(*) FROM core_exam_reset_cancellations',uid=user2).stdout.strip().splitlines()[-1],'0')
  # Old and V2 result visibility through effective projections; originals unchanged.
  self.assertEqual(self.scalar('SELECT count(*) FROM core_exam_resets_effective'),'0')
  self.assertEqual(self.scalar('SELECT count(*) FROM core_exam_neutralisations_effective'),'0')
  self.assertEqual(self.scalar('SELECT count(*) FROM exam_retake_authorizations_effective'),'0')
  self.assertEqual(float(self.scalar(f"SELECT score FROM core_exam_results WHERE attempt_id='{attempt}' AND NOT EXISTS(SELECT 1 FROM core_exam_neutralisations_effective n WHERE n.attempt_id='{attempt}')")),17)
  self.assertEqual(self.scalar(f"SELECT score_obtenu FROM apprenant_quiz_results q WHERE id='{legacy}' AND NOT EXISTS(SELECT 1 FROM core_exam_resets_effective r WHERE r.archived_legacy_result_ids ? q.id::text)"),'17')
  after=self.scalar(f"SELECT md5(jsonb_build_array((SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{attempt}'),(SELECT to_jsonb(r) FROM core_exam_results r WHERE result_id='{result}'),(SELECT to_jsonb(q) FROM apprenant_quiz_results q WHERE id='{legacy}'))::text)")
  self.assertEqual(before,after)
  # Real V2 starter still tries to consume the cancelled raw grant: safe refusal,
  # revealing the remaining integration blocker rather than a false restoration.
  v2=self.call(f"SELECT core_start_attempt('{uuid.uuid4()}','{A}','{exam}','t3p')",uid=U,check=False)
  self.assertNotEqual(v2.returncode,0);self.assertIn('CANCELLED_RESET_GRANT',v2.stderr)
  self.assertEqual(self.scalar(f"SELECT count(*) FROM exam_attempts_v2 WHERE apprenant_id='{A}' AND exam_id='{exam}'"),'1')
  # Real old first-start path: scoped receipt creates a timer without V2 copy.
  live=base.Live();live.seed('EB6','anglais');context=live.context('EB6','anglais');live.authorize(context,str(uuid.uuid4()))
  old=json.loads(live.start(context,str(uuid.uuid4())).stdout.strip().splitlines()[-1])
  self.assertEqual(old['moteur'],'legacy');self.assertEqual(old['tentative'],1)
  self.assertEqual(self.scalar(f"SELECT count(*) FROM apprenant_examen_timers WHERE apprenant_id='{A}' AND exercice_id='EB6__anglais'"),'1')
  self.assertEqual(self.scalar('SELECT count(*) FROM _effets_externes'),'0')

if __name__=='__main__':unittest.main(verbosity=2)