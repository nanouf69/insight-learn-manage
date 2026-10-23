"""Migration 0198 sur PostgreSQL JETABLE construit depuis le catalogue réel
(src/test/fixtures/qrc_ia_catalogue_live.sql : colonnes, NOT NULL, défauts,
contraintes, déclencheurs et fonctions réelles). Seul core_correct_qrc_publish
est remplacé par un enregistreur (sa logique de note n'est pas testée ici).
Aucune connexion à la production."""
import os, pathlib, subprocess, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIG = ROOT / 'drizzle/migrations/0198_qrc_ia_trace_reprise_exceptionnelle.sql'
TEMP = tempfile.mkdtemp(prefix='qrc-0198-', dir='/tmp'); os.chown(TEMP, 1000, 1000)
DATA, PORT = TEMP + '/data', '55441'
Q, A, C = '4814bf89-d0e3-484f-9a94-143eaa113ec9', 'f129b372-951f-42a8-95b0-d6421ace164b', 'fb39976a-d884-477a-b556-b13a97476ef9'
P = 'd2393741-4007-42ca-93c7-6c0b24d4f55e'
H = '3a3468fa89b2ab7cbfe5400858a8ec0066e9e8defa9a64c993b5f24210244df8'
BASE = '{"attempt_id":"%s","apprenant_id":"%s","question_id":"q1","reponse_hash":"%s","bareme":2,"modele":"m"}' % (A, P, H)

def sql(query, role='service_role'):
    pre = f"SET app.role='{role}';" + ('' if role == 'service_role' else f'SET ROLE {role};')
    return subprocess.check_output(['psql','-X','-h',TEMP,'-p',PORT,'-U','lovable','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',pre+query], text=True, stderr=subprocess.STDOUT).strip()


def reserve(q=Q, base=BASE, role='service_role'):
    return sql(f"SELECT qrc_ia_reserver_reprise_exceptionnelle('{q}','{base}'::jsonb)", role)

class Exceptionnelle(unittest.TestCase):
    def setUp(self):
        sql("SET session_replication_role=replica; TRUNCATE qrc_ia_reprises, qrc_ia_corrections, published; DELETE FROM qrc_instances_v2 WHERE qrc_instance_id NOT IN (SELECT qrc_instance_id FROM qrc_ia_reprise_exceptionnelle_constats);"
            f"UPDATE qrc_instances_v2 SET etat='en_attente', apprenant_id='{P}';"
            f"INSERT INTO qrc_ia_corrections(id,cle_idempotence,qrc_instance_id,attempt_id,apprenant_id,question_id,exam_id,matiere,reponse_hash,modele,statut,http_status,motif,termine_at) "
            f"VALUES('{C}','k1','{Q}','{A}','{P}','q1','EB5','m','{H}','m','a_verifier',504,'timeout_local_issue_inconnue : aborted',now());")

    def test_reserve_une_seule_fois(self):
        self.assertRegex(reserve(), r'^[0-9a-f-]{36}$')
        self.assertEqual(reserve(), '')
        self.assertEqual(sql('SELECT count(*), bool_and(exceptionnelle), max(numero) FROM qrc_ia_reprises'), '1|t|1')
        self.assertEqual(sql(f"SELECT statut||'|'||http_status FROM qrc_ia_corrections WHERE id='{C}'"), 'a_verifier|504')

    def test_qrc_hors_constat_refusee(self):
        sql(f"SET session_replication_role=replica; INSERT INTO qrc_instances_v2(qrc_instance_id,attempt_id,apprenant_id,question_id,etat) VALUES('99999999-9999-4999-8999-999999999999','{A}','{P}','q1','en_attente')")
        self.assertEqual(reserve('99999999-9999-4999-8999-999999999999'), '')

    def test_reponse_changee_refusee(self):
        with self.assertRaises(subprocess.CalledProcessError): reserve(base=BASE.replace(H, 'autre'))
        self.assertEqual(sql('SELECT count(*) FROM qrc_ia_reprises'), '0')

    def test_mauvais_passage_refuse(self):
        with self.assertRaises(subprocess.CalledProcessError): reserve(base=BASE.replace(A, '0ffd1d8e-90ee-4a4b-b551-039850013ec5'))

    def test_correction_definitive_jamais_refaite(self):
        sql("SET session_replication_role=replica; UPDATE qrc_instances_v2 SET etat='corrigee'")
        self.assertEqual(reserve(), '')
        self.assertEqual(sql('SELECT count(*) FROM qrc_ia_reprises'), '0')

    def test_ismail_exclu(self):
        sql("SET session_replication_role=replica; UPDATE qrc_instances_v2 SET apprenant_id='c0844007-b999-4385-9665-918e5077c3b5'")
        self.assertEqual(reserve(), '')

    def test_eleve_et_anon_refuses(self):
        for role in ('authenticated', 'anon'):
            with self.assertRaises(subprocess.CalledProcessError) as e: reserve(role=role)
            self.assertIn('permission denied', e.exception.output)

    def test_constat_immuable(self):
        with self.assertRaises(subprocess.CalledProcessError): sql("UPDATE qrc_ia_reprise_exceptionnelle_constats SET autorisation='x'")
        with self.assertRaises(subprocess.CalledProcessError): sql("DELETE FROM qrc_ia_reprise_exceptionnelle_constats")
        self.assertEqual(sql('SELECT count(*) FROM qrc_ia_reprise_exceptionnelle_constats'), '6')

    def test_trace_ecrite_en_cours_puis_figee_et_publication_idempotente(self):
        rid = reserve()
        sql(f"""UPDATE qrc_ia_reprises SET trace='{{"code_local":null}}', run_id='r1' WHERE id='{rid}'""")
        sql(f"SELECT qrc_ia_publier_reprise('{rid}','{A}',1.5,'ok','r1')")
        self.assertEqual(sql(f"SELECT qrc_ia_publier_reprise('{rid}','{A}',1.5,'ok','r1')->>'note'"), '1.5')
        self.assertEqual(sql('SELECT count(*) FROM published'), '1')
        with self.assertRaises(subprocess.CalledProcessError): sql(f"UPDATE qrc_ia_reprises SET trace='{{}}' WHERE id='{rid}'")

    def test_echec_reprise_reste_en_revue_sans_seconde_exceptionnelle(self):
        rid = reserve()
        sql(f"UPDATE qrc_ia_reprises SET statut='a_verifier', http_status=504, termine_at=now() WHERE id='{rid}'")
        self.assertEqual(reserve(), '')
        self.assertEqual(sql(f"SELECT qrc_ia_reserver_reprise('{Q}','{BASE}'::jsonb,true)"), '')

def main():
    subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','initdb','-D',DATA,'-A','trust','--no-locale'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','pg_ctl','-D',DATA,'-l',TEMP+'/pg.log','-o',f'-k {TEMP} -p {PORT} -h ""','-w','start'], check=True, stdout=subprocess.DEVNULL)
    try:
        sql('''CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
        CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
        CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('app.role', true)$$;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULL::uuid$$;
        CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
        CREATE TABLE published(q uuid);''')
        sql('SET check_function_bodies=off;' + (ROOT/'src/test/fixtures/qrc_ia_catalogue_live.sql').read_text())
        sql('''CREATE OR REPLACE FUNCTION public.core_correct_qrc_publish(uuid,uuid,numeric,text,text) RETURNS jsonb LANGUAGE plpgsql AS $$
          BEGIN INSERT INTO published VALUES($2); RETURN jsonb_build_object('qrc_instance_id',$2,'etat','corrigee','note',$3); END $$;''')
        sql(f"SET session_replication_role=replica; INSERT INTO qrc_ia_config(id,actif) VALUES(true,true) ON CONFLICT DO NOTHING;"
            "INSERT INTO qrc_instances_v2(qrc_instance_id,attempt_id,apprenant_id,question_id,etat) SELECT x.q::uuid, x.a::uuid, "
            f"'{P}','q1','en_attente' FROM (VALUES {','.join(repr((q,a)) for q,a in PAIRES)}) x(q,a);")
        sql(MIG.read_text())
        r = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Exceptionnelle))
        if not r.wasSuccessful(): raise SystemExit(1)
    finally:
        subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','pg_ctl','-D',DATA,'-m','immediate','stop'], stdout=subprocess.DEVNULL)

PAIRES = [('4814bf89-d0e3-484f-9a94-143eaa113ec9','f129b372-951f-42a8-95b0-d6421ace164b'),('6f0e5f81-98c9-4ec7-aee6-97004edabb78','f129b372-951f-42a8-95b0-d6421ace164b'),
  ('972083aa-6b40-4523-baf0-e823c6afc3cb','0ffd1d8e-90ee-4a4b-b551-039850013ec5'),('8161a9b6-6fab-48c5-af94-c7cfce9e9965','7bb05127-90a6-4ec4-b95a-2e36a19f4dfc'),
  ('b64b7b6f-f739-4a67-9411-18d6f7df1166','5c329b15-7981-420d-9b2b-e9cfaf8c3d05'),('58229778-73a7-4db6-bb7d-6babdf103ae2','5c329b15-7981-420d-9b2b-e9cfaf8c3d05')]
if __name__ == '__main__': main()
