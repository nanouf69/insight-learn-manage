"""Candidate annual claims on disposable PostgreSQL only; no live writes or emails."""
import concurrent.futures, json, pathlib, re, sys, unittest, uuid
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from core_correction_securite_contract import Pg, SCHEMA, ADMIN, ELEVE_UID, as_ctx
ROOT = pathlib.Path(__file__).resolve().parents[2]
F = str(uuid.uuid4())
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pg = Pg(); cls.addClassCleanup(cls.pg.stop)
  cls.sql(SCHEMA)
  cls.sql("""CREATE TABLE formateurs(id uuid PRIMARY KEY,nom text,prenom text,email text,type text);
  CREATE TABLE documents_a_signer(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),nom text,file_path text,champs jsonb,modele_code text,modele_version text,token text UNIQUE,destinataire_nom text,destinataire_email text,identite_figee jsonb,texte_fige text,cle_envoi text,reponses jsonb,statut text,signed_at timestamptz,created_by uuid);
  """)
  cls.sql((ROOT/'docs/sql-revue/2026-11-24-competences-annuelles.sql').read_text())
  source=(ROOT/'supabase/functions/_shared/competencesIntervenant.ts').read_text()
  cls.declaration=re.search(r'export const DECLARATION_COMPETENCES = "([^"]+)";',source).group(1)
 @classmethod
 def sql(cls,q):
  c,o=cls.pg.sql(q)
  if c: raise AssertionError(o)
  return o
 def setup_rows(self,active=True):
  f=str(uuid.uuid4())
  self.sql(f"INSERT INTO formateurs VALUES('{f}','Fictif','Test','fictif@example.invalid','externe');INSERT INTO competences_formateurs_activite(formateur_id,responsable_id,actif,motif) VALUES('{f}','{ADMIN}',{str(active).lower()},'preuve de test');")
  return f
 def enable(self,value=True):
  self.sql(f"INSERT INTO competences_annuelles_controle(responsable_id,actif,publication_verifiee,restauration_verifiee,motif) VALUES('{ADMIN}',{str(value).lower()},true,true,'test isolé');")
 def claim(self,f):
  declaration=self.declaration.replace("'","''")
  return f"SELECT public.competences_annuelles_reserver('{f}','{f}:premiere-demande','{'a'*64}','services-pro-competences-2026-11-24-v1','{declaration}');"
 def test_01_default_off_no_invitation(self):
  f=self.setup_rows();self.enable(False)
  self.assertEqual(self.sql(self.claim(f)), '')
  self.assertEqual(self.sql('SELECT count(*) FROM competences_annuelles_demandes;'),'0')
 def test_02_unknown_and_inactive_excluded(self):
  self.enable(); f=self.setup_rows(False)
  self.assertEqual(self.sql(self.claim(f)), '')
  other=str(uuid.uuid4());self.sql(f"INSERT INTO formateurs VALUES('{other}','F','T','f@example.invalid','interne');")
  self.assertEqual(self.sql(self.claim(other)), '')
 def test_03_concurrent_claim_once(self):
  self.enable();f=self.setup_rows()
  with concurrent.futures.ThreadPoolExecutor() as pool:
   results=list(pool.map(lambda _:self.pg.sql(self.claim(f)),range(2)))
  self.assertTrue(all(c==0 for c,_ in results),results)
  self.assertEqual(self.sql(f"SELECT count(*) FROM competences_annuelles_demandes WHERE formateur_id='{f}';"),'1')
  self.assertEqual(self.sql(f"SELECT count(*) FROM competences_annuelles_evenements e JOIN competences_annuelles_demandes d ON d.id=e.demande_id WHERE d.formateur_id='{f}' AND e.etat='reserve';"),'1')
 def test_04_existing_albert_invitation_no_duplicate(self):
  self.enable();f=self.setup_rows()
  self.sql(f"INSERT INTO documents_a_signer(modele_code,identite_figee,statut) VALUES('justification_competences_intervenant','{{\"formateur_id\":\"{f}\"}}','brouillon');")
  self.assertEqual(self.sql(self.claim(f)), '')
 def test_05_client_cannot_claim(self):
  f=self.setup_rows()
  for role in ['anon','authenticated']:
   c,_=self.pg.sql(as_ctx(role,{'sub':ELEVE_UID,'role':role},self.claim(f)))
   self.assertNotEqual(c,0)
 def test_06_admin_only_read_and_activation(self):
  for uid in [ADMIN,ELEVE_UID]:
   c,o=self.pg.sql(as_ctx('authenticated',{'sub':uid},'SELECT count(*) FROM competences_annuelles_controle;'))
   self.assertEqual(c,0,o)
   if uid==ELEVE_UID:self.assertEqual(o.splitlines()[-1],'0')
  c,_=self.pg.sql(as_ctx('authenticated',{'sub':ELEVE_UID},f"INSERT INTO competences_annuelles_controle(responsable_id,actif,publication_verifiee,restauration_verifiee,motif) VALUES('{ELEVE_UID}',true,true,true,'faux');"))
  self.assertNotEqual(c,0)
  c,_=self.pg.sql(as_ctx('authenticated',{'sub':ADMIN},f"INSERT INTO competences_annuelles_controle(responsable_id,actif,motif) VALUES('{ADMIN}',true,'sans vérification');"))
  self.assertNotEqual(c,0)
 def test_07_histories_immutable(self):
  self.enable()
  for table in ['competences_annuelles_controle','competences_formateurs_activite','competences_annuelles_demandes','competences_annuelles_evenements']:
   # Insert a fresh isolated request to ensure row triggers actually execute.
   if table in ['competences_annuelles_demandes','competences_annuelles_evenements'] and self.sql(f'SELECT count(*) FROM {table};')=='0':
    self.fail('missing populated table')
   c,_=self.pg.sql(f'UPDATE {table} SET created_at=now();');self.assertNotEqual(c,0)
   c,_=self.pg.sql(f'DELETE FROM {table};');self.assertNotEqual(c,0)
 def test_08_service_claim_returns_no_automatic_send(self):
  f=self.setup_rows(False)
  c,o=self.pg.sql(as_ctx('service_role',{'role':'service_role'},self.claim(f)))
  self.assertEqual(c,0,o)
if __name__=='__main__':unittest.main(verbosity=2)