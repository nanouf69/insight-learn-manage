"""EB4–6 candidate tested only on the existing disposable live-trigger harness.
No managed database access and no real learner fixture.
"""
import json
import unittest
import uuid
from pathlib import Path
from admin_subject_reset_live_contract import Live
from admin_subject_reset_sql_contract import A, U, ADMIN

def J(value):
    return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'"


class Bridge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Live.setUpClass()
        cls.addClassCleanup(Live.doClassCleanups)
        Live.sql("CREATE TABLE public.qrc_historique_corrections(result_id uuid)")
        # Candidate exclusion must happen in the eligibility function, not by changing global config.
        eligibility = json.loads(Path('src/test/fixtures/subject-reset-live-triggers-20261111.json').read_text())['functions']['qrc_ia_raison_file']
        eligibility = eligibility.replace('BEGIN\n', "BEGIN\n IF EXISTS(SELECT 1 FROM public.exam_attempts_v2 manual_copy WHERE manual_copy.attempt_id=p_attempt AND manual_copy.snapshot->>'correction_manuelle_exclusivement'='true') THEN RETURN 'correction_manuelle_exclusivement'; END IF;\n", 1)
        Live.sql(eligibility)
        Live.sql(Path('docs/sql-revue/2026-11-11-eb456-manual-bridge.sql').read_text())
        correction = Path('src/test/fixtures/core_correct_qrc_live_20261107.sql').read_text()
        correction = correction.replace('  rejeu :=', "  IF NOT public.core_contexte_correction_autorise() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501'; END IF;\n  rejeu :=", 1)
        Live.sql(correction)
        publish = Path('src/test/fixtures/core_correct_qrc_publish_live_20261107.sql').read_text()
        Live.sql(publish)

    def j(self, query):
        return json.loads(Live.sql("SELECT to_jsonb(x) FROM (" + query.replace('SELECT ', 'SELECT ', 1) + ") AS t(x)").stdout.splitlines()[-1])

    def fixture(self, exam, mid, submitted=True, counter=1, attempt=1, answers=None):
        rid = str(uuid.uuid4())
        key = exam + '__' + mid + (f'__t{attempt}' if attempt > 1 else '')
        questions = [
            {'id': 1, 'type': 'QCM', 'enonce': 'Question gelée', 'points': 2,
             'choix': [{'lettre': 'A', 'texte': 'Oui', 'correct': True}, {'lettre': 'B', 'texte': 'Non', 'correct': False}],
             'image': 'storage://frozen.png', 'imageSize': 'small', 'ordre': 0},
            {'id': 2, 'type': 'QRC', 'enonce': 'Énoncé gelé', 'points': 2,
             'reponseQRC': 'Réponse officielle gelée', 'ordre': 1}
        ]
        reps = {'1': ['A'], '2': 'Réponse exacte personnelle'}
        details = {'snapshot': {'examenId': exam, 'matiereId': mid, 'questions': questions,
                               'coefficient': 3, 'noteSur': 20, 'noteEliminatoire': 6},
                   'reponses': reps, 'qrc_pending_correction': True,
                   'correctionsIA': {'2': {'pointsObtenus': 1, 'explication': 'Correction déterministe'}}}
        if not Live.sql(f"SELECT id FROM exam_content_versions WHERE exam_id='{exam}' AND statut='publiee'").stdout.strip():
            Live.sql(f"INSERT INTO exam_content_versions(filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif,is_test) VALUES('VTC','4','{exam}',1,'publiee','{{}}','f','fixture',true)")
        Live.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at,tentative) VALUES('{A}','{U}','{key}','examen_blanc',{J(answers or reps)},{str(submitted).lower()},'{ 'submitted' if submitted else 'in_progress'}',{'NULL' if not submitted else chr(39)+'2026-11-01 10:00:00+00'+chr(39)},{counter})")
        Live.sql(f"INSERT INTO apprenant_quiz_results(id,apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,details,completed_at,score_obtenu,score_max,note_sur_20) VALUES('{rid}','{A}','{U}','examen_blanc','{exam}','FICTIF','{mid}','A - FICTIF',{attempt},{J(details)},'2026-11-01 10:00:00+00',3,4,15)")
        return rid, key, details

    def proof(self, rid):
        return self.j(f"SELECT public.eb456_preuve_remise('{rid}')")

    def test_01_twelve_exam_variants_import_frozen_no_grade_no_ai(self):
        for n in [4, 5, 6]:
            for suffix in ['', '-TAXI', '-ta', '-va']:
                exam = f'EB{n}{suffix}' if suffix not in ['-ta', '-va'] else f'eb{n}{suffix}'
                with self.subTest(exam=exam):
                    rid, key, details = self.fixture(exam, 'bridge_' + str(n) + suffix.replace('-', '_'))
                    proof = self.proof(rid)
                    self.assertEqual(proof['statut'], 'deja_v2')
                    aid = proof['attempt_id']
                    copy = self.j(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{aid}'")
                    self.assertEqual(copy['snapshot']['source_historique']['details'], details)
                    self.assertEqual(copy['snapshot']['questions'][0]['imageSize'], 'small')
                    self.assertEqual(copy['etat'], 'terminee')
                    self.assertEqual(self.j(f"SELECT count(*) FROM qrc_instances_v2 WHERE attempt_id='{aid}' AND etat='en_attente' AND note IS NULL"), 1)
                    self.assertEqual(self.j(f"SELECT count(*) FROM core_exam_results WHERE attempt_id='{aid}'"), 0)
                    self.assertEqual(self.j(f"SELECT count(*) FROM qrc_ia_suites WHERE attempt_id='{aid}'"), 0)
                    self.assertEqual(self.j(f"SELECT qrc_ia_raison_file('{aid}')"), 'correction_manuelle_exclusivement')

    def test_02_replay_original_note_and_other_subject_unchanged(self):
        rid, key, _ = self.fixture('EB4', 'replay_bridge')
        before = self.j(f"SELECT to_jsonb(r) FROM apprenant_quiz_results r WHERE id='{rid}'")
        rows_before = self.j("SELECT count(*) FROM exam_attempts_v2")
        first = self.j(f"SELECT eb456_raccorder_manuellement('{rid}')")
        for _ in range(5):
            self.assertEqual(first, self.j(f"SELECT eb456_raccorder_manuellement('{rid}')"))
        self.assertEqual(rows_before, self.j("SELECT count(*) FROM exam_attempts_v2"))
        self.assertEqual(before, self.j(f"SELECT to_jsonb(r) FROM apprenant_quiz_results r WHERE id='{rid}'"))

    def test_03_pending_submission_refused_then_exact_submission_imports(self):
        rid, key, _ = self.fixture('EB5', 'late_bridge', submitted=False)
        self.assertEqual(self.proof(rid)['raison'], 'remise_non_prouvee')
        # Same source, same answers, completion only on the isolated original flow.
        Live.sql(f"UPDATE reponses_apprenants SET completed=true,status='submitted',submitted_at='2026-11-01 10:00:00+00' WHERE apprenant_id='{A}' AND exercice_id='{key}'")
        # Existing trigger adds provenance to the result: final hook must re-read it.
        out = self.j(f"SELECT eb456_raccorder_manuellement('{rid}')")
        self.assertIn(out['statut'], ['importe', 'deja_v2'])

    def test_04_suffix_counter_conflict_never_imported(self):
        rid, _, _ = self.fixture('EB6', 'counter_bridge', counter=1, attempt=2)
        self.assertEqual(self.proof(rid)['raison'], 'compteur_suffixe_divergent')
        self.assertEqual(self.j(f"SELECT count(*) FROM exam_attempts_v2 WHERE snapshot->'source_historique'->>'result_id'='{rid}'"), 0)

    def test_05_divergent_answers_never_imported(self):
        rid, _, _ = self.fixture('EB4-TAXI', 'divergent_bridge', answers={'1': ['B'], '2': 'Autre réponse'})
        self.assertEqual(self.proof(rid)['raison'], 'identite_ou_reponses_divergentes')

    def test_06_rights_anonymous_and_other_account(self):
        rid, _, _ = self.fixture('EB5-TAXI', 'rights_bridge')
        denied = Live.sql(f"SET ROLE anon;SELECT eb456_preuve_remise('{rid}')", check=False)
        self.assertNotEqual(denied.returncode, 0)
        denied = Live.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uuid.uuid4()}';SELECT eb456_raccorder_manuellement('{rid}')", check=False)
        self.assertNotEqual(denied.returncode, 0)

    def test_07_same_answers_different_unlinked_instant_refused(self):
        rid, key, _ = self.fixture('EB6-TAXI', 'instant_bridge', submitted=False)
        Live.sql(f"UPDATE reponses_apprenants SET completed=true,status='submitted',submitted_at='2026-11-02 10:00:00+00' WHERE apprenant_id='{A}' AND exercice_id='{key}'")
        self.assertEqual(self.proof(rid)['raison'], 'identite_remise_non_figee')

    def test_08_manual_correction_creates_only_new_exact_result(self):
        for exam in ['EB4', 'EB5-TAXI', 'eb6-ta']:
            rid, key, details = self.fixture(exam, 'manual_result_bridge')
            original = self.j(f"SELECT to_jsonb(r) FROM apprenant_quiz_results r WHERE id='{rid}'")
            others = self.j(f"SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY result_id),'[]') FROM core_exam_results r")
            aid = self.proof(rid)['attempt_id']
            qid = Live.sql(f"SELECT qrc_instance_id FROM qrc_instances_v2 WHERE attempt_id='{aid}'").stdout.strip()
            # The real manual RPC, authenticated as the fixture admin. Never on live data.
            out = Live().api(f"SELECT core_correct_qrc_publish('{uuid.uuid4()}','{qid}',2,'Fictif','admin@example.invalid')", ADMIN)
            self.assertEqual(out.returncode, 0)
            result = self.j(f"SELECT to_jsonb(r) FROM core_exam_results r WHERE attempt_id='{aid}'")
            self.assertEqual(result['status'], 'definitif')
            self.assertEqual(result['score'], 20)
            self.assertEqual(result['qrc_restantes'], 0)
            self.assertEqual(original, self.j(f"SELECT to_jsonb(r) FROM apprenant_quiz_results r WHERE id='{rid}'"))
            self.assertEqual(others, self.j(f"SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY result_id),'[]') FROM core_exam_results r WHERE attempt_id<>'{aid}'"))

    def test_09_concurrent_replays_keep_one_projection(self):
        import concurrent.futures
        rid, _, _ = self.fixture('EB6', 'concurrent_bridge')
        aid = self.proof(rid)['attempt_id']
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            result = list(pool.map(lambda _: self.j(f"SELECT eb456_raccorder_manuellement('{rid}')"), range(6)))
        self.assertEqual({v['attempt_id'] for v in result}, {aid})
        self.assertEqual(self.j(f"SELECT count(*) FROM exam_attempts_v2 WHERE snapshot->'source_historique'->>'result_id'='{rid}'"), 1)


if __name__ == '__main__':
    unittest.main(defaultTest='Bridge', verbosity=2)