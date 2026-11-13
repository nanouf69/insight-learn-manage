"""Real catalog + review candidate. Disposable Postgres only, no live connection or writes."""
import json, os, subprocess, tempfile, shutil, unittest
from pathlib import Path
A='11111111-1111-1111-1111-111111111111'; U='22222222-2222-2222-2222-222222222222'; S='33333333-3333-3333-3333-333333333333'; G='44444444-4444-4444-4444-444444444444'; O='55555555-5555-5555-5555-555555555555'
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
class LateAttendance(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  catalog=json.loads(Path(os.environ['ATTENDANCE_CATALOG']).read_text())
  cls.tmp=tempfile.mkdtemp(prefix='late-attendance-',dir='/tmp');os.chown(cls.tmp,1000,1000)
  cls.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  subprocess.run(AS+['initdb','-D',cls.tmp+'/db','-U','postgres','-A','trust','--no-locale'],check=True,env=cls.env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  subprocess.run(AS+['pg_ctl','-D',cls.tmp+'/db','-l',cls.tmp+'/log','-o',f'-k {cls.tmp} -p 55488 -h ""','-w','start'],check=True,env=cls.env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  cls.sql("CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;")
  for table,columns in catalog['tables'].items(): cls.sql(f'CREATE TABLE public.{table}({columns});')
  cls.sql('ALTER TABLE emargements_fc ALTER COLUMN id SET DEFAULT gen_random_uuid();ALTER TABLE emargements_fc ADD UNIQUE(apprenant_id,date_emargement,demi_journee);')
  for name in ['pratique_creneaux_planifies','est_dossier_lie_emargement','emargement_fenetre_ouverte','emargement_theorie_inscrite','emargement_creneaux_reels','emargement_controle_creneau','emargement_fenetres_eleve','garde_emargement_fenetre']:
   cls.sql(catalog['functions'][name])
  cls.sql('CREATE TRIGGER trg_garde_emargement_fenetre BEFORE INSERT OR UPDATE ON emargements_fc FOR EACH ROW EXECUTE FUNCTION garde_emargement_fenetre();')
  cls.sql(Path('docs/sql-revue/2026-11-13-emargement-tardif.sql').read_text())
 @classmethod
 def tearDownClass(cls):
  subprocess.run(AS+['pg_ctl','-D',cls.tmp+'/db','-m','immediate','stop'],env=cls.env,capture_output=True);shutil.rmtree(cls.tmp,True)
 @classmethod
 def sql(cls,q,check=True):
  return subprocess.run(['psql','-X','-At','-h',cls.tmp,'-p','55488','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',q],env=cls.env,text=True,capture_output=True,check=check)
 def setUp(self):
  self.sql('TRUNCATE emargement_tardif_journal,emargements_fc,emargement_regularisations,apprenants,sessions,session_apprenants,emargement_dossiers_lies;')
  self.sql(f"INSERT INTO apprenants(id,auth_user_id,type_apprenant) VALUES('{A}','{U}','taxi');INSERT INTO sessions(id,type_session,date_debut,date_fin,heure_debut,heure_fin,statut) VALUES('{S}','theorique','2026-10-26','2026-10-30','09:00','16:00','terminee');INSERT INTO session_apprenants(session_id,apprenant_id) VALUES('{S}','{A}');INSERT INTO emargement_regularisations(id,auth_user_id,apprenant_id,session_id,creneaux,motif,autorise_par,expire_le) VALUES('{G}','{U}','{A}','{S}','[{{\"date\":\"2026-10-30\",\"creneau\":\"matin\"}},{{\"date\":\"2026-10-30\",\"creneau\":\"apres_midi\"}}]','Presence verifiee administrativement','admin',now()+interval '1 day');")
 def call(self,op=O,user=U,app=A,date='2026-10-30',slot='matin',signature=None,presence='true',identity='true',check=True):
  sig=signature if signature is not None else 'data:image/png;base64,'+'A'*300
  return self.sql(f"select emargement_tardif_signer('{op}','{user}','{G}','{app}','{date}','{slot}','{sig}',{presence},{identity},'fictif')",check)
 def refused(self,**args): self.assertNotEqual(self.call(check=False,**args).returncode,0);self.assertEqual(self.sql('select count(*) from emargement_tardif_journal').stdout.strip(),'0')
 def test_30_october_morning_real_timestamp(self):
  receipt=json.loads(self.call().stdout);self.assertTrue(receipt['tardif']);self.assertFalse(receipt['duplicate'])
  self.assertEqual(self.sql("select date_emargement::text||'|'||(signed_at>'2026-10-30'::timestamptz)::text||'|'||confirme_presence_creneau::text from emargements_fc").stdout.strip(),'2026-10-30|true|true')
 def test_afternoon_separate_proof(self): self.call(slot='apres_midi');self.assertEqual(self.sql('select creneau from emargement_tardif_journal').stdout.strip(),'apres_midi')
 def test_other_owner(self): self.refused(user=S)
 def test_other_dossier(self): self.refused(app=S)
 def test_other_slot(self): self.refused(slot='soir_1')
 def test_other_past_date(self): self.refused(date='2026-10-29')
 def test_future(self): self.refused(date='2099-10-30')
 def test_expiry(self): self.sql("update emargement_regularisations set expire_le=now()-interval '1 second'");self.refused()
 def test_missing_identity(self): self.refused(identity='false')
 def test_missing_presence(self): self.refused(presence='false')
 def test_invalid_signature(self): self.refused(signature='not-an-image')
 def test_waitlist(self): self.sql('update session_apprenants set liste_attente=true');self.refused()
 def test_excluded(self): self.sql('update session_apprenants set emargements_exclus=true');self.refused()
 def test_cancelled_session(self): self.sql("update sessions set statut='annulee'");self.refused()
 def test_wrong_session_in_grant(self): self.sql(f"update emargement_regularisations set session_id='{O}'");self.refused()
 def test_elearning(self): self.sql("update apprenants set type_apprenant='taxi-e'");self.refused()
 def test_double_click_same_operation(self):
  self.call();before=self.sql('select md5(to_jsonb(e)::text) from emargements_fc e').stdout
  self.assertTrue(json.loads(self.call().stdout)['duplicate']);self.assertEqual(self.sql('select count(*) from emargement_tardif_journal').stdout.strip(),'1');self.assertEqual(before,self.sql('select md5(to_jsonb(e)::text) from emargements_fc e').stdout)
 def test_conflicting_operation(self):
  self.call();self.assertNotEqual(self.call(signature='data:image/png;base64,'+'B'*300,check=False).returncode,0)
 def test_already_signed_no_replacement(self):
  self.call();before=self.sql('select md5(to_jsonb(e)::text) from emargements_fc e').stdout
  receipt=json.loads(self.call(op=S,signature='data:image/png;base64,'+'B'*300).stdout);self.assertTrue(receipt['conserve']);self.assertEqual(before,self.sql('select md5(to_jsonb(e)::text) from emargements_fc e').stdout)
 def test_masked_conflict_not_success(self):
  self.sql(f"insert into emargements_fc(id,apprenant_id,user_id,date_emargement,demi_journee,masque) values(gen_random_uuid(),'{A}','{U}','2026-10-30','matin',true)");self.refused()
 def test_fill_only_existing_blank(self):
  self.sql(f"insert into emargements_fc(id,apprenant_id,user_id,date_emargement,demi_journee) values('{O}','{A}','{U}','2026-10-30','matin')");self.call();self.assertEqual(self.sql('select id from emargements_fc').stdout.strip(),O)
 def test_journal_immutable(self):
  self.call();self.assertNotEqual(self.sql("update emargement_tardif_journal set creneau='apres_midi'",False).returncode,0);self.assertNotEqual(self.sql('delete from emargement_tardif_journal',False).returncode,0)
 def test_rpc_denied_to_learner_and_anon(self):
  for role in ['authenticated','anon']: self.assertEqual(self.sql(f"select has_function_privilege('{role}','emargement_tardif_signer(uuid,uuid,uuid,uuid,date,text,text,boolean,boolean,text)','execute')").stdout.strip(),'f')
 def test_journal_rls_other_account(self):
  self.call();self.assertEqual(self.sql(f"set role authenticated;set test.uid='{S}';select count(*) from emargement_tardif_journal").stdout.strip().splitlines()[-1],'0')
if __name__=='__main__': unittest.main(verbosity=2)