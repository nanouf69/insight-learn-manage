"""Refus 22P05 (Ahmed MALKI, 05–06/11/2026) — PostgreSQL JETABLE uniquement.

Charge la VRAIE fonction de production persist_answer_batch_v2 (figée en lecture seule le
07/11 dans src/test/fixtures/persist_answer_batch_v2_live_20261107.sql), reproduit le passage
d'arguments de l'API (corps JSON -> json_to_record -> jsonb, comme l'appel RPC de la fonction
serveur), puis vérifie :
  1. un U+0000 dans UNE réponse ou UN événement fait refuser TOUT le lot (22P05) ;
  2. le même lot codé par src/lib/transportSansNul.ts est enregistré, la relecture décodée
     est identique octet pour octet à la saisie (réponses + journal) ;
  3. renvoi de la même opération : aucun doublon dans le journal ;
  4. export nocturne (lecture JSON des lignes) : décodage sans perte du même contenu.
Prototype isolé NON ACTIVÉ : le marqueur manque dans le schéma/lecteurs réels.
Aucune connexion à la base réelle. Usage : python3 src/test/transport_nul_22p05_contract.py
"""
import json, os, pathlib, subprocess, tempfile, unittest, uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
FN = (ROOT / 'src/test/fixtures/persist_answer_batch_v2_live_20261107.sql').read_text()
LIB = ROOT / 'src/lib/transportSansNul.ts'

SCHEMA = """
CREATE TABLE public.reponses_apprenants (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, apprenant_id uuid, user_id uuid, exercice_id text, exercice_type text DEFAULT 'quiz', reponses jsonb DEFAULT '{}', score numeric, completed boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), status text DEFAULT 'in_progress', submitted_at timestamptz, tentative integer DEFAULT 1, bonnes_reponses integer, total_questions integer, reponses_meta jsonb DEFAULT '{}', write_seq bigint DEFAULT 0, source_noyau text, UNIQUE (apprenant_id, exercice_id));
CREATE TABLE public.reponses_apprenants_journal (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, apprenant_id uuid, user_id uuid, module_id integer, exercice_id text, exercice_type text DEFAULT 'quiz', question_id text, valeur jsonb DEFAULT '[]', tentative integer DEFAULT 1, client_saved_at timestamptz, created_at timestamptz DEFAULT now(), event_id uuid DEFAULT gen_random_uuid() UNIQUE);
"""

CALL = """SELECT row_to_json(r)::text FROM json_to_record(%s::json) AS x(p_apprenant_id uuid, p_user_id uuid, p_module_id integer, p_exercice_id text, p_exercice_type text, p_reponses jsonb, p_completed boolean, p_score numeric, p_base_seq bigint, p_events jsonb),
LATERAL public.persist_answer_batch_v2(x.p_apprenant_id, x.p_user_id, x.p_module_id, x.p_exercice_id, x.p_exercice_type, x.p_reponses, x.p_completed, x.p_score, x.p_base_seq, x.p_events) r"""


def js(code: str) -> str:
    """Exécute le VRAI module de codage (TypeScript) avec bun."""
    full = f"import * as T from '{LIB}';\n" + code
    r = subprocess.run(['bun', '-e', full], capture_output=True, text=True, cwd=ROOT)
    if r.returncode:
        raise RuntimeError(r.stderr)
    return r.stdout.strip()


def lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


class Pg:
    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix='pg-22p05-', dir='/tmp')
        self.user = [] if os.geteuid() else ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
        if self.user: os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ['initdb', '-D', self.dir + '/d', '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8'], check=True, capture_output=True)
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-o', f"-k {self.dir} -p 55463 -h ''", '-w', 'start', '-l', self.dir + '/log'], check=True, capture_output=True)

    def sql(self, q):
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        r = subprocess.run(['psql', '-X', '-At', '-h', self.dir, '-p', '55463', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-c', '\\set VERBOSITY verbose', '-c', q], capture_output=True, text=True, env=env)
        return r.returncode, (r.stdout + r.stderr).strip()

    def stop(self):
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-m', 'immediate', 'stop'], capture_output=True)


APP, UID = str(uuid.uuid4()), str(uuid.uuid4())
EV1, EV2 = str(uuid.uuid4()), str(uuid.uuid4())
# Saisie fictive : texte libre contenant un U+0000 invisible, un « ␀ » littéral et des
# caractères accentués/emoji — le contenu doit revenir à l'identique.
SAISIE = {
    "p_apprenant_id": APP, "p_user_id": UID, "p_module_id": 35, "p_exercice_id": "EB1__gestion__t2",
    "p_exercice_type": "examen_blanc", "p_completed": False, "p_score": None, "p_base_seq": 0,
    "p_reponses": {"1": "Réponse é😀 normale", "2": "texte\u0000invisible ␀ littéral"},
    "p_events": [
        {"event_id": EV1, "question_id": "1", "valeur": "Réponse é😀 normale", "client_saved_at": "2026-11-06T21:01:44Z"},
        {"event_id": EV2, "question_id": "2", "valeur": "texte\u0000invisible ␀ littéral", "client_saved_at": "2026-11-06T21:01:45Z"},
    ],
}


class Transport22P05(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = Pg()
        rc, out = cls.pg.sql(SCHEMA + FN)
        assert rc == 0, out

    @classmethod
    def tearDownClass(cls):
        cls.pg.stop()

    def test_contrat(self):
        # Corps tel que l'émet JavaScript (JSON.stringify écrit U+0000 en « \\u0000 »).
        brut = js(f"process.stdout.write(JSON.stringify({json.dumps(SAISIE)}))")
        self.assertIn('\\u0000', brut)

        # 1. Reproduction : tout le lot est refusé, rien n'est écrit.
        rc, out = self.pg.sql(CALL % lit(brut))
        self.assertNotEqual(rc, 0)
        self.assertIn('22P05', out)
        self.assertIn('unsupported Unicode escape sequence', out)
        self.assertEqual(self.pg.sql('SELECT count(*) FROM public.reponses_apprenants')[1], '0')
        self.assertEqual(self.pg.sql('SELECT count(*) FROM public.reponses_apprenants_journal')[1], '0')

        # Une seule réponse correcte + un seul événement empoisonné suffit (cause du blocage durable).
        poison = dict(SAISIE, p_reponses={"1": "ok"}, p_events=[SAISIE["p_events"][1]])
        rc, out = self.pg.sql(CALL % lit(js(f"process.stdout.write(JSON.stringify({json.dumps(poison)}))")))
        self.assertIn('22P05', out)

        # 2. Transport codé : accepté, relecture décodée identique.
        code = js(f"process.stdout.write(JSON.stringify(T.encoderTransport({json.dumps(SAISIE)})))")
        self.assertNotIn('\\u0000', code)
        rc, out = self.pg.sql(CALL % lit(code))
        self.assertEqual(rc, 0, out)
        res = json.loads(out)
        self.assertTrue(res['saved'])
        # Preuve du blocage d'activation : RPC actuel ne conserve aucun marqueur.
        meta = json.loads(self.pg.sql("SELECT reponses_meta::text FROM public.reponses_apprenants")[1])
        self.assertNotIn('transport_encodage', json.dumps(meta))
        # Prototype de schéma uniquement sur base jetable : marqueur PAR VALEUR,
        # séparé des données (pas de backfill d'anciennes réponses).
        rc, out = self.pg.sql("ALTER TABLE public.reponses_apprenants ADD COLUMN encodages_par_question jsonb NOT NULL DEFAULT '{}'; ALTER TABLE public.reponses_apprenants_journal ADD COLUMN transport_encodage text;")
        self.assertEqual(rc, 0, out)
        rc, out = self.pg.sql("UPDATE public.reponses_apprenants SET encodages_par_question = '{\"1\":\"nul-u2400-v1\",\"2\":\"nul-u2400-v1\"}'; UPDATE public.reponses_apprenants_journal SET transport_encodage = 'nul-u2400-v1';")
        self.assertEqual(rc, 0, out)
        stockees = self.pg.sql("SELECT reponses::text FROM public.reponses_apprenants")[1]
        decode = json.loads(js(f"process.stdout.write(JSON.stringify(T.decoderValeurMarquee({stockees}, T.TRANSPORT_ENCODAGE)))"))
        self.assertEqual(decode, SAISIE['p_reponses'])
        journal = self.pg.sql("SELECT json_agg(valeur ORDER BY client_saved_at)::text FROM public.reponses_apprenants_journal")[1]
        jdec = json.loads(js(f"process.stdout.write(JSON.stringify(T.decoderValeurMarquee({journal}, T.TRANSPORT_ENCODAGE)))"))
        self.assertEqual(jdec, [e['valeur'] for e in SAISIE['p_events']])

        # 3. Renvoi identique (réseau coupé après écriture) : aucun doublon dans le journal.
        rc, _ = self.pg.sql(CALL % lit(code))
        self.assertEqual(rc, 0)
        self.assertEqual(self.pg.sql('SELECT count(*) FROM public.reponses_apprenants_journal')[1], '2')

        # 4. Export nocturne : lignes lues en JSON (comme l'API) puis décodées sans perte.
        export = self.pg.sql("SELECT json_agg(to_jsonb(r) ORDER BY id)::text FROM public.reponses_apprenants r")[1]
        lignes = json.loads(js(f"const rows = {export}; process.stdout.write(JSON.stringify(rows.map(r => ({{...r, reponses:Object.fromEntries(Object.entries(r.reponses).map(([k,v])=>[k,T.decoderValeurMarquee(v,r.encodages_par_question[k])]))}}))))"))
        self.assertEqual(lignes[0]['reponses'], SAISIE['p_reponses'])
        # Une ancienne réponse non marquée est strictement préservée.
        literal = '␀␀ et ␀\u034f'
        decoded = json.loads(js(f"process.stdout.write(JSON.stringify(T.decoderValeurMarquee({json.dumps(literal)}, null)))"))
        self.assertEqual(decoded, literal)


if __name__ == '__main__':
    unittest.main()
