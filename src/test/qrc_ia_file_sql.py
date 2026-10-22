"""Queue/reconciliation SQL executed against an isolated, disposable PostgreSQL only (no production access)."""
import os, pathlib, subprocess, sys, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIGRATION = pathlib.Path(os.environ.get('QRC_FILE_SQL') or next(ROOT.glob('drizzle/migrations/*qrc_ia_file_serveur*.sql')))
TEMP = tempfile.mkdtemp(prefix='qrc-file-', dir='/tmp'); os.chown(TEMP, 1000, 1000)
DATA = TEMP + '/data'; PORT = '55441'
EL = '11111111-1111-4111-8111-000000000001'   # e-learning learner
PR = '11111111-1111-4111-8111-000000000002'   # présentiel learner
TS = '11111111-1111-4111-8111-000000000003'   # technical test account
IS = 'c0844007-b999-4385-9665-918e5077c3b5'   # Ismail AMAR (excluded)

def sql(q):
    return subprocess.check_output(['psql','-X','-h',TEMP,'-p',PORT,'-U','lovable','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',q], text=True, stderr=subprocess.STDOUT).strip()

def att(n): return f'22222222-2222-4222-8222-{n:012d}'
def qrc(n, k=1): return f'33333333-3333-4333-8333-{n*10+k:012d}'

class File(unittest.TestCase):
    def setUp(self):
        sql("TRUNCATE qrc_ia_suites, qrc_ia_corrections, qrc_ia_reprises, qrc_instances_v2, exam_attempts_v2, alertes_systeme, cron.job, net_calls;"
            "UPDATE qrc_ia_config SET actif=true, pause_depuis=NULL, actif_depuis='2026-10-10 12:35+00';")

    def passage(self, n, who=EL, fin="now()-interval '10 minutes'", reponse="'\"texte\"'", finalise=True, test=False):
        sql(f"INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,etat,finished_at,is_test) VALUES('{att(n)}','{who}','en_cours',NULL,{str(test).lower()});"
            f"INSERT INTO qrc_instances_v2(qrc_instance_id,attempt_id,apprenant_id,question_id,etat,reponse) VALUES('{qrc(n)}','{att(n)}','{who}','q:1','en_attente',{reponse});")
        if finalise: sql(f"UPDATE exam_attempts_v2 SET etat='terminee', finished_at={fin} WHERE attempt_id='{att(n)}';")

    def suites(self): return sql("SELECT count(*) FROM qrc_ia_suites")

    def test_finalisation_cree_la_file_sans_onglet(self):
        self.passage(1)
        self.assertEqual(sql(f"SELECT statut||'|'||origine FROM qrc_ia_suites WHERE attempt_id='{att(1)}'"), 'attente|declencheur_exam_attempts_v2')
        self.assertEqual(sql("SELECT count(*) FROM cron.job WHERE jobname='qrc-ia-suites-bornees'"), '1')

    def test_doublon_idempotent(self):
        self.passage(1)
        for _ in range(5): self.assertEqual(sql(f"SELECT qrc_ia_enfiler('{att(1)}','x')"), 'deja_en_file')
        self.assertEqual(self.suites(), '1')

    def test_exclusions_presentiel_test_ismail_null_historique_inexistant(self):
        self.passage(2, who=PR); self.passage(3, who=TS); self.passage(4, who=IS)
        self.passage(5, reponse='NULL'); self.passage(6, fin="'2026-10-20 09:00+00'"); self.passage(7, test=True)
        self.assertEqual(self.suites(), '0')
        self.assertEqual(sql(f"SELECT qrc_ia_enfiler('{att(99)}','x')"), 'passage_introuvable')
        self.assertEqual(sql(f"SELECT qrc_ia_raison_file('{att(2)}')"), 'non_elearning')
        self.assertEqual(sql(f"SELECT qrc_ia_raison_file('{att(4)}')"), 'exclu')
        self.assertEqual(sql("SELECT (qrc_ia_reconcilier()->>'vus')"), '0')
        self.assertEqual(self.suites(), '0')

    def test_passage_non_termine_pas_de_file(self):
        self.passage(8, finalise=False)
        self.assertEqual(self.suites(), '0')

    def test_reconciliation_retrouve_une_tache_oubliee(self):
        sql("ALTER TABLE exam_attempts_v2 DISABLE TRIGGER trg_qrc_ia_enfiler_passage; ALTER TABLE qrc_instances_v2 DISABLE TRIGGER trg_qrc_ia_enfiler_qrc;")
        try: self.passage(9)
        finally: sql("ALTER TABLE exam_attempts_v2 ENABLE TRIGGER trg_qrc_ia_enfiler_passage; ALTER TABLE qrc_instances_v2 ENABLE TRIGGER trg_qrc_ia_enfiler_qrc;")
        self.assertEqual(self.suites(), '0')
        self.assertEqual(sql("SELECT qrc_ia_reconcilier()->>'mis_en_file'"), '1')
        self.assertEqual(sql("SELECT count(*) FROM alertes_systeme WHERE type='qrc_ia_completude'"), '1')
        self.assertEqual(sql("SELECT qrc_ia_reconcilier()->>'mis_en_file'"), '0')

    def test_faux_termine_reouvert_revue_jamais(self):
        self.passage(10)
        sql(f"UPDATE qrc_ia_suites SET statut='terminee' WHERE attempt_id='{att(10)}'")
        self.assertEqual(sql("SELECT qrc_ia_reconcilier()->>'reouverts'"), '1')
        self.assertEqual(sql(f"SELECT statut FROM qrc_ia_suites WHERE attempt_id='{att(10)}'"), 'attente')
        sql(f"UPDATE qrc_ia_suites SET statut='a_verifier' WHERE attempt_id='{att(10)}'")
        self.assertEqual(sql(f"SELECT qrc_ia_enfiler('{att(10)}','x')"), 'revue_existante')

    def test_trace_existante_pas_de_nouvelle_file(self):
        self.passage(11)
        sql(f"UPDATE qrc_ia_suites SET statut='terminee'; INSERT INTO qrc_ia_corrections(cle_idempotence,qrc_instance_id,attempt_id,apprenant_id,question_id,reponse_hash,statut) VALUES('k','{qrc(11)}','{att(11)}','{EL}','q:1','h','appliquee')")
        self.assertEqual(sql(f"SELECT qrc_ia_enfiler('{att(11)}','x')"), 'rien_a_corriger')

    def test_pause_globale_respectee(self):
        self.passage(12)
        sql("UPDATE qrc_ia_config SET pause_depuis=now()")
        self.assertEqual(sql("SELECT qrc_ia_dispatch_suites()"), '0')
        self.assertEqual(sql("SELECT statut FROM qrc_ia_suites"), 'pause')
        self.assertEqual(sql("SELECT count(*) FROM net_calls"), '0')
        self.assertEqual(sql("SELECT qrc_ia_reconcilier()->>'reouverts'"), '0')
        sql("UPDATE qrc_ia_config SET pause_depuis=NULL")  # explicit admin resume
        self.assertEqual(sql("SELECT qrc_ia_reconcilier()->>'reouverts'"), '1')

    def test_ia_desactivee_rien(self):
        sql("UPDATE qrc_ia_config SET actif=false"); self.passage(13)
        self.assertEqual(self.suites(), '0')

    def test_bail_expire_dead_letter_et_suivant_non_bloque(self):
        self.passage(14); self.passage(15)
        sql(f"UPDATE qrc_ia_suites SET statut='en_cours', lease_until=now()-interval '1 second' WHERE attempt_id='{att(14)}'")
        self.assertEqual(sql("SELECT qrc_ia_dispatch_suites()"), '1')
        self.assertEqual(sql(f"SELECT statut||'|'||dernier_code FROM qrc_ia_suites WHERE attempt_id='{att(14)}'"), 'a_verifier|bail_expire_issue_inconnue')
        self.assertEqual(sql("SELECT body->>'attempt_id' FROM net_calls"), att(15))

    def test_bail_court(self):
        self.passage(16)
        sql(f"SELECT qrc_ia_suite_claim('{att(16)}',(SELECT token FROM qrc_ia_suites))")
        self.assertEqual(sql("SELECT lease_until <= now()+interval '10 minutes' AND lease_until > now()+interval '9 minutes' FROM qrc_ia_suites"), 't')

    def test_bilan_statuts(self):
        self.passage(17); self.passage(18, reponse='NULL')
        rows = dict(x.split('|') for x in sql("SELECT attempt_id||'|'||statut FROM qrc_ia_bilan_statuts()").splitlines())
        self.assertEqual(rows[att(17)], 'en_file'); self.assertEqual(rows[att(18)], 'sans_reponse')

    def test_enfiler_refuse_client(self):
        self.passage(19)
        with self.assertRaises(subprocess.CalledProcessError):
            sql(f"SET ROLE authenticated; SELECT qrc_ia_enfiler('{att(19)}','x')")

def main():
    subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','initdb','-D',DATA,'-A','trust','--no-locale'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','pg_ctl','-D',DATA,'-l',TEMP+'/pg.log','-o',f'-k {TEMP} -p {PORT} -h ""','-w','start'], check=True, stdout=subprocess.DEVNULL)
    try:
        sql('''CREATE SCHEMA auth; CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'service_role'::text$$;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE postgres;
        CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
        CREATE SCHEMA cron; CREATE TABLE cron.job(jobname text PRIMARY KEY, schedule text, command text);
        CREATE FUNCTION cron.schedule(n text,s text,c text) RETURNS bigint LANGUAGE sql AS $$INSERT INTO cron.job VALUES(n,s,c) ON CONFLICT(jobname) DO UPDATE SET schedule=excluded.schedule RETURNING 1::bigint$$;
        CREATE FUNCTION cron.unschedule(n text) RETURNS boolean LANGUAGE sql AS $$DELETE FROM cron.job WHERE jobname=n RETURNING true$$;
        CREATE SCHEMA extensions; CREATE SCHEMA net; CREATE TABLE public.net_calls(body jsonb);
        CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb) RETURNS bigint LANGUAGE sql AS $$INSERT INTO public.net_calls VALUES(body) RETURNING 1::bigint$$;
        CREATE TABLE qrc_ia_config(id boolean PRIMARY KEY, actif boolean, actif_depuis timestamptz, pause_depuis timestamptz); INSERT INTO qrc_ia_config VALUES(true,true,'2026-10-10 12:35+00',NULL);
        CREATE TABLE apprenants(id uuid PRIMARY KEY, type_apprenant text, modalite_formation text);
        CREATE TABLE comptes_test_techniques(apprenant_id uuid PRIMARY KEY);
        CREATE TABLE exam_attempts_v2(attempt_id uuid PRIMARY KEY, apprenant_id uuid, exam_id text DEFAULT 'EB5', etat text, finished_at timestamptz, is_test boolean DEFAULT false);
        CREATE TABLE qrc_instances_v2(qrc_instance_id uuid PRIMARY KEY, attempt_id uuid, apprenant_id uuid, question_id text, etat text, reponse jsonb);
        CREATE TABLE qrc_ia_corrections(id uuid DEFAULT gen_random_uuid(), cle_idempotence text UNIQUE, qrc_instance_id uuid, attempt_id uuid, apprenant_id uuid, question_id text, reponse_hash text, statut text, http_status int, motif text, created_at timestamptz DEFAULT now());
        CREATE TABLE qrc_ia_reprises(id uuid DEFAULT gen_random_uuid(), qrc_instance_id uuid, numero int, statut text, http_status int);
        CREATE TABLE alertes_systeme(type text, titre text, message text, details text, lu boolean);''')
        sql(f"INSERT INTO apprenants VALUES('{EL}','vtc-e',NULL),('{PR}','vtc',NULL),('{TS}','vtc-e',NULL),('{IS}','vtc-e',NULL); INSERT INTO comptes_test_techniques VALUES('{TS}');")
        source = (ROOT/'drizzle/migrations/0181_qrc_ia_suite_bornee.sql').read_text()
        sql(source[source.index('CREATE TABLE'):source.index('GRANT SELECT')])
        sql(source[source.index('CREATE OR REPLACE FUNCTION public.qrc_ia_suite_wake'):source.index('CREATE OR REPLACE FUNCTION public.qrc_ia_suite_claim')])
        sql('ALTER TABLE public.qrc_ia_suites ADD COLUMN dispatches integer NOT NULL DEFAULT 0;')
        sql(MIGRATION.read_text())
        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(File))
        if not result.wasSuccessful(): raise SystemExit(1)
    finally:
        subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','pg_ctl','-D',DATA,'-m','immediate','stop'], stdout=subprocess.DEVNULL)

if __name__ == '__main__': main()
