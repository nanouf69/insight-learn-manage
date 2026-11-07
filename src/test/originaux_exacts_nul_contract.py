"""Conservation exacte U+0000 (22P05) — PostgreSQL JETABLE uniquement, données fictives.

Charge la VRAIE fonction v2 figée (fixture lecture seule du 07/11) puis le brouillon
docs/sql-revue/2026-11-07-originaux-exacts-nul.sql, et exécute le VRAI module
src/lib/originauxExacts.ts (bun) pour préparer les lots et relire les valeurs.
Le passage d'arguments reproduit l'API (corps JSON -> json_to_record -> jsonb).
Aucune connexion à la base réelle. Usage : python3 src/test/originaux_exacts_nul_contract.py
"""
import json, os, pathlib, subprocess, tempfile, unittest, uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
V2 = (ROOT / 'src/test/fixtures/persist_answer_batch_v2_live_20261107.sql').read_text()
V3 = (ROOT / 'docs/sql-revue/2026-11-07-originaux-exacts-nul.sql').read_text()
LIB = ROOT / 'src/lib/originauxExacts.ts'

SCHEMA = """
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.reponses_apprenants (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, apprenant_id uuid, user_id uuid, exercice_id text, exercice_type text DEFAULT 'quiz', reponses jsonb DEFAULT '{}', score numeric, completed boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), status text DEFAULT 'in_progress', submitted_at timestamptz, tentative integer DEFAULT 1, bonnes_reponses integer, total_questions integer, reponses_meta jsonb DEFAULT '{}', write_seq bigint DEFAULT 0, source_noyau text, UNIQUE (apprenant_id, exercice_id));
CREATE TABLE public.reponses_apprenants_journal (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, apprenant_id uuid, user_id uuid, module_id integer, exercice_id text, exercice_type text DEFAULT 'quiz', question_id text, valeur jsonb DEFAULT '[]', tentative integer DEFAULT 1, client_saved_at timestamptz, created_at timestamptz DEFAULT now(), event_id uuid DEFAULT gen_random_uuid() UNIQUE);
CREATE FUNCTION public.protect_journal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only'; END $$;
CREATE TRIGGER trg_protect BEFORE UPDATE OR DELETE ON public.reponses_apprenants_journal FOR EACH ROW EXECUTE FUNCTION public.protect_journal();
"""

ARGS = "x(p_apprenant_id uuid, p_user_id uuid, p_module_id integer, p_exercice_id text, p_exercice_type text, p_reponses jsonb, p_completed boolean, p_score numeric, p_base_seq bigint, p_events jsonb{extra})"
CALL2 = "SELECT row_to_json(r)::text FROM json_to_record(%s::json) AS " + ARGS.format(extra='') + ", LATERAL public.persist_answer_batch_v2(x.p_apprenant_id, x.p_user_id, x.p_module_id, x.p_exercice_id, x.p_exercice_type, x.p_reponses, x.p_completed, x.p_score, x.p_base_seq, x.p_events) r"
CALL3 = "SELECT row_to_json(r)::text FROM json_to_record(%s::json) AS " + ARGS.format(extra=', p_originaux jsonb') + ", LATERAL public.persist_answer_batch_v3(x.p_apprenant_id, x.p_user_id, x.p_module_id, x.p_exercice_id, x.p_exercice_type, x.p_reponses, x.p_completed, x.p_score, x.p_base_seq, x.p_events, x.p_originaux) r"


def js(code: str) -> str:
    r = subprocess.run(['bun', '-e', f"import * as O from '{LIB}';\n" + code], capture_output=True, text=True, cwd=ROOT)
    if r.returncode:
        raise RuntimeError(r.stderr)
    return r.stdout.strip()


def lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


class Pg:
    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix='pg-orig-', dir='/tmp')
        self.user = [] if os.geteuid() else ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
        if self.user: os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ['initdb', '-D', self.dir + '/d', '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8'], check=True, capture_output=True)
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-o', f"-k {self.dir} -p 55471 -h ''", '-w', 'start', '-l', self.dir + '/log'], check=True, capture_output=True)

    def sql(self, q):
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        r = subprocess.run(['psql', '-X', '-At', '-h', self.dir, '-p', '55471', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', q], capture_output=True, text=True, env=env)
        return r.returncode, (r.stdout + r.stderr).strip()

    def stop(self):
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-m', 'immediate', 'stop'], capture_output=True)


APP, UID, EX = str(uuid.uuid4()), str(uuid.uuid4()), 'EB1__t3p'
NUL_TXT = 'texte\u0000invisible ␀ littéral ␀\u034f é😀'


def lot(reponses, events, base=0, completed=False):
    return {"p_apprenant_id": APP, "p_user_id": UID, "p_module_id": 35, "p_exercice_id": EX, "p_exercice_type": "examen_blanc",
            "p_completed": completed, "p_score": None, "p_base_seq": base, "p_reponses": reponses, "p_events": events}


def ev(q, v):
    return {"event_id": str(uuid.uuid4()), "question_id": q, "valeur": v, "client_saved_at": "2026-11-07T10:00:00Z"}


class OriginauxExacts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = Pg()
        rc, out = cls.pg.sql(SCHEMA + V2)
        assert rc == 0, out
        # Ligne ancienne (non marquée) contenant un « ␀ » littéral : ne doit JAMAIS être décodée.
        rc, out = cls.pg.sql(f"INSERT INTO public.reponses_apprenants(apprenant_id, exercice_id, reponses, reponses_meta, write_seq) VALUES ('{uuid.uuid4()}', 'ancien', '{{\"1\": \"␀␀ et ␀\u034f\"}}', '{{\"1\": {{\"seq\": 1}}}}', 1)")
        assert rc == 0, out
        cls.avant = cls.pg.sql("SELECT md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) FROM public.reponses_apprenants r")[1]
        rc, out = cls.pg.sql(V3)
        assert rc == 0, out

    @classmethod
    def tearDownClass(cls):
        cls.pg.stop()

    def appel3(self, l):
        prep = json.loads(js(f"const l = {json.dumps(l)}; const p = O.preparerLotSansNul(l.p_reponses, l.p_events); process.stdout.write(JSON.stringify({{...l, p_reponses: p.reponses, p_events: p.events, p_originaux: p.originaux}}))"))
        corps = json.dumps(prep)  # JSON identique à l'API ; aucun \\u0000 ne part en base
        self.assertNotIn('\\u0000', corps)
        return self.pg.sql(CALL3 % lit(corps))

    def lire(self):
        row = json.loads(self.pg.sql(f"SELECT to_jsonb(r)::text FROM public.reponses_apprenants r WHERE exercice_id = '{EX}'")[1])
        out = json.loads(js(f"const r = {json.dumps(row)}; process.stdout.write(JSON.stringify(O.lireReponsesExactes(r.reponses, r.originaux_exacts, r.reponses_meta)))"))
        return row, out

    def test_1_bout_en_bout(self):
        # Migration additive : lignes existantes strictement identiques (hors nouvelle colonne).
        apres = self.pg.sql("SELECT md5(string_agg((to_jsonb(r) - 'originaux_exacts')::text, '' ORDER BY id)) FROM public.reponses_apprenants r")[1]
        self.assertEqual(apres, self.avant)
        self.assertEqual(self.pg.sql("SELECT has_function_privilege('anon', 'public.persist_answer_batch_v3(uuid,uuid,integer,text,text,jsonb,boolean,numeric,bigint,jsonb,jsonb)', 'EXECUTE')")[1], 'f')
        self.assertEqual(self.pg.sql("SELECT has_function_privilege('authenticated', 'public.persist_answer_batch_v3(uuid,uuid,integer,text,text,jsonb,boolean,numeric,bigint,jsonb,jsonb)', 'EXECUTE')")[1], 'f')

        e1, e2 = ev('1', 'Réponse é😀 normale'), ev('2', NUL_TXT)
        l1 = lot({"1": "Réponse é😀 normale", "2": NUL_TXT, "3": ["A", "C"]}, [e1, e2])
        # v2 inchangée : refuse toujours tout le lot (reproduction 22P05), rien d'écrit.
        rc, out = self.pg.sql(CALL2 % lit(json.dumps(l1)))
        self.assertIn('22P05', self.pg.sql("SELECT 1")[1] + out if rc else 'pas de refus')
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.reponses_apprenants WHERE exercice_id='{EX}'")[1], '0')

        rc, out = self.appel3(l1)
        self.assertEqual(rc, 0, out)
        r1 = json.loads(out)
        self.assertTrue(r1['saved']); self.assertEqual(r1['skipped_questions'], [])
        row, exact = self.lire()
        self.assertEqual(exact['reponses'], l1['p_reponses'])  # octet pour octet, NUL + ␀ littéral + emoji
        self.assertEqual(exact['anomalies'], {})
        self.assertEqual(row['reponses']['2'], NUL_TXT.replace('\u0000', ''))  # projection visible identique
        self.assertEqual(sorted(row['originaux_exacts'].keys()), ['2'])
        self.assertEqual(row['originaux_exacts']['2']['seq'], 1)

        # Réponse réseau perdue après commit : renvoi identique => aucune réécriture, aucun doublon,
        # valeurs « sautées » restituées exactes (le client peut prouver l'égalité).
        rc, out = self.appel3(l1)
        self.assertEqual(rc, 0, out)
        r2 = json.loads(out)
        self.assertEqual(sorted(r2['skipped_questions']), ['1', '2', '3'])
        self.assertEqual(r2['stored_write_seq'], 1)
        restitue = json.loads(js(f"const r = {json.dumps(r2)}; process.stdout.write(JSON.stringify(O.lireReponsesExactes(r.stored_reponses, r.stored_originaux, r.stored_meta).reponses))"))
        self.assertEqual(restitue, l1['p_reponses'])
        self.assertEqual(self.pg.sql('SELECT count(*) FROM public.reponses_apprenants_journal')[1], '2')

        # Deux modifications composées pendant le même envoi (même base 0) : la seconde ne
        # remplace rien (aucun écrasement à rebours) ; l'original exact reste celui confirmé.
        rc, out = self.appel3(lot({"2": 'B\u0000'}, [ev('2', 'B\u0000')], base=0))
        self.assertEqual(json.loads(out)['skipped_questions'], ['2'])
        self.assertEqual(self.lire()[1]['reponses']['2'], NUL_TXT)
        # Recomposée sur la base confirmée : appliquée, marqueur avancé.
        rc, out = self.appel3(lot({"2": 'B\u0000'}, [ev('2', 'B\u0000')], base=1))
        row, exact = self.lire()
        self.assertEqual(exact['reponses']['2'], 'B\u0000'); self.assertEqual(row['originaux_exacts']['2']['seq'], 2)

        # Autre écrivain (v2) écrivant le même texte visible sans NUL : marqueur périmé, JAMAIS appliqué.
        rc, out = self.pg.sql(CALL2 % lit(json.dumps(lot({"2": 'B'}, [], base=2))))
        self.assertEqual(rc, 0, out)
        row, exact = self.lire()
        self.assertEqual(exact['reponses']['2'], 'B'); self.assertEqual(exact['anomalies'], {'2': 'marqueur_perime'})
        # v3 sans NUL sur la question : marqueur retiré.
        self.appel3(lot({"2": 'C'}, [ev('2', 'C')], base=3))
        row, exact = self.lire()
        self.assertNotIn('2', row['originaux_exacts']); self.assertEqual(exact['anomalies'], {})

        # Marqueur forgé (version inconnue / projection divergente) : refus P0550, rien écrit.
        avant = self.pg.sql("SELECT md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) FROM public.reponses_apprenants r")[1]
        nj = self.pg.sql('SELECT count(*) FROM public.reponses_apprenants_journal')[1]
        for marq in ({"v": "nul-b64-v9", "b64": "AA==", "projection": "x"}, {"v": "nul-b64-v1", "b64": "AA==", "projection": "autre"}):
            bad = dict(lot({"2": "x"}, [ev('2', 'x')], base=4), p_originaux={"2": marq})
            rc, out = self.pg.sql(CALL3 % lit(json.dumps(bad)))
            self.assertNotEqual(rc, 0); self.assertIn('ORIGINAL_MARQUEUR_INVALIDE', out)
        self.assertEqual(self.pg.sql("SELECT md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) FROM public.reponses_apprenants r")[1], avant)
        self.assertEqual(self.pg.sql('SELECT count(*) FROM public.reponses_apprenants_journal')[1], nj)

        # Version inconnue présente en base (écrite par un futur code) : lecteur ne décode pas.
        st = json.loads(js("process.stdout.write(JSON.stringify(O.lireOriginal('x', {v:'nul-b64-v9', b64:'AA==', projection:'x'}, 1)))"))
        self.assertEqual(st, {"statut": "version_inconnue", "valeur": "x"})

        # Journal append-only : chaque original d'événement relu exact.
        rows = json.loads(self.pg.sql("SELECT json_agg(json_build_object('valeur', valeur, 'm', valeur_originale) ORDER BY created_at, id)::text FROM public.reponses_apprenants_journal WHERE valeur_originale IS NOT NULL")[1])
        vals = json.loads(js(f"process.stdout.write(JSON.stringify({json.dumps(rows)}.map(r => O.lireOriginal(r.valeur, r.m))))"))
        self.assertEqual(sorted(v['valeur'] for v in vals), sorted([NUL_TXT, 'B\u0000', 'B\u0000']))
        self.assertTrue(all(v['statut'] == 'exact' for v in vals))
        rc, out = self.pg.sql("UPDATE public.reponses_apprenants_journal SET valeur_originale = NULL")
        self.assertNotEqual(rc, 0)

        # Tentative figée : aucune écriture de réponse ni de marqueur, journal conservé.
        self.appel3(lot({"2": 'F\u0000'}, [ev('2', 'F\u0000')], base=5, completed=True))
        self.pg.sql(f"UPDATE public.reponses_apprenants SET status='submitted' WHERE exercice_id='{EX}'")
        figee = self.lire()[1]['reponses']
        rc, out = self.appel3(lot({"2": 'G\u0000'}, [ev('2', 'G\u0000')], base=99))
        self.assertTrue(json.loads(out)['frozen'])
        self.assertEqual(self.lire()[1]['reponses'], figee)

        # Ancienne valeur non marquée : jamais décodée (␀ littéraux intacts).
        old = json.loads(self.pg.sql("SELECT to_jsonb(r)::text FROM public.reponses_apprenants r WHERE exercice_id='ancien'")[1])
        dec = json.loads(js(f"const r = {json.dumps(old)}; process.stdout.write(JSON.stringify(O.lireReponsesExactes(r.reponses, r.originaux_exacts, r.reponses_meta)))"))
        self.assertEqual(dec['reponses'], {"1": "␀␀ et ␀\u034f"})

        # Export (lignes JSON comme l'API) -> restauration sur table jetable -> relecture exacte.
        export = self.pg.sql("SELECT json_agg(to_jsonb(r) ORDER BY id)::text FROM public.reponses_apprenants r")[1]
        rc, out = self.pg.sql("CREATE TABLE restaure (LIKE public.reponses_apprenants INCLUDING ALL); INSERT INTO restaure SELECT * FROM jsonb_populate_recordset(NULL::restaure, " + lit(export) + "::jsonb)")
        self.assertEqual(rc, 0, out)
        self.assertEqual(self.pg.sql("SELECT md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) FROM restaure r")[1],
                         self.pg.sql("SELECT md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) FROM public.reponses_apprenants r")[1])


if __name__ == '__main__':
    unittest.main()
