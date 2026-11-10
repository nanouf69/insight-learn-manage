"""Contrat EB3 (VTC + TAXI) du circuit de correction QRC V2 — PostgreSQL JETABLE uniquement.

Charge les définitions de PRODUCTION relevées le 10/11/2026 (src/test/fixtures/eb3-20261110/) :
fonctions de correction/notation, garde-fous de qrc_instances_v2, droits EXECUTE et contenus figés
de deux sujets EB3 réels (VTC Gestion, TAXI). Aucune donnée élève, aucune connexion à la base réelle.
Usage : python3 src/test/eb3_correction_v2_contract.py
"""
import json, os, pathlib, subprocess, tempfile, unittest, uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / 'src/test/fixtures/eb3-20261110'
PORT = 55473
ADMIN, ELEVE_UID, AUTRE_UID = (str(uuid.uuid4()) for _ in range(3))
APP, APP2 = str(uuid.uuid4()), str(uuid.uuid4())

PRELUDE = f"""
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE ROLE authenticator NOLOGIN NOINHERIT;
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{{}}')::jsonb $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
"""

POST = f"""
ALTER TABLE public.qrc_instances_v2 ADD PRIMARY KEY (qrc_instance_id), ADD UNIQUE (attempt_id, question_id);
ALTER TABLE public.core_exam_results ADD PRIMARY KEY (result_id), ADD UNIQUE (attempt_id);
ALTER TABLE public.core_operations ADD PRIMARY KEY (operation_id);
ALTER TABLE public.exam_attempts_v2 ADD PRIMARY KEY (attempt_id);
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role::text=_role::text) $$;
INSERT INTO public.user_roles (user_id, role) VALUES ('{ADMIN}','admin');
INSERT INTO public.apprenants (id, auth_user_id) VALUES ('{APP}','{ELEVE_UID}'), ('{APP2}','{AUTRE_UID}');
"""

TRIGGERS = """
CREATE TRIGGER trg_qrc_v2_context BEFORE INSERT OR UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION public.core_enforce_qrc_context();
CREATE TRIGGER trg_qrc_v2_finality BEFORE UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION public.enforce_qrc_v2_finality();
CREATE TRIGGER trg_qrc_v2_correction_journal AFTER UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION public.core_log_qrc_correction();
CREATE TRIGGER trg_qrc_verification_cloture AFTER UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION public.qrc_verification_cloture_humaine();
CREATE TRIGGER trg_qrc_correction_events_append_only BEFORE UPDATE OR DELETE ON public.qrc_correction_events FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();
CREATE TRIGGER trg_core_operations_append_only BEFORE UPDATE OR DELETE ON public.core_operations FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();
"""


class Pg:
    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix='pg-eb3-', dir='/tmp')
        self.user = [] if os.geteuid() else ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
        if self.user: os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ['initdb', '-D', self.dir + '/d', '-U', 'postgres', '-A', 'trust', '--no-locale'], check=True, capture_output=True)
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-o', f"-k {self.dir} -p {PORT} -h ''", '-w', 'start', '-l', self.dir + '/log'], check=True, capture_output=True)

    def sql(self, q):
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}  # jamais la base réelle
        r = subprocess.run(['psql', '-X', '-At', '-h', self.dir, '-p', str(PORT), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', q], capture_output=True, text=True, env=env)
        return r.returncode, (r.stdout + r.stderr).strip()

    def stop(self):
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-m', 'immediate', 'stop'], capture_output=True)


def ctx(claims, call, role='authenticated'):
    c = json.dumps(claims).replace("'", "''")
    return f"SELECT set_config('request.jwt.claims', '{c}', false); SET SESSION AUTHORIZATION authenticator; SET ROLE {role}; {call}"


ADMIN_C = {'role': 'authenticated', 'sub': ADMIN}
ELEVE_C = {'role': 'authenticated', 'sub': ELEVE_UID}


def lit(s):
    return "'" + s.replace("'", "''") + "'"


class EB3(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = pg = Pg()
        for part in (PRELUDE, (FIX / 'schema_live.sql').read_text(), POST, (FIX / 'fonctions_live.sql').read_text(), TRIGGERS,
                     'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;', (FIX / 'droits_live.sql').read_text().replace('FUNCTION core_', 'FUNCTION public.core_')):
            code, out = pg.sql(part)
            assert code == 0, out[-800:]

    @classmethod
    def tearDownClass(cls):
        cls.pg.stop()

    def last(self, out):
        return out.strip().splitlines()[-1]

    def preparer(self, snap_file, apprenant=APP):
        """Copie terminée réaliste : QCM répondues (moitié justes), QRC remises en attente."""
        snap = json.loads((FIX / snap_file).read_text())
        att = str(uuid.uuid4())
        code, out = self.pg.sql(f"INSERT INTO public.exam_attempts_v2 (attempt_id, apprenant_id, exam_id, snapshot, etat, finished_at) VALUES ('{att}','{apprenant}',{lit(snap['exam_id'])},{lit(json.dumps(snap))}::jsonb,'terminee',now())")
        self.assertEqual(code, 0, out[-600:])
        qcm_ok, qrcs, total, i = 0.0, [], 0.0, 0
        for q in snap['questions']:
            total += q['points']
            if q['type'] == 'QRC':
                qi = str(uuid.uuid4())
                code, out = self.pg.sql(f"INSERT INTO public.qrc_instances_v2 (qrc_instance_id, attempt_id, question_id, apprenant_id, reponse) VALUES ('{qi}','{att}',{lit(q['id'])},'{apprenant}',{lit(json.dumps('réponse fictive'))}::jsonb)")
                self.assertEqual(code, 0, out)
                qrcs.append((qi, q['points']))
            elif q.get('choix'):
                bonnes = sorted(c['lettre'] for c in q['choix'] if c.get('correct'))
                i += 1
                rep = bonnes if i % 2 else ['E' if 'E' not in bonnes else 'D']
                if rep == bonnes: qcm_ok += q['points']
                self.pg.sql(f"INSERT INTO public.answer_state (attempt_id, apprenant_id, question_id, valeur) VALUES ('{att}','{apprenant}',{lit(q['id'])},{lit(json.dumps(rep))}::jsonb)")
        return att, qrcs, qcm_ok, total, snap

    def corriger(self, qi, note, op=None, claims=ADMIN_C):
        op = op or str(uuid.uuid4())
        return self.pg.sql(ctx(claims, f"SELECT public.core_correct_qrc_publish('{op}','{qi}',{note},'contrôle EB3','admin@test');")), op

    def resultat(self, att):
        # Relecture dans une NOUVELLE session psql = rechargement de page.
        code, out = self.pg.sql(f"SELECT status||'|'||score||'|'||qrc_restantes||'|'||(published_at IS NOT NULL)||'|'||result_revision FROM public.core_exam_results WHERE attempt_id='{att}'")
        self.assertEqual(code, 0, out)
        return out.split('|') if out else None

    def parcours_complet(self, snap_file):
        att, qrcs, qcm_ok, total, snap = self.preparer(snap_file)
        self.assertGreaterEqual(len(qrcs), 2)
        notes = [p / 2 for _, p in qrcs]
        notes[0] = qrcs[0][1]
        # 1re QRC : note enregistrée, résultat provisoire (aucun verdict anticipé).
        (code, out), op1 = self.corriger(qrcs[0][0], notes[0])
        self.assertEqual(code, 0, out)
        st, score, rest, pub, rev = self.resultat(att)
        self.assertEqual((st, rest, pub), ('provisoire', str(len(qrcs) - 1), 'false'))
        self.assertEqual(self.pg.sql(f"SELECT etat||'|'||note FROM public.qrc_instances_v2 WHERE qrc_instance_id='{qrcs[0][0]}'")[1], f"corrigee|{notes[0]:g}" if notes[0] != int(notes[0]) else f"corrigee|{int(notes[0])}")
        # Rejeu (double clic / F5) : aucune nouvelle écriture.
        (code, out), _ = self.corriger(qrcs[0][0], notes[0], op=op1)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.resultat(att)[4], rev)
        # Dernières QRC : note définitive publiée, égale à la formule indépendante.
        for (qi, _), n in zip(qrcs[1:], notes[1:]):
            (code, out), _ = self.corriger(qi, n)
            self.assertEqual(code, 0, out)
        st, score, rest, pub, _ = self.resultat(att)
        attendu = round((qcm_ok + sum(notes)) / total * 20, 2)
        self.assertEqual((st, rest, pub), ('definitif', '0', 'true'))
        self.assertAlmostEqual(float(score), attendu, places=2)
        # Journal append-only : un événement par correction, non modifiable.
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.qrc_correction_events e JOIN public.qrc_instances_v2 i ON i.qrc_instance_id::text = e.qrc_instance_id::text WHERE i.attempt_id='{att}'")[1], str(len(qrcs)))
        self.assertNotEqual(self.pg.sql(f"UPDATE public.qrc_correction_events SET note = 0 WHERE qrc_instance_id::text = '{qrcs[0][0]}'")[0], 0)
        return att, qrcs, notes, qcm_ok, total, snap

    def test_vtc_gestion_note_remonte(self):
        self.parcours_complet('snap_eb3_vtc_gestion.json')

    def test_taxi_note_remonte(self):
        self.parcours_complet('snap_eb3_taxi.json')

    def test_reecriture_refusee_et_revision_cas(self):
        att, qrcs, notes, qcm_ok, total, _ = self.parcours_complet('snap_eb3_vtc_gestion.json')
        qi, pts = qrcs[0]
        # Une QRC corrigée n'est jamais réécrite par la première notation.
        (code, out), _ = self.corriger(qi, 0)
        self.assertEqual(self.pg.sql(f"SELECT note FROM public.qrc_instances_v2 WHERE qrc_instance_id='{qi}'")[1].rstrip('0').rstrip('.'), f"{notes[0]:g}")
        # Révision avec note attendue périmée : refus.
        code, out = self.pg.sql(ctx(ADMIN_C, f"SELECT public.core_revise_qrc_publish('{uuid.uuid4()}','{qi}',0,{pts / 2 + 0.5},'r','admin@test');"))
        self.assertNotEqual(code, 0, out)
        # Révision CAS correcte : nouvelle note, score recalculé, toujours définitif.
        code, out = self.pg.sql(ctx(ADMIN_C, f"SELECT public.core_revise_qrc_publish('{uuid.uuid4()}','{qi}',0,{notes[0]},'r','admin@test');"))
        self.assertEqual(code, 0, out)
        st, score, rest, pub, _ = self.resultat(att)
        self.assertEqual(st, 'definitif')
        self.assertAlmostEqual(float(score), round((qcm_ok + sum(notes[1:])) / total * 20, 2), places=2)

    def test_eleve_et_anonyme_refuses_isolation(self):
        att, qrcs, *_ = self.preparer('snap_eb3_taxi.json')
        autre, qrcs2, *_ = self.preparer('snap_eb3_taxi.json', apprenant=APP2)
        (code, out), _ = self.corriger(qrcs[0][0], 1, claims=ELEVE_C)
        self.assertNotEqual(code, 0, out)
        code, out = self.pg.sql(ctx({'role': 'anon'}, f"SELECT public.core_correct_qrc_publish('{uuid.uuid4()}','{qrcs[0][0]}',1,'x','x');", role='anon'))
        self.assertNotEqual(code, 0, out)
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.qrc_instances_v2 WHERE attempt_id='{att}' AND etat='corrigee'")[1], '0')
        # Corriger la copie d'un élève ne touche jamais celle d'un autre.
        (code, out), _ = self.corriger(qrcs2[0][0], 1)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.qrc_instances_v2 WHERE attempt_id='{att}' AND etat='corrigee'")[1], '0')
        self.assertIsNone(self.resultat(att))

    def test_note_hors_bareme_refusee(self):
        att, qrcs, *_ = self.preparer('snap_eb3_vtc_gestion.json')
        (code, out), _ = self.corriger(qrcs[0][0], qrcs[0][1] + 1)
        self.assertNotEqual(code, 0, out)
        self.assertEqual(self.pg.sql(f"SELECT etat FROM public.qrc_instances_v2 WHERE qrc_instance_id='{qrcs[0][0]}'")[1], 'en_attente')


if __name__ == '__main__':
    unittest.main(verbosity=2)
