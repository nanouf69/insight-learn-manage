#!/usr/bin/env python3
"""Gel-v3 sur PostgreSQL jetable ; ne jamais appeler geler_releves_fin_acces."""
import importlib.util, json, subprocess, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("completion_contract", ROOT / "src/test/module_completion_sql_contract.py")
c = importlib.util.module_from_spec(spec); spec.loader.exec_module(c)
CORE = (ROOT / "docs/candidates/module_completion_preuves_versionnees.sql").read_text()
GEL = (ROOT / "docs/candidates/releve_gel_v3_preuves.sql").read_text()
EXTRA = """
ALTER TABLE apprenants ADD COLUMN prenom text, ADD COLUMN nom text,
 ADD COLUMN acces_e_learning_debut date, ADD COLUMN acces_e_learning_fin date, ADD COLUMN modules_autorises jsonb;
CREATE TABLE emargements_fc (apprenant_id uuid, date_emargement date, creneau text,
 signature_data_url text, signed_at timestamptz, absent boolean, masque boolean);
CREATE TABLE presentiel_heures_validees (apprenant_id uuid, date_presence date, heures numeric, motif text);
CREATE TABLE contenu_module_fige (empreinte text, module_id integer, module_data jsonb,
 deleted_exercices jsonb, deleted_cours jsonb, source_updated_at timestamptz);
"""
class GelV3SqlContract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  c.DEPS_SQL = {fn: (ROOT / f"src/test/fixtures/fn_{fn}.sql").read_text() for fn in c.DEPS}
  subprocess.run(c.AS_USER + ["initdb","-D",c.DATA,"-A","trust","--no-locale","-U","lovable"],check=True,stdout=subprocess.DEVNULL)
  subprocess.run(c.AS_USER + ["pg_ctl","-D",c.DATA,"-l",c.TEMP+"/pg.log","-o",f"-k {c.TEMP} -p {c.PORT} -h ''","-w","start"],check=True,stdout=subprocess.DEVNULL)
  c.sql("CREATE DATABASE t", "postgres")
  c.sql(c.STUBS)
  for fn in c.DEPS: c.sql(c.DEPS_SQL[fn])
  c.sql(c.capture_live()); c.sql(EXTRA); c.sql(c.MIGRATION_0230.read_text()); c.sql(CORE); c.sql(GEL)
 @classmethod
 def tearDownClass(cls):
  subprocess.run(c.AS_USER + ["pg_ctl","-D",c.DATA,"-m","immediate","stop"],stdout=subprocess.DEVNULL)
 def test_sources_fige_preuve_et_attribution(self):
  c.sql(f"INSERT INTO apprenants(id,auth_user_id,type_apprenant,modules_autorises) VALUES ('{c.A}','{c.U}','vtc-e','[2,26,70]');")
  c.sql(f"INSERT INTO apprenant_module_completion(apprenant_id,module_id,status,progress,completed_at,details) VALUES ('{c.A}',2,'completed',100,now(),'[]');")
  c.sql("INSERT INTO module_editor_state VALUES (2, '{\"exercices\":[{\"id\":1,\"questions\":[{\"id\":1,\"choix\":[{\"lettre\":\"A\"}]}]},{\"id\":2,\"questions\":[{\"id\":1,\"choix\":[{\"lettre\":\"A\"}]}]}]}');")
  c.sql(f"INSERT INTO reponses_apprenants VALUES ('{c.A}','module_2_exo_1','{{\"1-1\":\"A\"}}','submitted',now());")
  raw = c.sql(f"SELECT releve_sources_apprenant('{c.A}')")
  sources = json.loads(raw)
  self.assertEqual(sources["modules_attribues"], [2,26,70])
  preuve = next(row for row in sources["preuves_completion"] if row["module_id"] == 2)
  self.assertFalse(preuve["preuve_complete"]); self.assertEqual(float(preuve["progress_effectif"]), 50.0)
  self.assertEqual(preuve["questions_requises"], 2); self.assertEqual(preuve["questions_prouvees"], 1)
 def test_fonction_planifiee_declaree_sans_execution(self):
  definition = c.sql("SELECT pg_get_functiondef('geler_releves_fin_acces()'::regprocedure)")
  self.assertIn("'gel-v3'", definition); self.assertIn("preuves_completion", definition)
  self.assertIn("modules_attribues", definition); self.assertIn("WHERE g.id IS NULL", definition)
if __name__ == "__main__": unittest.main(verbosity=2)
