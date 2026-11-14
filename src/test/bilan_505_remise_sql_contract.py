"""Local disposable PostgreSQL; no production connection, no real identity."""
import json,pathlib,unittest
from core_correction_securite_contract import Pg,SCHEMA,APP,ELEVE_UID,AUTRE_UID,as_ctx
ROOT=pathlib.Path(__file__).resolve().parents[2]
def j(x):return "'"+json.dumps(x,ensure_ascii=False).replace("'","''")+"'::jsonb"
COMPLETE=json.loads((ROOT/'src/test/bilan-505-remise-browser/snapshot-complete.json').read_text())
MISSING=json.loads((ROOT/'src/test/bilan-505-remise-browser/snapshot-missing.json').read_text())
ANS={q['cle']:[c['lettre'] for c in q['choix'] if c.get('correct')] for q in COMPLETE['questions']}
RID='33333333-3333-4333-8333-333333333333'
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pg=Pg();cls.addClassCleanup(cls.pg.stop)
  cls.sql(SCHEMA+'''CREATE TABLE reponses_apprenants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),apprenant_id uuid, user_id uuid,exercice_id text,exercice_type text,reponses jsonb,score numeric,bonnes_reponses int,total_questions int,completed boolean DEFAULT false,status text DEFAULT 'in_progress',submitted_at timestamptz,updated_at timestamptz, tentative int DEFAULT 1,write_seq bigint DEFAULT 0,reponses_meta jsonb DEFAULT '{}',UNIQUE(apprenant_id,exercice_id));
  CREATE TABLE reponses_apprenants_journal(id uuid DEFAULT gen_random_uuid(),event_id uuid UNIQUE,apprenant_id uuid,user_id uuid,module_id int,exercice_id text,exercice_type text,question_id text,valeur jsonb,tentative int,client_saved_at timestamptz,created_at timestamptz DEFAULT now());''')
  cls.sql('''CREATE TABLE bilan_passage_snapshots(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,module_id int,exercice_id int,tentative int,nb_questions int,questions jsonb,empreinte text);
  CREATE TABLE bilan_passages_figes(reponse_apprenant_id uuid,tentative int);
  CREATE TABLE bilan_passage_categories(apprenant_id uuid,module_id int,exercice_id int,tentative int,categorie text);
  CREATE TABLE bilan_reponse_statuts_effectifs(apprenant_id uuid,module_id int,exercice_id int,tentative int,cle text,reponse jsonb,statut text);
  CREATE TABLE reponses_apprenants_historique(apprenant_id uuid,user_id uuid,exercice_id text,exercice_type text,tentative int,reponses jsonb,score numeric,bonnes_reponses int,total_questions int,status text,submitted_at timestamptz);
  CREATE TABLE quiz_valide_reecritures_refusees(table_cible text,apprenant_id uuid,cle text,champs text[],auteur uuid);
  ''')
  for n in ['persist_answer_batch_v2','submit_quiz_attempt']:cls.sql((ROOT/f'src/test/bilan-505-remise-browser/{n}.sql').read_text())
  cls.sql((ROOT/'docs/candidats-sql/bilan_505_remise.sql').read_text())
  cls.sql((ROOT/'src/test/bilan-505-remise-browser/triggers-live.sql').read_text())
 @classmethod
 def sql(cls,s):
  c,o=cls.pg.sql(s)
  if c:raise AssertionError(o)
  return o
 def setUp(self):
  self.sql(f"DELETE FROM bilan_passages_figes;DELETE FROM bilan_passage_categories;DELETE FROM bilan_reponse_statuts_effectifs;DELETE FROM bilan_passage_snapshots;DELETE FROM reponses_apprenants;DELETE FROM reponses_apprenants_journal;INSERT INTO reponses_apprenants(id,apprenant_id,user_id,exercice_id,exercice_type,reponses,write_seq) VALUES('{RID}','{APP}','{ELEVE_UID}','module_5_exo_505','quiz',{j(ANS)},100);INSERT INTO reponses_apprenants(apprenant_id,exercice_id,reponses,score,status) VALUES('{APP}','module_5_revision_exo_505','{{}}',72,'submitted'),('{APP}','module_5_exo_506','{{}}',83,'submitted');")
  self.sql(f"INSERT INTO reponses_apprenants_journal(apprenant_id,user_id,exercice_id,question_id,valeur,tentative,client_saved_at,created_at) SELECT '{APP}','{ELEVE_UID}','module_5_exo_505',key,value,1,'2026-11-01','2026-11-01' FROM jsonb_each({j(ANS)});")
  self.sql(f"INSERT INTO bilan_passage_snapshots(apprenant_id,module_id,exercice_id,tentative,nb_questions,questions,empreinte) VALUES('{APP}',5,505,1,49,{j(COMPLETE['questions'])},'{COMPLETE['empreinte']}')")
 def call(self,answers=ANS,seq=100,attempt=1,who=ELEVE_UID):
  return self.pg.sql(as_ctx('authenticated',{'sub':who},f"SELECT bilan_505_remise_commit('{APP}','{RID}',{attempt},{seq},{j(answers)});"))
 def test_concordant_idempotent_and_other_notes(self):
  before=self.sql("SELECT md5(string_agg(to_jsonb(r)::text,'' ORDER BY exercice_id)) FROM reponses_apprenants r WHERE exercice_id<>'module_5_exo_505'")
  c,o=self.call();self.assertEqual(c,0,o)
  first=self.sql(f"SELECT to_jsonb(r)::text FROM reponses_apprenants r WHERE id='{RID}'")
  self.assertEqual(self.sql(f"SELECT score||'|'||bonnes_reponses||'|'||total_questions FROM reponses_apprenants WHERE id='{RID}'"),'100|49|49')
  c,o=self.call();self.assertEqual(c,0,o);self.assertEqual(first,self.sql(f"SELECT to_jsonb(r)::text FROM reponses_apprenants r WHERE id='{RID}'"))
  self.assertEqual(before,self.sql("SELECT md5(string_agg(to_jsonb(r)::text,'' ORDER BY exercice_id)) FROM reponses_apprenants r WHERE exercice_id<>'module_5_exo_505'"))
 def test_latest_journal_reconciled_no_reset(self):
  self.sql(f"INSERT INTO reponses_apprenants_journal(apprenant_id,user_id,exercice_id,question_id,valeur,tentative) VALUES('{APP}','{ELEVE_UID}','module_5_exo_505','505-1','[\"B\"]',1)")
  self.assertNotEqual(self.call()[0],0)
  ans={**ANS,'505-1':['B']};c,o=self.call(ans);self.assertEqual(c,0,o)
  self.assertEqual(self.sql(f"SELECT tentative||'|'||status||'|'||(reponses->>'505-1') FROM reponses_apprenants WHERE id='{RID}'"),'1|submitted|["B"]')
 def test_newer_sequence_refused(self):
  self.sql(f"UPDATE reponses_apprenants SET write_seq=101 WHERE id='{RID}'")
  self.assertNotEqual(self.call()[0],0)
 def test_owner_attempt_and_revision(self):
  for who,attempt in [(AUTRE_UID,1),(ELEVE_UID,2)]:self.assertNotEqual(self.call(attempt=attempt,who=who)[0],0)
 def test_other_attempt_journal_excluded(self):
  self.sql(f"INSERT INTO reponses_apprenants_journal(apprenant_id,user_id,exercice_id,question_id,valeur,tentative) VALUES('{APP}','{ELEVE_UID}','module_5_exo_505','505-1','[\"B\"]',2)")
  c,o=self.call();self.assertEqual(c,0,o)
 def test_empty_never_zero(self):
  self.assertNotEqual(self.call({**ANS,'505-1':[]})[0],0)
  self.assertEqual(self.sql(f"SELECT status||'|'||coalesce(score::text,'NULL') FROM reponses_apprenants WHERE id='{RID}'"),'in_progress|NULL')
 def test_missing_q7_no_inheritance(self):
  self.sql(f"UPDATE bilan_passage_snapshots SET questions={j(MISSING['questions'])},empreinte='{MISSING['empreinte']}'")
  c,o=self.call();self.assertNotEqual(c,0);self.assertIn('corrige_snapshot_incomplet',o)
  c,o=self.pg.sql(as_ctx('authenticated',{'sub':ELEVE_UID},f"SELECT bilan_505_remise_prepare('{APP}');"));self.assertEqual(c,0,o)
  data=json.loads(o.splitlines()[-1]);self.assertEqual(data['unresolved_questions'],['505-7'])
  self.assertNotIn('score',data);self.assertNotIn('questions',data);self.assertNotIn('choix',data)
 def test_internal_grader_not_callable_by_learner(self):
  c,o=self.pg.sql(as_ctx('authenticated',{'sub':ELEVE_UID},f"SELECT bilan_505_snapshot_grade('{APP}',1,{j(ANS)});"));self.assertNotEqual(c,0)
 def test_exact_set_no_partial_and_no_order_penalty(self):
  q=next(q for q in COMPLETE['questions'] if len(ANS[q['cle']])>1);key=q['cle']
  ans={**ANS,key:ANS[key][:1]}
  self.sql(f"UPDATE reponses_apprenants SET reponses={j(ans)} WHERE id='{RID}';UPDATE reponses_apprenants_journal SET valeur={j(ans[key])} WHERE question_id='{key}'")
  c,o=self.call(ans);self.assertEqual(c,0,o)
  self.assertEqual(self.sql(f"SELECT bonnes_reponses FROM reponses_apprenants WHERE id='{RID}'"),'48')
 def test_snapshot_tamper_refused(self):
  self.sql("UPDATE bilan_passage_snapshots SET empreinte='wrong'");self.assertNotEqual(self.call()[0],0)
 def test_real_red_and_frozen_guards(self):
  self.sql(f"INSERT INTO bilan_passage_categories VALUES('{APP}',5,505,1,'ROUGE')")
  self.assertNotEqual(self.call()[0],0)
  self.sql(f"DELETE FROM bilan_passage_categories;INSERT INTO bilan_passages_figes VALUES('{RID}',1)")
  self.assertNotEqual(self.call()[0],0)
 def test_real_locked_answer_guard_rolls_back(self):
  self.sql(f"INSERT INTO bilan_reponse_statuts_effectifs VALUES('{APP}',5,505,1,'505-1',{j(ANS['505-1'])},'INCERTAINE');INSERT INTO reponses_apprenants_journal(apprenant_id,user_id,exercice_id,question_id,valeur,tentative) VALUES('{APP}','{ELEVE_UID}','module_5_exo_505','505-1','[\"B\"]',1)")
  ans={**ANS,'505-1':['B']};self.assertNotEqual(self.call(ans)[0],0)
  self.assertEqual(self.sql(f"SELECT status FROM reponses_apprenants WHERE id='{RID}'"),'in_progress')
if __name__=='__main__':unittest.main(verbosity=2)