"""Candidate only, minimal disposable PostgreSQL. No real attendance rows."""
import unittest,subprocess,tempfile,os,shutil,uuid,json
from pathlib import Path
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
A='11111111-1111-1111-1111-111111111111'; U='22222222-2222-2222-2222-222222222222'; ADMIN='33333333-3333-3333-3333-333333333333'; V='44444444-4444-4444-4444-444444444444'
class Decisions(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='presence-decisions-',dir='/tmp');os.chown(c.d,1000,1000);c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};c.addClassCleanup(c.cleanup)
  subprocess.run(AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],env=c.env,check=True,capture_output=True)
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55489 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
  c.sql(f"""CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  GRANT USAGE ON SCHEMA auth TO authenticated,anon;
  CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql AS $$SELECT u='{ADMIN}'::uuid AND r='admin'$$;
  CREATE TABLE presentiel_heures_validees(id uuid PRIMARY KEY,apprenant_id uuid,heures numeric,date_presence date,categorie text);
  CREATE TABLE edof_fin_formation(apprenant_id uuid);CREATE TABLE releve_jalons_fin_acces(apprenant_id uuid);CREATE TABLE releve_jalons_gels(apprenant_id uuid);
  INSERT INTO presentiel_heures_validees VALUES('{V}','{A}',4,'2026-09-18','theorie'),('55555555-5555-5555-5555-555555555555','{A}',1.5,'2026-09-17','theorie');
  CREATE TABLE signatures(id uuid, image text); INSERT INTO signatures VALUES('{V}','original-signature');
  CREATE TABLE notes(id uuid,note numeric); INSERT INTO notes VALUES('{V}',12);
  CREATE TABLE copies(id uuid,reponse text); INSERT INTO copies VALUES('{V}','original-answer');""")
  c.sql(Path('docs/sql-revue/2026-11-13-presence-decisions.sql').read_text())
 @classmethod
 def sql(c,q,check=True):
  r=subprocess.run(['psql','-X','-At','-h',c.d,'-p','55489','-U','postgres','-v','ON_ERROR_STOP=1'],input=q,env=c.env,text=True,capture_output=True)
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 @classmethod
 def cleanup(c):
  if hasattr(c,'d'):
   subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True);shutil.rmtree(c.d,ignore_errors=True)
 def call(self,op,version=0,action='annuler',uid=ADMIN,apprenant=A,motif='Erreur saisie',check=False):
  return self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';SELECT row_to_json(r) FROM presentiel_decider_validation('{op}','{apprenant}','{V}',{version},'{action}','{motif}')r;",check)
 def test_contract(self):
  before=self.sql('SELECT to_jsonb(v) FROM presentiel_heures_validees v').stdout
  op=str(uuid.uuid4())
  self.assertNotEqual(self.call(op,uid=U).returncode,0)
  self.assertNotEqual(self.call(op,apprenant=U).returncode,0)
  self.assertNotEqual(self.call(op,action='restaurer',motif='x').returncode,0)
  others=self.sql('SELECT row_to_json(s) FROM signatures s;SELECT row_to_json(n) FROM notes n;SELECT row_to_json(c) FROM copies c').stdout
  first=self.call(op,motif='',check=True);receipt=json.loads(first.stdout.splitlines()[-1]);self.assertEqual(receipt['action'],'annuler')
  self.assertEqual(receipt['original']['heures'],4)
  self.assertEqual(receipt['created_by'],ADMIN)
  self.assertTrue(receipt['created_at'])
  self.assertEqual(self.call(op,motif='').stdout,first.stdout)
  self.assertEqual(self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{ADMIN}';SELECT sum(heures) FROM presentiel_validations_effectives('{A}')").stdout.splitlines()[-1],'1.5')
  self.assertNotEqual(self.call(str(uuid.uuid4())).returncode,0)
  self.assertNotEqual(self.call(op,action='restaurer').returncode,0)
  self.assertNotEqual(self.sql('UPDATE presentiel_validation_decisions SET motif=\'Modifier\'',False).returncode,0)
  self.assertNotEqual(self.sql('DELETE FROM presentiel_validation_decisions',False).returncode,0)
  self.assertEqual(self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{U}';SELECT count(*) FROM presentiel_validation_decisions").stdout.splitlines()[-1],'0')
  restored=self.call(str(uuid.uuid4()),version=1,action='restaurer',check=True)
  self.assertEqual(json.loads(restored.stdout.splitlines()[-1])['version'],2)
  self.assertEqual(self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{ADMIN}';SELECT sum(heures) FROM presentiel_validations_effectives('{A}')").stdout.splitlines()[-1],'5.5')
  self.sql(f"INSERT INTO edof_fin_formation VALUES('{A}')")
  self.assertNotEqual(self.call(str(uuid.uuid4()),version=2).returncode,0)
  self.assertEqual(before,self.sql('SELECT to_jsonb(v) FROM presentiel_heures_validees v').stdout)
  self.assertEqual(self.sql('SELECT count(*) FROM presentiel_validation_decisions').stdout.strip(),'2')
  self.assertEqual(others,self.sql('SELECT row_to_json(s) FROM signatures s;SELECT row_to_json(n) FROM notes n;SELECT row_to_json(c) FROM copies c').stdout)
  dump=subprocess.run(['pg_dump','-h',self.d,'-p','55489','-U','postgres','--no-owner'],env=self.env,text=True,capture_output=True,check=True).stdout
  self.sql('CREATE DATABASE restored')
  r=subprocess.run(['psql','-X','-h',self.d,'-p','55489','-U','postgres','-d','restored','-v','ON_ERROR_STOP=1'],input=dump,env=self.env,text=True,capture_output=True)
  self.assertEqual(r.returncode,0,r.stderr)
  restored_rows=subprocess.run(['psql','-XAt','-h',self.d,'-p','55489','-U','postgres','-d','restored','-c','SELECT to_jsonb(v) FROM presentiel_heures_validees v'],env=self.env,text=True,capture_output=True,check=True).stdout
  self.assertEqual(before,restored_rows)
if __name__=='__main__':unittest.main(verbosity=2)