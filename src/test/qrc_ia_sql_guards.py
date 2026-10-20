"""Execute production claim SQL against isolated, disposable PostgreSQL only."""
import concurrent.futures
import os
import pathlib
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
Q = '11111111-1111-4111-8111-111111111111'
A = '22222222-2222-4222-8222-222222222222'
P = '33333333-3333-4333-8333-333333333333'
BASE = '{"attempt_id":"%s","apprenant_id":"%s","question_id":"test:1","cle_idempotence":"test-key","reponse_hash":"hash","exam_id":"EB4","matiere":"test","modele":"original","bareme":2}' % (A, P)
TEMP = tempfile.mkdtemp(prefix='qrc-sql-', dir='/tmp')
os.chown(TEMP, 1000, 1000)
DATA = TEMP + '/data'
PORT = '55439'

def sql(query):
    return subprocess.check_output(['psql', '-X', '-h', TEMP, '-p', PORT, '-U', 'lovable', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], text=True, stderr=subprocess.STDOUT).strip()

class Guards(unittest.TestCase):
    def setUp(self):
        sql('TRUNCATE qrc_ia_reprises,qrc_ia_corrections,qrc_instances_v2,qrc_ia_suites,published;')
        sql(f"INSERT INTO qrc_instances_v2(qrc_instance_id,attempt_id,apprenant_id,question_id,etat,reponse) VALUES('{Q}','{A}','{P}','test:1','en_attente','\"original\"');")

    def claim(self, base=BASE):
        return sql(f"SELECT qrc_ia_reserver_auto('{Q}','{base}'::jsonb);")

    def test_concurrent_claim_single_paid_slot(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            rows = list(pool.map(lambda _: self.claim(), range(8)))
        self.assertEqual(sum(bool(x) for x in rows), 1)
        self.assertEqual(sql('SELECT count(*) FROM qrc_ia_corrections'), '1')

    def test_503_finished_bounded_retry_preserves_original(self):
        self.claim()
        sql("UPDATE qrc_ia_corrections SET statut='erreur',http_status=503,termine_at=now()-interval '1 minute'")
        self.assertIn('reprise', self.claim())
        self.assertEqual(self.claim(), '')
        sql("UPDATE qrc_ia_reprises SET statut='erreur',http_status=503,termine_at=now()-interval '1 minute'")
        self.assertIn('reprise', self.claim())
        sql("UPDATE qrc_ia_reprises SET statut='erreur',http_status=503,termine_at=now()-interval '1 minute'")
        self.assertEqual(self.claim(), '')
        self.assertEqual(sql('SELECT count(*) FROM qrc_ia_reprises'), '2')
        self.assertEqual(sql('SELECT http_status FROM qrc_ia_corrections'), '503')

    def test_interrupted_active_work_not_replayed(self):
        self.claim()
        sql("UPDATE qrc_ia_corrections SET created_at=now()-interval '1 day'")
        self.assertEqual(self.claim(), '')

    def test_retry_cannot_switch_answer_version(self):
        self.claim()
        sql("UPDATE qrc_ia_corrections SET statut='erreur',http_status=503,termine_at=now()-interval '1 minute'")
        self.claim()
        sql("UPDATE qrc_ia_reprises SET statut='erreur',http_status=503,termine_at=now()-interval '1 minute'")
        with self.assertRaises(subprocess.CalledProcessError): self.claim(BASE.replace('"hash"','"changed"'))
        self.assertEqual(sql('SELECT count(*) FROM qrc_ia_reprises'),'1')

    def test_publish_skips_correction_that_became_definitive(self):
        self.claim()
        sql("UPDATE qrc_instances_v2 SET etat='corrigee'")
        result=sql(f"SELECT qrc_ia_publier_initial((SELECT id FROM qrc_ia_corrections),'{A}',2,'AI result')")
        self.assertIn('true',result)
        self.assertEqual(sql('SELECT count(*) FROM published'),'0')
        self.assertEqual(sql('SELECT statut FROM qrc_ia_corrections'),'ignoree')

    def test_definitive_and_other_account_never_claimed(self):
        sql("UPDATE qrc_instances_v2 SET etat='corrigee'")
        self.assertEqual(self.claim(), '')
        sql("UPDATE qrc_instances_v2 SET etat='en_attente'")
        with self.assertRaises(subprocess.CalledProcessError):
            self.claim(BASE.replace(P, '44444444-4444-4444-8444-444444444444'))
        self.assertEqual(sql('SELECT count(*) FROM qrc_ia_corrections'), '0')

    def test_suite_single_flight_wrong_token_and_cooldown(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            rows = list(pool.map(lambda _: sql(f"SELECT qrc_ia_suite_claim('{A}',NULL)"), range(6)))
        self.assertEqual(rows.count('t'), 1)
        sql("UPDATE qrc_ia_suites SET statut='attente',next_at=now()-interval '1 minute'")
        self.assertEqual(sql(f"SELECT qrc_ia_suite_claim('{A}','{Q}')"), 'f')
        sql("UPDATE qrc_ia_suites SET next_at=now()+interval '1 minute'")
        self.assertEqual(sql(f"SELECT qrc_ia_suite_claim('{A}',NULL)"), 'f')

    def test_expired_and_changed_response_cannot_publish(self):
        self.claim()
        sql(f"SELECT qrc_ia_suite_claim('{A}',NULL)")
        call=f"SELECT qrc_ia_publier_auto((SELECT id FROM qrc_ia_corrections),true,'{A}','{Q}','\"original\"','{A}',2,'AI result',NULL)"
        sql("UPDATE qrc_ia_suites SET lease_until=now()-interval '1 second'")
        with self.assertRaises(subprocess.CalledProcessError): sql(call)
        sql("UPDATE qrc_ia_suites SET lease_until=now()+interval '1 hour'")
        sql("UPDATE qrc_instances_v2 SET reponse='\"changed\"'")
        with self.assertRaises(subprocess.CalledProcessError): sql(call)
        self.assertEqual(sql('SELECT count(*) FROM published'),'0')
        self.assertEqual(sql('SELECT statut FROM qrc_ia_corrections'),'en_cours')

def main():
    subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','initdb','-D',DATA,'-A','trust','--no-locale'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','pg_ctl','-D',DATA,'-l',TEMP+'/pg.log','-o',f'-k {TEMP} -p {PORT} -h ""','-w','start'], check=True, stdout=subprocess.DEVNULL)
    try:
        sql('''CREATE SCHEMA auth; CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'service_role'::text$$;
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
        CREATE TABLE qrc_instances_v2(qrc_instance_id uuid PRIMARY KEY,attempt_id uuid,apprenant_id uuid,question_id text,etat text);
        CREATE TABLE qrc_ia_config(id boolean,actif boolean,pause_depuis timestamptz); INSERT INTO qrc_ia_config VALUES(true,true,NULL);
        CREATE TABLE qrc_ia_corrections(id uuid DEFAULT gen_random_uuid(),cle_idempotence text UNIQUE,qrc_instance_id uuid,attempt_id uuid,apprenant_id uuid,question_id text,exam_id text,matiere text,reponse_hash text,modele text,bareme numeric,statut text,http_status int,created_at timestamptz DEFAULT now(),termine_at timestamptz);
        CREATE TABLE qrc_ia_reprises(id uuid DEFAULT gen_random_uuid(),qrc_instance_id uuid,base jsonb,numero int,statut text DEFAULT 'en_cours',created_at timestamptz DEFAULT now(),termine_at timestamptz,http_status int,UNIQUE(qrc_instance_id,numero));''')
        sql('''ALTER TABLE qrc_ia_corrections ADD COLUMN note numeric, ADD COLUMN justification text, ADD COLUMN motif text;
        ALTER TABLE qrc_instances_v2 ADD COLUMN reponse jsonb;
        CREATE TABLE published(q uuid);
        CREATE FUNCTION public.core_correct_qrc_publish(uuid,uuid,numeric,text,text) RETURNS jsonb LANGUAGE plpgsql AS $$BEGIN INSERT INTO published VALUES($2); RETURN jsonb_build_object('qrc_instance_id',$2,'etat','corrigee','note',$3); END $$;''')
        sql((ROOT/'drizzle/migrations/0179_qrc_reprise_guard_legacy_reservation.sql').read_text())
        sql((ROOT/'drizzle/migrations/0180_qrc_ia_reservation_auto.sql').read_text())
        sql((ROOT/'drizzle/migrations/0182_qrc_ia_auto_publication_guard.sql').read_text())
        source = (ROOT/'drizzle/migrations/0181_qrc_ia_suite_bornee.sql').read_text()
        sql(source[source.index('CREATE TABLE'):source.index('GRANT SELECT')])
        sql(source[source.index('CREATE OR REPLACE FUNCTION public.qrc_ia_suite_claim'):source.index('CREATE OR REPLACE FUNCTION public.qrc_ia_dispatch_suites')])
        sql((ROOT/'drizzle/migrations/0185_qrc_ia_suite_lease_longue.sql').read_text())
        sql((ROOT/'drizzle/migrations/0186_qrc_ia_publication_auto_fenced.sql').read_text())
        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Guards))
        if not result.wasSuccessful(): raise SystemExit(1)
    finally:
        subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','pg_ctl','-D',DATA,'-m','immediate','stop'], stdout=subprocess.DEVNULL)

if __name__ == '__main__': main()