"""Owner-scoped SELECT correction candidate on DISPOSABLE PostgreSQL only."""
import json, pathlib, sys, unittest, uuid
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from core_correction_securite_contract import Pg, SCHEMA, ELEVE_UID, AUTRE_UID, APP, as_ctx
ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCE=str(uuid.uuid4()); FUTURE=str(uuid.uuid4())
UIDS=['79ef7a10-1eac-498f-b5b5-ddb8d90d4328','45e4fbf1-caf4-48ff-8e55-b16e2595a0e5']
Q=[{'id':71,'uid':UIDS[0],'type':'QCM','enonce':'route étroite','choix':[{'lettre':'A','texte':'Oui','correct':True},{'lettre':'B','texte':'Non'}]},
   {'id':226,'uid':UIDS[1],'type':'QCM','enonce':'0,29 mg','choix':[{'lettre':'C','texte':'délit'},{'lettre':'D','texte':'contravention et perte de 6 points','correct':True}]}]
CURRENT=json.loads(json.dumps(Q));CURRENT[0]['choix'][0]['correct']=False;CURRENT[0]['choix'][1]['correct']=True
def j(x):return "'"+json.dumps(x).replace("'","''")+"'::jsonb"
class Contract(unittest.TestCase):
 @classmethod
 def sql(cls,q):
  c,o=cls.pg.sql(q)
  if c:raise AssertionError(o)
  return o
 @classmethod
 def setUpClass(cls):
  cls.pg=Pg();cls.sql(SCHEMA)
  cls.sql('''CREATE TABLE bilan_passage_snapshots(id uuid,apprenant_id uuid,module_id int,exercice_id int,tentative int,passage_cle text,questions jsonb);
  CREATE TABLE bilan_future_receipts(id uuid,owner_id uuid,module_id int,exercise_id int,version_id uuid);
  CREATE TABLE bilan_future_versions(id uuid,questions jsonb);
  CREATE TABLE bilan_future_submissions(receipt_id uuid,answers jsonb,submitted_at timestamptz);
  CREATE TABLE reponses_apprenants(apprenant_id uuid,exercice_id text,tentative int,status text,completed boolean,reponses jsonb,submitted_at timestamptz,updated_at timestamptz,created_at timestamptz);
  CREATE TABLE module_editor_state(module_id int,module_data jsonb,updated_at timestamptz);
  ''')
  frozen=[{**q,'question_id':q['id'],'cle':f"502-{q['id']}"} for q in Q]
  cls.sql(f"INSERT INTO bilan_passage_snapshots VALUES('{SOURCE}','{APP}',5,502,1,'module_5_exo_502',{j(frozen)});")
  cls.sql(f"INSERT INTO reponses_apprenants VALUES('{APP}','module_5_exo_502',1,'submitted',true,{j({'502-71':['A'],'502-226':['C','D']})},'2026-11-09','2026-11-09','2026-11-09'),('{APP}','module_5_revision_exo_502',1,'in_progress',false,{j({'502-226':['D']})},NULL,'2026-11-12','2026-11-10');")
  cls.sql(f"INSERT INTO module_editor_state VALUES(5,{j({'exercices':[{'id':502,'questions':CURRENT}]})},'2026-11-12');INSERT INTO bilan_future_versions VALUES('b3ab1768-df8c-41ad-ab85-89af51927141',{j(Q)});INSERT INTO bilan_future_receipts VALUES('{FUTURE}','{ELEVE_UID}',5,502,'b3ab1768-df8c-41ad-ab85-89af51927141');INSERT INTO bilan_future_submissions VALUES('{FUTURE}',{j({'71':['B'],'226':['D']})},'2026-11-10');")
  cls.sql((ROOT/'docs/sql-revue/2026-11-12-bilan-vtc-sr-training.sql').read_text())
 @classmethod
 def tearDownClass(cls):cls.pg.stop()
 def read(self,t='snapshot',source=SOURCE,who=ELEVE_UID,prefix=''):
  out=self.sql(prefix+as_ctx('authenticated',{'sub':who},f"SELECT bilan_vtc_sr_training_read('{t}','{source}');"))
  return json.loads(out.splitlines()[-1])
 def test_last_recorded_choice_and_admin_key(self):
  r=self.read();self.assertEqual([q['correct'] for q in r['questions']],[['B'],['D']]);self.assertEqual([q['answer'] for q in r['questions']],[['A'],['D']])
 def test_future_audited_identity(self):
  r=self.read('future',FUTURE);self.assertEqual([q['uid'] for q in r['questions']],UIDS)
 def test_other_owner_and_anon(self):
  for role,who in [('authenticated',AUTRE_UID),('anon',ELEVE_UID)]:
   c,o=self.pg.sql(as_ctx(role,{'sub':who},f"SELECT bilan_vtc_sr_training_read('snapshot','{SOURCE}');"));self.assertNotEqual(c,0)
 def test_no_unsubmitted_or_taxi(self):
  for change in ["UPDATE reponses_apprenants SET completed=false,status='in_progress';","UPDATE bilan_passage_snapshots SET module_id=11;"]:
   c,o=self.pg.sql('BEGIN;'+change+as_ctx('authenticated',{'sub':ELEVE_UID},f"SELECT bilan_vtc_sr_training_read('snapshot','{SOURCE}');")+'ROLLBACK;');self.assertNotEqual(c,0)
 def test_duplicate_uid_or_swapped_options_refused(self):
  for current in [[CURRENT[0],CURRENT[0],CURRENT[1]],[{**CURRENT[0],'choix':list(reversed(CURRENT[0]['choix']))},CURRENT[1]]]:
   r=self.read(prefix=f"UPDATE module_editor_state SET module_data={j({'exercices':[{'id':502,'questions':current}]})};")
   self.assertEqual(r['unavailable'],1);self.assertEqual([q['uid'] for q in r['questions']],[UIDS[1]])
   self.sql(f"UPDATE module_editor_state SET module_data={j({'exercices':[{'id':502,'questions':CURRENT}]})};")
 def test_number_remapped_uid_kept(self):
  changed=[{**q,'id':q['id']+300} for q in CURRENT]
  r=self.read(prefix=f"UPDATE module_editor_state SET module_data={j({'exercices':[{'id':502,'questions':changed}]})};")
  self.assertEqual([q['id'] for q in r['questions']],[71,226]);self.assertEqual(r['unavailable'],0)
  self.sql(f"UPDATE module_editor_state SET module_data={j({'exercices':[{'id':502,'questions':CURRENT}]})};")
 def test_select_does_not_rewrite(self):
  query="SELECT md5(string_agg(x::text,'')) FROM (SELECT to_jsonb(t) x FROM bilan_passage_snapshots t UNION ALL SELECT to_jsonb(t) FROM reponses_apprenants t UNION ALL SELECT to_jsonb(t) FROM bilan_future_submissions t) z;"
  before=self.sql(query);self.read();self.read('future',FUTURE);self.assertEqual(self.sql(query),before)
if __name__=='__main__':unittest.main(verbosity=2)