"""Contrat SQL reset V2 : PostgreSQL jetable uniquement, aucune lecture/écriture Cloud."""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ADMIN = "11111111-1111-1111-1111-111111111111"
OWNER = "22222222-2222-2222-2222-222222222222"
APPRENANT = "33333333-3333-3333-3333-333333333333"
VERSION = "44444444-4444-4444-4444-444444444444"
OLD = "55555555-5555-5555-5555-555555555555"
AS = ["setpriv", "--reuid=1000", "--regid=1000", "--clear-groups"]


class ExamResetV2Contract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = tempfile.mkdtemp(dir="/tmp")
        os.chown(cls.d, 1000, 1000)
        cls.addClassCleanup(cls.tearDownClass)
        cls.env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
        subprocess.run(AS + ["initdb", "-D", cls.d + "/db", "-U", "postgres", "-A", "trust", "--no-locale"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=cls.env)
        subprocess.run(AS + ["pg_ctl", "-D", cls.d + "/db", "-l", cls.d + "/log", "-o", f"-k {cls.d} -p 55479 -h \"\"", "-w", "start"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=cls.env)
        cls.sql(f"""
        CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
        CREATE TABLE apprenants(id uuid PRIMARY KEY, auth_user_id uuid);
        CREATE TABLE exam_content_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), exam_id text, statut text, retired_at timestamptz, content jsonb, filiere text, exam_numero text);
        CREATE TABLE exam_attempts_v2(attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), apprenant_id uuid, exam_id text, exam_version_id uuid, snapshot jsonb, snapshot_fingerprint text, etat text, is_test boolean DEFAULT false, started_at timestamptz DEFAULT now(), finished_at timestamptz);
        CREATE TABLE core_exam_resets(reset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL UNIQUE, apprenant_id uuid NOT NULL, exam_id text NOT NULL, cutoff_at timestamptz NOT NULL DEFAULT now(), archived_attempt_ids jsonb NOT NULL DEFAULT '[]', archived_core_result_ids jsonb NOT NULL DEFAULT '[]', archived_legacy_result_ids jsonb NOT NULL DEFAULT '[]', motif text NOT NULL, created_by uuid, created_email text, created_at timestamptz NOT NULL DEFAULT now());
        CREATE TABLE exam_retake_authorizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), apprenant_id uuid NOT NULL, exam_id text NOT NULL, motif text NOT NULL DEFAULT 'test', result_ids jsonb NOT NULL DEFAULT '[]', granted_by uuid, granted_email text, created_at timestamptz NOT NULL DEFAULT now(), consumed_at timestamptz, revoked_at timestamptz);
        CREATE TABLE core_tentatives_neutralisees(attempt_id uuid PRIMARY KEY, apprenant_id uuid, exam_id text, motif text, resultat_avant jsonb, neutralise_par text);
        CREATE TABLE core_exam_results(result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid, apprenant_id uuid, updated_at timestamptz DEFAULT now());
        CREATE TABLE apprenant_quiz_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), apprenant_id uuid, quiz_id text, quiz_type text, created_at timestamptz DEFAULT now());
        CREATE TABLE core_operations(operation_id uuid PRIMARY KEY, operation_type text, apprenant_id uuid, attempt_id uuid, auteur uuid, cible jsonb, resultat jsonb);
        CREATE TABLE audit_journal(operation text, cible_type text, cible_id text, exam_id text, exam_version_id uuid, attempt_id uuid, apprenant_id uuid, auteur uuid, avant jsonb, apres jsonb, origine text);
        CREATE FUNCTION has_role(uid uuid, role text) RETURNS boolean LANGUAGE sql AS $$ SELECT uid='{ADMIN}' AND role='admin' $$;
        CREATE FUNCTION core_bridge_compte_test(a uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
        CREATE FUNCTION core_bridge_actif(t boolean) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
        CREATE FUNCTION core_est_proprietaire(a uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT auth.uid() IS NOT NULL $$;
        CREATE FUNCTION core_operation_replay(op uuid, typ text) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('resultat',o.resultat) FROM core_operations o WHERE o.operation_id=op AND o.operation_type=typ $$;
        """)
        cls.sql(Path("drizzle/migrations/0242_secure_exam_reset_retake_authorization.sql").read_text())

    @classmethod
    def tearDownClass(cls):
        if not os.path.exists(cls.d):
            return
        subprocess.run(AS + ["pg_ctl", "-D", cls.d + "/db", "-m", "immediate", "stop"], capture_output=True, env=cls.env)
        shutil.rmtree(cls.d)

    @classmethod
    def sql(cls, query, check=True):
        result = subprocess.run(["psql", "-X", "-At", "-h", cls.d, "-p", "55479", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", query], capture_output=True, text=True, check=False, env=cls.env)
        if check and result.returncode:
            raise RuntimeError(result.stderr)
        return result

    def setUp(self):
        self.sql("""TRUNCATE apprenants,exam_content_versions,exam_attempts_v2,core_exam_resets,exam_retake_authorizations,core_tentatives_neutralisees,core_exam_results,apprenant_quiz_results,core_operations,audit_journal;
        INSERT INTO apprenants VALUES('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222');
        INSERT INTO exam_content_versions(id,exam_id,statut,content,filiere,exam_numero) VALUES('44444444-4444-4444-4444-444444444444','EB1-FICTIF','publiee','{"exam_libelle":"Fictif","matieres":[{"subject_id":"t3p"},{"subject_id":"gestion"}],"questions":[{"id":"t3p:1","matiere":"t3p","type":"QCM"},{"id":"gestion:1","matiere":"gestion","type":"QCM"}]}','TAXI','1');""")

    def reset(self, op="66666666-6666-6666-6666-666666666666"):
        self.sql(f"""INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat) VALUES('{OLD}','{APPRENANT}','EB1-FICTIF','{VERSION}','{{"matiere":"t3p"}}','old','en_cours');
        INSERT INTO apprenant_quiz_results(apprenant_id,quiz_id,quiz_type) VALUES('{APPRENANT}','EB1-FICTIF','examen_blanc');""")
        return self.sql(f"SET test.uid='{ADMIN}'; SELECT reset_id FROM core_admin_reset_exam('{op}','{APPRENANT}','EB1-FICTIF','test fictif','admin@example.test')").stdout.strip()

    def start(self, matiere="t3p", op="77777777-7777-7777-7777-777777777777", check=True):
        return self.sql(f"SET test.uid='{OWNER}'; SELECT attempt_id FROM core_start_attempt('{op}','{APPRENANT}','EB1-FICTIF','{matiere}')", check)

    def test_reset_archive_sans_detruire_et_lie_autorisation(self):
        reset_id = self.reset()
        self.assertEqual(self.sql("SELECT etat FROM exam_attempts_v2 WHERE attempt_id='55555555-5555-5555-5555-555555555555'").stdout.strip(), "abandonnee")
        self.assertEqual(self.sql("SELECT count(*) FROM apprenant_quiz_results").stdout.strip(), "1")
        self.assertEqual(self.sql(f"SELECT reset_id FROM exam_retake_authorizations WHERE reset_id='{reset_id}'").stdout.strip(), reset_id)

    def test_demarrage_consomme_une_fois_et_rejeu_reprend_meme_id(self):
        self.reset()
        first = self.start().stdout.strip()
        replay = self.start().stdout.strip()
        self.assertEqual(first, replay)
        self.start("gestion", "88888888-8888-8888-8888-888888888888")
        self.assertEqual(self.sql("SELECT count(*) FROM exam_retake_authorizations WHERE consumed_at IS NOT NULL").stdout.strip(), "1")
        self.assertEqual(self.sql("SELECT count(*) FROM exam_attempts_v2 WHERE etat='en_cours'").stdout.strip(), "2")

    def test_reprise_ouverte_enregistre_operation_sans_nouvelle_tentative(self):
        self.reset()
        first = self.start().stdout.strip()
        second = self.start(op="88888888-8888-8888-8888-888888888888").stdout.strip()
        self.assertEqual(first, second)
        self.assertEqual(self.sql("SELECT count(*) FROM core_operations WHERE operation_type='attempt_start'").stdout.strip(), "2")
        self.assertEqual(self.sql("SELECT count(*) FROM exam_attempts_v2 WHERE etat='en_cours'").stdout.strip(), "1")

    def test_double_appareil_meme_matiere_un_seul_passage_et_une_consommation(self):
        self.reset()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda op: self.start(op=op), ["77777777-7777-7777-7777-777777777777", "88888888-8888-8888-8888-888888888888"]))
        self.assertEqual([r.returncode for r in results], [0, 0])
        ids = {r.stdout.strip() for r in results}
        self.assertEqual(len(ids), 1)
        self.assertEqual(self.sql("SELECT count(*) FROM exam_attempts_v2 WHERE etat='en_cours'").stdout.strip(), "1")
        self.assertEqual(self.sql("SELECT count(*) FROM exam_retake_authorizations WHERE consumed_at IS NOT NULL").stdout.strip(), "1")

    def test_deux_matieres_concurrentes_reussissent_avec_une_consommation(self):
        self.reset()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda p: self.start(p[0], p[1]), [("t3p", "77777777-7777-7777-7777-777777777777"), ("gestion", "88888888-8888-8888-8888-888888888888")]))
        self.assertEqual([r.returncode for r in results], [0, 0])
        self.assertEqual(self.sql("SELECT count(*) FROM exam_attempts_v2 WHERE etat='en_cours'").stdout.strip(), "2")
        self.assertEqual(self.sql("SELECT count(*) FROM exam_retake_authorizations WHERE consumed_at IS NOT NULL").stdout.strip(), "1")

    def test_fallback_historique_unique_sans_backfill(self):
        self.sql(f"""INSERT INTO core_exam_resets(operation_id,apprenant_id,exam_id,cutoff_at,motif) VALUES('66666666-6666-6666-6666-666666666666','{APPRENANT}','EB1-FICTIF','2026-11-06 09:00:00+00','ancien');
        INSERT INTO exam_retake_authorizations(apprenant_id,exam_id,created_at) VALUES('{APPRENANT}','EB1-FICTIF','2026-11-06 09:00:00+00');""")
        self.start()
        self.assertEqual(self.sql("SELECT count(*) FROM exam_retake_authorizations WHERE consumed_at IS NOT NULL AND reset_id IS NULL").stdout.strip(), "1")

    def test_fallback_ambigu_ne_choisit_pas_arbitrairement(self):
        self.sql(f"""INSERT INTO core_exam_resets(operation_id,apprenant_id,exam_id,cutoff_at,motif) VALUES('66666666-6666-6666-6666-666666666666','{APPRENANT}','EB1-FICTIF','2026-11-06 09:00:00+00','ancien'),('99999999-9999-9999-9999-999999999999','{APPRENANT}','EB1-FICTIF','2026-11-06 09:00:00+00','ancien');
        INSERT INTO exam_retake_authorizations(apprenant_id,exam_id,created_at) VALUES('{APPRENANT}','EB1-FICTIF','2026-11-06 09:00:00+00');""")
        self.start()
        self.assertEqual(self.sql("SELECT count(*) FROM exam_retake_authorizations WHERE consumed_at IS NOT NULL").stdout.strip(), "0")

    def test_autorisation_independante_non_consommee(self):
        self.sql(f"INSERT INTO exam_retake_authorizations(apprenant_id,exam_id) VALUES('{APPRENANT}','EB1-FICTIF')")
        self.start()
        self.assertEqual(self.sql("SELECT count(*) FROM exam_retake_authorizations WHERE consumed_at IS NOT NULL").stdout.strip(), "0")

    def test_rollback_annule_tentative_et_consommation(self):
        self.reset()
        self.sql(f"BEGIN; SET LOCAL test.uid='{OWNER}'; SELECT core_start_attempt('77777777-7777-7777-7777-777777777777','{APPRENANT}','EB1-FICTIF','t3p'); ROLLBACK;")
        self.assertEqual(self.sql("SELECT count(*) FROM exam_attempts_v2 WHERE etat='en_cours'").stdout.strip(), "0")
        self.assertEqual(self.sql("SELECT count(*) FROM exam_retake_authorizations WHERE consumed_at IS NOT NULL").stdout.strip(), "0")

    def test_meme_operation_autre_matiere_refusee(self):
        self.reset()
        self.start()
        refused = self.start("gestion")
        self.assertNotEqual(refused.returncode, 0)
        self.assertIn("OPERATION_CIBLE_DIFFERENTE", refused.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
