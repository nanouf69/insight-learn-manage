"""Disposable only: actual candidate SQL; source/UID/options/keys and no-write evidence."""
import json,pathlib,sys,unittest,uuid
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from bilan_sr_training_sql_contract import Contract as Base,j,ROOT,APP,ELEVE_UID,AUTRE_UID,as_ctx
SOURCE=str(uuid.uuid4()); U='1cac4575-76c3-46c2-adb5-dffd1b3c2ebb'; V='3b5dab19-fda7-4dec-bdf6-1c4f54ebe9aa'
Q=[{'id':18,'uid':U,'type':'QCM','enonce':"Lors du transport d'une personne atteinte de déficience visuelle, je dois :",'choix':[{'lettre':'A','texte':'donner des repères pendant le trajet','correct':True},{'lettre':'B','texte':'parler fort'},{'lettre':'C','texte':'me présenter'}]}, {'id':19,'uid':V,'type':'QCM','enonce':'Le prix de vente doit être égal au :','choix':[{'lettre':'A','texte':'coût + TVA'},{'lettre':'B','texte':'coût + marge + TVA','correct':True}]}]
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  Base.setUpClass();cls.pg=Base.pg;cls.addClassCleanup(cls.pg.stop)
  cls.sql=Base.sql
  frozen=[{**q,'question_id':str(q['id']),'cle':f"505-{q['id']}"} for q in Q]
  cls.sql(f"INSERT INTO bilan_passage_snapshots VALUES('{SOURCE}','{APP}',5,505,1,'module_5_exo_505',{j(frozen)}); INSERT INTO reponses_apprenants VALUES('{APP}','module_5_exo_505',1,'submitted',true,{j({'505-18':['A'],'505-19':['A']})},'2026-11-09','2026-11-09','2026-11-09'),('{APP}','module_5_revision_exo_505',1,'in_progress',false,{j({'505-19':['B']})},NULL,'2026-11-12','2026-11-10'); UPDATE module_editor_state SET module_data={j({'exercices':[{'id':505,'questions':Q}]})};")
  cls.sql((ROOT/'docs/sql-revue/2026-11-12-bilan-vtc-fg-training.sql').read_text())
 def read(self,prefix=''):
  out=self.sql('BEGIN;'+prefix+as_ctx('authenticated',{'sub':ELEVE_UID},f"SELECT bilan_vtc_fg_training_read('snapshot','{SOURCE}');")+'ROLLBACK;')
  return json.loads(out.splitlines()[-1])
 def test_saved_editor_key_changes_without_publish(self):
  self.assertEqual(self.read()['questions'][0]['correct'],['A'])
  current=json.loads(json.dumps(Q));current[0]['choix'][2]['correct']=True
  r=self.read(f"UPDATE module_editor_state SET module_data={j({'exercices':[{'id':505,'questions':current}]})};")
  self.assertEqual(r['questions'][0]['correct'],['A','C']);self.assertEqual(r['questions'][1]['answer'],['B'])
 def test_uid_remap_and_option_reorder_supported_not_text_swaps(self):
  current=json.loads(json.dumps(Q));current[0]['id']=999;current[0]['choix'].reverse()
  r=self.read(f"UPDATE module_editor_state SET module_data={j({'exercices':[{'id':505,'questions':current}]})};")
  self.assertEqual(r['unavailable'],0);self.assertEqual(r['questions'][0]['id'],'18')
  current[0]['choix'][0]['texte']='different meaning'
  self.assertEqual(self.read(f"UPDATE module_editor_state SET module_data={j({'exercices':[{'id':505,'questions':current}]})};")['unavailable'],1)
 def test_other_uid_duplicate_unsupported_no_fallback(self):
  for qs in [[{**Q[0],'uid':'other'},Q[1]],[Q[0],Q[0],Q[1]]]:
   self.assertEqual(self.read(f"UPDATE module_editor_state SET module_data={j({'exercices':[{'id':505,'questions':qs}]})};")['unavailable'],1)
 def test_owner_submission_module_and_source_guards(self):
  for prefix,who in [('',AUTRE_UID),("UPDATE reponses_apprenants SET status='in_progress' WHERE exercice_id='module_5_exo_505';",ELEVE_UID),("UPDATE bilan_passage_snapshots SET module_id=11 WHERE exercice_id=505;",ELEVE_UID)]:
   c,o=self.pg.sql('BEGIN;'+prefix+as_ctx('authenticated',{'sub':who},f"SELECT bilan_vtc_fg_training_read('snapshot','{SOURCE}');")+'ROLLBACK;');self.assertNotEqual(c,0)
  c,o=self.pg.sql(as_ctx('anon',{'sub':ELEVE_UID},f"SELECT bilan_vtc_fg_training_read('snapshot','{SOURCE}');"));self.assertNotEqual(c,0)
 def test_revision_same_tentative_only_and_empty_choice_preserved(self):
  self.assertEqual(self.read("UPDATE reponses_apprenants SET tentative=2 WHERE exercice_id='module_5_revision_exo_505';")['questions'][1]['answer'],['A'])
  self.assertEqual(self.read(f"UPDATE reponses_apprenants SET reponses={j({'505-19':[]})} WHERE exercice_id='module_5_revision_exo_505';")['questions'][1]['answer'],[])
 def test_no_evidence_rewritten(self):
  query="SELECT md5(string_agg(x::text,'')) FROM (SELECT to_jsonb(t) x FROM bilan_passage_snapshots t UNION ALL SELECT to_jsonb(t) FROM reponses_apprenants t) z;"
  before=self.sql(query);self.read();self.assertEqual(self.sql(query),before)
if __name__=='__main__':unittest.main(verbosity=2)