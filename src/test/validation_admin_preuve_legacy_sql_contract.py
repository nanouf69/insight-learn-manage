"""Contrat 0304 sur PostgreSQL JETABLE uniquement (aucune connexion à la base réelle).

Vérifie la validation admin journalisée d'un module dont le relevé ancien utilise
d'anciens numéros de questions : seule une décision admin, appuyée sur des tentatives
d'origine soumises complètes de CE compte, fait passer le verdict serveur à terminé ;
la règle stricte reste inchangée pour tous les autres apprenants et modules.
Usage : python3 src/test/validation_admin_preuve_legacy_sql_contract.py
"""
import os, pathlib, subprocess, tempfile, unittest, json

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIG = ROOT / 'src/test/fixtures/validation_admin_preuve_legacy_0304.sql'
MIG2 = ROOT / 'src/test/fixtures/questions_affichees_0305.sql'
for k in [k for k in os.environ if k.startswith('PG')]:
    os.environ.pop(k)
TEMP = tempfile.mkdtemp(prefix='va-sql-', dir='/tmp'); os.chown(TEMP, 1000, 1000)
DATA = TEMP + '/data'; PORT = '55461'
AS_USER = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']

A = 'aaaaaaaa-0000-4000-8000-00000000000a'; U = 'bbbbbbbb-0000-4000-8000-00000000000b'
B = 'aaaaaaaa-0000-4000-8000-00000000002a'; UB = 'bbbbbbbb-0000-4000-8000-00000000002b'
ADMIN = 'cccccccc-0000-4000-8000-00000000000c'
MOTIF = "Les 7 quiz du module 4 sont soumis et confirmés par le serveur ; anciens numéros de questions"

def sql(q):
    try:
        return subprocess.check_output(['psql', '-X', '-q', '-h', TEMP, '-p', PORT, '-U', 'lovable', '-d', 't', '-At',
                                        '-v', 'ON_ERROR_STOP=1', '-c', q], text=True, stderr=subprocess.STDOUT).strip()
    except subprocess.CalledProcessError as e:
        raise AssertionError(e.output)

def err(q):
    try:
        sql(q); return ''
    except AssertionError as e:
        return str(e)

def as_user(uid, q):
    return f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; {q}"

def valider(uid, aid=A, mod=4, motif=MOTIF):
    m = motif.replace("'", "''")
    return as_user(uid, f"SELECT module_id FROM public.admin_valider_module_preuve_legacy('{aid}', {mod}, '{m}')")

def etat(aid=A, mod=4, uid=ADMIN):
    return sql(as_user(uid, f"SELECT coalesce(preuve_complete::text,'null')||'|'||status_effectif FROM public.etat_completion_modules('{aid}') WHERE module_id={mod}"))

STUBS = '''
CREATE SCHEMA auth;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles(user_id uuid, role app_role);
CREATE TABLE public.apprenants(id uuid PRIMARY KEY, auth_user_id uuid);
CREATE TABLE public.apprenant_module_completion(apprenant_id uuid, module_id int, status text, completed_at timestamptz, progress int, details jsonb);
CREATE TABLE public.reponses_apprenants(apprenant_id uuid, exercice_id text, reponses jsonb, status text, submitted_at timestamptz, UNIQUE(apprenant_id, exercice_id));
CREATE TABLE public.module_editor_state(module_id int, module_data jsonb);
CREATE TABLE public.quiz_lyon_cohortes(apprenant_id uuid);
CREATE FUNCTION public.historique_obligations_modules(_apprenant_id uuid) RETURNS TABLE(module_id integer, exercice_id text, question_id text, ajout timestamptz, supp timestamptz)
  LANGUAGE sql STABLE AS $$ SELECT NULL::int, NULL::text, NULL::text, NULL::timestamptz, NULL::timestamptz WHERE false $$;
CREATE FUNCTION public.obligations_non_datees_anterieures(_apprenant_id uuid) RETURNS TABLE(module_id integer, exercice_id text, question_id text)
  LANGUAGE sql STABLE AS $$ SELECT NULL::int, NULL::text, NULL::text WHERE false $$;
CREATE FUNCTION public.reponse_enregistree(v jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $f$
DECLARE e jsonb;
BEGIN
  CASE jsonb_typeof(v)
    WHEN 'string' THEN RETURN (v #>> '{}') ~ '\\S';
    WHEN 'number', 'boolean' THEN RETURN true;
    WHEN 'array' THEN FOR e IN SELECT x FROM jsonb_array_elements(v) x LOOP IF public.reponse_enregistree(e) THEN RETURN true; END IF; END LOOP; RETURN false;
    WHEN 'object' THEN FOR e IN SELECT x.value FROM jsonb_each(v) x LOOP IF public.reponse_enregistree(e) THEN RETURN true; END IF; END LOOP; RETURN false;
    ELSE RETURN false;
  END CASE;
END $f$;
ALTER TABLE public.reponses_apprenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprenant_module_completion ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
'''
POL = '''
CREATE POLICY r_sel ON public.reponses_apprenants FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.est_proprietaire_apprenant(apprenant_id));
CREATE POLICY c_sel ON public.apprenant_module_completion FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.est_proprietaire_apprenant(apprenant_id));
'''
EXOS = ['100', '101', '102', '103', '104', '105', '106']

def legacy_details():
    # Relevé ancien : numéros 1, 2, 3… qui ne correspondent plus aux identifiants permanents.
    return json.dumps([{"exerciceId": ex, "questionId": str(i), "reponseEleve": None, "reponseCorrecte": ["A"]}
                       for ex in EXOS for i in (1, 2, 3)])

def editor(extra=None):
    ex = [{"id": int(e), "actif": True, "questions": [{"id": int(e) * 1000 + 1}]} for e in EXOS]
    ex += extra or []
    return json.dumps({"exercices": ex})

def soumettre(aid, ex, rep=None, status='submitted', exo_id=None):
    rep = rep if rep is not None else {f"{ex}-{ex}001": "A", f"{ex}-{ex}002": ["B"]}
    sub = 'clock_timestamp()' if status == 'submitted' else 'NULL'
    sql(f"INSERT INTO reponses_apprenants VALUES ('{aid}', '{exo_id or f'module_4_exo_{ex}'}', '{json.dumps(rep)}', '{status}', {sub})")

class Contrat(unittest.TestCase):
    def setUp(self):
        sql("ALTER TABLE module_completion_validations_admin DISABLE TRIGGER USER; DELETE FROM module_completion_validations_admin;"
            " ALTER TABLE module_completion_validations_admin ENABLE TRIGGER USER;"
            " ALTER TABLE quiz_questions_affichees DISABLE TRIGGER USER; DELETE FROM quiz_questions_affichees; ALTER TABLE quiz_questions_affichees ENABLE TRIGGER USER;"
            " DELETE FROM reponses_apprenants; DELETE FROM apprenant_module_completion; DELETE FROM module_editor_state;")
        sql(f"INSERT INTO module_editor_state VALUES (4, '{editor()}')")
        for aid in (A, B):
            sql(f"INSERT INTO apprenant_module_completion VALUES ('{aid}', 4, 'completed', '2026-07-10', 100, '{legacy_details()}')")

    def tout_soumettre(self, aid=A, sauf=()):
        for ex in EXOS:
            if ex not in sauf:
                soumettre(aid, ex)

    def test_01_cas_arga_bloque_puis_valide_par_admin(self):
        self.tout_soumettre()
        self.assertEqual(etat(), 'false|in_progress')
        self.assertEqual(sql(valider(ADMIN)), '4')
        self.assertEqual(etat(), 'true|completed')
        self.assertEqual(etat(uid=U), 'true|completed')  # l'apprenant lit le même verdict (RLS)
        preuves = json.loads(sql("SELECT preuves FROM module_completion_validations_admin"))
        self.assertEqual([p['exercice_id'] for p in preuves], [f'module_4_exo_{e}' for e in EXOS])
        self.assertEqual(sql("SELECT auteur_uid||'|'||auteur_role FROM module_completion_validations_admin"), f'{ADMIN}|admin')

    def test_02_aucune_reponse_ni_releve_modifie(self):
        self.tout_soumettre()
        avant = sql("SELECT md5(string_agg(t::text, ',' ORDER BY t::text)) FROM (SELECT * FROM reponses_apprenants UNION ALL SELECT apprenant_id, module_id::text, details, status, completed_at FROM apprenant_module_completion) t")
        sql(valider(ADMIN))
        apres = sql("SELECT md5(string_agg(t::text, ',' ORDER BY t::text)) FROM (SELECT * FROM reponses_apprenants UNION ALL SELECT apprenant_id, module_id::text, details, status, completed_at FROM apprenant_module_completion) t")
        self.assertEqual(avant, apres)

    def test_03_apprenant_ou_anonyme_refuse(self):
        self.tout_soumettre()
        self.assertIn('réservée aux administrateurs', err(valider(U)))
        self.assertIn('permission denied', err(f"SET ROLE anon; SELECT public.admin_valider_module_preuve_legacy('{A}', 4, '{MOTIF}')"))
        self.assertEqual(etat(), 'false|in_progress')

    def test_04_quiz_manquant_refuse(self):
        self.tout_soumettre(sauf=('103',))
        self.assertIn('103', err(valider(ADMIN)))
        self.assertEqual(etat(), 'false|in_progress')

    def test_05_remise_avec_reponse_vide_refusee(self):
        self.tout_soumettre(sauf=('102',))
        soumettre(A, '102', {"102-102001": "A", "102-102002": ""})
        self.assertIn('102', err(valider(ADMIN)))

    def test_06_revision_ou_brouillon_ne_comptent_pas(self):
        self.tout_soumettre(sauf=('103', '104'))
        soumettre(A, '103', status='in_progress', exo_id='module_4_revision_exo_103')
        soumettre(A, '104', status='in_progress')
        e = err(valider(ADMIN))
        self.assertIn('103', e); self.assertIn('104', e)

    def test_07_remise_d_un_autre_compte_ne_compte_pas(self):
        self.tout_soumettre(sauf=('106',))
        soumettre(B, '106')
        self.assertIn('106', err(valider(ADMIN)))

    def test_08_module_sans_releve_termine_refuse(self):
        self.tout_soumettre()
        sql(f"UPDATE apprenant_module_completion SET status='in_progress' WHERE apprenant_id='{A}'")
        self.assertIn('Aucun relevé', err(valider(ADMIN)))

    def test_09_motif_obligatoire_et_eb_exclus(self):
        self.tout_soumettre()
        self.assertIn('Motif', err(valider(ADMIN, motif='trop court')))
        self.assertIn('Examens blancs', err(valider(ADMIN, mod=35)))

    def test_10_preuve_deja_complete_refusee(self):
        self.tout_soumettre()
        sql(f"UPDATE apprenant_module_completion SET details='[]' WHERE apprenant_id='{A}'")
        self.assertIn('Aucun relevé', err(valider(ADMIN)))
        sql(f"UPDATE apprenant_module_completion SET details='{json.dumps([{'exerciceId':'103','questionId':'103001','reponseEleve':'A'}])}' WHERE apprenant_id='{A}'")
        self.assertIn('pas de preuve manquante', err(valider(ADMIN)))

    def test_11_ajout_seul_et_doublon_refuse(self):
        self.tout_soumettre(); sql(valider(ADMIN))
        self.assertIn('ajout seul', err("UPDATE module_completion_validations_admin SET motif='x'"))
        self.assertIn('ajout seul', err("DELETE FROM module_completion_validations_admin"))
        self.assertIn('pas de preuve manquante', err(valider(ADMIN)))  # déjà reconnu : aucun second enregistrement
        self.assertEqual(sql("SELECT count(*) FROM module_completion_validations_admin"), '1')
        self.assertIn('permission denied', err(as_user(ADMIN, f"INSERT INTO module_completion_validations_admin(apprenant_id,module_id,motif,preuves,auteur_role) VALUES ('{B}',4,'x','[]','admin')")))

    def test_12_tentative_modifiee_apres_validation_annule_l_exception(self):
        self.tout_soumettre(); sql(valider(ADMIN))
        sql(f"UPDATE reponses_apprenants SET reponses = reponses || '{{\"103-9\":\"Z\"}}' WHERE apprenant_id='{A}' AND exercice_id='module_4_exo_103'")
        self.assertEqual(etat(), 'false|in_progress')

    def test_13_autres_apprenants_et_modules_inchanges(self):
        self.tout_soumettre(); self.tout_soumettre(aid=B)
        sql(f"INSERT INTO apprenant_module_completion VALUES ('{A}', 9, 'completed', '2026-07-10', 100, '{legacy_details()}')")
        sql(valider(ADMIN))
        self.assertEqual(etat(aid=B), 'false|in_progress')
        self.assertEqual(etat(mod=9), 'false|in_progress')
        self.assertEqual(sql(as_user(UB, "SELECT count(*) FROM module_completion_validations_admin")), '0')

    def test_14_quiz_actif_hors_releve_requis_quiz_desactive_non_requis(self):
        sql(f"UPDATE module_editor_state SET module_data='{editor([{'id': 107, 'actif': True, 'questions': [{'id': 1}]}, {'id': 108, 'actif': False, 'questions': [{'id': 1}]}])}'")
        self.tout_soumettre()
        e = err(valider(ADMIN))
        self.assertIn('107', e); self.assertNotIn('108', e)
        soumettre(A, '107')
        self.assertEqual(sql(valider(ADMIN)), '4')

    def test_15_service_role_autorise(self):
        self.tout_soumettre()
        self.assertEqual(sql(f"SET ROLE service_role; SELECT auteur_role FROM public.admin_valider_module_preuve_legacy('{A}', 4, '{MOTIF}')"), 'service_role')

def afficher(uid, ex, ids, aid=A):
    arr = "ARRAY[" + ",".join(f"'{i}'" for i in ids) + "]::text[]" if ids else "ARRAY[]::text[]"
    return as_user(uid, f"SELECT array_to_string(public.enregistrer_questions_affichees('{aid}', '{ex}', {arr}), ',')")

class QuestionsAffichees(Contrat):
    """0305 : couverture exacte contre la liste serveur enregistrée avant la remise."""
    def test_01_couverture_exacte_suffit_sans_validation_admin(self):
        for ex in EXOS:
            self.assertEqual(sql(afficher(U, f'module_4_exo_{ex}', [f'{ex}001', f'{ex}002'])), f'{ex}001,{ex}002')
        self.tout_soumettre()
        self.assertEqual(etat(), 'true|completed')
        self.assertEqual(sql("SELECT count(*) FROM module_completion_validations_admin"), '0')

    def test_02_question_affichee_sans_reponse_bloque(self):
        for ex in EXOS:
            sql(afficher(U, f'module_4_exo_{ex}', [f'{ex}001', f'{ex}002', f'{ex}003']))
        self.tout_soumettre()
        self.assertEqual(etat(), 'false|in_progress')

    def test_03_liste_apres_remise_refusee_et_sans_effet(self):
        self.tout_soumettre()
        self.assertIn('déjà remise', err(afficher(U, 'module_4_exo_100', ['100001'])))
        self.assertEqual(etat(), 'false|in_progress')

    def test_04_liste_posterieure_a_la_remise_ignoree(self):
        for ex in EXOS:
            sql(afficher(U, f'module_4_exo_{ex}', [f'{ex}001', f'{ex}002']))
        self.tout_soumettre()
        sql("ALTER TABLE quiz_questions_affichees DISABLE TRIGGER USER; UPDATE quiz_questions_affichees SET created_at = now(); ALTER TABLE quiz_questions_affichees ENABLE TRIGGER USER;")
        self.assertEqual(etat(), 'false|in_progress')

    def test_05_revision_doublon_vide_autre_compte_refuses(self):
        self.assertIn('origine', err(afficher(U, 'module_4_revision_exo_100', ['100001'])))
        self.assertIn('invalide', err(afficher(U, 'module_4_exo_100', ['100001', '100001'])))
        self.assertIn('invalide', err(afficher(U, 'module_4_exo_100', [])))
        self.assertIn('non autorisé', err(afficher(UB, 'module_4_exo_100', ['100001'])))

    def test_06_immuable_premiere_liste_conservee(self):
        sql(afficher(U, 'module_4_exo_100', ['100001']))
        self.assertEqual(sql(afficher(U, 'module_4_exo_100', ['100001', '100009'])), '100001')
        self.assertIn('ajout seul', err("UPDATE quiz_questions_affichees SET question_ids='{x}'"))
        self.assertIn('ajout seul', err("DELETE FROM quiz_questions_affichees"))
        self.assertIn('permission denied', err(as_user(U, f"INSERT INTO quiz_questions_affichees(apprenant_id,exercice_id,question_ids,empreinte) VALUES ('{A}','module_4_exo_101','{{x}}','x')")))

    def test_07_liste_d_un_autre_eleve_ne_prouve_rien(self):
        for ex in EXOS:
            sql(afficher(UB, f'module_4_exo_{ex}', [f'{ex}001', f'{ex}002'], aid=B))
        self.tout_soumettre()
        self.assertEqual(etat(), 'false|in_progress')
        self.assertEqual(etat(aid=B), 'false|in_progress')  # B n'a rien remis

def main():
    subprocess.run(AS_USER + ['initdb', '-D', DATA, '-A', 'trust', '--no-locale', '-U', 'lovable'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(AS_USER + ['pg_ctl', '-D', DATA, '-l', TEMP + '/pg.log', '-o', f'-k {TEMP} -p {PORT} -h ""', '-w', 'start'], check=True, stdout=subprocess.DEVNULL)
    try:
        subprocess.check_call(['psql', '-X', '-q', '-h', TEMP, '-p', PORT, '-U', 'lovable', '-d', 'postgres', '-c', 'CREATE DATABASE t'])
        sql(STUBS)
        for f in ('fn_has_role.sql', 'fn_est_proprietaire_apprenant.sql'):
            sql((ROOT / 'src/test/fixtures' / f).read_text())
        sql(POL)
        sql(MIG.read_text())
        sql(MIG2.read_text())
        sql(f"INSERT INTO apprenants VALUES ('{A}','{U}'),('{B}','{UB}'); INSERT INTO user_roles VALUES ('{ADMIN}','admin');")
        r = unittest.main(exit=False, verbosity=2).result
        return 0 if r.wasSuccessful() else 1
    finally:
        subprocess.run(AS_USER + ['pg_ctl', '-D', DATA, '-m', 'immediate', 'stop'], stdout=subprocess.DEVNULL)

if __name__ == '__main__':
    raise SystemExit(main())
