"""A–E version→UID links candidate on DISPOSABLE PostgreSQL only."""
import json, pathlib, sys, unittest, uuid
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from core_correction_securite_contract import Pg, SCHEMA, ELEVE_UID, AUTRE_UID, ADMIN, as_ctx
ROOT=pathlib.Path(__file__).resolve().parents[2]
V,R=str(uuid.uuid4()),str(uuid.uuid4())
def q(i,k,en,*t,uid=None):
 d={'id':i,'type':'QCM','enonce':en,'choix':[{'lettre':'ABC'[n],'texte':x,**({'correct':True} if 'ABC'[n] in k else {})} for n,x in enumerate(t)]}
 if uid:d['uid']=uid
 return d
def j(x):return "'"+json.dumps(x,ensure_ascii=False).replace("'","''")+"'::jsonb"
VERSION=[q(18,'A','Q18','x','y','z'),q(19,'A','dup','o','n'),q(20,'A','dup','o','n'),q(21,'A','absente','a','b')]
EDITOR=[q(301,'AC','Q18','x','y','z',uid='u18'),q(302,'A','dup','o','n',uid='ud')]
class C(unittest.TestCase):
 @classmethod
 def sql(cls,s):
  c,o=cls.pg.sql(s)
  if c:raise AssertionError(o)
  return o
 @classmethod
 def setUpClass(cls):
  cls.pg=Pg();cls.addClassCleanup(cls.pg.stop);cls.sql(SCHEMA)
  cls.sql('''CREATE TABLE bilan_future_receipts(id uuid,owner_id uuid,module_id int,exercise_id int,version_id uuid);
  CREATE TABLE bilan_future_versions(id uuid,questions jsonb);
  CREATE TABLE bilan_future_submissions(receipt_id uuid,answers jsonb,correct_count int,question_count int,submitted_at timestamptz);
  CREATE TABLE module_editor_state(module_id int,module_data jsonb,updated_at timestamptz);''')
  cls.sql(f"INSERT INTO bilan_future_versions VALUES('{V}',{j(VERSION)});INSERT INTO bilan_future_receipts VALUES('{R}','{ELEVE_UID}',5,502,'{V}');"
   f"INSERT INTO bilan_future_submissions VALUES('{R}',{j({'18':['A'],'19':['A']})},3,4,now());INSERT INTO module_editor_state VALUES(5,{j({'exercices':[{'id':502,'questions':EDITOR}]})},now());")
  cls.sql((ROOT/'docs/sql-revue/2026-11-12-bilan-future-uid-liens.sql').read_text())
 def call(self,who,f):
  c,o=self.pg.sql(as_ctx('authenticated',{'sub':who},f"SELECT {f};"));return c,(json.loads(o.splitlines()[-1]) if c==0 else o)
 def test_1_no_link_never_mapped(self):
  c,r=self.call(ELEVE_UID,f"bilan_future_corrige_actuel_read('{R}')");self.assertEqual(c,0)
  self.assertTrue(all(x['uid'] is None and x['current'] is None for x in r['questions']))
 def test_2_candidates_and_ambiguity(self):
  c,r=self.call(ADMIN,f"bilan_future_uid_candidats('{V}',5,502)")
  self.assertEqual([x['statut'] for x in r],['candidat','ambigu_version','ambigu_version','absent_editeur'])
  self.assertNotEqual(self.call(ELEVE_UID,f"bilan_future_uid_candidats('{V}',5,502)")[0],0)
 def test_3_confirm_reproved_idempotent_then_mapped(self):
  for f in [f"bilan_future_uid_confirmer('{V}',5,502,19,'ud')",f"bilan_future_uid_confirmer('{V}',5,502,18,'ud')"]:
   self.assertNotEqual(self.call(ADMIN,f)[0],0)
  self.assertNotEqual(self.call(ELEVE_UID,f"bilan_future_uid_confirmer('{V}',5,502,18,'u18')")[0],0)
  c,a=self.call(ADMIN,f"bilan_future_uid_confirmer('{V}',5,502,18,'u18')");self.assertEqual(a['deja'],False)
  c,b=self.call(ADMIN,f"bilan_future_uid_confirmer('{V}',5,502,18,'u18')");self.assertEqual(b['deja'],True)
  c,r=self.call(ELEVE_UID,f"bilan_future_corrige_actuel_read('{R}')")
  q18=r['questions'][0];self.assertEqual(q18['uid'],'u18');self.assertEqual([x['lettre'] for x in q18['current']['choix'] if x.get('correct')],['A','C'])
  self.assertTrue(all(x['current'] is None for x in r['questions'][1:]))
  self.assertNotEqual(self.pg.sql("DELETE FROM bilan_future_uid_liens;")[0],0)
 def test_4_other_owner_refused_and_no_learner_write(self):
  self.assertNotEqual(self.call(AUTRE_UID,f"bilan_future_corrige_actuel_read('{R}')")[0],0)
  h="SELECT md5(string_agg(x::text,'' ORDER BY x::text)) FROM (SELECT to_jsonb(t) x FROM bilan_future_submissions t UNION ALL SELECT to_jsonb(t) FROM bilan_future_versions t UNION ALL SELECT to_jsonb(t) FROM bilan_future_receipts t) z;"
  b=self.sql(h);self.call(ELEVE_UID,f"bilan_future_corrige_actuel_read('{R}')");self.call(ADMIN,f"bilan_future_uid_confirmer('{V}',5,502,18,'u18')");self.assertEqual(self.sql(h),b)
if __name__=='__main__':unittest.main(verbosity=2)
