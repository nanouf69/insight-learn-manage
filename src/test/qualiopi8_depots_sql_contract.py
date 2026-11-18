"""Runs the exact documentary update in disposable PostgreSQL only."""
import importlib.util,pathlib,unittest
path=pathlib.Path(__file__).with_name('qualiopi8_admissions_sql_contract.py')
spec=importlib.util.spec_from_file_location('admissions_contract',path)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class Depot(module.Contract):
 @classmethod
 def setUpClass(c):
  super().setUpClass()
  c.sql('CREATE TABLE public.apprenant_documents_completes(id uuid,apprenant_id uuid,type_document text,donnees jsonb); CREATE TABLE public.qualiopi_preuves(id uuid,ref_key text,source_table text,source_id text,remarque_interne text,description text,updated_at timestamptz,date_preuve date);')
  c.update=(module.ROOT/'docs/qualiopi-8-depots-2026-11-18.sql').read_text()
 def setUp(self):
  super().setUp()
  self.sql('TRUNCATE apprenant_documents_completes,qualiopi_preuves')
  self.sql(f"INSERT INTO qualiopi_preuves VALUES(gen_random_uuid(),'i8-admission-formation-20261118-x','session_apprenants','{self.i}','{{\"decision_le\":null,\"historique\":\"conserve\"}}','Original',null,null)")
 def document(self,signed=True,date='2026-09-18T12:32:00Z'):
  import json
  data=json.dumps({'date_completion':date,**({'signature':'data:image/png;base64,SYNTHETIC'} if signed else {})})
  self.sql(f"INSERT INTO apprenant_documents_completes VALUES(gen_random_uuid(),'{self.a}','dossier-bienvenue','{data}'::jsonb)")
 def test_depot_ne_devient_jamais_decision(self):
  self.document(); self.assertEqual(self.sql(self.update),'1|1|0')
  self.assertEqual(self.sql("SELECT remarque_interne::jsonb->'controle_depot_20261118'->>'depot_le', date_preuve IS NULL,remarque_interne::jsonb->>'historique',remarque_interne::jsonb->>'decision_le' IS NULL FROM qualiopi_preuves"),'2026-09-18T12:32:00Z|t|conserve|t')
 def test_sans_signature(self):
  self.document(False); self.assertEqual(self.sql(self.update),'1|0|1')
 def test_sans_dossier(self): self.assertEqual(self.sql(self.update),'1|0|1')
 def test_doublon_non_rapproche(self):
  self.document();self.document();self.assertEqual(self.sql(self.update),'1|0|1')
 def test_reexecution_sans_doublon(self):
  self.document();self.sql(self.update);self.assertEqual(self.sql(self.update),'0|0|0')
if __name__=='__main__': unittest.main(verbosity=2)