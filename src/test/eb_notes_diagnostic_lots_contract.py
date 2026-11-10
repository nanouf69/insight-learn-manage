"""Contrat « Actualiser les notes » — diagnostic par lots (incident 57014 du 10/11/2026). PostgreSQL JETABLE uniquement.

Banc EB3 (définitions de production relevées le 10/11, sujets EB3 VTC Gestion et TAXI réels, AUCUNE donnée élève),
index de production reproduits, puis volumétrie fictive supérieure à la production :
  4 300 copies du nouveau correcteur + 1 500 copies importées (dont 36 sans barème avec QRC restantes),
  6 100 anciennes copies, 56 notes divergentes et 10 attentes fantômes injectées.
Vérifie : ancienne version = délai dépassé (reproduction), nouvelle version = chaque lot < plafond de 8 s,
reprise par curseur sans doublon ni oubli, budget forcé, mêmes constats que l'ancienne version, droits admin,
lecture seule (empreintes), lecture pendant des corrections concurrentes, rollback.
Usage : python3 src/test/eb_notes_diagnostic_lots_contract.py
"""
import json, pathlib, sys, threading, time, unittest, uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import eb3_correction_v2_contract as m  # noqa: E402

m.PORT = 55511
ROOT, FIX = m.ROOT, m.FIX
ctx, ADMIN_C, ELEVE_C, lit = m.ctx, m.ADMIN_C, m.ELEVE_C, m.lit
SYNC = (ROOT / 'docs/sql-revue/2026-11-10-eb-notes-synchronisation.sql').read_text()
LOTS = (ROOT / 'docs/sql-revue/2026-11-10-eb-notes-diagnostic-lots.sql').read_text()
ROLLBACK = (ROOT / 'docs/sql-revue/2026-11-10-eb-notes-diagnostic-lots-ROLLBACK.sql').read_text()
IMPORTEES = (ROOT / 'drizzle/migrations/0262_eb_notes_synchronisation_importees.sql').read_text()

N_V2, N_IMP, N_SANS_BAREME, N_ANC, N_ANC_CORRIGEES, N_DIV, N_FANT = 4300, 1500, 36, 6100, 100, 56, 10

ANCIEN = """
CREATE TABLE public.apprenant_quiz_results (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), apprenant_id uuid, quiz_type text, quiz_id text,
  matiere_id text, matiere_nom text, score_obtenu numeric, tentative integer DEFAULT 1, details jsonb, completed_at timestamptz);
CREATE TABLE public.qrc_historique_corrections (id bigint GENERATED ALWAYS AS IDENTITY, result_id uuid, question_id text, note numeric, revision integer DEFAULT 1);
CREATE OR REPLACE FUNCTION public.qrc_historique_valide(c jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT jsonb_typeof(c) = 'object' AND (c->>'validatedByAdmin' = 'true' OR c->>'manuel' = 'true' OR coalesce(c->>'correctedBy','') LIKE 'ia:%%') $$;
-- Index de production (relevés le 10/11/2026 en lecture seule).
CREATE UNIQUE INDEX ux_exam_attempts_v2_source_result ON public.exam_attempts_v2 (((snapshot->'source_historique')->>'result_id')) WHERE snapshot ? 'source_historique';
CREATE INDEX exam_attempts_v2_apprenant ON public.exam_attempts_v2 (apprenant_id, exam_id);
CREATE INDEX qrc_instances_v2_etat ON public.qrc_instances_v2 (etat, apprenant_id);
CREATE UNIQUE INDEX answer_state_unique_courant ON public.answer_state (attempt_id, question_id);
CREATE INDEX answer_state_apprenant ON public.answer_state (apprenant_id, attempt_id);
CREATE UNIQUE INDEX qrc_hist_rqr ON public.qrc_historique_corrections (result_id, question_id, revision);
CREATE INDEX idx_aqr_apprenant_quiz_matiere ON public.apprenant_quiz_results (apprenant_id, quiz_id, matiere_id, tentative DESC);
"""


def fonction(src, nom):
    i = src.index(f'CREATE OR REPLACE FUNCTION public.{nom}(')
    return src[i:src.index('$function$;', i) + len('$function$;')]


# Versions installées avant ce correctif, renommées pour la comparaison.
AVANT = (fonction(IMPORTEES, 'eb_notes_diagnostic').replace('public.eb_notes_diagnostic(', 'public.eb_notes_diagnostic_avant(', 1) + '\n'
         + fonction(SYNC, 'eb_notes_diagnostic_ancien').replace('public.eb_notes_diagnostic_ancien(', 'public.eb_notes_diagnostic_ancien_avant(', 1)
         + "\nGRANT EXECUTE ON FUNCTION public.eb_notes_diagnostic_avant(uuid, integer, uuid), public.eb_notes_diagnostic_ancien_avant(uuid, integer) TO authenticated;")


def charger_volumetrie(pg):
    taxi = (FIX / 'snap_eb3_taxi.json').read_text()
    vtc = (FIX / 'snap_eb3_vtc_gestion.json').read_text()
    sql = f"""
SET session_replication_role = replica;  -- chargement fictif en masse (base jetable seulement)
CREATE TEMP TABLE snaps (k int, s jsonb);
INSERT INTO snaps VALUES (0, {lit(taxi)}::jsonb), (1, {lit(vtc)}::jsonb);
CREATE TEMP TABLE eleves AS SELECT row_number() OVER () - 1 AS i, gen_random_uuid() AS id FROM generate_series(1, 700);
INSERT INTO public.apprenants (id, nom, prenom) SELECT id, 'FICTIF' || i, 'Élève' FROM eleves;
-- Anciennes copies (ancien circuit).
INSERT INTO public.apprenant_quiz_results (apprenant_id, quiz_type, quiz_id, matiere_id, matiere_nom, tentative, details, completed_at)
SELECT e.id, 'examen_blanc', CASE WHEN g % 2 = 0 THEN 'EB3-TAXI' ELSE 'EB3' END, s.s->>'matiere', 'Matière', 1 + g / 700,
       jsonb_build_object('snapshot', s.s, 'correctionsIA', '{{}}'::jsonb), now() - (g || ' minutes')::interval
FROM generate_series(1, {N_ANC}) g JOIN eleves e ON e.i = g % 700 JOIN snaps s ON s.k = g % 2;
CREATE TEMP TABLE anc AS SELECT id, row_number() OVER (ORDER BY completed_at) AS r, details FROM public.apprenant_quiz_results;
-- Corrections humaines historiques pour {N_ANC_CORRIGEES} anciennes copies (toutes leurs QRC).
INSERT INTO public.qrc_historique_corrections (result_id, question_id, note)
SELECT a.id, q->>'id', 1 FROM anc a, jsonb_array_elements(a.details->'snapshot'->'questions') q
WHERE a.r > {N_IMP} AND a.r <= {N_IMP + N_ANC_CORRIGEES} AND q->>'type' = 'QRC';
-- Copies du nouveau correcteur (2 % encore en cours).
CREATE TEMP TABLE att AS
SELECT gen_random_uuid() AS attempt_id, e.id AS apprenant_id, s.s AS snapshot, g, CASE WHEN g % 50 = 0 THEN 'en_cours' ELSE 'terminee' END AS etat
FROM generate_series(1, {N_V2}) g JOIN eleves e ON e.i = g % 700 JOIN snaps s ON s.k = g % 2;
-- Copies importées : la remise d'origine est l'ancienne copie r ; les {N_SANS_BAREME} premières sans barème figé.
INSERT INTO att
SELECT gen_random_uuid(), (SELECT apprenant_id FROM public.apprenant_quiz_results x WHERE x.id = a.id),
       CASE WHEN a.r <= {N_SANS_BAREME}
            THEN jsonb_set(a.details->'snapshot', '{{questions}}', (SELECT jsonb_agg(q || '{{"points": 0}}'::jsonb) FROM jsonb_array_elements(a.details->'snapshot'->'questions') q))
            ELSE a.details->'snapshot' END || jsonb_build_object('source_historique', jsonb_build_object('result_id', a.id)),
       {N_V2} + a.r, 'terminee'
FROM anc a WHERE a.r <= {N_IMP};
INSERT INTO public.exam_attempts_v2 (attempt_id, apprenant_id, exam_id, snapshot, etat, finished_at)
SELECT attempt_id, apprenant_id, snapshot->>'exam_id', snapshot, etat, CASE WHEN etat = 'terminee' THEN now() END FROM att;
INSERT INTO public.answer_state (attempt_id, apprenant_id, question_id, valeur)
SELECT a.attempt_id, a.apprenant_id, q->>'id',
       CASE WHEN (a.g + o) % 2 = 0 THEN (SELECT jsonb_agg(c->>'lettre') FROM jsonb_array_elements(q->'choix') c WHERE (c->>'correct')::boolean) ELSE '["E"]'::jsonb END
FROM att a, jsonb_array_elements(a.snapshot->'questions') WITH ORDINALITY AS t(q, o) WHERE q->>'type' <> 'QRC';
-- QRC : 80 % des copies entièrement corrigées, les autres en attente normale ; sans barème = toujours en attente.
INSERT INTO public.qrc_instances_v2 (attempt_id, question_id, apprenant_id, reponse, etat, note)
SELECT a.attempt_id, q->>'id', a.apprenant_id, '"réponse fictive"'::jsonb,
       CASE WHEN a.g % 5 <> 0 AND a.g > {N_V2 + N_SANS_BAREME} OR (a.g <= {N_V2} AND a.g % 5 <> 0) THEN 'corrigee' ELSE 'en_attente' END,
       CASE WHEN a.g % 5 <> 0 AND a.g > {N_V2 + N_SANS_BAREME} OR (a.g <= {N_V2} AND a.g % 5 <> 0) THEN (q->>'points')::numeric / 2 END
FROM att a, jsonb_array_elements(a.snapshot->'questions') q WHERE q->>'type' = 'QRC';
SET session_replication_role = origin;
ANALYZE;
"""
    code, out = pg.sql(sql)
    assert code == 0, out[-1500:]
    # Résultats enregistrés = formule serveur réelle (core_note_attempt), lue en administrateur.
    code, out = pg.sql(ctx(ADMIN_C, """
CREATE TEMP TABLE calc AS SELECT t.attempt_id, t.apprenant_id, n.score20, n.total, n.qrc_restantes
FROM public.exam_attempts_v2 t, LATERAL public.core_note_attempt(t.attempt_id) n WHERE t.etat = 'terminee';
RESET ROLE; RESET SESSION AUTHORIZATION;
SET session_replication_role = replica;
INSERT INTO public.core_exam_results (attempt_id, apprenant_id, status, score, total, qrc_restantes, published_at)
SELECT attempt_id, apprenant_id, CASE WHEN qrc_restantes = 0 THEN 'definitif' ELSE 'provisoire' END, score20, total, qrc_restantes,
       CASE WHEN qrc_restantes = 0 THEN now() END FROM calc;
"""))
    assert code == 0, out[-1500:]
    # Défauts injectés (états dérivés incohérents) sur des copies du nouveau correcteur avec barème.
    code, out = pg.sql(f"""
SET session_replication_role = replica;
WITH c AS (SELECT r.attempt_id FROM public.core_exam_results r JOIN public.exam_attempts_v2 t USING (attempt_id)
           WHERE NOT t.snapshot ? 'source_historique' AND r.qrc_restantes = 0 ORDER BY r.attempt_id LIMIT {N_DIV})
UPDATE public.core_exam_results r SET score = r.score + 1 FROM c WHERE c.attempt_id = r.attempt_id;
WITH c AS (SELECT r.attempt_id FROM public.core_exam_results r JOIN public.exam_attempts_v2 t USING (attempt_id)
           WHERE NOT t.snapshot ? 'source_historique' AND r.qrc_restantes = 0 ORDER BY r.attempt_id DESC LIMIT {N_FANT})
UPDATE public.core_exam_results r SET status = 'provisoire', qrc_restantes = 2, published_at = NULL FROM c WHERE c.attempt_id = r.attempt_id;
SET session_replication_role = origin;
ANALYZE;
""")
    assert code == 0, out[-1500:]


class Lots(m.EB3):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        for part in (ANCIEN, SYNC, AVANT):
            code, out = cls.pg.sql(part)
            assert code == 0, out[-800:]
        charger_volumetrie(cls.pg)
        code, out = cls.pg.sql(LOTS)
        assert code == 0, out[-800:]

    def appel(self, fn, args, claims=ADMIN_C, prefixe="SET statement_timeout = '8s';"):
        t = time.time()
        code, out = self.pg.sql(ctx(claims, f"{prefixe} SELECT public.{fn}({args})::text;"))
        return code, (json.loads(self.last(out)) if code == 0 else out), time.time() - t

    def parcourir(self, fn, limite, prefixe="SET statement_timeout = '8s';", cle='attempt_id'):
        vus, lignes, scan, pages, durees, apres, total = set(), {}, 0, 0, [], None, None
        while True:
            p = f"'{apres}'" if apres else 'NULL'
            args = f"{p},{limite},NULL" if fn == 'eb_notes_diagnostic' else f"{p},{limite}"
            code, d, dt = self.appel(fn, args, prefixe=prefixe)
            self.assertEqual(code, 0, d)
            durees.append(dt)
            pages += 1
            scan += d['scannees']
            total = d.get('total', total)
            for l in d['lignes']:
                self.assertNotIn(l[cle], lignes, 'doublon entre lots')
                lignes[l[cle]] = l
            apres = d['suivant']
            if d.get('fini', apres is None):
                self.assertIsNone(apres)
                return dict(lignes=lignes, scan=scan, pages=pages, durees=durees, total=total)
            self.assertLess(pages, 5000)

    # 1. Reproduction : l'ancienne lecture des anciennes copies dépasse le plafond de 8 s dès la première page.
    def test_1_reproduction_ancienne_version_timeout(self):
        code, out, dt = self.appel('eb_notes_diagnostic_ancien_avant', 'NULL,800')
        self.assertNotEqual(code, 0)
        self.assertIn('statement timeout', out)
        print(f"\n[reproduction] ancienne version : délai dépassé après {dt:.1f} s (identique à la capture)")

    # 2. Nouveau diagnostic : exhaustif, chaque lot sous le plafond, aucun doublon ni oubli, constats exacts.
    def test_2_nouveau_correcteur_exhaustif_sous_plafond(self):
        r = self.parcourir('eb_notes_diagnostic', 50)
        total = int(self.pg.sql("SELECT count(*) FROM public.exam_attempts_v2 WHERE NOT coalesce(is_test,false)")[1])
        self.assertEqual((r['scan'], r['total']), (total, total))
        types = {}
        for l in r['lignes'].values():
            types[l['type']] = types.get(l['type'], 0) + 1
        self.assertEqual(types.get('note_divergente'), N_DIV)
        self.assertEqual(types.get('attente_fantome'), N_FANT)
        self.assertEqual(types.get('importee_sans_bareme_qrc_restantes'), N_SANS_BAREME)
        self.assertNotIn('identite_incoherente', types)
        self.assertLess(max(r['durees']), 8)
        print(f"\n[nouveau] {r['scan']} copies en {r['pages']} lots, max {max(r['durees']):.2f} s, total {sum(r['durees']):.1f} s, constats {types}")

    def test_3_anciennes_copies_exhaustives_sous_plafond(self):
        r = self.parcourir('eb_notes_diagnostic_ancien', 200, cle='result_id')
        self.assertEqual((r['scan'], r['total']), (N_ANC, N_ANC))
        self.assertEqual(len(r['lignes']), N_ANC - N_IMP - N_ANC_CORRIGEES)
        self.assertLess(max(r['durees']), 8)
        print(f"\n[anciennes] {r['scan']} copies en {r['pages']} lots, max {max(r['durees']):.2f} s, {len(r['lignes'])} sans correction humaine")

    # 4. Budget forcé à 1 ms : 1 copie par appel, reprise au curseur, même résultat final que sans budget.
    def test_4_budget_force_reprise_sans_doublon_ni_oubli(self):
        code, d, _ = self.appel('eb_notes_diagnostic', 'NULL,100,NULL', prefixe="SET statement_timeout = '8s'; SET eb_notes.budget_ms = '1';")
        self.assertEqual(code, 0, d)
        self.assertTrue(d['interrompu_budget'])
        self.assertFalse(d['fini'])
        self.assertGreaterEqual(d['scannees'], 1)
        # Un réglage ne peut pas allonger le budget au-delà de 3 s.
        code, d2, _ = self.appel('eb_notes_diagnostic', 'NULL,100,NULL', prefixe="SET statement_timeout = '8s'; SET eb_notes.budget_ms = '999999';")
        self.assertEqual(code, 0, d2)
        self.assertLessEqual(d2['duree_ms'], 3600)
        # Parcours de l'ancien circuit entièrement sous budget forcé de 30 ms : même ensemble que le parcours normal.
        force = self.parcourir('eb_notes_diagnostic_ancien', 200, prefixe="SET statement_timeout = '8s'; SET eb_notes.budget_ms = '30';", cle='result_id')
        normal = self.parcourir('eb_notes_diagnostic_ancien', 200, cle='result_id')
        self.assertGreater(force['pages'], normal['pages'])
        self.assertEqual(set(force['lignes']), set(normal['lignes']))
        self.assertEqual(force['scan'], N_ANC)

    # 5. Mêmes constats que la version précédente (aucune règle changée), sur toutes les copies.
    def test_5_equivalence_avec_version_precedente(self):
        avant = self.parcourir('eb_notes_diagnostic_avant', 500, prefixe='')
        apres = self.parcourir('eb_notes_diagnostic', 100)
        norm = lambda d: {k: (v['type'], v['reparable'], json.dumps(v['stocke'], sort_keys=True), json.dumps(v['attendu'], sort_keys=True)) for k, v in d.items()}
        self.assertEqual(norm(avant['lignes']), norm(apres['lignes']))
        # Ancien circuit : comparaison sur la plage de la première page de l'ancienne version (sans plafond, base jetable).
        code, a, _ = self.appel('eb_notes_diagnostic_ancien_avant', 'NULL,300', prefixe='')
        self.assertEqual(code, 0, a)
        borne = a['suivant']
        nouv = self.parcourir('eb_notes_diagnostic_ancien', 200, cle='result_id')
        dans = {k: v for k, v in nouv['lignes'].items() if k <= borne}
        self.assertEqual({l['result_id']: l for l in a['lignes']}, dans)

    def test_6_droits_admin_seulement(self):
        for fn, args in (('eb_notes_diagnostic', 'NULL,50,NULL'), ('eb_notes_diagnostic_ancien', 'NULL,50')):
            code, out, _ = self.appel(fn, args, claims=ELEVE_C)
            self.assertNotEqual(code, 0)
            self.assertIn('administrateur', out)
            code, out = self.pg.sql(ctx({'role': 'anon'}, f"SELECT public.{fn}({args});", role='anon'))
            self.assertNotEqual(code, 0)

    # 7. Lecture seule : empreinte complète identique avant/après plusieurs parcours.
    def test_7_lecture_seule(self):
        q = ("SELECT md5(string_agg(x, ',' ORDER BY x)) FROM ("
             "SELECT attempt_id::text||status||coalesce(score::text,'')||qrc_restantes||result_revision AS x FROM public.core_exam_results UNION ALL "
             "SELECT qrc_instance_id::text||etat||coalesce(note::text,'') FROM public.qrc_instances_v2 UNION ALL "
             "SELECT attempt_id::text||question_id||valeur::text FROM public.answer_state UNION ALL "
             "SELECT id::text||md5(details::text) FROM public.apprenant_quiz_results) s")
        avant = self.pg.sql(q)[1]
        self.parcourir('eb_notes_diagnostic', 100)
        self.parcourir('eb_notes_diagnostic_ancien', 200, cle='result_id')
        self.assertEqual(self.pg.sql(q)[1], avant)
        self.assertEqual(self.pg.sql("SELECT count(*) FROM public.eb_notes_synchronisations")[1], '0')

    # 8. Corrections réelles concurrentes pendant la lecture : aucune erreur, aucun verrou bloquant.
    def test_8_concurrence_corrections_pendant_lecture(self):
        att, qrcs, *_ = self.preparer('snap_eb3_taxi.json')
        erreurs = []

        def corriger():
            for qi, p in qrcs:
                (code, out), _ = self.corriger(qi, p / 2)
                if code: erreurs.append(out)

        th = threading.Thread(target=corriger)
        th.start()
        r = self.parcourir('eb_notes_diagnostic', 100)
        th.join()
        self.assertEqual(erreurs, [])
        self.assertLess(max(r['durees']), 8)
        code, d, _ = self.appel('eb_notes_diagnostic', f"NULL,1,'{att}'")
        self.assertEqual((code, d['lignes'], d['fini']), (0, [], True))  # toutes corrigées : cohérente

    # 9. Rollback : définitions précédentes restaurées, puis réinstallation.
    def test_9_rollback(self):
        code, out = self.pg.sql(ROLLBACK)
        self.assertEqual(code, 0, out)
        src = self.pg.sql("SELECT pg_get_functiondef('public.eb_notes_diagnostic_ancien'::regproc)")[1]
        self.assertNotIn('budget', src)
        code, out = self.pg.sql(LOTS)
        self.assertEqual(code, 0, out)
        self.assertIn('budget', self.pg.sql("SELECT pg_get_functiondef('public.eb_notes_diagnostic_ancien'::regproc)")[1])


if __name__ == '__main__':
    unittest.main(verbosity=2)
