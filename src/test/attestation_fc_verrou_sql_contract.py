"""Contrat du verrou des attestations FC sur PostgreSQL JETABLE uniquement.
Fonctions recopiées en LECTURE SEULE depuis le catalogue réel ; aucune écriture hors base jetable.
Usage : python3 src/test/attestation_fc_verrou_sql_contract.py"""
import os, subprocess, tempfile, unittest, json, shutil

FNS = ['attestation_fc_controle', 'attestation_fc_autorisee', 'garde_attestation_fc_emargements']
def live(q): return subprocess.check_output(['psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', q], text=True).strip()
SIG = 'data:image/png;base64,' + 'A' * 400
AS = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
A = '11111111-1111-1111-1111-111111111111'

class Contrat(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        defs = [live(f"select pg_get_functiondef('public.{f}'::regproc)") for f in FNS]
        cls.dir = tempfile.mkdtemp(dir='/tmp'); os.chown(cls.dir, 1000, 1000); env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        cls.env = env; d = cls.dir
        subprocess.run(AS + ['initdb', '-D', d + '/db', '-U', 'postgres', '-A', 'trust'], check=True, capture_output=True, env=env)
        subprocess.run(AS + ['pg_ctl', '-D', d + '/db', '-o', f'-k {d} -p 55439 -c listen_addresses=', '-w', 'start'], check=True, capture_output=True, env=env)
        cls.sql("""CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
          CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
          CREATE TABLE apprenants (id uuid primary key, auth_user_id uuid);
          CREATE TABLE sessions (id uuid primary key default gen_random_uuid(), nom text, date_debut date, date_fin date);
          CREATE TABLE session_apprenants (apprenant_id uuid, session_id uuid, liste_attente boolean default false);
          CREATE TABLE emargements_fc (apprenant_id uuid, date_emargement date, demi_journee text, signature_data_url text, signed_at timestamptz, absent boolean default false, masque boolean default false);
          CREATE TABLE documents_inscription (id uuid primary key default gen_random_uuid(), apprenant_id uuid, type_document text, url text);
          CREATE TABLE user_roles (user_id uuid, role text);
          CREATE FUNCTION has_role(u uuid, r text) RETURNS boolean LANGUAGE sql AS $$ select exists(select 1 from user_roles where user_id=u and role=r) $$;""")
        for d_ in defs: cls.sql(d_)
        cls.sql("CREATE TRIGGER trg BEFORE INSERT OR UPDATE ON documents_inscription FOR EACH ROW EXECUTE FUNCTION garde_attestation_fc_emargements();")

    @classmethod
    def tearDownClass(cls):
        subprocess.run(AS + ['pg_ctl', '-D', cls.dir + '/db', '-m', 'immediate', 'stop'], capture_output=True, env=cls.env); shutil.rmtree(cls.dir, True)

    @classmethod
    def sql(cls, q, check=True):
        return subprocess.run(['psql', '-X', '-At', '-h', cls.dir, '-p', '55439', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', q], capture_output=True, text=True, check=check, env=cls.env)

    def setUp(self):
        self.sql(f"""TRUNCATE apprenants, sessions, session_apprenants, emargements_fc, documents_inscription, user_roles;
          INSERT INTO apprenants VALUES ('{A}', '22222222-2222-2222-2222-222222222222');
          INSERT INTO sessions (id, nom, date_debut, date_fin) VALUES ('33333333-3333-3333-3333-333333333333','Formation Continue VTC - 21 et 22 juillet 2026','2026-07-21','2026-07-22');
          INSERT INTO session_apprenants VALUES ('{A}','33333333-3333-3333-3333-333333333333',false);""")

    def signer(self, slots, **kw):
        for d, c in slots:
            sig = kw.get('sig', SIG); ab = kw.get('absent', False); m = kw.get('masque', False); st = kw.get('signed_at', "now()")
            self.sql(f"INSERT INTO emargements_fc VALUES ('{A}','{d}','{c}',{'NULL' if sig is None else repr(sig)},{st},{ab},{m})")
    def ctrl(self): return json.loads(self.sql(f"select attestation_fc_controle('{A}')").stdout)
    def depot(self): return self.sql(f"INSERT INTO documents_inscription (apprenant_id, type_document, url) VALUES ('{A}','attestation-fc','x')", check=False)

    QUATRE = [('2026-07-21','matin'),('2026-07-21','apres_midi'),('2026-07-22','matin'),('2026-07-22','apres_midi')]
    def test_0_a_4_signatures(self):
        for n in range(5):
            self.setUp(); self.signer(self.QUATRE[:n]); r = self.ctrl()
            self.assertEqual((r['signes'], r['requis'], len(r['manquants'])), (n, 4, 4 - n))
            self.assertEqual(r['autorise'], n == 4)
            self.assertEqual(self.depot().returncode == 0, n == 4, f'{n} signatures')
    def test_manquants_nommes(self):
        self.signer(self.QUATRE[:3]); self.assertEqual(self.ctrl()['manquants'], [{'date': '2026-07-22', 'creneau': 'apres_midi'}])
    def test_feuille_vierge_absence_masquee_non_synchronisee_refusees(self):
        cas = [dict(sig=None), dict(sig=''), dict(sig='data:image/png;base64,'), dict(sig='https://x/emargement.pdf'), dict(absent=True), dict(masque=True), dict(signed_at='NULL')]
        for k in cas:
            self.setUp(); self.signer(self.QUATRE[:3]); self.signer(self.QUATRE[3:], **k)
            self.assertFalse(self.ctrl()['autorise'], k); self.assertNotEqual(self.depot().returncode, 0, k)
    def test_sans_session_fc_refus(self):
        self.sql("TRUNCATE session_apprenants"); self.signer(self.QUATRE)
        self.assertFalse(self.ctrl()['autorise']); self.assertNotEqual(self.depot().returncode, 0)
    def test_liste_attente_refus(self):
        self.sql("UPDATE session_apprenants SET liste_attente=true"); self.signer(self.QUATRE); self.assertFalse(self.ctrl()['autorise'])
    def test_autres_documents_non_concernes(self):
        r = self.sql(f"INSERT INTO documents_inscription (apprenant_id, type_document, url) VALUES ('{A}','devis','x')", check=False)
        self.assertEqual(r.returncode, 0)
    def test_acces_direct_autre_compte_refuse(self):
        self.signer(self.QUATRE)
        r = json.loads(self.sql(f"set test.uid='99999999-9999-9999-9999-999999999999'; select attestation_fc_autorisee('{A}')").stdout.splitlines()[-1])
        self.assertEqual((r['autorise'], r['motif']), (False, 'Accès refusé'))
        r = json.loads(self.sql(f"set test.uid='22222222-2222-2222-2222-222222222222'; select attestation_fc_autorisee('{A}')").stdout.splitlines()[-1])
        self.assertTrue(r['autorise'])

if __name__ == '__main__': unittest.main(verbosity=2)
