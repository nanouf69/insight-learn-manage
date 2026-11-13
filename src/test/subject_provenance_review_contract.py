"""Fictitious metadata only, disposable PostgreSQL with the captured live trigger catalog."""
import unittest,uuid,json
from pathlib import Path
from admin_subject_reset_live_contract import Live,J
from admin_subject_reset_sql_contract import A,U,ADMIN
class Review(Live):
 @classmethod
 def setUpClass(c):
  super().setUpClass()
  c.sql(Path('docs/sql-revue/2026-11-13-subject-provenance-review.sql').read_text())
 def test_90_explicit_review_preserves_f_g_without_claiming_link(self):
  self.seed('EB6-TAXI','reglementation_taxi')
  self.seed('EB5-TAXI','reglementation_taxi2')
  old=self.v2('EB6-TAXI','reglementation_taxi',{})
  recent=self.v2('EB6-TAXI','reglementation_taxi',{})
  other=self.v2('EB5-TAXI','reglementation_taxi2',{})
  def read():return json.loads(self.call(f"SELECT exam_subject_provenance_read('{A}','EB6-TAXI','reglementation_taxi')").stdout.splitlines()[-1])
  c=read();op=str(uuid.uuid4())
  def decide(attempt=recent,scope=c['scope_hash'],uid=ADMIN):
   return self.call(f"SELECT row_to_json(r) FROM exam_subject_provenance_decide('{op}','{A}','EB6-TAXI','reglementation_taxi','{attempt}','{scope}','{c['version_hash']}','Copies distinctes conservées ; nouvelle copie demandée') r",uid,False)
  before=self.sql("SELECT md5(string_agg(to_jsonb(a)::text,'|' ORDER BY attempt_id)) FROM exam_attempts_v2 a").stdout
  self.assertNotEqual(decide(uid=U).returncode,0)
  self.assertNotEqual(decide(attempt=other).returncode,0)
  self.assertNotEqual(decide(scope='stale').returncode,0)
  self.assertEqual(decide().returncode,0)
  self.assertEqual(decide().returncode,0)
  self.assertNotEqual(decide(attempt=old).returncode,0)
  self.assertEqual(self.sql(f"SELECT count(*) FROM exam_subject_provenance_reviews WHERE operation_id='{op}'").stdout.strip(),'1')
  self.assertNotEqual(self.call("UPDATE exam_subject_provenance_reviews SET motif='overwrite'",check=False).returncode,0)
  self.assertNotEqual(self.call(f"SELECT exam_subject_provenance_start(gen_random_uuid(),'{op}')",U,False).returncode,0)
  self.assertEqual(before,self.sql("SELECT md5(string_agg(to_jsonb(a)::text,'|' ORDER BY attempt_id)) FROM exam_attempts_v2 a").stdout)
  self.assertEqual(self.sql(f"SELECT count(*) FROM audit_journal WHERE cible_id='{op}' AND apres->>'association_legacy'='false'").stdout.strip(),'1')
if __name__=='__main__':unittest.main()