"""Candidate signature table tested only on disposable PostgreSQL with synthetic rows."""
import os, pathlib, subprocess, tempfile, unittest
ROOT = pathlib.Path(__file__).resolve().parents[2]
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='intervenant-signature-',dir='/tmp'); c.user=[] if os.geteuid() else ['setpriv','--reuid=1000','--regid=1000','--clear-groups']
  if c.user: os.chown(c.d,1000,1000)
  c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  for cmd in [c.user+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],c.user+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55524 -h ""','-w','start']]: subprocess.run(cmd,env=c.env,check=True,capture_output=True)
  c.sql("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.uid',true),'')::uuid$$; CREATE TYPE public.app_role AS ENUM('admin','user'); CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$SELECT $1='11111111-1111-1111-1111-111111111111'::uuid AND $2='admin'$$; CREATE TABLE public.documents_a_signer(id uuid primary key,apprenant_id uuid,modele_code text,cle_envoi text,modele_version text); GRANT USAGE ON SCHEMA auth TO authenticated;"+(ROOT/'docs/sql-revue/2026-11-24-parcours-signature-intervenant.sql').read_text())
  c.sql("INSERT INTO public.documents_a_signer VALUES ('11111111-1111-1111-1111-111111111111',null,'justification_competences_intervenant',null,'v1'),('22222222-2222-2222-2222-222222222222',null,'contrat_cadre_prestation_intervenant','11111111-1111-1111-1111-111111111111','v1')")
 @classmethod
 def tearDownClass(c): subprocess.run(c.user+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True)
 @classmethod
 def sql(c,q,check=True): return subprocess.run(['psql','-X','-At','-h',c.d,'-p','55524','-U','postgres','-v','ON_ERROR_STOP=1','-c',q],env=c.env,text=True,capture_output=True,check=check)
 def insert(self,doc=None,op='33333333-3333-3333-3333-333333333333'):
  doc=doc or op
  return f"INSERT INTO public.documents_a_signer SELECT '{op}',null,'justification_competences_intervenant',null,'v1' WHERE NOT EXISTS(SELECT 1 FROM public.documents_a_signer WHERE id='{op}'); INSERT INTO public.intervenant_signature_preuves(document_id,operation_id,document_empreinte,requete_empreinte,consentement_texte,signature_data_url,signature_empreinte,pdf_path,pdf_empreinte,charge_utile,signed_at,signe_le_paris) VALUES('{doc}','{op}',repeat('a',64),repeat('b',64),'CONSENT','data:image/png;base64,TEST',repeat('c',64),'/tmp/{op}.pdf',repeat('d',64),'{{\"fictif\":true}}',now(),'TEST PARIS')"
 def test_01_insert_and_admin_read(self):
  self.sql(self.insert()); out=self.sql("SET ROLE authenticated; SET request.uid='11111111-1111-1111-1111-111111111111'; SELECT count(*) FROM public.intervenant_signature_preuves").stdout.strip().splitlines()[-1]; self.assertEqual(out,'1')
 def test_02_non_admin_reads_nothing(self):
  self.sql(self.insert(op='44444444-4444-4444-4444-444444444444')); out=self.sql("SET ROLE authenticated; SET request.uid='99999999-9999-9999-9999-999999999999'; SELECT count(*) FROM public.intervenant_signature_preuves").stdout.strip().splitlines()[-1]; self.assertEqual(out,'0')
 def test_03_anon_has_no_table_privilege(self): self.assertEqual(self.sql("SELECT has_table_privilege('anon','public.intervenant_signature_preuves','SELECT'),has_table_privilege('authenticated','public.intervenant_signature_preuves','INSERT'),has_table_privilege('service_role','public.intervenant_signature_preuves','INSERT')").stdout.strip(),'f|f|t')
 def test_04_update_forbidden(self):
  self.sql(self.insert(op='55555555-5555-5555-5555-555555555555')); self.assertNotEqual(self.sql("UPDATE public.intervenant_signature_preuves SET consentement_texte='CHANGED'",False).returncode,0)
 def test_05_delete_forbidden(self):
  self.sql(self.insert(op='66666666-6666-6666-6666-666666666666')); self.assertNotEqual(self.sql("DELETE FROM public.intervenant_signature_preuves",False).returncode,0)
 def test_06_one_proof_per_document(self):
  self.sql(self.insert(doc='11111111-1111-1111-1111-111111111111',op='77777777-7777-7777-7777-777777777777')); self.assertNotEqual(self.sql(self.insert(doc='11111111-1111-1111-1111-111111111111',op='88888888-8888-8888-8888-888888888888'),False).returncode,0)
 def test_07_contract_unique_only_for_new_model(self):
  self.assertNotEqual(self.sql("INSERT INTO public.documents_a_signer VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',null,'contrat_cadre_prestation_intervenant','11111111-1111-1111-1111-111111111111','v1')",False).returncode,0)
  self.sql("INSERT INTO public.documents_a_signer VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',null,'autre_modele','11111111-1111-1111-1111-111111111111','v1')")
 def test_08_satisfaction_unique_only_for_new_model(self):
  self.sql("INSERT INTO public.documents_a_signer VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc',null,'enquete_satisfaction_formateur','11111111-1111-1111-1111-111111111111','v1')")
  self.assertNotEqual(self.sql("INSERT INTO public.documents_a_signer VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd',null,'enquete_satisfaction_formateur','11111111-1111-1111-1111-111111111111','v1')",False).returncode,0)
  self.sql("INSERT INTO public.documents_a_signer VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',null,'autre_enquete','11111111-1111-1111-1111-111111111111','v1')")
 def test_09_independent_restore_preserves_sources_and_permissions(self):
  backup=self.d+'/signature-restauration-complete.sql'
  before=self.sql("SELECT (SELECT md5(string_agg(id::text,',' ORDER BY id::text)) FROM public.documents_a_signer)||'|'||(SELECT count(*) FROM public.intervenant_signature_preuves)").stdout.strip()
  subprocess.run(['pg_dump','-h',self.d,'-p','55524','-U','postgres','-f',backup],env=self.env,check=True,capture_output=True)
  subprocess.run(['createdb','-h',self.d,'-p','55524','-U','postgres','signature_restauration'],env=self.env,check=True,capture_output=True)
  subprocess.run(['psql','-X','-At','-h',self.d,'-p','55524','-U','postgres','-d','signature_restauration','-v','ON_ERROR_STOP=1','-f',backup],env=self.env,check=True,capture_output=True)
  restored=subprocess.run(['psql','-X','-At','-h',self.d,'-p','55524','-U','postgres','-d','signature_restauration','-c',"SELECT (SELECT md5(string_agg(id::text,',' ORDER BY id::text)) FROM public.documents_a_signer)||'|'||(SELECT count(*) FROM public.intervenant_signature_preuves)"],env=self.env,text=True,capture_output=True,check=True).stdout.strip()
  self.assertEqual(restored,before)
  out=subprocess.run(['psql','-X','-At','-h',self.d,'-p','55524','-U','postgres','-d','signature_restauration','-c',"SET ROLE authenticated; SET request.uid='99999999-9999-9999-9999-999999999999'; SELECT count(*) FROM public.intervenant_signature_preuves"],env=self.env,text=True,capture_output=True,check=True).stdout.strip().splitlines()[-1]
  self.assertEqual(out,'0')
  subprocess.run(['dropdb','-h',self.d,'-p','55524','-U','postgres','signature_restauration'],env=self.env,check=True,capture_output=True)
if __name__=='__main__': unittest.main(verbosity=2)
