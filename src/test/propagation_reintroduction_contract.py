"""Réintroduction de questions supprimées par la propagation des exercices partagés — PostgreSQL JETABLE.

Cas réel (lecture seule, question_change_log) : exercice 62 partagé VTC (module 2) / TAXI (module 10).
  05/11 14:19 TAXI supprime Q40 puis Q41 -> la propagation (écriture automatique) ne peut rien retirer
              côté VTC (garde_retrait_massif_questions) : Q40/Q41 restent en VTC.
  05/11 19:30 VTC supprime Q49 -> la propagation remplace l'exercice TAXI par la version VTC :
              Q40/Q41 sont « ajoutées » de nouveau en TAXI.
Charge les définitions de PRODUCTION figées le 07/11 (fixtures *_live_20261107.sql), reproduit le défaut,
applique le brouillon docs/sql-revue/2026-11-07-propagation-sans-reintroduction.sql et vérifie :
  - Q40/Q41 ne reviennent plus en TAXI ; - une NOUVELLE question VTC se propage toujours ;
  - une modification de texte se propage toujours ; - aucune question n'est retirée par la propagation.
Questions fictives uniquement. Usage : python3 src/test/propagation_reintroduction_contract.py
"""
import json, os, pathlib, subprocess, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / 'src/test/fixtures'
LIVE = (FIX / 'propagate_shared_exercices_live_20261107.sql').read_text()
GARDE = (FIX / 'garde_retrait_massif_questions_live_20261107.sql').read_text()
HELP = (FIX / 'shared_exercice_helpers_live_20261107.sql').read_text()
PATCH = (ROOT / 'docs/sql-revue/2026-11-07-propagation-sans-reintroduction.sql').read_text()

SCHEMA = """
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
CREATE TABLE public.module_editor_state (module_id int PRIMARY KEY, module_data jsonb, updated_at timestamptz DEFAULT now());
"""
TRIGGERS = """
CREATE TRIGGER trg_aaa_garde_retrait_massif BEFORE UPDATE OF module_data ON public.module_editor_state FOR EACH ROW EXECUTE FUNCTION public.garde_retrait_massif_questions();
CREATE TRIGGER trg_propagate_shared_exercices AFTER UPDATE OF module_data ON public.module_editor_state FOR EACH ROW EXECUTE FUNCTION public.propagate_shared_exercices();
"""


def q(i, txt=None):
    return {"id": i, "enonce": txt or f"Question fictive {i}", "choix": [{"lettre": "A", "texte": "a", "correct": True}]}


def exo(ids, txt=None):
    return {"id": 62, "matiereKey": "t3p_fictif", "titre": "Exercice fictif", "questions": [q(i, (txt or {}).get(i)) for i in ids]}


BASE = [40, 41, 47, 49, 51]


class Pg:
    def __init__(self, port):
        self.port = port
        self.dir = tempfile.mkdtemp(prefix='pg-prop-', dir='/tmp')
        self.user = [] if os.geteuid() else ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
        if self.user: os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ['initdb', '-D', self.dir + '/d', '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8'], check=True, capture_output=True)
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-o', f"-k {self.dir} -p {port} -h ''", '-w', 'start', '-l', self.dir + '/log'], check=True, capture_output=True)

    def sql(self, s):
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        r = subprocess.run(['psql', '-X', '-At', '-h', self.dir, '-p', str(self.port), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], input=s, capture_output=True, text=True, env=env)
        assert r.returncode == 0, r.stderr
        return r.stdout.strip()

    def stop(self):
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-m', 'immediate', 'stop'], capture_output=True)


def scenario(pg, fonction):
    pg.sql(SCHEMA + HELP + GARDE + fonction + TRIGGERS)
    d = lambda ids, txt=None: json.dumps({"exercices": [exo(ids, txt)]}).replace("'", "''")
    pg.sql(f"INSERT INTO public.module_editor_state VALUES (2, '{d(BASE)}'), (10, '{d(BASE)}');")
    save = lambda m, ids, txt=None: pg.sql(f"BEGIN; SET LOCAL request.jwt.claim.role='authenticated'; UPDATE public.module_editor_state SET module_data='{d(ids, txt)}' WHERE module_id={m}; COMMIT;")
    ids = lambda m: json.loads(pg.sql(f"SELECT json_agg(x->'id') FROM public.module_editor_state, jsonb_array_elements(module_data->'exercices'->0->'questions') x WHERE module_id={m}"))
    txt = lambda m, i: pg.sql(f"SELECT x->>'enonce' FROM public.module_editor_state, jsonb_array_elements(module_data->'exercices'->0->'questions') x WHERE module_id={m} AND x->>'id'='{i}'")
    # 14:19 TAXI supprime Q40 puis Q41 (2 enregistrements manuels).
    save(10, [41, 47, 49, 51])
    save(10, [47, 49, 51])
    apres_taxi = (ids(2), ids(10))
    # 19:30 VTC supprime Q49 et modifie le texte de Q51.
    save(2, [40, 41, 47, 51], {51: "Texte corrigé fictif"})
    apres_vtc = (ids(2), ids(10), txt(10, 51))
    # Plus tard : VTC ajoute une nouvelle question Q60.
    save(2, [40, 41, 47, 51, 60], {51: "Texte corrigé fictif"})
    return apres_taxi, apres_vtc, ids(10)


class Reintroduction(unittest.TestCase):
    def test_production_reintroduit(self):
        pg = Pg(55465)
        try:
            apres_taxi, apres_vtc, final = scenario(pg, LIVE)
        finally:
            pg.stop()
        self.assertEqual(apres_taxi, ([40, 41, 47, 49, 51], [47, 49, 51]))
        # Défaut reproduit : Q40/Q41 reviennent en TAXI.
        self.assertIn(40, apres_vtc[1]); self.assertIn(41, apres_vtc[1])

    def test_brouillon_ne_reintroduit_plus(self):
        pg = Pg(55466)
        try:
            apres_taxi, apres_vtc, final = scenario(pg, PATCH)
        finally:
            pg.stop()
        self.assertEqual(apres_taxi, ([40, 41, 47, 49, 51], [47, 49, 51]))
        vtc, taxi, texte51 = apres_vtc
        self.assertNotIn(40, taxi); self.assertNotIn(41, taxi)
        self.assertEqual(texte51, "Texte corrigé fictif")  # modification de texte toujours propagée
        self.assertIn(49, taxi)  # aucune suppression par propagation (garde inchangée)
        self.assertIn(60, final)  # nouvelle question VTC toujours propagée
        self.assertNotIn(40, final); self.assertNotIn(41, final)


if __name__ == '__main__':
    unittest.main()
