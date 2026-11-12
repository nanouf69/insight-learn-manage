"""Auto-correction AMONT des QRC identiques au corrigé — PostgreSQL JETABLE uniquement.

Charge les définitions de PRODUCTION du 12/11/2026 (fixtures/qrc_auto_exact_live_20261112.sql : note, recalcul,
garde barème, finalité, journal), applique docs/sql-revue/2026-11-12-qrc-auto-exact-match.sql, puis simule des
remises réelles (rôle élève via authenticator). Aucune connexion à la base réelle.
Usage : python3 src/test/qrc_auto_exact_match_contract.py
"""
import json, os, pathlib, subprocess, tempfile, unittest, uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
LIVE = ROOT / 'src/test/fixtures/qrc_auto_exact_live_20261112.sql'
MIG = ROOT / 'docs/sql-revue/2026-11-12-qrc-auto-exact-match.sql'
ELEVE_UID, APP = str(uuid.uuid4()), str(uuid.uuid4())
CORRIGE = "Une personne morale est généralement constituée par un regroupement de personnes"

SCHEMA = f"""
CREATE EXTENSION unaccent;
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE ROLE authenticator NOLOGIN NOINHERIT; GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE TABLE public.apprenants (id uuid PRIMARY KEY, auth_user_id uuid);
CREATE TABLE public.exam_attempts_v2 (attempt_id uuid PRIMARY KEY, apprenant_id uuid, exam_id text, snapshot jsonb, etat text DEFAULT 'en_cours', finished_at timestamptz);
CREATE TABLE public.answer_state (attempt_id uuid, question_id text, valeur text);
CREATE TABLE public.qrc_bareme_restaure (qrc_instance_id uuid PRIMARY KEY, bareme numeric);
CREATE TABLE public.qrc_instances_v2 (qrc_instance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid, question_id text, apprenant_id uuid, reponse jsonb, etat text DEFAULT 'en_attente', note numeric, corrige_par uuid, corrige_email text, corrige_at timestamptz, UNIQUE(attempt_id, question_id));
CREATE TABLE public.qrc_correction_events (correction_event_id bigserial, qrc_instance_id uuid, attempt_id uuid, question_id text, apprenant_id uuid, etat_precedent text, etat_nouveau text, note_precedente numeric, note_nouvelle numeric, commentaire text, corrige_par uuid, corrige_email text, operation_id uuid, created_at timestamptz DEFAULT now());
CREATE TABLE public.core_exam_results (result_id uuid DEFAULT gen_random_uuid(), attempt_id uuid UNIQUE, apprenant_id uuid, result_revision int, status text, score numeric, total numeric, qrc_restantes int, published_at timestamptz, updated_at timestamptz);
CREATE TABLE public.core_operations (operation_id uuid PRIMARY KEY, operation_type text, apprenant_id uuid, attempt_id uuid, auteur uuid, cible jsonb, resultat jsonb);
CREATE TABLE public.audit_journal (operation text, cible_type text, cible_id text, attempt_id uuid, apprenant_id uuid, auteur uuid, auteur_email text, avant jsonb, apres jsonb, origine text);
CREATE TABLE public.alertes_systeme (type text, titre text, message text, details text, lu boolean);
CREATE TABLE public.ia_file (attempt_id uuid, qrc_en_attente int);
INSERT INTO public.apprenants VALUES ('{APP}','{ELEVE_UID}');
GRANT SELECT, UPDATE ON public.exam_attempts_v2 TO authenticated;
"""
TRIGGERS = """
CREATE TRIGGER trg_qrc_v2_bareme BEFORE UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION public.qrc_v2_garde_bareme();
CREATE TRIGGER trg_qrc_v2_finality BEFORE UPDATE OR DELETE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION public.enforce_qrc_v2_finality();
CREATE TRIGGER trg_qrc_v2_correction_journal AFTER UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION public.core_log_qrc_correction();
-- Témoin de l'ordre : l'IA (trg_qrc_ia_*) doit voir les QRC déjà auto-corrigées.
CREATE FUNCTION public.temoin_ia() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.ia_file SELECT NEW.attempt_id, count(*) FROM public.qrc_instances_v2 WHERE attempt_id = NEW.attempt_id AND etat = 'en_attente'; RETURN NULL; END $$;
CREATE TRIGGER trg_qrc_ia_enfiler_passage AFTER UPDATE OF etat ON public.exam_attempts_v2 FOR EACH ROW EXECUTE FUNCTION public.temoin_ia();
"""

class Pg:
    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix='pg-autoexact-', dir='/tmp')
        self.user = [] if os.geteuid() else ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
        if self.user: os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ['initdb', '-D', self.dir + '/d', '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8'], check=True, capture_output=True)
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-o', f"-k {self.dir} -p 55471 -h ''", '-w', 'start', '-l', self.dir + '/log'], check=True, capture_output=True)
    def sql(self, q, check=True):
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        r = subprocess.run(['psql', '-X', '-At', '-h', self.dir, '-p', '55471', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', q], capture_output=True, text=True, env=env)
        if check and r.returncode: raise AssertionError(r.stdout + r.stderr)
        return (r.stdout + r.stderr).strip()
    def stop(self):
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-m', 'immediate', 'stop'], capture_output=True)

def remise_eleve(attempt):
    """Fin de passage telle que core_finalize_attempt la fait, sous l'identité de l'élève (pas d'admin)."""
    claims = json.dumps({'sub': ELEVE_UID, 'role': 'authenticated'})
    return f"""SET SESSION AUTHORIZATION authenticator; SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{claims}', false);
UPDATE public.exam_attempts_v2 SET etat = 'terminee', finished_at = now() WHERE attempt_id = '{attempt}';
RESET ROLE; RESET SESSION AUTHORIZATION;"""

class AutoExact(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = Pg(); cls.pg.sql(SCHEMA); cls.pg.sql(LIVE.read_text()); cls.pg.sql(TRIGGERS); cls.pg.sql(MIG.read_text())
    @classmethod
    def tearDownClass(cls): cls.pg.stop()

    def passage(self, reponses: dict, deja=None):
        """Crée un passage EB5 (QCM 2 pts + QRC 2 pts par question), avec ses QRC en attente."""
        att = str(uuid.uuid4())
        qs = [{"id": "qcm:1", "type": "QCM", "points": 2, "choix": [{"lettre": "A", "correct": True}, {"lettre": "B", "correct": False}]}]
        for qid in reponses: qs.append({"id": qid, "type": "QRC", "points": 2, "reponseQRC": CORRIGE if not qid.startswith('n') else "Il ne faut pas dépasser 10 heures"})
        self.pg.sql(f"INSERT INTO public.exam_attempts_v2 (attempt_id, apprenant_id, exam_id, snapshot) VALUES ('{att}','{APP}','EB5','{json.dumps({'questions': qs}).replace(chr(39), chr(39)*2)}');"
                    f"INSERT INTO public.answer_state VALUES ('{att}','qcm:1','A');")
        for qid, rep in reponses.items():
            self.pg.sql(f"INSERT INTO public.qrc_instances_v2 (attempt_id, question_id, apprenant_id, reponse) VALUES ('{att}','{qid}','{APP}', {('$j$' + json.dumps(rep, ensure_ascii=False) + '$j$::jsonb') if rep is not None else 'NULL'});")
        if deja:  # correction manuelle préalable (ex. formateur) : doit rester intacte
            self.pg.sql(f"UPDATE public.qrc_instances_v2 SET etat='corrigee', note={deja[1]}, corrige_email='contact@ftransport.fr', corrige_at='2026-11-12 18:00+00' WHERE attempt_id='{att}' AND question_id='{deja[0]}';")
        return att

    def etat(self, att, qid):
        return self.pg.sql(f"SELECT etat||'|'||coalesce(note::text,'∅')||'|'||coalesce(corrige_email,'∅') FROM public.qrc_instances_v2 WHERE attempt_id='{att}' AND question_id='{qid}'")

    def test_identique_2_sur_2_sans_clic(self):
        att = self.passage({"gestion:2": CORRIGE})
        self.pg.sql(remise_eleve(att))
        self.assertEqual(self.etat(att, "gestion:2"), "corrigee|2|auto_exact_match")
        res = self.pg.sql(f"SELECT status||'|'||score||'|'||qrc_restantes FROM public.core_exam_results WHERE attempt_id='{att}'")
        self.assertEqual(res, "definitif|20.00|0")  # QCM 2/2 + QRC 2/2 = 20/20, plus rien à corriger
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.qrc_correction_events WHERE attempt_id='{att}' AND corrige_email='auto_exact_match'"), "1")
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.audit_journal WHERE attempt_id='{att}' AND origine='qrc_auto_exact_match'"), "1")
        self.assertEqual(self.pg.sql(f"SELECT qrc_en_attente FROM public.ia_file WHERE attempt_id='{att}'"), "0")  # l'IA ne la reçoit pas

    def test_accents_casse_espaces_ponctuation(self):
        att = self.passage({"gestion:2": "  UNE personne MORALE est generalement constituee, par un regroupement de personnes !"})
        self.pg.sql(remise_eleve(att))
        self.assertEqual(self.etat(att, "gestion:2"), "corrigee|2|auto_exact_match")

    def test_partielle_synonyme_negation_chiffres_restent_en_attente(self):
        att = self.passage({"gestion:2": "Un regroupement de personnes",                       # partielle
                            "gestion:3": "Une personne morale est souvent constituée par un regroupement de personnes",  # synonyme
                            "n:1": "Il faut dépasser 10 heures",                                 # négation retirée
                            "n:2": "Il ne faut pas dépasser 11 heures",                          # chiffre différent
                            "n:3": "Il ne faut pas dépasser 10 minutes",                         # durée différente
                            "n:4": "",                                                           # vide : jamais 0 technique ici
                            "n:5": None})
        self.pg.sql(remise_eleve(att))
        for q in ("gestion:2", "gestion:3", "n:1", "n:2", "n:3", "n:4", "n:5"):
            self.assertEqual(self.etat(att, q), "en_attente|∅|∅", q)
        self.assertEqual(self.pg.sql(f"SELECT status||'|'||qrc_restantes FROM public.core_exam_results WHERE attempt_id='{att}'"), "")  # aucun recalcul, aucune note inventée

    def test_correction_manuelle_intacte(self):
        att = self.passage({"gestion:2": CORRIGE, "gestion:3": CORRIGE}, deja=("gestion:2", 1))
        avant = self.pg.sql(f"SELECT corrige_at FROM public.qrc_instances_v2 WHERE attempt_id='{att}' AND question_id='gestion:2'")
        self.pg.sql(remise_eleve(att))
        self.assertEqual(self.etat(att, "gestion:2"), "corrigee|1|contact@ftransport.fr")
        self.assertEqual(self.pg.sql(f"SELECT corrige_at FROM public.qrc_instances_v2 WHERE attempt_id='{att}' AND question_id='gestion:2'"), avant)
        self.assertEqual(self.etat(att, "gestion:3"), "corrigee|2|auto_exact_match")

    def test_pas_de_double_ni_retroactivite(self):
        att = self.passage({"gestion:2": CORRIGE})
        self.pg.sql(remise_eleve(att))
        # Rejeu manuel / second déclenchement : aucune nouvelle écriture.
        self.assertEqual(self.pg.sql(f"SELECT public.qrc_auto_exact_match('{att}')"), "0")
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.qrc_correction_events WHERE attempt_id='{att}'"), "1")
        # Une tentative déjà terminée AVANT installation n'est jamais touchée (le déclencheur exige en_cours -> terminee).
        old = self.passage({"gestion:2": CORRIGE})
        self.pg.sql(f"ALTER TABLE public.exam_attempts_v2 DISABLE TRIGGER trg_qrc_aa_auto_exact; UPDATE public.exam_attempts_v2 SET etat='terminee' WHERE attempt_id='{old}'; ALTER TABLE public.exam_attempts_v2 ENABLE TRIGGER trg_qrc_aa_auto_exact;")
        self.pg.sql(f"UPDATE public.exam_attempts_v2 SET finished_at = now() WHERE attempt_id='{old}'")
        self.assertEqual(self.etat(old, "gestion:2"), "en_attente|∅|∅")

    def test_bareme_inconnu_reste_en_attente_et_remise_jamais_bloquee(self):
        att = str(uuid.uuid4())
        snap = {"questions": [{"id": "g:9", "type": "QRC", "points": "?", "reponseQRC": CORRIGE}]}
        self.pg.sql(f"INSERT INTO public.exam_attempts_v2 (attempt_id, apprenant_id, exam_id, snapshot) VALUES ('{att}','{APP}','EB5','{json.dumps(snap)}');"
                    f"INSERT INTO public.qrc_instances_v2 (attempt_id, question_id, apprenant_id, reponse) VALUES ('{att}','g:9','{APP}', $j${json.dumps(CORRIGE, ensure_ascii=False)}$j$::jsonb);")
        self.pg.sql(remise_eleve(att))
        self.assertEqual(self.pg.sql(f"SELECT etat FROM public.exam_attempts_v2 WHERE attempt_id='{att}'"), "terminee")
        self.assertEqual(self.etat(att, "g:9"), "en_attente|∅|∅")

    def test_normalisation_garde_decimales_signes(self):
        n = lambda t: self.pg.sql(f"SELECT public.qrc_normaliser_exact($t${t}$t$)")
        self.assertNotEqual(n("2,5 %"), n("25 %"))
        self.assertNotEqual(n("-10 euros"), n("10 euros"))
        self.assertEqual(n("Éléve, l'ÉCOLE !"), n("eleve l ecole"))

if __name__ == '__main__':
    unittest.main(verbosity=2)
