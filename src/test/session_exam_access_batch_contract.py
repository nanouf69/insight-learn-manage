"""Run only in a socket-only disposable database, never on Cloud."""
import json,uuid
from pathlib import Path
from session_exam_access_contract import Access,A,U,ADMIN,S,S2
class Batch(Access):
 @classmethod
 def setUpClass(c):
  super().setUpClass()
  c.sql("ALTER TABLE sessions ADD COLUMN date_debut date DEFAULT CURRENT_DATE, ADD COLUMN date_fin date DEFAULT CURRENT_DATE+30;")
  c.sql(Path('docs/sql-revue/2026-11-11-session-exam-access-batch.sql').read_text())
 def batch(self,selected=None,op=None,uid=ADMIN,opened=False):
  selected=selected if selected is not None else [{'session_id':s,'session_name':n,'expected_operation_id':self.current(s)} for s,n in [(S,'VTC SOIR'),(S2,'TAXI JOUR')]]
  op=op or str(uuid.uuid4())
  return self.call(f"SELECT admin_set_sessions_exam_access('{op}','EB3',{str(opened).lower()},'{json.dumps(selected)}')",uid,False)
 def test_16_invalid_second_session_is_atomic(self):
  before=self.sql('SELECT count(*) FROM session_exam_access_events').stdout
  selected=[{'session_id':S,'session_name':'VTC SOIR','expected_operation_id':self.current()}, {'session_id':S2,'session_name':'WRONG','expected_operation_id':self.current(S2)}]
  self.assertNotEqual(self.batch(selected).returncode,0)
  self.assertEqual(before,self.sql('SELECT count(*) FROM session_exam_access_events').stdout)
 def test_17_batch_replay_and_permissions(self):
  op=str(uuid.uuid4());selected=[{'session_id':s,'session_name':n,'expected_operation_id':self.current(s)} for s,n in [(S,'VTC SOIR'),(S2,'TAXI JOUR')]]
  self.assertNotEqual(self.batch(selected,op,uid=U).returncode,0)
  first=self.batch(selected,op);self.assertEqual(first.returncode,0,first.stderr)
  self.assertEqual(first.stdout,self.batch(selected,op).stdout)
  self.assertNotEqual(self.batch(selected,op,opened=True).returncode,0)
  self.assertNotEqual(self.sql('UPDATE session_exam_access_batches SET opened=true',False).returncode,0)
 def test_18_past_remote_duplicate_and_stale_rejected(self):
  for change in ["date_fin=CURRENT_DATE-1","nom='VTC e-learning'","types_apprenant=ARRAY['vtc-e']"]:
   self.sql(f"UPDATE sessions SET {change} WHERE id='{S2}'")
   self.assertNotEqual(self.batch().returncode,0)
   self.sql(f"UPDATE sessions SET date_fin=CURRENT_DATE+30,nom='TAXI JOUR',types_apprenant=ARRAY['TAXI','TA'] WHERE id='{S2}'")
  row={'session_id':S,'session_name':'VTC SOIR','expected_operation_id':self.current()}
  self.assertNotEqual(self.batch([row,row]).returncode,0)
  row['expected_operation_id']=str(uuid.uuid4());self.assertNotEqual(self.batch([row]).returncode,0)
if __name__=='__main__':
 import unittest;unittest.main(verbosity=2)