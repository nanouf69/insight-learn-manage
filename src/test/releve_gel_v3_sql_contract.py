#!/usr/bin/env python3
"""Contrat SQL gel-v3 sur PostgreSQL jetable ; aucun appel à geler_releves_fin_acces."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("completion_contract", ROOT / "src/test/module_completion_sql_contract.py")
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)

GEL = (ROOT / "docs/candidates/releve_gel_v3_preuves.sql").read_text()
EXTRA = """
ALTER TABLE apprenants ADD COLUMN type_apprenant text, ADD COLUMN formation_choisie text,
  ADD COLUMN prenom text, ADD COLUMN nom text,
  ADD COLUMN acces_e_learning_debut date, ADD COLUMN acces_e_learning_fin date,
  ADD COLUMN modules_autorises jsonb;
ALTER TABLE apprenant_module_completion ADD COLUMN details jsonb, ADD COLUMN progress numeric,
  ADD COLUMN completed_at timestamptz, ADD COLUMN created_at timestamptz DEFAULT now(),
  ADD COLUMN updated_at timestamptz DEFAULT now();
CREATE TABLE emargements_fc (apprenant_id uuid, date_emargement date, creneau text,
  signature_data_url text, signed_at timestamptz, absent boolean, masque boolean);
CREATE TABLE presentiel_heures_validees (apprenant_id uuid, date_presence date, heures numeric, motif text);
CREATE TABLE contenu_module_fige (empreinte text, module_id integer, module_data jsonb,
  deleted_exercices jsonb, deleted_cours jsonb, source_updated_at timestamptz);
"""

class GelV3SqlContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = contract.db()
        cls.conn = cls.db.__enter__()
        contract.SQL = EXTRA + contract.CORE + GEL
        contract.run_sql(contract.SQL)

    @classmethod
    def tearDownClass(cls):
        cls.db.__exit__(None, None, None)

    def setUp(self):
        for table in ["reponses_apprenants", "apprenant_module_completion", "apprenant_module_activites", "apprenants"]:
            contract.q(f"DELETE FROM {table}", ())
        contract.q("INSERT INTO apprenants(id,type_apprenant,formation_choisie,modules_autorises) VALUES (%s,'vtc-e',null,%s::jsonb)", (contract.A, json.dumps([2,26,70])))
        contract.q("INSERT INTO apprenant_module_completion(user_id,module_id,status,completed_at,details) VALUES (%s,2,'completed',now()+interval '1 day','[]')", (contract.A,))
        for exo in ["gel_v3_exo_1", "gel_v3_exo_2"]:
            contract.q("INSERT INTO apprenant_module_activites(user_id,module_id,exercice_id,questions_requises,nb_requis,nb_qrc) VALUES (%s,2,%s,%s,2,0)", (contract.A, exo, json.dumps([{"id": exo + "_q"}])))
        contract.q("INSERT INTO reponses_apprenants(user_id,module_id,exercice_id,completed) VALUES (%s,2,'gel_v3_exo_1',true)", (contract.A,))

    def test_sources_fige_verdict_et_attribution_sans_appel_au_gel(self):
        rows = contract.q("SELECT releve_sources_apprenant(%s)", (contract.A,))
        sources = json.loads(rows[0][0]) if isinstance(rows[0][0], str) else rows[0][0]
        self.assertEqual(sources["modules_attribues"], [2,26,70])
        preuve = next(row for row in sources["preuves_completion"] if row["module_id"] == 2)
        self.assertFalse(preuve["preuve_complete"])
        self.assertEqual(float(preuve["progress_effectif"]), 50.0)
        self.assertEqual(preuve["exercices_requis"], 2)
        self.assertEqual(preuve["exercices_soumis"], 1)
        self.assertIn("gele_le", sources)

    def test_fonction_planifiee_declaree_mais_jamais_executee(self):
        rows = contract.q("SELECT pg_get_functiondef('geler_releves_fin_acces()'::regprocedure)", ())
        self.assertIn("'gel-v3'", rows[0][0])
        self.assertIn("preuves_completion", rows[0][0])
        self.assertIn("modules_attribues", rows[0][0])
        self.assertIn("WHERE g.id IS NULL", rows[0][0])

if __name__ == "__main__":
    unittest.main(verbosity=2)
