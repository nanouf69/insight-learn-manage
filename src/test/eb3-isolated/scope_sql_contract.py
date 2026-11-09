"""Scope prototype only. Disposable PostgreSQL, synthetic records, no Cloud writes."""
import pathlib
import sys
import unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from upsert_reponse_http_integration import PgJetable

APP='11111111-1111-4111-8111-000000000001'
UID='22222222-2222-4222-8222-000000000002'
ORIGINAL='33333333-3333-4333-8333-000000000003'

class ScopeSql(unittest.TestCase):
    def setUp(self):
        self.pg=PgJetable()
        self.pg.sql(f"""
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION core_est_proprietaire(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='{APP}'::uuid AND auth.uid()='{UID}'::uuid $$;
CREATE TABLE exam_attempts_v2(attempt_id uuid PRIMARY KEY,apprenant_id uuid,exam_id text,started_at timestamptz,is_test boolean,snapshot_fingerprint text,snapshot jsonb);
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
""")
        self.pg.sql((pathlib.Path(__file__).parent/'scope.sql').read_text())
    def tearDown(self): self.pg.stop()
    def fixture(self, exam='EB3', original_start='2026-11-09 13:02:01+00'):
        self.pg.sql(f"""
INSERT INTO eb_revision_activation_candidate VALUES(true,'2026-11-09 13:02:00+00');
INSERT INTO eb_original_candidate VALUES('{ORIGINAL}','{APP}','{exam}','{original_start}');
INSERT INTO exam_attempts_v2 SELECT md5(i::text)::uuid,'{APP}','{exam}','2026-11-09 13:02:01+00',false,'fingerprint',jsonb_build_object('matiere',i::text,'questions',jsonb_build_array(jsonb_build_object('id',i))) FROM generate_series(1,7) i;
INSERT INTO eb_revision_sources_candidate SELECT '{APP}','{exam}','new-revision',i::text,md5(i::text)::uuid,'{ORIGINAL}' FROM generate_series(1,7) i;
""")
    def call(self, exam='EB3', uid=UID):
        return self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SELECT eb_revision_scope_candidate('{APP}','{exam}','new-revision')").splitlines()[-1]
    def test_eight_exact_ids(self):
        for exam in ('EB3','EB4','EB5','EB6','EB3-TAXI','EB4-TAXI','EB5-TAXI','EB6-TAXI'):
            self.fixture(exam)
            self.assertEqual(self.call(exam),'t')
            # Reset synthetic fixture only by starting a new disposable cluster.
            self.pg.stop(); self.setUp()
    def test_eb1_eb2_and_other_tracks_excluded(self):
        self.fixture()
        for exam in ('EB1','EB2','EB1-TAXI','EB2-TAXI','EB3-TA','EB7','eb3'):
            self.assertEqual(self.call(exam),'f')
    def test_old_original_new_subjects_and_revision_excluded(self):
        self.fixture(original_start='2026-11-09 13:01:59+00')
        self.assertEqual(self.call(),'f')
    def test_activation_boundary_excluded(self):
        self.fixture(original_start='2026-11-09 13:02:00+00')
        self.assertEqual(self.call(),'f')
    def test_legacy_snapshot_refused_and_original_unchanged(self):
        self.fixture(); self.pg.sql("UPDATE exam_attempts_v2 SET snapshot='{}' WHERE attempt_id=md5('1')::uuid")
        before=self.pg.sql('SELECT md5(jsonb_agg(to_jsonb(a) ORDER BY attempt_id)::text) FROM exam_attempts_v2 a')
        self.assertEqual(self.call(),'f')
        self.assertEqual(before,self.pg.sql('SELECT md5(jsonb_agg(to_jsonb(a) ORDER BY attempt_id)::text) FROM exam_attempts_v2 a'))
    def test_unauthenticated_and_wrong_owner_refused(self):
        self.fixture()
        for uid in ('','44444444-4444-4444-8444-000000000004'):
            with self.assertRaisesRegex(RuntimeError,'Accès refusé'): self.call(uid=uid)
    def test_clients_cannot_assign_scope(self):
        self.fixture()
        for table in ('eb_revision_activation_candidate','eb_original_candidate','eb_revision_sources_candidate'):
            with self.assertRaisesRegex(RuntimeError,'permission denied'):
                self.pg.sql(f'SET ROLE authenticated; UPDATE {table} SET apprenant_id=null' if table!='eb_revision_activation_candidate' else f'SET ROLE authenticated; UPDATE {table} SET activated_at=now()')
    def test_missing_activation_and_roster_excluded(self):
        self.assertEqual(self.call(),'f')
        self.fixture(); self.pg.sql("UPDATE eb_revision_sources_candidate SET revision_exercice_id='other' WHERE matiere_id='1'")
        self.assertEqual(self.call(),'f')
    def test_empty_snapshot_and_borrowed_subject_excluded(self):
        self.fixture(); self.pg.sql("UPDATE exam_attempts_v2 SET snapshot=jsonb_build_object('matiere','2','questions','[]'::jsonb) WHERE attempt_id=md5('1')::uuid")
        self.assertEqual(self.call(),'f')

if __name__=='__main__': unittest.main(verbosity=2)