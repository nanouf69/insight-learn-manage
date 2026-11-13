"""Disposable-only prototype contract: real Postgres, not hosted Auth/Storage E2E."""
import unittest, subprocess, tempfile, os, shutil, uuid, json
from pathlib import Path
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
A='11111111-1111-1111-1111-111111111111'; I='22222222-2222-2222-2222-222222222222'; S='33333333-3333-3333-3333-333333333333'; U='44444444-4444-4444-4444-444444444444'; F='55555555-5555-5555-5555-555555555555'; V='66666666-6666-6666-6666-666666666666'
class Presence(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='presence-exacte-',dir='/tmp');os.chown(c.d,1000,1000);c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};c.addClassCleanup(c.cleanup)
  subprocess.run(AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],env=c.env,check=True,capture_output=True)
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55491 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
  c.sql(f"""CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA storage;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  GRANT USAGE ON SCHEMA auth TO authenticated;
  CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql AS $$SELECT u='{U}'::uuid AND r='admin'$$;
  CREATE TABLE storage.objects(bucket_id text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE TABLE session_apprenants(id uuid,apprenant_id uuid,session_id uuid,liste_attente boolean,emargements_exclus boolean,statut_suivi text,date_debut date,date_fin date,date_fin_personnalisee date);
  CREATE TABLE sessions(id uuid,date_debut date,date_fin date);
  CREATE TABLE formateurs(id uuid);
  CREATE TABLE presentiel_heures_validees(id uuid,apprenant_id uuid,date_presence date,categorie text,heures numeric,created_at timestamptz);
  CREATE TABLE edof_fin_formation(apprenant_id uuid,mis_fin_formation boolean);CREATE TABLE releve_jalons_gels(apprenant_id uuid);CREATE TABLE releve_jalons_fin_acces(apprenant_id uuid);
  CREATE FUNCTION emargement_theorie_inscrite(uuid,uuid) RETURNS TABLE(date_cours date,creneau text,debut time,fin time,pratique boolean) LANGUAGE sql AS $$ SELECT '2026-09-17'::date,'soir_2','18:30'::time,'21:00'::time,false $$;
  INSERT INTO sessions VALUES('{S}','2026-09-14','2026-09-27');
  INSERT INTO session_apprenants VALUES('{I}','{A}','{S}',false,false,'inscrit','2026-09-14','2026-10-31',null);
  INSERT INTO formateurs VALUES('{F}');
  INSERT INTO presentiel_heures_validees VALUES('{V}','{A}','2026-09-17','theorie',1.5,'2026-11-13T13:52:38Z');""")
  c.sql(Path('docs/sql-revue/2026-11-13-presence-creneau-operationnel.sql').read_text())
 @classmethod
 def sql(c,q,check=True):
  r=subprocess.run(['psql','-X','-At','-h',c.d,'-p','55491','-U','postgres','-v','ON_ERROR_STOP=1'],input=q,env=c.env,text=True,capture_output=True)
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 @classmethod
 def cleanup(c):
  if hasattr(c,'d'):subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True);shutil.rmtree(c.d,ignore_errors=True)
 def test_contract_and_restore(self):
  original=self.sql('SELECT to_jsonb(v) FROM presentiel_heures_validees v').stdout
  snapshot=self.sql("SELECT jsonb_agg(jsonb_build_object('id',id,'heures',heures,'date_presence',date_presence,'categorie',categorie,'created_at',created_at) ORDER BY id) FROM presentiel_heures_validees").stdout.strip()
  op=str(uuid.uuid4()); self.sql(f"INSERT INTO presentiel_presence_pdf VALUES('{op}','{op}','{A}','{U}','private/{op}.pdf',repeat('a',64),100,clock_timestamp())")
  def call(uid=U,app=A,ins=I,session=S,date='2026-09-17',creneau='soir_2',start='18:30',end='21:00',trainer=F,proof=op,rap=snapshot,replace=True,confirmed=True,operation=op,check=False):
   return self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';SELECT row_to_json(r) FROM presentiel_confirmer_creneau('{operation}','{app}','{ins}','{session}','{date}','{creneau}','{start}','{end}','{trainer}','feuille','{proof}','{rap}'::jsonb,{str(confirmed).lower()},{str(replace).lower()})r",check)
  cases=[dict(uid=A),dict(app=U),dict(ins=F),dict(session=F),dict(date='2099-01-01'),dict(creneau='soir_1'),dict(start='18:00'),dict(trainer=A),dict(proof=A),dict(rap='[]'),dict(replace=False),dict(confirmed=False)]
  for case in cases:
   with self.subTest(refusal=case):self.assertNotEqual(call(**case).returncode,0)
  self.sql(f"INSERT INTO edof_fin_formation VALUES('{A}',true)")
  self.assertNotEqual(call().returncode,0);self.sql('TRUNCATE edof_fin_formation') # disposable fixture only
  r=call(check=True);rec=json.loads(r.stdout.splitlines()[-1]);self.assertEqual(rec['minutes'],150);self.assertEqual(rec['auteur'],U);self.assertNotEqual(rec['valide_le'][:10],'2026-09-17')
  self.assertEqual(call(check=True).stdout,r.stdout)
  self.assertNotEqual(call(start='19:00').returncode,0)
  op2=str(uuid.uuid4());self.sql(f"INSERT INTO presentiel_presence_pdf VALUES('{op2}','{op2}','{A}','{U}','private/{op2}.pdf',repeat('b',64),100,clock_timestamp())")
  self.assertNotEqual(call(operation=op2,proof=op2).returncode,0)
  for table in ['presentiel_presence_creneaux','presentiel_presence_pdf']:
   self.assertNotEqual(self.sql(f"UPDATE {table} SET auteur='{A}'",False).returncode,0)
   self.assertNotEqual(self.sql(f'DELETE FROM {table}',False).returncode,0)
   self.assertEqual(self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{A}';SELECT count(*) FROM {table}").stdout.splitlines()[-1],'0')
  self.assertEqual(original,self.sql('SELECT to_jsonb(v) FROM presentiel_heures_validees v').stdout)
  dump=subprocess.run(['pg_dump','-h',self.d,'-p','55491','-U','postgres','--no-owner','postgres'],env=self.env,text=True,capture_output=True,check=True).stdout
  self.sql('CREATE DATABASE restored')
  restored=subprocess.run(['psql','-X','-h',self.d,'-p','55491','-U','postgres','-d','restored','-v','ON_ERROR_STOP=1'],input=dump,env=self.env,text=True,capture_output=True)
  self.assertEqual(restored.returncode,0,restored.stderr)
  result=subprocess.run(['psql','-X','-At','-h',self.d,'-p','55491','-U','postgres','-d','restored','-c','SELECT row_to_json(r) FROM presentiel_presence_creneaux r'],env=self.env,text=True,capture_output=True,check=True)
  self.assertEqual(json.loads(result.stdout),rec)
if __name__=='__main__':unittest.main(verbosity=2)