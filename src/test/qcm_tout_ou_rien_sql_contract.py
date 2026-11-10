"""Exécute core_note_attempt sur PostgreSQL jetable, jamais sur des copies réelles."""
import json
import pathlib
import re
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from core_correction_securite_contract import Pg

ROOT = pathlib.Path(__file__).resolve().parents[2]
ATT = '00000000-0000-0000-0000-000000000001'
SCHEMA = """
CREATE TABLE exam_attempts_v2 (attempt_id uuid, apprenant_id uuid, snapshot jsonb);
CREATE TABLE answer_state (attempt_id uuid, question_id text, valeur text);
CREATE TABLE qrc_instances_v2 (attempt_id uuid, note numeric, etat text);
CREATE FUNCTION core_contexte_tentative_autorise(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
"""

class ToutOuRien(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = Pg()
        cls.run_sql(SCHEMA)
        sql = (ROOT / 'drizzle/migrations/0244_securiser_fonctions_correction_notes.sql').read_text()
        match = re.search(r'CREATE OR REPLACE FUNCTION public.core_note_attempt\(.*?\$function\$;', sql, re.S)
        if not match:
            raise AssertionError('Définition serveur absente')
        cls.run_sql(match.group())

    @classmethod
    def run_sql(cls, sql):
        code, out = cls.pg.sql(sql)
        if code:
            raise AssertionError(out)
        return out

    @classmethod
    def tearDownClass(cls):
        cls.pg.stop()

    def test_titiller_exact_sets_and_frozen_history(self):
        for correct in (['A', 'C'], ['C']):
            for selected, expected in [('A,C', 2), ('C,A', 2), ('A', 0), ('C', 0), ('A,B,C', 0), ('B', 0), ('', 0)]:
                if correct == ['C']:
                    expected = 2 if selected == 'C' else 0
                snapshot = json.dumps({'questions': [{'id': 'francais:4', 'type': 'QCM', 'points': 2,
                    'choix': [{'lettre': l, 'correct': l in correct} for l in ['A', 'B', 'C']]}]})
                # Chaque fixture est rollbackée ; aucun UPDATE de copie réelle.
                out = self.run_sql(f"BEGIN; INSERT INTO exam_attempts_v2 VALUES ('{ATT}', '{ATT}', '{snapshot}'::jsonb); "
                    f"INSERT INTO answer_state VALUES ('{ATT}', 'francais:4', '{selected}'); "
                    f"SELECT points_qcm FROM core_note_attempt('{ATT}'); ROLLBACK;")
                self.assertIn(str(expected), out.splitlines(), (correct, selected, out))

if __name__ == '__main__':
    unittest.main(verbosity=2)