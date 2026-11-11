"""Disposable PostgreSQL only. Coverage gate enabled solely inside this fixture."""
from pathlib import Path
import json
from concurrent.futures import ThreadPoolExecutor
from exam_reset_v2_sql_contract import ExamResetV2Contract, ADMIN, OWNER, APPRENANT, OLD


class CancellationContract(ExamResetV2Contract):
    @classmethod
    def sql(cls, query, check=True):
        if query.startswith('TRUNCATE apprenants,'):
            query = query.replace('TRUNCATE apprenants,', 'TRUNCATE core_exam_reset_cancellations,apprenants,', 1)
        return super().sql(query, check)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.sql(Path('docs/sql-revue/2026-11-11-exam-reset-cancellation.sql').read_text())

    def setUp(self):
        self.sql('TRUNCATE core_exam_reset_cancellations')
        super().setUp()
        self.sql('CREATE OR REPLACE FUNCTION exam_reset_cancellation_coverage_ready() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$')

    def prepared(self):
        reset = self.reset()
        self.sql(f"UPDATE exam_attempts_v2 SET etat='terminee' WHERE attempt_id='{OLD}'")
        return reset

    def context(self, reset):
        r = self.sql(f"SET test.uid='{ADMIN}'; SELECT admin_exam_reset_cancel_context('{APPRENANT}','{reset}')")
        return json.loads(r.stdout.strip().splitlines()[-1])

    def cancel(self, reset, actor=ADMIN, check=True, op='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'):
        return self.sql(f"SET test.uid='{actor}'; SELECT admin_cancel_exam_reset('{op}','{APPRENANT}','{reset}','EB1-FICTIF',(SELECT cutoff_at FROM core_exam_resets WHERE reset_id='{reset}'))", check)

    def enable_fixture(self):
        self.sql('CREATE OR REPLACE FUNCTION exam_reset_cancellation_coverage_ready() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$')

    def test_candidate_disabled_even_safe(self):
        reset = self.prepared()
        self.assertTrue(self.context(reset)['eligible'])
        self.assertIn('coverage unverified', self.cancel(reset, check=False).stderr)
        self.assertEqual(self.sql('SELECT count(*) FROM core_exam_reset_cancellations').stdout.strip(), '0')

    def test_event_views_replay_no_source_writes(self):
        reset = self.prepared()
        before = self.sql("SELECT md5((SELECT jsonb_agg(t)::text FROM (SELECT * FROM core_exam_resets) t)),md5((SELECT jsonb_agg(t)::text FROM (SELECT * FROM exam_attempts_v2) t)),md5((SELECT jsonb_agg(t)::text FROM (SELECT * FROM core_tentatives_neutralisees) t)),md5((SELECT jsonb_agg(t)::text FROM (SELECT * FROM exam_retake_authorizations) t))").stdout
        self.enable_fixture()
        first = self.cancel(reset).stdout
        self.assertEqual(first, self.cancel(reset).stdout)
        self.cancel(reset, op='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
        after = self.sql("SELECT md5((SELECT jsonb_agg(t)::text FROM (SELECT * FROM core_exam_resets) t)),md5((SELECT jsonb_agg(t)::text FROM (SELECT * FROM exam_attempts_v2) t)),md5((SELECT jsonb_agg(t)::text FROM (SELECT * FROM core_tentatives_neutralisees) t)),md5((SELECT jsonb_agg(t)::text FROM (SELECT * FROM exam_retake_authorizations) t))").stdout
        self.assertEqual(before, after)
        self.assertEqual(self.sql('SELECT count(*) FROM core_exam_reset_cancellations').stdout.strip(), '1')
        self.assertEqual(self.sql('SELECT count(*) FROM core_exam_resets_effective').stdout.strip(), '0')
        self.assertEqual(self.sql('SELECT count(*) FROM core_exam_neutralisations_effective').stdout.strip(), '0')
        self.assertEqual(self.sql('SELECT count(*) FROM exam_retake_authorizations_effective').stdout.strip(), '0')
        self.assertIn('CANCELLED_RESET_GRANT', self.sql('UPDATE exam_retake_authorizations SET consumed_at=now()',False).stderr)
        self.assertIn('CANCELLATION_APPEND_ONLY', self.sql('UPDATE core_exam_reset_cancellations SET exam_id=exam_id',False).stderr)

    def test_independent_neutralisation_preserved(self):
        reset = self.prepared()
        self.sql("UPDATE core_tentatives_neutralisees SET motif='independent fixture reason'")
        self.enable_fixture(); self.cancel(reset)
        self.assertEqual(self.sql('SELECT count(*) FROM core_exam_neutralisations_effective').stdout.strip(),'1')

    def test_non_admin_denied(self):
        reset = self.prepared(); self.enable_fixture()
        self.assertIn('ADMIN_REQUIRED', self.cancel(reset, actor=OWNER, check=False).stderr)

    def test_later_attempt_blocks(self):
        reset = self.prepared(); self.start()
        self.assertFalse(self.context(reset)['eligible'])

    def test_consumed_grant_blocks(self):
        reset = self.prepared()
        self.sql('UPDATE exam_retake_authorizations SET consumed_at=now()')
        self.assertFalse(self.context(reset)['eligible'])

    def test_newer_reset_blocks_same_exam_only(self):
        reset = self.prepared()
        self.sql(f"INSERT INTO core_exam_resets(operation_id,apprenant_id,exam_id,cutoff_at,motif) VALUES(gen_random_uuid(),'{APPRENANT}','EB4-FICTIF',clock_timestamp(),'other exam')")
        self.assertTrue(self.context(reset)['eligible'])
        self.sql(f"INSERT INTO core_exam_resets(operation_id,apprenant_id,exam_id,cutoff_at,motif) VALUES(gen_random_uuid(),'{APPRENANT}','EB1-FICTIF',clock_timestamp(),'newer')")
        self.assertFalse(self.context(reset)['eligible'])

    def test_start_wins_concurrent_cancel_refused(self):
        reset = self.prepared(); self.enable_fixture()
        # Hold the shared start lock until a new copy is committed.
        with ThreadPoolExecutor(max_workers=2) as pool:
            future = pool.submit(self.sql, f"BEGIN; SELECT pg_advisory_xact_lock(hashtextextended('exam-v2:{APPRENANT}:EB1-FICTIF',0)); SELECT pg_sleep(0.4); SET test.uid='{OWNER}'; SELECT core_start_attempt('cccccccc-cccc-cccc-cccc-cccccccccccc','{APPRENANT}','EB1-FICTIF','t3p'); COMMIT;")
            import time
            time.sleep(0.1)
            refused = self.cancel(reset,check=False)
            future.result()
        self.assertNotEqual(refused.returncode,0)
        self.assertEqual(self.sql('SELECT count(*) FROM core_exam_reset_cancellations').stdout.strip(),'0')

if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)