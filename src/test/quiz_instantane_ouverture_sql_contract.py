"""Contrat du CANDIDAT docs/sql-revue/2026-11-27-quiz-instantane-ouverture.sql sur PostgreSQL JETABLE.

Aucune connexion à la base réelle. Vérifie : instantané dérivé par le serveur à l'ouverture
(aucune liste reçue du navigateur), immuable, lié au compte et à la tentative d'origine ;
remise refusée (erreur claire, rien d'écrit) si instantané absent, réponses partielles ou
question hors instantané ; tentatives antérieures conservées sous la règle précédente.
Usage : python3 src/test/quiz_instantane_ouverture_sql_contract.py
"""
import json, pathlib, subprocess, unittest
import validation_admin_preuve_legacy_sql_contract as base
from validation_admin_preuve_legacy_sql_contract import sql, err, as_user, etat, A, U, B, UB, ADMIN, EXOS

CAND = base.ROOT / 'docs/sql-revue/2026-11-27-quiz-instantane-ouverture.sql'
EXTRA = '''
ALTER TABLE public.reponses_apprenants ADD COLUMN user_id uuid, ADD COLUMN exercice_type text, ADD COLUMN score numeric,
  ADD COLUMN bonnes_reponses int, ADD COLUMN total_questions int, ADD COLUMN completed boolean, ADD COLUMN updated_at timestamptz,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp();
ALTER TABLE public.module_editor_state ADD COLUMN updated_at timestamptz DEFAULT now(), ADD COLUMN source_fingerprint text;
'''

def ouvrir(uid, ex, aid=A):
    return as_user(uid, f"SELECT array_to_string(question_ids, ',') FROM public.ouvrir_quiz_instantane('{aid}', '{ex}')")

def remettre(uid, ex, rep, aid=A):
    return as_user(uid, f"SELECT status FROM public.submit_quiz_attempt('{aid}', '{ex}', 'quiz', '{json.dumps(rep)}'::jsonb)")

def rep_complete(ex):
    return {f"{ex}-{ex}001": "A"}

def activer(exos=EXOS, mod=4):
    for ex in exos:
        sql(f"INSERT INTO quiz_instantane_exercices(module_id, exercice_id, actif, motif) VALUES ({mod}, {ex}, true, 'test')")

class Instantane(unittest.TestCase):
    def setUp(self):
        base.Contrat.setUp(self)
        sql("DELETE FROM quiz_instantane_exercices; ALTER TABLE quiz_instantanes_ouverture DISABLE TRIGGER USER;"
            " DELETE FROM quiz_instantanes_ouverture; ALTER TABLE quiz_instantanes_ouverture ENABLE TRIGGER USER;"
            " DROP TRIGGER IF EXISTS panne ON quiz_instantanes_ouverture;")

    def nb_remises(self, aid=A):
        return sql(f"SELECT count(*) FROM reponses_apprenants WHERE apprenant_id='{aid}'")

    def test_01_parcours_normal_complet(self):
        activer()
        for ex in EXOS:
            self.assertEqual(sql(ouvrir(U, f'module_4_exo_{ex}')), f'{ex}001')
            self.assertEqual(sql(remettre(U, f'module_4_exo_{ex}', rep_complete(ex))), 'submitted')
        self.assertEqual(etat(), 'true|completed')
        self.assertEqual(sql("SELECT count(*) FROM module_completion_validations_admin"), '0')

    def test_02_instantane_absent_refuse_sans_ecriture(self):
        activer()
        self.assertIn('Instantané serveur absent', err(remettre(U, 'module_4_exo_100', rep_complete('100'))))
        self.assertEqual(self.nb_remises(), '0')

    def test_03_aucune_liste_navigateur_et_question_ajoutee_refusee(self):
        activer()
        self.assertIn('function', err(as_user(U, f"SELECT public.ouvrir_quiz_instantane('{A}', 'module_4_exo_100', ARRAY['x'])")))
        sql(ouvrir(U, 'module_4_exo_100'))
        r = {**rep_complete('100'), '100-999': 'B'}
        self.assertIn('absente de l', err(remettre(U, 'module_4_exo_100', r)))
        self.assertEqual(self.nb_remises(), '0')

    def test_04_doublons_serveur_refuses(self):
        activer(['100'])
        ed = json.dumps({"exercices": [{"id": 100, "questions": [{"id": 1}, {"id": 1}]}]})
        sql(f"UPDATE module_editor_state SET module_data='{ed}'")
        self.assertIn('en double', err(ouvrir(U, 'module_4_exo_100')))
        self.assertEqual(sql("SELECT count(*) FROM quiz_instantanes_ouverture"), '0')

    def test_05_revision_posterieure_ne_change_pas_l_instantane(self):
        activer(['100'])
        sql(ouvrir(U, 'module_4_exo_100'))
        ed = json.dumps({"exercices": [{"id": 100, "questions": [{"id": 100001}, {"id": 100002}]}]})
        sql(f"UPDATE module_editor_state SET module_data='{ed}', updated_at=now()+interval '1 min'")
        self.assertEqual(sql(ouvrir(U, 'module_4_exo_100')), '100001')
        self.assertIn('absente de l', err(remettre(U, 'module_4_exo_100', {"100-100001": "A", "100-100002": "B"})))
        self.assertEqual(sql(remettre(U, 'module_4_exo_100', {"100-100001": "A"})), 'submitted')

    def test_06_mauvais_compte(self):
        activer()
        self.assertIn('non autorisé', err(ouvrir(UB, 'module_4_exo_100')))
        for ex in EXOS:
            sql(ouvrir(UB, f'module_4_exo_{ex}', aid=B))
        self.assertIn('Instantané serveur absent', err(remettre(U, 'module_4_exo_100', rep_complete('100'))))
        self.assertIn('Not allowed', err(remettre(UB, 'module_4_exo_100', rep_complete('100'))))

    def test_07_reponses_partielles_refusees(self):
        activer(['100'])
        ed = json.dumps({"exercices": [{"id": 100, "questions": [{"id": 100001}, {"id": 100002}]}]})
        sql(f"UPDATE module_editor_state SET module_data='{ed}'")
        sql(ouvrir(U, 'module_4_exo_100'))
        self.assertIn('incomplètes', err(remettre(U, 'module_4_exo_100', {"100-100001": "A", "100-100002": ""})))
        self.assertEqual(self.nb_remises(), '0')

    def test_08_erreurs_lecture_et_ecriture_serveur(self):
        activer(['100', '101'])
        sql("UPDATE module_editor_state SET module_id=99")
        self.assertIn('illisible', err(ouvrir(U, 'module_4_exo_100')))
        sql("UPDATE module_editor_state SET module_id=4")
        sql("CREATE FUNCTION panne() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'panne écriture'; END $$;"
            " CREATE TRIGGER panne BEFORE INSERT ON quiz_instantanes_ouverture FOR EACH ROW EXECUTE FUNCTION panne();")
        try:
            self.assertIn('panne', err(ouvrir(U, 'module_4_exo_101')))
        finally:
            sql("DROP TRIGGER panne ON quiz_instantanes_ouverture; DROP FUNCTION panne();")
        self.assertIn('Instantané serveur absent', err(remettre(U, 'module_4_exo_101', rep_complete('101'))))
        self.assertEqual(sql("SELECT count(*) FROM quiz_instantanes_ouverture")+'|'+self.nb_remises(), '0|0')

    def test_09_quiz_non_active_regle_precedente(self):
        self.assertIn('non disponible', err(ouvrir(U, 'module_4_exo_100')))
        self.assertEqual(sql(remettre(U, 'module_4_exo_100', rep_complete('100'))), 'submitted')

    def test_10_tentative_commencee_avant_activation(self):
        sql(f"INSERT INTO reponses_apprenants(apprenant_id, exercice_id, reponses, status, created_at) VALUES ('{A}','module_4_exo_100','{{}}','draft', now()-interval '1 day')")
        activer(['100'])
        self.assertIn('antérieure', err(ouvrir(U, 'module_4_exo_100')))
        self.assertEqual(sql(remettre(U, 'module_4_exo_100', {"100-100001": "A"})), 'submitted')
        self.assertEqual(etat(), 'false|in_progress')  # aucune preuve fabriquée

    def test_11_immuable_et_tentative_d_origine_seule(self):
        activer(['100'])
        sql(ouvrir(U, 'module_4_exo_100'))
        self.assertIn('ajout seul', err("UPDATE quiz_instantanes_ouverture SET question_ids='{x}', question_versions='{x}'"))
        self.assertIn('ajout seul', err("DELETE FROM quiz_instantanes_ouverture"))
        self.assertIn('permission denied', err(as_user(U, f"INSERT INTO quiz_instantanes_ouverture(apprenant_id,exercice_id,module_id,question_ids,question_versions,empreinte) VALUES ('{A}','module_4_exo_101',4,'{{x}}','{{x}}','x')")))
        self.assertIn('origine', err(ouvrir(U, 'module_4_revision_exo_100')))

    def test_12_quiz_desactive_refuse(self):
        activer(['100'])
        ed = json.dumps({"exercices": [{"id": 100, "actif": False, "questions": [{"id": 100001}]}]})
        sql(f"UPDATE module_editor_state SET module_data='{ed}'")
        self.assertIn('désactivé', err(ouvrir(U, 'module_4_exo_100')))

def main():
    subprocess.run(base.AS_USER + ['initdb', '-D', base.DATA, '-A', 'trust', '--no-locale', '-U', 'lovable'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(base.AS_USER + ['pg_ctl', '-D', base.DATA, '-l', base.TEMP + '/pg.log', '-o', f'-k {base.TEMP} -p {base.PORT} -h ""', '-w', 'start'], check=True, stdout=subprocess.DEVNULL)
    try:
        subprocess.check_call(['psql', '-X', '-q', '-h', base.TEMP, '-p', base.PORT, '-U', 'lovable', '-d', 'postgres', '-c', 'CREATE DATABASE t'])
        sql(base.STUBS); sql(EXTRA)
        for f in ('fn_has_role.sql', 'fn_est_proprietaire_apprenant.sql'):
            sql((base.ROOT / 'src/test/fixtures' / f).read_text())
        sql(base.POL)
        for m in (base.MIG, base.MIG2, base.MIG3, CAND):
            sql(m.read_text())
        sql(f"INSERT INTO apprenants VALUES ('{A}','{U}'),('{B}','{UB}'); INSERT INTO user_roles VALUES ('{ADMIN}','admin');")
        suite = unittest.TestLoader().loadTestsFromTestCase(Instantane)
        r = unittest.TextTestRunner(verbosity=2).run(suite)
        return 0 if r.wasSuccessful() else 1
    finally:
        subprocess.run(base.AS_USER + ['pg_ctl', '-D', base.DATA, '-m', 'immediate', 'stop'], stdout=subprocess.DEVNULL)

if __name__ == '__main__':
    raise SystemExit(main())
