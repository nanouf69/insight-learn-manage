"""Staged allow-list delta on the captured production catalogue, fake identities only.
Uses the real captured functions/triggers/RLS; leaves activation off, never submits.
"""
import pathlib,re,unittest
from bilan_505_catalogue_prod_contract import load_db,Eleve,ANS,COMPLETE,MISSING,ROOT

class Lot505(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.pg=load_db(activer=False)
  c.addClassCleanup(c.pg.stop)
 @classmethod
 def sql(c,s):
  code,out=c.pg.sql(s)
  if code:raise AssertionError(out)
  return out
 def test_01_exact_candidate_with_fictional_parameters_and_actual_triggers(self):
  original=(ROOT/'docs/sql-revue/2026-11-26-lot-505.sql').read_text()
  tuples=re.findall(r"\('([0-9a-f-]{36})'::uuid,'([0-9a-f-]{36})'::uuid,(\d+),'([0-9a-f]{32})','(remise|recuperation)'",original)
  self.assertEqual(len(tuples),4)
  script=original
  self.students=[]
  for rid,aid,seq,old_hash,mode in tuples:
   e=Eleve(self,ANS,[],snapshot=MISSING if mode=='recuperation' else COMPLETE,seq=int(seq),mode=None)
   self.students.append(e)
   actual=self.sql(f"SELECT md5(reponses::text) FROM reponses_apprenants WHERE id='{e.rid}'")
   script=script.replace(rid,e.rid).replace(aid,e.app).replace(old_hash,actual)
  ids=','.join("'"+e.rid+"'" for e in self.students)
  fingerprint=lambda:self.sql(f"SELECT md5(jsonb_agg(to_jsonb(r) ORDER BY id)::text) FROM reponses_apprenants r WHERE id IN ({ids})")
  before=fingerprint()
  # A wrong expected seq on the last entry must roll back all earlier authorizations.
  wrong=script.replace(",100,'",",101,'")
  code,out=self.pg.sql(wrong)
  self.assertNotEqual(code,0);self.assertIn('LOT_505_CHANGE',out)
  self.assertEqual(self.sql('SELECT count(*) FROM bilan_505_remise_copies'),'0')
  self.assertEqual(fingerprint(),before)
  self.sql(script);self.sql(script)
  self.assertEqual(self.sql('SELECT count(*) FROM bilan_505_remise_copies'),'4')
  self.assertEqual(self.sql("SELECT count(*) FROM bilan_505_remise_copies WHERE mode='recuperation'"),'2')
  self.assertEqual(fingerprint(),before)
  self.assertEqual(self.sql('SELECT actif FROM bilan_505_remise_activation WHERE id=1'),'f')
  self.assertEqual(self.sql(f"SELECT count(*) FROM reponses_apprenants WHERE id IN ({ids}) AND status='in_progress' AND submitted_at IS NULL AND score IS NULL"),'4')
 def test_02_clients_cannot_install_the_candidate(self):
  # The staged block is administrative; owner RLS never permits allow-list writes.
  code,out=self.pg.sql("SET ROLE authenticated;INSERT INTO bilan_505_remise_copies(row_id,apprenant_id,tentative,mode,motif) VALUES(gen_random_uuid(),gen_random_uuid(),1,'remise','fictif');")
  self.assertNotEqual(code,0);self.assertIn('permission denied',out)

if __name__=='__main__':unittest.main(verbosity=2)