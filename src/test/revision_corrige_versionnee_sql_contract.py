"""Real PostgreSQL transaction tests; disposable data only, no Cloud writes."""
import concurrent.futures
import json
import pathlib
import unittest
import uuid
from upsert_reponse_http_integration import PgJetable

ROOT = pathlib.Path(__file__).resolve().parents[2]
OWNER = '11111111-1111-4111-8111-000000000001'
UID = '22222222-2222-4222-8222-000000000002'
OTHER = '33333333-3333-4333-8333-000000000003'
COPY = '44444444-4444-4444-8444-000000000004'


class RevisionVersionnee(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = PgJetable()
        cls.pg.sql("""
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TYPE app_role AS ENUM ('admin','moderator','user');
CREATE TABLE apprenants(id uuid PRIMARY KEY,auth_user_id uuid);
CREATE FUNCTION core_est_proprietaire(uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM apprenants WHERE id=$1 AND auth_user_id=auth.uid())$$;
CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$;
CREATE TABLE exam_attempts_v2(attempt_id uuid PRIMARY KEY,apprenant_id uuid,exam_id text,etat text,snapshot jsonb);
CREATE TABLE apprenant_quiz_results(id uuid PRIMARY KEY,apprenant_id uuid,quiz_id text,matiere_id text,details jsonb,quiz_type text,completed_at timestamptz,note numeric);
CREATE TABLE exam_content_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),exam_id text,version_number integer,published_at timestamptz,content jsonb,statut text,retired_at timestamptz,is_test boolean);
GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
""")
        cls.pg.sql((ROOT/'docs/sql-revue/2026-11-10-corriges-trois-surfaces.sql').read_text())
        cls.pg.sql((ROOT/'docs/sql-revue/2026-11-10-revision-corrige-versionnee.sql').read_text())
        q={'id':'francais:4','type':'QCM','enonce':'titiller','points':2,'choix':[{'lettre':l,'texte':l,'correct':l in ['A','C']} for l in ['A','B','C']]}
        cls.pg.sql(f"INSERT INTO apprenants VALUES('{OWNER}','{UID}'); INSERT INTO exam_attempts_v2 VALUES('{COPY}','{OWNER}','EB3','terminee','{json.dumps({'matiere':'francais','questions':[q]})}'); INSERT INTO exam_content_versions(exam_id,version_number,published_at,content,statut,is_test) VALUES('EB3',23,now(),'{json.dumps({'questions':[q]})}','publiee',false)")

    @classmethod
    def tearDownClass(cls):
        cls.pg.stop()

    def call(self, sql, user=UID):
        raw=self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{user}'; "+sql)
        return json.loads(raw.splitlines()[-1])

    def open(self):
        refs=[{'type':'attempt','id':COPY,'question':'francais:4'}]
        return self.call(f"SELECT revision_corrige_ouvrir('{OWNER}','{json.dumps(refs)}')")

    def command(self,state,payload,op=None):
        return self.call(f"SELECT revision_corrige_commande('{state['id']}',{state['seq']},'{state['epoch']}','{op or uuid.uuid4()}','{json.dumps(payload)}')")

    def answer(self,state,answer,op=None):
        return self.command(state,{'kind':'answer','key':f'attempt|{COPY}|francais:4','answer':answer},op)

    def test_exact_sets(self):
        for answer,points in [(['A','C'],1),(['C','A'],1),(['A'],0),(['C'],0),(['A','B','C'],0),(['B'],0)]:
            state=self.answer(self.open(),answer)
            result=self.command(state,{'kind':'submit'})
            self.assertEqual(result['submission']['perfect'],points)
            self.assertFalse(result['submission']['note_examen_modifiee'])

    def test_reload_latest_timestamp(self):
        state=self.answer(self.open(),['B'])
        state=self.answer(state,['C','A'])
        reread=self.call(f"SELECT revision_corrige_etat('{state['id']}')")
        self.assertEqual(reread['answers'][f'attempt|{COPY}|francais:4'],['C','A'])
        self.assertEqual(reread['seq'],2)
        self.assertEqual(self.pg.sql(f"SELECT count(*),count(DISTINCT created_at) FROM revision_corrige_events WHERE session_id='{state['id']}'"),'2|2')

    def test_two_tabs_cas_preserves_both_local_inputs(self):
        state=self.open()
        def attempt(a):
            try: return self.answer(state,a)
            except RuntimeError as exc: return str(exc)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(attempt,[['A'],['C']]))
        self.assertEqual(sum(isinstance(x,dict) for x in results),1)
        self.assertTrue(any('Conflit de version' in str(x) for x in results))
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM revision_corrige_events WHERE session_id='{state['id']}'"),'1')

    def test_idempotent_lost_ack_and_operation_reuse(self):
        state=self.open();op=uuid.uuid4()
        first=self.answer(state,['A','C'],op)
        self.assertEqual(first,self.answer(state,['A','C'],op))
        with self.assertRaisesRegex(RuntimeError,'Operation reutilisee'):
            self.answer(state,['B'],op)

    def test_current_version_changed_keeps_answer_requires_revalidation(self):
        state=self.answer(self.open(),['A','C'])
        self.pg.sql("BEGIN; UPDATE exam_content_versions SET version_number=24,content=jsonb_set(content,'{questions,0,choix,0,correct}','false'); COMMIT;")
        try:
            with self.assertRaisesRegex(RuntimeError,'Corrige modifie'):
                self.command(state,{'kind':'submit'})
            fresh=self.call(f"SELECT revision_corrige_etat('{state['id']}')")
            self.assertEqual(fresh['answers'],state['answers'])
            result=self.command(fresh,{'kind':'submit'})
            self.assertEqual(result['submission']['perfect'],0)
            self.assertEqual(result['submission']['sources'][0]['version'],24)
        finally:
            self.pg.sql("UPDATE exam_content_versions SET version_number=23,content=jsonb_set(content,'{questions,0,choix,0,correct}','true')")

    def test_submission_immutable_and_double_click(self):
        state=self.answer(self.open(),['A','C']);op=uuid.uuid4()
        first=self.command(state,{'kind':'submit'},op)
        self.assertEqual(first,self.command(state,{'kind':'submit'},op))
        with self.assertRaisesRegex(RuntimeError,'deja remise'):
            self.answer(first,['B'])
        with self.assertRaisesRegex(RuntimeError,'immuable'):
            self.pg.sql(f"UPDATE revision_corrige_events SET payload='{{}}' WHERE session_id='{state['id']}'")

    def test_no_answer_no_validation(self):
        state=self.open()
        with self.assertRaisesRegex(RuntimeError,'Toutes les reponses'):
            self.command(state,{'kind':'submit'})
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM revision_corrige_events WHERE session_id='{state['id']}'"),'0')

    def test_owner_and_direct_writes(self):
        state=self.open()
        with self.assertRaisesRegex(RuntimeError,'Acces eleve refuse'):
            self.call(f"SELECT revision_corrige_etat('{state['id']}')",OTHER)
        self.assertEqual(self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{OTHER}'; SELECT count(*) FROM revision_corrige_sessions WHERE id='{state['id']}'").splitlines()[-1],'0')
        with self.assertRaisesRegex(RuntimeError,'permission denied'):
            self.pg.sql("SET ROLE anon; SELECT revision_corrige_etat(gen_random_uuid())")
        with self.assertRaisesRegex(RuntimeError,'permission denied'):
            self.pg.sql(f"SET ROLE authenticated; INSERT INTO revision_corrige_events(session_id,seq,operation_id,payload) VALUES('{state['id']}',1,gen_random_uuid(),'{{}}')")

    def test_historical_fingerprint_unchanged(self):
        before=self.pg.sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY attempt_id)::text) FROM exam_attempts_v2 t")
        self.command(self.answer(self.open(),['A','C']),{'kind':'submit'})
        self.assertEqual(before,self.pg.sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY attempt_id)::text) FROM exam_attempts_v2 t"))

    def test_timeout_rolls_back_operation_can_retry(self):
        state=self.open();op=uuid.uuid4()
        with self.assertRaisesRegex(RuntimeError,'statement timeout'):
            self.pg.sql("SET statement_timeout='5ms'; SELECT pg_sleep(0.03)")
        self.assertEqual(self.answer(state,['A','C'],op)['seq'],1)


if __name__=='__main__': unittest.main(verbosity=2)