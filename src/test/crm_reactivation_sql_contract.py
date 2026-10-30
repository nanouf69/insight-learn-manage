"""Isolated PostgreSQL contract. Never writes to hosted learner data."""
import json,os,shutil,subprocess,tempfile,unittest
from pathlib import Path
A='11111111-1111-1111-1111-111111111111'
U='22222222-2222-2222-2222-222222222222'
O='33333333-3333-3333-3333-333333333333'
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(dir='/tmp');os.chown(c.d,1000,1000);c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};c.addClassCleanup(c.tearDownClass)
  for cmd in [AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55479 -h ""','-w','start']]:subprocess.run(cmd,env=c.env,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  c.sql("""CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
  CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT $1='22222222-2222-2222-2222-222222222222'::uuid AND $2='admin'$$;
  CREATE TABLE auth.users(id uuid,banned_until timestamptz);
  CREATE TABLE apprenants(id uuid PRIMARY KEY,auth_user_id uuid,deleted_at timestamptz,abandonnee boolean,compte_cours_archive_at timestamptz,statut text,modules_autorises integer[],date_debut_cours_en_ligne date,date_fin_cours_en_ligne date,date_examen_theorique text);
  CREATE TABLE documents_a_signer(apprenant_id uuid,modele_code text,cle_envoi text);""")
  c.sql(Path('docs/crm-reinscription-reactivation.sql').read_text())
 @classmethod
 def tearDownClass(c):
  if not hasattr(c,'d'):return
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True);shutil.rmtree(c.d)
 @classmethod
 def sql(c,q,check=True):
  r=subprocess.run(['psql','-X','-At','-h',c.d,'-p','55479','-U','postgres','-v','ON_ERROR_STOP=1','-c',q],env=c.env,capture_output=True,text=True)
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 def setUp(s):
  s.sql(f"TRUNCATE crm_acces_extensions,crm_reinscription_choix,apprenants,auth.users;INSERT INTO auth.users VALUES('{A}',NULL);INSERT INTO apprenants VALUES('{A}','{A}',NULL,false,NULL,'actif',ARRAY[11],current_date-60,current_date-1,'17 novembre 2026');")
 def choice(s,op=O,exam='2026-11-17',prev='NULL',uid=U,choice='oui',check=True):
  return s.sql(f"SET test.uid='{uid}';SELECT row_to_json(r) FROM crm_enregistrer_reinscription('{op}','{A}','{exam}','{choice}',{prev})r",check)
 def proposal(s):return json.loads(s.sql(f"SET test.uid='{U}';SELECT crm_preparer_reactivation('{A}')").stdout.splitlines()[-1])
 def extend(s,op=O,p=None,check=True):
  p=p or s.proposal();return s.sql(f"SET test.uid='{U}';SELECT row_to_json(r) FROM crm_reactiver_un_mois('{op}','{A}','{p['fin_precedente']}','{p['fin']}')r",check)
 def test_choice_yes_no_history_and_dates(s):
  first=json.loads(s.choice().stdout.splitlines()[-1]);s.choice(op=A,prev="'%s'"%first['id'],choice='non');s.assertEqual(s.sql("SELECT string_agg(choix,',' ORDER BY created_at) FROM crm_reinscription_choix").stdout.strip(),'oui,non');s.assertNotEqual(s.choice(exam='2026-12-17',check=False).returncode,0)
 def test_idempotence_and_conflict(s):
  s.assertEqual(s.choice().stdout,s.choice().stdout);s.assertNotEqual(s.choice(op=A,check=False).returncode,0)
 def test_non_admin_refused(s):
  s.assertNotEqual(s.choice(uid=A,check=False).returncode,0);s.assertNotEqual(s.sql(f"SET test.uid='{A}';SELECT crm_preparer_reactivation('{A}')",False).returncode,0)
 def test_expired_one_calendar_month_and_original_preserved(s):
  before=s.sql('SELECT row_to_json(a) FROM apprenants a').stdout;p=s.proposal();s.assertEqual(p['debut'],p['jour_paris']);r=s.extend(p=p);s.assertEqual(r.stdout,s.extend(p=p).stdout);s.assertEqual(before,s.sql('SELECT row_to_json(a) FROM apprenants a').stdout);s.assertNotEqual(s.extend(op=A,p=p,check=False).returncode,0)
 def test_active_future_extension_and_month_end(s):
  s.sql("UPDATE apprenants SET date_fin_cours_en_ligne='2030-01-31'");p=s.proposal();s.assertEqual(p['fin'],'2030-02-28');s.assertEqual(p['debut'],'2030-01-31')
 def test_banned_archive_missing_account(s):
  for change in ["UPDATE auth.users SET banned_until=now()+interval '1 day'","UPDATE apprenants SET compte_cours_archive_at=now()","UPDATE apprenants SET auth_user_id=NULL"]:
   s.setUp();s.sql(change);s.assertNotEqual(s.sql(f"SET test.uid='{U}';SELECT crm_preparer_reactivation('{A}')",False).returncode,0)
 def test_owner_extension_read_and_isolation(s):
  s.extend();r=s.sql(f"SET test.uid='{A}';SELECT crm_lire_extension_acces('{A}')");s.assertTrue(json.loads(r.stdout.splitlines()[-1])['autorise']);s.assertNotEqual(s.sql(f"SET test.uid='{O}';SELECT crm_lire_extension_acces('{A}')",False).returncode,0)
 def test_immutable_and_browser_insert_forbidden(s):
  s.choice();s.extend();s.assertNotEqual(s.sql("UPDATE crm_reinscription_choix SET choix='non'",False).returncode,0);s.assertNotEqual(s.sql('DELETE FROM crm_acces_extensions',False).returncode,0);s.assertNotEqual(s.sql(f"SET ROLE authenticated;INSERT INTO crm_acces_extensions(operation_id,apprenant_id,auteur,debut,fin) VALUES('{A}','{A}','{U}',current_date,current_date)",False).returncode,0)
if __name__=='__main__':unittest.main(verbosity=2)
