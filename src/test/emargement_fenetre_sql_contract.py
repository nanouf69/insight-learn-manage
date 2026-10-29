"""Execute attendance migration and real catalog dependencies on disposable PostgreSQL only."""
import os, subprocess, tempfile, shutil, unittest, json
from pathlib import Path
AS = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
A='11111111-1111-1111-1111-111111111111'; U='22222222-2222-2222-2222-222222222222'; S='33333333-3333-3333-3333-333333333333'
TABLES=['apprenants','sessions','session_apprenants','agenda_blocs','reservations_pratique','planning_pratique_config','emargement_regularisations','emargements_fc','emargement_dossiers_lies']
def live(q): return subprocess.check_output(['psql','-X','-At','-v','ON_ERROR_STOP=1','-c',q],text=True).strip()
class Contrat(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.dir=tempfile.mkdtemp(dir='/tmp'); os.chown(cls.dir,1000,1000); cls.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  subprocess.run(AS+['initdb','-D',cls.dir+'/db','-U','postgres','-A','trust','--no-locale'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=cls.env)
  subprocess.run(AS+['pg_ctl','-D',cls.dir+'/db','-l',cls.dir+'/pg.log','-o',f'-k {cls.dir} -p 55479 -h ""','-w','start'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=cls.env)
  cls.sql("CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$select nullif(current_setting('test.uid',true),'')::uuid$$; CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql AS $$select false$$;")
  for t in TABLES:
   columns=live(f"select string_agg(quote_ident(attname)||' '||format_type(atttypid,atttypmod),',' order by attnum) from pg_attribute where attrelid='public.{t}'::regclass and attnum>0 and not attisdropped")
   cls.sql(f'CREATE TABLE public.{t} ({columns});')
  for f in ['pratique_creneaux_planifies','est_dossier_lie_emargement']:
   cls.sql(live(f"select pg_get_functiondef('public.{f}'::regproc)"))
  cls.sql(Path('drizzle/migrations/0215_emargement_fenetre_trente_minutes.sql').read_text())
 @classmethod
 def tearDownClass(cls):
  subprocess.run(AS+['pg_ctl','-D',cls.dir+'/db','-m','immediate','stop'],capture_output=True,env=cls.env); shutil.rmtree(cls.dir,True)
 @classmethod
 def sql(cls,q,check=True): return subprocess.run(['psql','-X','-At','-h',cls.dir,'-p','55479','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True,check=check,env=cls.env)
 def setUp(self):
  self.sql('TRUNCATE '+','.join(TABLES))
  self.sql(f"INSERT INTO apprenants(id,auth_user_id,type_apprenant) VALUES('{A}','{U}','taxi'); INSERT INTO sessions(id,type_session,date_debut,date_fin,heure_debut,heure_fin) VALUES('{S}','theorique','2026-10-26','2026-10-30','09:00','16:00'); INSERT INTO session_apprenants(apprenant_id,session_id) VALUES('{A}','{S}'); INSERT INTO agenda_blocs(semaine_debut,jour,heure_debut,heure_fin,publics_cibles) VALUES('2026-10-26',0,'09:00','12:00',ARRAY['TAXI']),('2026-10-26',0,'13:00','16:00',ARRAY['TAXI']);")
 def slots(self): return self.sql(f"select date_cours||'|'||creneau||'|'||debut||'|'||fin||'|'||pratique from emargement_creneaux_reels('{A}')").stdout.strip().splitlines()
 def test_boundary_minus31_minus30_minus1_exact(self):
  for instant,wanted in [('07:29',False),('07:30',True),('07:59',True),('08:00',True)]:
   got=self.sql(f"select emargement_fenetre_ouverte('2026-10-29','09:00','2026-10-29T{instant}:00Z')").stdout.strip(); self.assertEqual(got,'t' if wanted else 'f')
 def test_afternoon_and_evening(self):
  for start,utc in [('13:00','11:30'),('17:00','15:30'),('18:30','17:00')]:
   self.assertEqual(self.sql(f"select emargement_fenetre_ouverte('2026-10-29','{start}','2026-10-29T{utc}:00Z')").stdout.strip(),'t')
 def test_paris_dst_summer_winter_and_previous_date(self):
  for d,h in [('2026-03-29','06:30'),('2026-10-25','07:30')]:
   self.assertEqual(self.sql(f"select emargement_fenetre_ouverte('{d}','09:00','{d}T{h}:00Z')").stdout.strip(),'t')
  self.assertEqual(self.sql("select emargement_fenetre_ouverte('2026-10-30','00:00','2026-10-29T22:30:00Z')").stdout.strip(),'t')
 def test_real_schedule_and_personalized_hours(self):
  self.assertEqual(self.slots(),['2026-10-26|matin|09:00:00|12:00:00|false','2026-10-26|apres_midi|13:00:00|16:00:00|false'])
  self.sql("update session_apprenants set heure_debut_personnalisee='10:00',heure_fin_personnalisee='15:30'")
  self.assertEqual(self.slots(),['2026-10-26|matin|10:00:00|12:00:00|false','2026-10-26|apres_midi|13:00:00|15:30:00|false'])
 def test_waitlist_excluded_cancelled_nonregistered(self):
  for change in ["update session_apprenants set liste_attente=true","update session_apprenants set emargements_exclus=true","update sessions set statut='annulee'","truncate session_apprenants"]:
   self.setUp(); self.sql(change); self.assertEqual(self.slots(),[])
 def test_elearning_theory_never_due(self):
  self.sql("update apprenants set type_apprenant='taxi-e'"); self.assertEqual(self.slots(),[])
 def test_practical_each_halfday_uses_own_real_start(self):
  self.sql("truncate agenda_blocs; update sessions set type_session='pratique',date_fin=date_debut; insert into planning_pratique_config(id,day_time_slots,updated_at) values(gen_random_uuid(),'{\"2026-10-26\":{\"matin\":\"10h-12h\",\"apresmidi\":\"14h-16h\"}}',now());")
  self.assertEqual(self.slots(),['2026-10-26|matin|10:00:00|12:00:00|true','2026-10-26|apres_midi|14:00:00|16:00:00|true'])
  self.sql("update session_apprenants set heure_debut_personnalisee='10:30'")
  self.assertEqual(self.slots()[0],'2026-10-26|matin|10:30:00|12:00:00|true')
 def test_practice_excluded_reservation_cannot_bypass(self):
  self.sql(f"update sessions set type_session='pratique'; update session_apprenants set liste_attente=true; insert into reservations_pratique(id,apprenant_id,date_choisie,creneau) values(gen_random_uuid(),'{A}','2026-10-26','journee');")
  self.assertEqual(self.slots(),[])
 def test_server_guard_refuses_future_filled_not_blank_generation(self):
  self.sql(f"insert into emargements_fc(id,apprenant_id,user_id,date_emargement,demi_journee) values(gen_random_uuid(),'{A}','{U}','2099-01-01','matin')")
  r=self.sql("update emargements_fc set signature_data_url='data:image/png;base64,fictif'",check=False); self.assertNotEqual(r.returncode,0); self.assertIn('trente minutes',r.stderr)
 def test_recorded_signature_unchanged_and_real_timestamp(self):
  self.sql(f"insert into emargements_fc(id,apprenant_id,user_id,date_emargement,demi_journee,signature_data_url,signed_at) values(gen_random_uuid(),'{A}','{U}','2026-10-26','matin','data:image/png;base64,fictif','2000-01-01')")
  self.assertEqual(self.sql("select signed_at>'2026-01-01'::timestamptz from emargements_fc").stdout.strip(),'t')
  old=self.sql('select signed_at from emargements_fc').stdout; self.sql("update emargements_fc set user_agent='metadata only'"); self.assertEqual(self.sql('select signed_at from emargements_fc').stdout,old)
 def test_read_rpc_other_account_refused(self):
  r=self.sql(f"set test.uid='99999999-9999-9999-9999-999999999999'; select * from emargement_fenetres_eleve('{A}')",check=False); self.assertNotEqual(r.returncode,0)
  self.assertEqual(self.sql(f"set test.uid='{U}'; select count(*) from emargement_fenetres_eleve('{A}')").stdout.strip().splitlines()[-1],'2')
if __name__=='__main__': unittest.main(verbosity=2)
