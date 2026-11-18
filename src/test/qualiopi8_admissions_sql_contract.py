"""The exact audit query runs against synthetic data in disposable PostgreSQL."""
import os, pathlib, subprocess, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='qualiopi8-',dir='/tmp'); c.user=[] if os.geteuid() else ['setpriv','--reuid=1000','--regid=1000','--clear-groups']
  if c.user: os.chown(c.d,1000,1000)
  c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  for cmd in [c.user+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],c.user+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55519 -h ""','-w','start']]: subprocess.run(cmd,env=c.env,check=True,capture_output=True)
  c.sql("""CREATE TABLE apprenants(id uuid,nom text,prenom text,email text,type_apprenant text,formation_choisie text,statut text,deleted_at timestamptz,abandonnee boolean);
  CREATE TABLE sessions(id uuid,nom text,type_session text,types_apprenant text[],date_debut date,date_fin date,statut text);
  CREATE TABLE session_apprenants(id uuid,apprenant_id uuid,session_id uuid,date_debut date,date_fin date,date_fin_personnalisee date,statut_suivi text,liste_attente boolean,emargements_exclus boolean);
  CREATE TABLE comptes_test_techniques(apprenant_id uuid); CREATE TABLE core_bridge_comptes_test(apprenant_id uuid);
  CREATE TABLE emargements_fc(id uuid,apprenant_id uuid,date_emargement date,signed_at timestamptz,signature_data_url text,absent boolean,masque boolean);
  CREATE TABLE fc_signatures_papier(id uuid,inscription_id uuid,apprenant_id uuid,session_id uuid,document_id uuid,date_presence date,heures numeric,created_at timestamptz);
  CREATE TABLE documents_inscription(id uuid,apprenant_id uuid,url text,statut text);
  CREATE TABLE presentiel_presence_creneaux(id uuid,inscription_id uuid,apprenant_id uuid,session_id uuid,validation_id uuid,date_presence date,minutes integer,pdf_chemin text,created_at timestamptz);
  CREATE TABLE presentiel_heures_validees(id uuid,apprenant_id uuid);
  CREATE TABLE presentiel_validation_decisions(validation_id uuid,version integer,action text);
  """)
  c.query=(ROOT/'docs/qualiopi-8-admissions-audit.sql').read_text()
 @classmethod
 def tearDownClass(c): subprocess.run(c.user+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True)
 @classmethod
 def sql(c,q): return subprocess.run(['psql','-X','-At','-h',c.d,'-p','55519','-U','postgres','-v','ON_ERROR_STOP=1','-c',q],env=c.env,text=True,capture_output=True,check=True).stdout.strip()
 def setUp(self):
  self.sql("TRUNCATE apprenants,sessions,session_apprenants,comptes_test_techniques,core_bridge_comptes_test,emargements_fc,fc_signatures_papier,documents_inscription,presentiel_presence_creneaux,presentiel_heures_validees,presentiel_validation_decisions;")
  self.a='11111111-1111-1111-1111-111111111111'; self.s='22222222-2222-2222-2222-222222222222'; self.i='33333333-3333-3333-3333-333333333333'
  self.sql(f"INSERT INTO apprenants(id,nom,email,type_apprenant,statut) VALUES('{self.a}','SYNTHETIC','synthetic@invalid.local','vtc','inscrit'); INSERT INTO sessions VALUES('{self.s}','VTC','theorique',ARRAY['VTC'],current_date-10,current_date-1,'planifiee'); INSERT INTO session_apprenants(id,apprenant_id,session_id) VALUES('{self.i}','{self.a}','{self.s}');")
 def signature(self): self.sql(f"INSERT INTO emargements_fc VALUES(gen_random_uuid(),'{self.a}',current_date-3,now()-interval '2 days','data:image/png;base64,SYNTHETIC',false,false)")
 def result(self): return self.sql('SELECT resultat FROM ('+self.query+') audit')
 def test_01_participation_required(self): self.assertNotEqual(self.result(),'eligible')
 def test_02_signed_participation(self): self.signature(); self.assertEqual(self.result(),'eligible')
 def test_03_no_fake_decision_date(self): self.signature(); self.assertEqual(self.sql('SELECT decision_le IS NULL AND date_decision_statut=\'date à confirmer\' FROM ('+self.query+') audit'),'t')
 def test_04_tests_excluded(self): self.signature(); self.sql(f"INSERT INTO comptes_test_techniques VALUES('{self.a}')"); self.assertEqual(self.result(),'compte test exclu')
 def test_05_masked_signature_not_proof(self): self.signature(); self.sql('UPDATE emargements_fc SET masque=true'); self.assertNotEqual(self.result(),'eligible')
 def test_06_absent_not_admitted(self): self.signature(); self.sql('UPDATE emargements_fc SET absent=true'); self.assertNotEqual(self.result(),'eligible')
 def test_07_overlapping_sessions_not_arbitrary(self): self.signature(); self.sql(f"INSERT INTO sessions SELECT gen_random_uuid(),nom,type_session,types_apprenant,date_debut,date_fin,statut FROM sessions; INSERT INTO session_apprenants(id,apprenant_id,session_id) SELECT gen_random_uuid(),'{self.a}',id FROM sessions WHERE id<>'{self.s}';"); self.assertNotIn('eligible',self.result().splitlines())
 def test_08_exact_enrollment_dates(self): self.signature(); self.sql('UPDATE session_apprenants SET date_debut=current_date-2'); self.assertNotEqual(self.result(),'eligible')
 def test_09_future_not_admitted(self): self.sql('UPDATE sessions SET date_debut=current_date+1,date_fin=current_date+2'); self.assertEqual(self.result(),'session future')
 def test_10_cancelled_not_admitted(self): self.signature(); self.sql("UPDATE session_apprenants SET statut_suivi='abandon'"); self.assertNotEqual(self.result(),'eligible')
 def test_11_exam_not_formation(self): self.signature(); self.sql("UPDATE sessions SET type_session='examen'"); self.assertEqual(self.result(),'')
 def test_12_crm_current_label_never_replaces_session(self): self.signature(); self.sql("UPDATE apprenants SET formation_choisie='continue-taxi'"); self.assertEqual(self.sql('SELECT session_nom FROM ('+self.query+') audit'),'VTC')
if __name__=='__main__': unittest.main(verbosity=2)