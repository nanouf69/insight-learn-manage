"""Candidate RPC + real tentative trigger on disposable PostgreSQL only."""
import concurrent.futures
import json
import pathlib
import unittest
from upsert_reponse_http_integration import PgJetable

ROOT = pathlib.Path(__file__).resolve().parents[2]
APP = '11111111-1111-4111-8111-000000000001'
UID = '22222222-2222-4222-8222-000000000002'

class RevisionSql(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = PgJetable()
        cls.pg.sql('''
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE apprenants(id uuid PRIMARY KEY,auth_user_id uuid);
CREATE FUNCTION core_est_proprietaire(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM apprenants WHERE id=$1 AND auth_user_id=auth.uid()) $$;
CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE TABLE reponses_apprenants(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,user_id uuid,exercice_id text,exercice_type text,reponses jsonb,score numeric,completed boolean);
CREATE TABLE apprenant_quiz_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),apprenant_id uuid,user_id uuid,quiz_type text,quiz_id text,quiz_titre text,matiere_id text,score_obtenu numeric,score_max numeric,note_sur_20 numeric,reussi boolean,details jsonb,completed_at timestamptz DEFAULT now(),tentative integer DEFAULT 1);
CREATE FUNCTION set_next_quiz_tentative() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_next integer; BEGIN IF NEW.tentative IS NULL OR NEW.tentative=1 THEN SELECT coalesce(max(tentative),0)+1 INTO v_next FROM apprenant_quiz_results WHERE apprenant_id=NEW.apprenant_id AND quiz_id=NEW.quiz_id AND coalesce(matiere_id,'')=coalesce(NEW.matiere_id,''); IF v_next>1 THEN NEW.tentative:=v_next; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_set_next_quiz_tentative BEFORE INSERT ON apprenant_quiz_results FOR EACH ROW EXECUTE FUNCTION set_next_quiz_tentative();
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
GRANT SELECT ON reponses_apprenants,apprenant_quiz_results TO authenticated;
''')
        cls.pg.sql('BEGIN;'+(ROOT/'docs/sql-revue/2026-11-08-revision-finalisation-idempotente.sql').read_text()+'COMMIT;')
        cls.pg.sql(f"INSERT INTO apprenants VALUES('{APP}','{UID}'); INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_type,note_sur_20,details) VALUES('{APP}','{UID}','EB2-TAXI','examen_blanc',6.5,'{{\"snapshot\":\"unchanged\"}}');")

    @classmethod
    def tearDownClass(cls): cls.pg.stop()

    def fixture(self, exam):
        state={'examenId':exam,'answers':{'t3p:1':['B','C'],'gestion:1':'texte'},'questionOrder':['t3p:1','gestion:1'],'correctedQuestions':['t3p:1','gestion:1'],'correctedCount':2}
        self.pg.sql(f"INSERT INTO reponses_apprenants VALUES(gen_random_uuid(),'{APP}','{UID}','revision_fausses_{exam}','revision_fausses','{json.dumps({'revisionState':state})}',2,true)")
    def call(self, exam, uid=UID):
        return self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SELECT finaliser_revision_fausses('{APP}','{exam}','revision_fausses_{exam}')")

    def test_concurrent_and_lost_ack(self):
        self.fixture('EB2-TAXI')
        initial=self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM apprenant_quiz_results r WHERE quiz_type='examen_blanc'")
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            values=list(pool.map(lambda _:self.call('EB2-TAXI'),range(2)))
        self.assertEqual(values[0],values[1])
        self.assertEqual(values[0],self.call('EB2-TAXI'))
        self.assertEqual('1|1',self.pg.sql("SELECT count(*),count(DISTINCT id) FROM apprenant_quiz_results WHERE quiz_type='revision_fausses' AND quiz_id='EB2-TAXI'"))
        self.assertEqual(initial,self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM apprenant_quiz_results r WHERE quiz_type='examen_blanc'"))

    def test_wrong_owner_and_expired(self):
        self.fixture('EB1')
        with self.assertRaisesRegex(RuntimeError,'Accès refusé'): self.call('EB1','33333333-3333-4333-8333-000000000003')
        with self.assertRaisesRegex(RuntimeError,'Accès refusé'): self.call('EB1','')
        self.assertEqual('0',self.pg.sql("SELECT count(*) FROM apprenant_quiz_results WHERE quiz_id='EB1'"))

    def test_old_client_duplicate_guard(self):
        self.fixture('EB3')
        self.call('EB3')
        with self.assertRaisesRegex(RuntimeError,'déjà finalisée'):
            self.pg.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,quiz_id,quiz_type,details) VALUES('{APP}','EB3','revision_fausses','{{\"revision_exercice_id\":\"revision_fausses_EB3\"}}')")

    def test_unconfirmed_refused(self):
        self.fixture('EB4')
        self.pg.sql("UPDATE reponses_apprenants SET completed=false WHERE exercice_id='revision_fausses_EB4'")
        with self.assertRaisesRegex(RuntimeError,'Clôture non confirmée'): self.call('EB4')

if __name__=='__main__': unittest.main(verbosity=2)