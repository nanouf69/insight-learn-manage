"""Candidate RPC + real tentative trigger on disposable PostgreSQL only."""
import concurrent.futures
import json
import pathlib
import unittest
import sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from upsert_reponse_http_integration import PgJetable

ROOT = pathlib.Path(__file__).resolve().parents[3]
APP = '11111111-1111-4111-8111-000000000001'
UID = '22222222-2222-4222-8222-000000000002'
ADMIN = '44444444-4444-4444-8444-000000000004'

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
CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='44444444-4444-4444-8444-000000000004'::uuid AND $2='admin' $$;
CREATE TABLE reponses_apprenants(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,user_id uuid,exercice_id text,exercice_type text,reponses jsonb,score numeric,completed boolean,updated_at timestamptz DEFAULT now(),write_seq bigint DEFAULT 7);
CREATE TABLE apprenant_quiz_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),apprenant_id uuid,user_id uuid,quiz_type text,quiz_id text,quiz_titre text,matiere_id text,score_obtenu numeric,score_max numeric,note_sur_20 numeric,reussi boolean,details jsonb,completed_at timestamptz DEFAULT now(),tentative integer DEFAULT 1);
CREATE FUNCTION set_next_quiz_tentative() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_next integer; BEGIN IF NEW.tentative IS NULL OR NEW.tentative=1 THEN SELECT coalesce(max(tentative),0)+1 INTO v_next FROM apprenant_quiz_results WHERE apprenant_id=NEW.apprenant_id AND quiz_id=NEW.quiz_id AND coalesce(matiere_id,'')=coalesce(NEW.matiere_id,''); IF v_next>1 THEN NEW.tentative:=v_next; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_set_next_quiz_tentative BEFORE INSERT ON apprenant_quiz_results FOR EACH ROW EXECUTE FUNCTION set_next_quiz_tentative();
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
GRANT SELECT ON reponses_apprenants,apprenant_quiz_results TO authenticated;
''')
        cls.pg.sql('BEGIN;'+(ROOT/'src/test/eb2-isolated/candidate.sql').read_text()+'COMMIT;')
        cls.pg.sql(f"INSERT INTO apprenants VALUES('{APP}','{UID}'); INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_type,note_sur_20,details) VALUES('{APP}','{UID}','EB2-TAXI','examen_blanc',6.5,'{{\"snapshot\":\"unchanged\"}}');")

    @classmethod
    def tearDownClass(cls): cls.pg.stop()

    def fixture(self, exam):
        state={'examenId':exam,'answers':{'t3p:1':['B','C'],'gestion:1':'texte'},'questionOrder':['t3p:1','gestion:1'],'correctedQuestions':['t3p:1','gestion:1'],'correctedCount':2}
        for matter, question in [('t3p',{'id':1,'type':'QCM','choix':[{'lettre':'A','correct':False},{'lettre':'B','correct':True},{'lettre':'C','correct':True}]}),('gestion',{'id':1,'type':'QRC','reponses_possibles':['texte']})]:
            snapshot={'snapshot':{'matiereId':matter,'questions':[question]}}
            self.pg.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_type,matiere_id,details,completed_at) VALUES('{APP}','{UID}','{exam}','examen_blanc','{matter}','{json.dumps(snapshot)}',now()-interval '1 second')")
        self.pg.sql(f"INSERT INTO reponses_apprenants(id,apprenant_id,user_id,exercice_id,exercice_type,reponses,score,completed) VALUES(gen_random_uuid(),'{APP}','{UID}','revision_fausses_{exam}','revision_fausses','{json.dumps({'revisionState':state})}',2,true)")
    def call(self, exam, uid=UID):
        return self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SELECT finaliser_revision_fausses('{APP}','{exam}','revision_fausses_{exam}',7,(SELECT reponses FROM reponses_apprenants WHERE exercice_id='revision_fausses_{exam}'))")

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
        self.assertEqual('0',self.pg.sql("SELECT count(*) FROM apprenant_quiz_results WHERE quiz_id='EB1' AND quiz_type='revision_fausses'"))

    def test_old_client_duplicate_guard(self):
        self.fixture('EB3')
        self.call('EB3')
        with self.assertRaisesRegex(RuntimeError,'déjà finalisée'):
            self.pg.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,quiz_id,quiz_type,details) VALUES('{APP}','EB3','revision_fausses','{{\"revision_exercice_id\":\"revision_fausses_EB3\"}}')")

    def test_unconfirmed_refused(self):
        self.fixture('EB4')
        self.pg.sql("UPDATE reponses_apprenants SET completed=false WHERE exercice_id='revision_fausses_EB4'")
        self.call('EB4')
        self.assertEqual('t',self.pg.sql("SELECT completed FROM reponses_apprenants WHERE exercice_id='revision_fausses_EB4'"))

    def test_forged_score_refused(self):
        self.fixture('FORGED')
        self.pg.sql("UPDATE reponses_apprenants SET reponses=jsonb_set(reponses,'{revisionState,answers,t3p:1}','[\"A\"]') WHERE exercice_id='revision_fausses_FORGED'")
        with self.assertRaisesRegex(RuntimeError,'Score de révision non confirmé'): self.call('FORGED')
        self.assertEqual('0',self.pg.sql("SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='FORGED'"))

    def test_receipt_rls_and_admin(self):
        self.fixture('ADMIN')
        self.call('ADMIN',ADMIN)
        self.assertEqual('1',self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{UID}'; SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='ADMIN'").splitlines()[-1])
        self.assertEqual('0',self.pg.sql("SET ROLE authenticated; SET request.jwt.claim.sub='33333333-3333-4333-8333-000000000003'; SELECT count(*) FROM revision_fausses_receipts").splitlines()[-1])
        self.assertEqual('1',self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ADMIN}'; SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='ADMIN'").splitlines()[-1])
        with self.assertRaisesRegex(RuntimeError,'permission denied'): self.pg.sql("SET ROLE anon; SELECT * FROM revision_fausses_receipts")
        with self.assertRaisesRegex(RuntimeError,'permission denied'): self.pg.sql(f"SET ROLE anon; SELECT finaliser_revision_fausses('{APP}','ADMIN','revision_fausses_ADMIN',7,'{{}}')")
        with self.assertRaisesRegex(RuntimeError,'permission denied'): self.pg.sql("SET ROLE authenticated; INSERT INTO revision_fausses_receipts VALUES(null,null,null,null,null,now())")

    def test_historical_conflict_preserved(self):
        self.fixture('CONFLICT')
        self.pg.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,quiz_id,quiz_type,score_obtenu,score_max,details) VALUES('{APP}','CONFLICT','revision_fausses',0,2,'{{\"revision_exercice_id\":\"revision_fausses_CONFLICT\"}}')")
        before=self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM apprenant_quiz_results r WHERE quiz_id='CONFLICT' AND quiz_type='revision_fausses'")
        with self.assertRaisesRegex(RuntimeError,'Preuve historique différente'): self.call('CONFLICT')
        self.assertEqual(before,self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM apprenant_quiz_results r WHERE quiz_id='CONFLICT' AND quiz_type='revision_fausses'"))

    def test_source_identity_never_guessed(self):
        self.fixture('IDENTITY')
        source=self.pg.sql("SELECT id FROM apprenant_quiz_results WHERE quiz_id='IDENTITY' AND matiere_id='t3p'")
        self.pg.sql("INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_type,matiere_id,details,completed_at) SELECT apprenant_id,user_id,quiz_id,quiz_type,matiere_id,details,completed_at FROM apprenant_quiz_results WHERE quiz_id='IDENTITY' AND matiere_id='t3p'")
        with self.assertRaisesRegex(RuntimeError,'Identité de copie initiale non prouvée'): self.call('IDENTITY')
        self.pg.sql(f"UPDATE reponses_apprenants SET reponses=jsonb_set(reponses,'{{revisionState,sourceResultIds}}','{{\"t3p:1\":\"{source}\"}}') WHERE exercice_id='revision_fausses_IDENTITY'")
        self.call('IDENTITY')
        self.assertEqual('1',self.pg.sql("SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='IDENTITY'"))

    def test_missing_qrc_key_refused_not_invented(self):
        self.fixture('NO_KEY')
        self.pg.sql("UPDATE apprenant_quiz_results SET details=jsonb_set(details,'{snapshot,questions,0,reponses_possibles}','[]') WHERE quiz_id='NO_KEY' AND matiere_id='gestion'")
        with self.assertRaisesRegex(RuntimeError,'corrigé figé insuffisant'): self.call('NO_KEY')
        self.assertEqual('0',self.pg.sql("SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='NO_KEY'"))

    def test_atomic_rollback_between_completed_and_result(self):
        self.fixture('ROLLBACK')
        self.pg.sql("UPDATE reponses_apprenants SET completed=false WHERE exercice_id='revision_fausses_ROLLBACK'")
        before=self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM reponses_apprenants r WHERE exercice_id='revision_fausses_ROLLBACK'")
        self.pg.sql("CREATE FUNCTION test_fail_result() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.quiz_id='ROLLBACK' AND NEW.quiz_type='revision_fausses' THEN RAISE EXCEPTION 'injected interruption'; END IF; RETURN NEW; END $$; CREATE TRIGGER z_test_failure BEFORE INSERT ON apprenant_quiz_results FOR EACH ROW EXECUTE FUNCTION test_fail_result()")
        with self.assertRaisesRegex(RuntimeError,'injected interruption'): self.call('ROLLBACK')
        self.assertEqual(before,self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM reponses_apprenants r WHERE exercice_id='revision_fausses_ROLLBACK'"))
        self.assertEqual('0',self.pg.sql("SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='ROLLBACK'"))
        self.pg.sql("ALTER TABLE apprenant_quiz_results DISABLE TRIGGER z_test_failure")
        self.call('ROLLBACK')
        self.assertEqual('t|1',self.pg.sql("SELECT completed,(SELECT count(*) FROM apprenant_quiz_results WHERE quiz_type='revision_fausses' AND quiz_id='ROLLBACK') FROM reponses_apprenants WHERE exercice_id='revision_fausses_ROLLBACK'"))

    def test_failure_after_result_rolls_back_all_three(self):
        self.fixture('RECEIPT_FAIL')
        self.pg.sql("UPDATE reponses_apprenants SET completed=false WHERE exercice_id='revision_fausses_RECEIPT_FAIL'")
        self.pg.sql("CREATE FUNCTION test_fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.examen_id='RECEIPT_FAIL' THEN RAISE EXCEPTION 'receipt interruption'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_receipt_failure BEFORE INSERT ON revision_fausses_receipts FOR EACH ROW EXECUTE FUNCTION test_fail_receipt()")
        with self.assertRaisesRegex(RuntimeError,'receipt interruption'): self.call('RECEIPT_FAIL')
        self.assertEqual('f|0|0',self.pg.sql("SELECT completed,(SELECT count(*) FROM apprenant_quiz_results WHERE quiz_type='revision_fausses' AND quiz_id='RECEIPT_FAIL'),(SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='RECEIPT_FAIL') FROM reponses_apprenants WHERE exercice_id='revision_fausses_RECEIPT_FAIL'"))

    def test_stale_device_cannot_close_or_overwrite(self):
        self.fixture('STALE')
        self.pg.sql("UPDATE reponses_apprenants SET completed=false,write_seq=8 WHERE exercice_id='revision_fausses_STALE'")
        before=self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM reponses_apprenants r WHERE exercice_id='revision_fausses_STALE'")
        with self.assertRaisesRegex(RuntimeError,'périmée'): self.call('STALE')
        self.assertEqual(before,self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM reponses_apprenants r WHERE exercice_id='revision_fausses_STALE'"))

    def test_same_seq_different_payload_refused(self):
        self.fixture('PAYLOAD')
        with self.assertRaisesRegex(RuntimeError,'périmée'):
            self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{UID}'; SELECT finaliser_revision_fausses('{APP}','PAYLOAD','revision_fausses_PAYLOAD',7,'{{}}')")
        self.assertEqual('0',self.pg.sql("SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='PAYLOAD'"))

    def test_lost_network_reply_replays_identical_receipt(self):
        self.fixture('LOST')
        self.pg.sql("UPDATE reponses_apprenants SET completed=false WHERE exercice_id='revision_fausses_LOST'")
        # Commit really happens. Discarding this return simulates losing the network ACK, not a real socket drop.
        receipt=self.call('LOST')
        for _ in range(12): self.assertEqual(receipt,self.call('LOST'))
        self.assertEqual('1|1',self.pg.sql("SELECT (SELECT count(*) FROM revision_fausses_receipts WHERE examen_id='LOST'),count(*) FROM apprenant_quiz_results WHERE quiz_type='revision_fausses' AND quiz_id='LOST'"))

    def test_two_devices_open_draft_one_atomic_result(self):
        self.fixture('TWO_DEVICES')
        self.pg.sql("UPDATE reponses_apprenants SET completed=false WHERE exercice_id='revision_fausses_TWO_DEVICES'")
        before=self.pg.sql("SELECT md5(reponses::text),score,write_seq FROM reponses_apprenants WHERE exercice_id='revision_fausses_TWO_DEVICES'")
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            receipts=list(pool.map(lambda _:self.call('TWO_DEVICES'),range(2)))
        self.assertEqual(receipts[0],receipts[1])
        self.assertEqual(before,self.pg.sql("SELECT md5(reponses::text),score,write_seq FROM reponses_apprenants WHERE exercice_id='revision_fausses_TWO_DEVICES'"))

    def test_identity_separate_revisions_never_merge(self):
        self.fixture('IDENTITY_ROUNDS')
        self.call('IDENTITY_ROUNDS')
        self.pg.sql("INSERT INTO reponses_apprenants SELECT gen_random_uuid(),apprenant_id,user_id,exercice_id||'__r2',exercice_type,reponses,score,false,updated_at,write_seq FROM reponses_apprenants WHERE exercice_id='revision_fausses_IDENTITY_ROUNDS'")
        self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{UID}'; SELECT finaliser_revision_fausses('{APP}','IDENTITY_ROUNDS','revision_fausses_IDENTITY_ROUNDS__r2',7,(SELECT reponses FROM reponses_apprenants WHERE exercice_id='revision_fausses_IDENTITY_ROUNDS__r2'))")
        self.assertEqual('2|2',self.pg.sql("SELECT count(*),count(DISTINCT result_id) FROM revision_fausses_receipts WHERE examen_id='IDENTITY_ROUNDS'"))

    def test_qrc_blank_keywords_refused(self):
        self.fixture('BLANK_KEY')
        self.pg.sql("UPDATE apprenant_quiz_results SET details=jsonb_set(details,'{snapshot,questions,0,reponses_possibles}',jsonb_build_array('   ','!!!')) WHERE quiz_id='BLANK_KEY' AND matiere_id='gestion'")
        with self.assertRaisesRegex(RuntimeError,'insuffisant'): self.call('BLANK_KEY')

    def test_qrc_whitespace_only_keyword_refused(self):
        self.fixture('SPACE_KEY')
        self.pg.sql("UPDATE apprenant_quiz_results SET details=jsonb_set(details,'{snapshot,questions,0,reponses_possibles}',jsonb_build_array('   ')) WHERE quiz_id='SPACE_KEY' AND matiere_id='gestion'")
        with self.assertRaisesRegex(RuntimeError,'insuffisant'): self.call('SPACE_KEY')

if __name__=='__main__': unittest.main(verbosity=2)
