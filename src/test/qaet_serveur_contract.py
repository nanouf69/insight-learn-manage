"""Run candidate RPCs and RLS on disposable PostgreSQL only, synthetic accounts."""
import json, pathlib, unittest, uuid
from core_correction_securite_contract import Pg, as_ctx
ROOT=pathlib.Path(__file__).resolve().parents[2]
UID='10000000-0000-0000-0000-000000000001'
OTHER='10000000-0000-0000-0000-000000000002'
VTC='10000000-0000-0000-0000-000000000003'
def j(x): return "'"+json.dumps(x).replace("'","''")+"'::jsonb"
SCHEMA="""
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE ROLE authenticator NOINHERIT; GRANT anon,authenticated TO authenticator;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE apprenants(id uuid DEFAULT gen_random_uuid(),auth_user_id uuid,type_apprenant text,formation_choisie text,deleted_at timestamptz,date_fin_cours_en_ligne date);
CREATE TABLE apprenant_connexions(id uuid DEFAULT gen_random_uuid(),user_id uuid,ended_at timestamptz,started_at timestamptz DEFAULT now());
CREATE TABLE module_editor_state(module_id int,module_data jsonb);
CREATE TABLE quiz_question_bindings(module_id int,exercise_id int,quiz_id text,section_id int);
CREATE TABLE quiz_questions(quiz_id text,section_id int,legacy_question_id int,enonce text,choix jsonb,active boolean);
CREATE TABLE official_evidence(kind text,payload jsonb);
INSERT INTO official_evidence VALUES ('modules','{"completed":true,"hours":60,"jalons":100,"attestation":true,"pratique":true}');
"""
class QAET(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pg=Pg(); cls.addClassCleanup(cls.pg.stop)
  cls.sql(SCHEMA)
  cls.sql((ROOT/'docs/sql-revue/qaet-autonome.sql').read_text())
  cls.sql(f"INSERT INTO apprenants(auth_user_id,type_apprenant) VALUES('{UID}','taxi'),('{OTHER}','taxi'),('{VTC}','vtc')")
  qs=[{'id':i,'enonce':f'Question synthetic {i}','choix':[{'lettre':'A','texte':'Oui','correct':True},{'lettre':'B','texte':'Non','correct':False}]} for i in range(1,672)]
  cls.sql(f"INSERT INTO module_editor_state VALUES(7,{j({'exercices':[{'id':7001,'questions':qs}]})})")
  cls.refs=[{'cle':f'7:7001:{i}','module':7,'exercice':7001,'question':str(i),'theme':'adresses'} for i in range(1,672)]
 @classmethod
 def sql(cls,q):
  c,o=cls.pg.sql(q)
  if c: raise AssertionError(o)
  return o
 def call(self,action='read',tid=None,rev=0,payload=None,op=None,uid=UID):
  tid=tid or str(uuid.uuid4()); op=op or str(uuid.uuid4())
  return self.pg.sql(as_ctx('authenticated',{'sub':uid},f"SELECT qaet_commande('{op}','{action}','{tid}',{rev},{j(payload or {})});"))
 def start(self):
  tid=str(uuid.uuid4()); c,o=self.call('start',tid,payload={'references':self.refs,'mode':'toutes'})
  self.assertEqual(c,0,o); return tid
 def fingerprint(self):
  return self.sql("SELECT qaet_empreinte(qaet_question('{\"module\":7,\"exercice\":7001,\"question\":\"1\"}'))")
 def test_01_permissions_isolation(self):
  tid=self.start()
  self.assertNotEqual(self.call(uid=VTC)[0],0)
  c,o=self.pg.sql(as_ctx('anon',{},'SELECT qaet_eligible();')); self.assertNotEqual(c,0)
  c,o=self.call(); self.assertEqual(c,0,o)
  c,o=self.pg.sql(as_ctx('authenticated',{'sub':OTHER},f"SELECT count(*) FROM qaet_tentatives WHERE id='{tid}';")); self.assertEqual(o.splitlines()[-1],'0')
  for query in [f"UPDATE qaet_tentatives SET reponses='{{}}' WHERE id='{tid}'",f"DELETE FROM qaet_tentatives WHERE id='{tid}'"]:
   self.assertNotEqual(self.pg.sql(as_ctx('authenticated',{'sub':UID},query))[0],0)
  self.assertNotEqual(self.call('answer',tid,payload={'cle':'7:7001:1','lettres':['A'],'empreinte':self.fingerprint()},uid=OTHER)[0],0)
 def test_02_idempotence_revision_and_late_success(self):
  tid=self.start(); op=str(uuid.uuid4()); payload={'cle':'7:7001:1','lettres':['A'],'empreinte':self.fingerprint()}
  for _ in range(2): self.assertEqual(self.call('answer',tid,0,payload,op)[0],0)
  self.assertEqual(self.sql(f"SELECT revision FROM qaet_tentatives WHERE id='{tid}'"),'1')
  self.assertNotEqual(self.call('answer',tid,0,{**payload,'lettres':['B']})[0],0)
  self.assertNotEqual(self.call('answer',tid,0,{**payload,'lettres':['B']},op)[0],0)
  c,o=self.call(uid=UID); self.assertIn('"lettres": ["A"]',o)
 def test_03_complete_freeze_and_current_score(self):
  tid=self.start(); self.assertNotEqual(self.call('finish',tid)[0],0)
  # Fill via the actual RPCs, not direct table mutation.
  for i in range(1,672):
   fp=self.sql(f"SELECT qaet_empreinte(qaet_question('{json.dumps(self.refs[i-1])}'))")
   c,o=self.call('answer',tid,i-1,{'cle':f'7:7001:{i}','lettres':['A'],'empreinte':fp}); self.assertEqual(c,0,o)
  op=str(uuid.uuid4()); c,o=self.call('finish',tid,671,op=op); self.assertEqual(c,0,o); self.assertIn('"note20": 20.00',o)
  self.assertEqual(self.call('finish',tid,671,op=op)[0],0)
  self.assertNotEqual(self.call('answer',tid,672,{'cle':'7:7001:1','lettres':['B'],'empreinte':self.fingerprint()})[0],0)
  before=self.sql(f"SELECT reponses FROM qaet_tentatives WHERE id='{tid}'")
  self.sql("UPDATE module_editor_state SET module_data=jsonb_set(module_data,'{exercices,0,questions,0,choix}', '[{\"lettre\":\"A\",\"texte\":\"Oui\",\"correct\":false},{\"lettre\":\"B\",\"texte\":\"Non\",\"correct\":true}]')")
  c,o=self.call(); self.assertEqual(c,0,o); self.assertIn('"note20": 19.97',o)
  self.assertEqual(before,self.sql(f"SELECT reponses FROM qaet_tentatives WHERE id='{tid}'"))
 def test_04_course_session_and_official_evidence_unchanged(self):
  before=self.sql('SELECT payload FROM official_evidence')
  self.sql(f"INSERT INTO apprenant_connexions(user_id) VALUES('{UID}')")
  self.assertNotEqual(self.call('start',payload={'references':self.refs,'mode':'toutes'})[0],0)
  self.sql(f"UPDATE apprenant_connexions SET ended_at=now() WHERE user_id='{UID}'")
  cnx=self.sql('SELECT row_to_json(c) FROM apprenant_connexions c'); self.start()
  self.assertEqual(before,self.sql('SELECT payload FROM official_evidence')); self.assertEqual(cnx,self.sql('SELECT row_to_json(c) FROM apprenant_connexions c'))
 def test_05_excluded_source_and_spoofed_fingerprint(self):
  refs=[*self.refs]; refs[0]={**refs[0],'module':13,'exercice':13100}
  self.assertNotEqual(self.call('start',payload={'references':refs,'mode':'toutes'})[0],0)
  tid=self.start(); self.assertNotEqual(self.call('answer',tid,payload={'cle':'7:7001:1','lettres':['A']})[0],0)
if __name__=='__main__': unittest.main()