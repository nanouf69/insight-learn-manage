"""Real PostgreSQL execution on disposable, synthetic tables only. No production writes."""
import os, subprocess, tempfile, shutil, unittest
from pathlib import Path

class Signatures(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.directory=tempfile.mkdtemp(prefix='signature-contract-',dir='/tmp'); os.chown(cls.directory,1000,1000)
  cls.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  cls.as_user=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
  subprocess.run(cls.as_user+['initdb','-D',cls.directory+'/db','-U','postgres','-A','trust','--no-locale'],check=True,capture_output=True,env=cls.env)
  subprocess.run(cls.as_user+['pg_ctl','-D',cls.directory+'/db','-l',cls.directory+'/log','-o',f'-k {cls.directory} -p 55489 -h ""','-w','start'],check=True,capture_output=True,env=cls.env)
  cls.sql("CREATE ROLE authenticated; CREATE ROLE service_role; CREATE TABLE emargements_fc(id integer,apprenant_id uuid,user_id uuid,date_emargement date,demi_journee text,signature_data_url text,absent boolean,signed_at timestamptz,regularisation_id uuid,masque boolean); GRANT ALL ON emargements_fc TO authenticated,service_role;")
  # Isolate this guard: the pre-existing enrollment/opening RPC is tested separately.
  cls.sql("CREATE FUNCTION emargement_controle_creneau(uuid,date,text) RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('autorise',$2=(clock_timestamp() AT TIME ZONE 'Europe/Paris')::date)$$;")
  cls.sql(Path('docs/sql-revue/2026-11-13-signatures-passees-interdites.sql').read_text())
  cls.sql('CREATE TRIGGER trg_garde_emargement_fenetre BEFORE INSERT OR UPDATE ON emargements_fc FOR EACH ROW EXECUTE FUNCTION garde_emargement_fenetre()')
 @classmethod
 def tearDownClass(cls):
  subprocess.run(cls.as_user+['pg_ctl','-D',cls.directory+'/db','-m','immediate','stop'],capture_output=True,env=cls.env); shutil.rmtree(cls.directory,True)
 @classmethod
 def sql(cls,q,check=True):
  return subprocess.run(['psql','-X','-At','-h',cls.directory,'-p','55489','-U','postgres','-v','ON_ERROR_STOP=1','-c',q],check=check,capture_output=True,text=True,env=cls.env)
 def setUp(self): self.sql('TRUNCATE emargements_fc')
 def test_paris_midnight_winter_summer(self):
  for instant,date,expected in [('2026-11-13T22:59:59Z','2026-11-13','t'),('2026-11-13T23:00:00Z','2026-11-13','f'),('2026-11-13T23:00:00Z','2026-11-14','t'),('2026-07-13T22:00:00Z','2026-07-13','f'),('2026-07-13T21:59:59Z','2026-07-13','t')]:
   self.assertEqual(self.sql(f"SELECT emargement_date_non_passee('{date}','{instant}')").stdout.strip(),expected)
 def test_dst_changes(self):
  for instant,date in [('2026-03-29T22:00:00Z','2026-03-29'),('2026-10-25T23:00:00Z','2026-10-25')]:
   self.assertEqual(self.sql(f"SELECT emargement_date_non_passee('{date}','{instant}')").stdout.strip(),'f')
 def test_direct_past_insert_all_transport_roles(self):
  for role in ['authenticated','service_role']:
   result=self.sql(f"SET ROLE {role}; INSERT INTO emargements_fc(id,date_emargement,signature_data_url,regularisation_id) VALUES(1,(clock_timestamp() AT TIME ZONE 'Europe/Paris')::date-1,'image','11111111-1111-1111-1111-111111111111')",False)
   self.assertNotEqual(result.returncode,0); self.assertIn('passée interdite',result.stderr)
  self.assertEqual(self.sql('SELECT count(*) FROM emargements_fc').stdout.strip(),'0')
 def test_blank_past_row_cannot_be_filled(self):
  self.sql("INSERT INTO emargements_fc(id,date_emargement) VALUES(1,(clock_timestamp() AT TIME ZONE 'Europe/Paris')::date-1)")
  result=self.sql("UPDATE emargements_fc SET signature_data_url='image' WHERE id=1",False)
  self.assertNotEqual(result.returncode,0); self.assertIn('passée interdite',result.stderr)
  self.assertEqual(self.sql('SELECT signature_data_url IS NULL FROM emargements_fc').stdout.strip(),'t')
 def test_today_real_timestamp_and_future_refusal(self):
  self.sql("INSERT INTO emargements_fc(id,date_emargement,signature_data_url,signed_at) VALUES(1,(clock_timestamp() AT TIME ZONE 'Europe/Paris')::date,'image','2000-01-01')")
  self.assertEqual(self.sql("SELECT signed_at>clock_timestamp()-interval '10 seconds' FROM emargements_fc").stdout.strip(),'t')
  self.assertNotEqual(self.sql("INSERT INTO emargements_fc(date_emargement,signature_data_url) VALUES((clock_timestamp() AT TIME ZONE 'Europe/Paris')::date+1,'image')",False).returncode,0)
 def test_existing_historical_proof_preserved(self):
  # Synthetic pre-existing history loaded before enforcement, never real data.
  self.sql("ALTER TABLE emargements_fc DISABLE TRIGGER trg_garde_emargement_fenetre; INSERT INTO emargements_fc(id,date_emargement,signature_data_url,signed_at) VALUES(1,'2026-11-10','original','2026-11-10T17:00:00Z'); ALTER TABLE emargements_fc ENABLE TRIGGER trg_garde_emargement_fenetre")
  before=self.sql('SELECT row_to_json(e) FROM emargements_fc e').stdout
  self.sql('UPDATE emargements_fc SET masque=false WHERE id=1')
  result=self.sql("UPDATE emargements_fc SET signature_data_url='replacement' WHERE id=1",False)
  self.assertNotEqual(result.returncode,0); self.assertIn('remplacement refusé',result.stderr)
  self.assertEqual(self.sql("SELECT signature_data_url||'|'||signed_at FROM emargements_fc").stdout.strip(),'original|2026-11-10 17:00:00+00')
  self.assertIn('original',before)

if __name__=='__main__': unittest.main(verbosity=2)