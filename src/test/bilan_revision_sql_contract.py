"""Disposable loopback PostgreSQL only; no hosted writes."""
import pathlib, unittest, concurrent.futures
from upsert_reponse_http_integration import PgJetable
ROOT=pathlib.Path(__file__).resolve().parents[2]
APP='11111111-1111-4111-8111-111111111111'
UID='22222222-2222-4222-8222-222222222222'
REC='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
VER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pg=PgJetable()
  cls.pg.sql(f"""
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TABLE apprenants(id uuid PRIMARY KEY,auth_user_id uuid);
CREATE TABLE reponses_apprenants(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,exercice_id text,exercice_type text,reponses jsonb,status text,completed boolean DEFAULT false,submitted_at timestamptz,write_seq bigint);
CREATE TABLE bilan_future_receipts(id uuid,owner_id uuid,version_id uuid,module_id int,exercise_id int);
CREATE TABLE bilan_future_submissions(receipt_id uuid,answers jsonb);
CREATE FUNCTION bilan_future_questions(uuid) RETURNS jsonb LANGUAGE sql AS $$SELECT '{{"questions":[{{"id":71}},{{"id":226}}]}}'::jsonb$$;
INSERT INTO apprenants VALUES('{APP}','{UID}');INSERT INTO bilan_future_receipts VALUES('{REC}','{UID}','{VER}',5,502);
INSERT INTO bilan_future_submissions VALUES('{REC}','{{"71":["B"],"226":["D"]}}');
""")
  cls.pg.sql((ROOT/'docs/sql-revue/2026-11-12-bilan-revision-finalisation.sql').read_text())
 @classmethod
 def tearDownClass(cls):cls.pg.stop()
 def fixture(self,name):
  self.pg.sql(f"""INSERT INTO reponses_apprenants(apprenant_id,exercice_id,exercice_type,reponses,status,write_seq) VALUES('{APP}','{name}','bilan_revision','{{"__source":{{"owner":"{APP}","module":5,"exercise":502,"receipt":"{REC}","version":"{VER}","questions":["71","226"]}},"71":["A","C"],"226":["A"]}}','in_progress',2)""")
 def call(self,name,seq=2,uid=UID):
  return self.pg.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';SELECT (bilan_revision_finaliser('{name}',{seq},(SELECT reponses FROM reponses_apprenants WHERE exercice_id='{name}'))).submitted_at")
 def test_concurrency_and_original_unchanged(self):
  self.pg.sql('GRANT SELECT ON reponses_apprenants TO authenticated;')
  self.fixture('concurrent');before=self.pg.sql('SELECT md5(to_jsonb(s)::text) FROM bilan_future_submissions s')
  with concurrent.futures.ThreadPoolExecutor(2) as p:values=list(p.map(lambda _:self.call('concurrent'),range(2)))
  self.assertEqual(values[0],values[1]);self.assertEqual(values[0],self.call('concurrent'))
  self.assertEqual(before,self.pg.sql('SELECT md5(to_jsonb(s)::text) FROM bilan_future_submissions s'))
 def test_stale_version(self):
  self.pg.sql('GRANT SELECT ON reponses_apprenants TO authenticated;');self.fixture('stale')
  with self.assertRaisesRegex(RuntimeError,'Conflit de version'):self.call('stale',1)
 def test_wrong_owner(self):
  self.pg.sql('GRANT SELECT ON reponses_apprenants TO authenticated;');self.fixture('owner')
  with self.assertRaisesRegex(RuntimeError,'propriétaire'):self.call('owner',uid='33333333-3333-4333-8333-333333333333')
 def test_incomplete(self):
  self.pg.sql('GRANT SELECT ON reponses_apprenants TO authenticated;');self.fixture('incomplete');self.pg.sql("UPDATE reponses_apprenants SET reponses=reponses-'226' WHERE exercice_id='incomplete'")
  with self.assertRaisesRegex(RuntimeError,'incomplète'):self.call('incomplete')
if __name__=='__main__':unittest.main(verbosity=2)