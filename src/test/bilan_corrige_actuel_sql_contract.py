"""Generic current-key reader candidate on DISPOSABLE PostgreSQL only."""
import json, pathlib, sys, unittest, uuid
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from core_correction_securite_contract import Pg, SCHEMA, ELEVE_UID, AUTRE_UID, ADMIN, APP, as_ctx
ROOT=pathlib.Path(__file__).resolve().parents[2]
S_VTC,S_TAXI,S_FG=(str(uuid.uuid4()) for _ in range(3))
def q(uid,k,*t):return {'uid':uid,'type':'QCM','enonce':uid,'choix':[{'lettre':'ABC'[i],'texte':x,**({'correct':True} if 'ABC'[i] in k else {})} for i,x in enumerate(t)]}
def j(x):return "'"+json.dumps(x,ensure_ascii=False).replace("'","''")+"'::jsonb"
class C(unittest.TestCase):
 @classmethod
 def sql(cls,s):
  c,o=cls.pg.sql(s)
  if c:raise AssertionError(o)
  return o
 @classmethod
 def setUpClass(cls):
  cls.pg=Pg();cls.addClassCleanup(cls.pg.stop);cls.sql(SCHEMA)
  cls.sql('''CREATE TABLE bilan_passage_snapshots(id uuid,apprenant_id uuid,module_id int,exercice_id int,filiere text,matiere text,tentative int,passage_cle text,questions jsonb);
  CREATE TABLE reponses_apprenants(apprenant_id uuid,exercice_id text,tentative int,status text,completed boolean,reponses jsonb,score numeric,submitted_at timestamptz,updated_at timestamptz);
  CREATE TABLE module_editor_state(module_id int,module_data jsonb,updated_at timestamptz);''')
  cls.sql(f"INSERT INTO apprenants VALUES('{APP}','{ELEVE_UID}') ON CONFLICT DO NOTHING;")
  for sid,mod,exo in [(S_VTC,5,502),(S_TAXI,11,602),(S_FG,5,505)]:
   fz=[{**q('u18','A','x','y','z'),'cle':f'{exo}-18'},{**q('uX','A','o','n'),'cle':f'{exo}-2'}]
   cls.sql(f"INSERT INTO bilan_passage_snapshots VALUES('{sid}','{APP}',{mod},{exo},'f','m',1,'module_{mod}_exo_{exo}',{j(fz)});"
     f"INSERT INTO reponses_apprenants VALUES('{APP}','module_{mod}_exo_{exo}',1,'submitted',true,{j({f'{exo}-18':['A'],f'{exo}-2':['A']})},2,'2026-11-01','2026-11-01'),"
     f"('{APP}','module_{mod}_revision_exo_{exo}',1,'in_progress',false,{j({f'{exo}-18':['A','C']})},null,null,'2026-11-05');")
  ed=lambda exo:{'exercices':[{'id':exo,'questions':[q('u18','AC','x','y','z'),{**q('uY','A','o','n'),'enonce':'remplacée'}]}]}
  cls.sql(f"INSERT INTO module_editor_state VALUES(5,{j({'exercices':ed(502)['exercices']+ed(505)['exercices']})},'2026-11-12'),(11,{j(ed(602))},'2026-11-12');")
  cls.sql((ROOT/'docs/sql-revue/2026-11-12-bilan-corrige-actuel.sql').read_text())
 def read(self,sid,who=ELEVE_UID,pre=''):
  return json.loads(self.sql(pre+as_ctx('authenticated',{'sub':who},f"SELECT bilan_corrige_actuel_read('{sid}');")).splitlines()[-1])
 def test_vtc_taxi_fg_current_key_by_uid(self):
  for sid,exo in [(S_VTC,502),(S_TAXI,602),(S_FG,505)]:
   r=self.read(sid);a,b=r['questions']
   self.assertEqual([c['lettre'] for c in a['current']['choix'] if c.get('correct')],['A','C'])
   self.assertEqual(a['submitted'],['A']);self.assertEqual(a['practice'],['A','C']);self.assertEqual(float(r['original_score']),2)
   self.assertEqual(b['matches'],0);self.assertIsNone(b['current'])  # replaced question never assimilated
 def test_admin_ok_other_and_anon_refused(self):
  self.assertEqual(len(self.read(S_VTC,ADMIN)['questions']),2)
  for role,who in [('authenticated',AUTRE_UID),('anon',ELEVE_UID)]:
   c,_=self.pg.sql(as_ctx(role,{'sub':who},f"SELECT bilan_corrige_actuel_read('{S_VTC}');"));self.assertNotEqual(c,0)
 def test_not_submitted_refused(self):
  c,_=self.pg.sql("BEGIN;UPDATE reponses_apprenants SET status='in_progress',completed=false;"+as_ctx('authenticated',{'sub':ELEVE_UID},f"SELECT bilan_corrige_actuel_read('{S_VTC}');")+"ROLLBACK;");self.assertNotEqual(c,0)
 def test_other_tentative_practice_ignored(self):
  r=self.read(S_VTC,pre="BEGIN;UPDATE reponses_apprenants SET tentative=2 WHERE exercice_id LIKE '%revision%';")
  self.assertIsNone(r['questions'][0]['practice']);self.sql("ROLLBACK;")
 def test_no_write(self):
  h="SELECT md5(string_agg(x::text,'' ORDER BY x::text)) FROM (SELECT to_jsonb(t) x FROM bilan_passage_snapshots t UNION ALL SELECT to_jsonb(t) FROM reponses_apprenants t UNION ALL SELECT to_jsonb(t) FROM module_editor_state t) z;"
  b=self.sql(h);[self.read(s) for s in (S_VTC,S_TAXI,S_FG)];self.assertEqual(self.sql(h),b)
if __name__=='__main__':unittest.main(verbosity=2)
