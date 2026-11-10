"""Contrat « Actualiser les notes » (diagnostic + actualisation des états dérivés) — PostgreSQL JETABLE uniquement.

Réutilise le banc EB3 (définitions de production relevées le 10/11/2026, sujets EB3 VTC Gestion et TAXI réels,
aucune donnée élève) puis charge docs/sql-revue/2026-11-10-eb-notes-synchronisation.sql.
Usage : python3 src/test/eb_notes_synchronisation_contract.py
"""
import json, pathlib, subprocess, sys, threading, unittest, uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import eb3_correction_v2_contract as m  # noqa: E402

m.PORT = 55492
ROOT = m.ROOT
SQL = (ROOT / 'docs/sql-revue/2026-11-10-eb-notes-synchronisation.sql').read_text()
ROLLBACK = (ROOT / 'docs/sql-revue/2026-11-10-eb-notes-synchronisation-ROLLBACK.sql').read_text()
ctx, ADMIN_C, ELEVE_C, APP, APP2, lit = m.ctx, m.ADMIN_C, m.ELEVE_C, m.APP, m.APP2, m.lit

ANCIEN = """
CREATE TABLE public.apprenant_quiz_results (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), apprenant_id uuid, quiz_type text, quiz_id text,
  matiere_id text, matiere_nom text, score_obtenu numeric, tentative integer DEFAULT 1, details jsonb, completed_at timestamptz);
CREATE TABLE public.qrc_historique_corrections (id bigint GENERATED ALWAYS AS IDENTITY, result_id uuid, question_id text, note numeric);
CREATE OR REPLACE FUNCTION public.qrc_historique_valide(c jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT jsonb_typeof(c) = 'object' AND (c->>'validatedByAdmin' = 'true' OR c->>'manuel' = 'true' OR coalesce(c->>'correctedBy','') LIKE 'ia:%%') $$;
UPDATE public.apprenants SET nom = 'CANDIDAT', prenom = 'Un' WHERE id = '%s';
UPDATE public.apprenants SET nom = 'CANDIDAT', prenom = 'Deux' WHERE id = '%s';
""" % (APP, APP2)


class Sync(m.EB3):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        for part in (ANCIEN, SQL):
            code, out = cls.pg.sql(part)
            assert code == 0, out[-800:]

    # --- outils ---
    def diag(self, att=None, claims=ADMIN_C, apres=None, limite=500):
        a = f"'{att}'" if att else 'NULL'
        p = f"'{apres}'" if apres else 'NULL'
        code, out = self.pg.sql(ctx(claims, f"SELECT public.eb_notes_diagnostic({p},{limite},{a})::text;"))
        return code, (json.loads(self.last(out)) if code == 0 else out)

    def actualiser(self, att, rev, op=None, claims=ADMIN_C):
        op = op or str(uuid.uuid4())
        r = 'NULL' if rev is None else str(rev)
        code, out = self.pg.sql(ctx(claims, f"SELECT public.eb_notes_actualiser('{op}','{att}',{r})::text;"))
        return code, (json.loads(self.last(out)) if code == 0 else out), op

    def ligne(self, att):
        code, d = self.diag(att)
        self.assertEqual(code, 0, d)
        return d['lignes'][0] if d['lignes'] else None

    def empreinte(self, att):
        return self.pg.sql(f"SELECT md5(coalesce((SELECT string_agg(qrc_instance_id||etat||coalesce(note::text,''),',' ORDER BY qrc_instance_id) FROM public.qrc_instances_v2 WHERE attempt_id='{att}'),'')"
                           f"||coalesce((SELECT string_agg(question_id||valeur::text,',' ORDER BY question_id) FROM public.answer_state WHERE attempt_id='{att}'),''))")[1]

    def corriger_tout(self, qrcs):
        for qi, p in qrcs:
            (code, out), _ = self.corriger(qi, p / 2)
            self.assertEqual(code, 0, out)

    def falsifier(self, att, sets):
        # Simulation d'un état dérivé incohérent (écriture directe hors application, base jetable seulement).
        code, out = self.pg.sql(f"UPDATE public.core_exam_results SET {sets} WHERE attempt_id='{att}'")
        self.assertEqual(code, 0, out)

    # --- tests ---
    def test_droits_admin_seulement(self):
        att, *_ = self.preparer('snap_eb3_taxi.json')
        self.assertNotEqual(self.diag(att, claims=ELEVE_C)[0], 0)
        code, out, _ = self.actualiser(att, None, claims=ELEVE_C)
        self.assertNotEqual(code, 0)
        self.assertIn('42501', out) if 'SQLSTATE' in out else self.assertIn('administrateur', out)
        code, out = self.pg.sql(ctx({'role': 'anon'}, "SELECT public.eb_notes_diagnostic(NULL,10,NULL);", role='anon'))
        self.assertNotEqual(code, 0)

    def test_attente_legitime_puis_coherent_taxi_et_vtc(self):
        for snap in ('snap_eb3_taxi.json', 'snap_eb3_vtc_gestion.json'):
            att, qrcs, *_ = self.preparer(snap)
            (code, out), _ = self.corriger(qrcs[0][0], 0)
            self.assertEqual(code, 0, out)
            l = self.ligne(att)
            self.assertEqual((l['type'], l['reparable'], l['attendu']['qrc_restantes']), ('qrc_non_corrigee', False, len(qrcs) - 1))
            self.corriger_tout(qrcs[1:])
            self.assertIsNone(self.ligne(att), snap)  # toutes corrigées : ni attente, ni anomalie

    def test_attente_fantome_reparee_sans_changer_la_note(self):
        att, qrcs, *_ = self.preparer('snap_eb3_taxi.json')
        self.corriger_tout(qrcs)
        st, score, *_ = self.resultat(att)
        self.falsifier(att, "status='provisoire', qrc_restantes=2, published_at=NULL")
        avant = self.empreinte(att)
        l = self.ligne(att)
        self.assertEqual((l['type'], l['reparable']), ('attente_fantome', True))
        code, r, op = self.actualiser(att, l['result_revision'])
        self.assertEqual(code, 0, r)
        self.assertEqual((r['statut'], r['status'], r['qrc_restantes']), ('actualise', 'definitif', 0))
        st2, score2, rest2, pub2, rev2 = self.resultat(att)
        self.assertEqual((st2, score2, rest2, pub2), ('definitif', score, '0', 'true'))
        self.assertEqual(self.empreinte(att), avant)  # QRC, notes et réponses intactes
        # Double clic / F5 : même opération = même réponse, aucune nouvelle écriture.
        code, r2, _ = self.actualiser(att, l['result_revision'], op=op)
        self.assertEqual((code, r2.get('rejoue'), r2['result_revision']), (0, True, r['result_revision']))
        self.assertEqual(self.resultat(att)[4], rev2)
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.eb_notes_synchronisations WHERE attempt_id='{att}'")[1], '1')
        self.assertIsNone(self.ligne(att))
        # Journal append-only.
        self.assertNotEqual(self.pg.sql(f"UPDATE public.eb_notes_synchronisations SET motif='x' WHERE attempt_id='{att}'")[0], 0)
        self.assertNotEqual(self.pg.sql(f"DELETE FROM public.eb_notes_synchronisations WHERE attempt_id='{att}'")[0], 0)

    def test_definitif_avec_qrc_restantes_redevient_provisoire(self):
        att, qrcs, *_ = self.preparer('snap_eb3_vtc_gestion.json')
        (code, out), _ = self.corriger(qrcs[0][0], 1)
        self.assertEqual(code, 0, out)
        self.falsifier(att, "status='definitif', qrc_restantes=0, published_at=now()")
        l = self.ligne(att)
        self.assertEqual(l['type'], 'definitif_avec_qrc_restantes')
        code, r, _ = self.actualiser(att, l['result_revision'])
        self.assertEqual((code, r['status'], r['qrc_restantes']), (0, 'provisoire', len(qrcs) - 1))
        self.assertEqual(self.resultat(att)[3], 'false')

    def test_note_divergente_jamais_modifiee(self):
        att, qrcs, *_ = self.preparer('snap_eb3_taxi.json')
        self.corriger_tout(qrcs)
        self.falsifier(att, "score=score+1")
        score = self.resultat(att)[1]
        l = self.ligne(att)
        self.assertEqual((l['type'], l['reparable']), ('note_divergente', False))
        code, out, _ = self.actualiser(att, l['result_revision'])
        self.assertNotEqual(code, 0)
        self.assertIn('NOTE_DIVERGENTE', out)
        self.assertEqual(self.resultat(att)[1], score)

    def test_resultat_manquant_jamais_definitif_si_qrc_restantes(self):
        att, qrcs, *_ = self.preparer('snap_eb3_taxi.json')
        l = self.ligne(att)
        self.assertEqual((l['type'], l['reparable'], l['stocke']), ('resultat_manquant', True, None))
        code, r, _ = self.actualiser(att, None)
        self.assertEqual((code, r['status'], r['qrc_restantes']), (0, 'provisoire', len(qrcs)))
        self.assertEqual(self.ligne(att)['type'], 'qrc_non_corrigee')

    def test_cas_revision_perimee(self):
        att, qrcs, *_ = self.preparer('snap_eb3_taxi.json')
        self.corriger_tout(qrcs)
        self.falsifier(att, "status='provisoire'")
        l = self.ligne(att)
        code, out, _ = self.actualiser(att, l['result_revision'] - 1)
        self.assertNotEqual(code, 0)
        self.assertIn('P0409', out) if 'SQLSTATE' in out else self.assertIn('modifié', out)
        self.assertEqual(self.resultat(att)[0], 'provisoire')

    def test_copie_en_cours_refusee(self):
        att = str(uuid.uuid4())
        snap = json.loads((m.FIX / 'snap_eb3_taxi.json').read_text())
        self.pg.sql(f"INSERT INTO public.exam_attempts_v2 (attempt_id, apprenant_id, exam_id, snapshot, etat) VALUES ('{att}','{APP}','EB3-TAXI',{lit(json.dumps(snap, ensure_ascii=False))}::jsonb,'en_cours')")
        code, d = self.diag(att)
        self.assertEqual((code, d['en_cours'], d['lignes']), (0, 1, []))
        code, out, _ = self.actualiser(att, None)
        self.assertNotEqual(code, 0)
        self.assertIn('COPIE_NON_TERMINEE', out)

    def test_identite_incoherente_refusee(self):
        att, qrcs, *_ = self.preparer('snap_eb3_taxi.json')
        self.pg.sql(f"SET session_replication_role = replica; UPDATE public.qrc_instances_v2 SET apprenant_id='{APP2}' WHERE qrc_instance_id='{qrcs[0][0]}'")
        l = self.ligne(att)
        self.assertEqual((l['type'], l['reparable']), ('identite_incoherente', False))
        code, out, _ = self.actualiser(att, None)
        self.assertNotEqual(code, 0)
        self.assertIn('IDENTITE_INCOHERENTE', out)

    def _parallele(self, cmds):
        sorties = [None] * len(cmds)
        def run(i, c):
            sorties[i] = self.pg.sql(c)
        ts = [threading.Thread(target=run, args=(i, c)) for i, c in enumerate(cmds)]
        for t in ts: t.start()
        for t in ts: t.join()
        return sorties

    def test_concurrence_un_seul_gagnant_et_double_clic(self):
        att, qrcs, *_ = self.preparer('snap_eb3_taxi.json')
        self.corriger_tout(qrcs)
        self.falsifier(att, "status='provisoire', qrc_restantes=1")
        rev = self.ligne(att)['result_revision']
        lent = lambda op: ctx(ADMIN_C, f"SELECT public.eb_notes_actualiser('{op}','{att}',{rev})::text; SELECT pg_sleep(0.6);")
        s = self._parallele([lent(uuid.uuid4()), lent(uuid.uuid4())])
        ok = [c for c, _ in s if c == 0]
        self.assertEqual(len(ok), 1, s)
        self.assertTrue(any('P0409' in o or 'modifié' in o for c, o in s if c != 0), s)
        # Double clic simultané (même opération) : deux réponses identiques, une seule ligne de journal.
        self.falsifier(att, "status='provisoire', qrc_restantes=1")
        rev = self.ligne(att)['result_revision']
        op = uuid.uuid4()
        s = self._parallele([lent(op), lent(op)])
        self.assertEqual([c for c, _ in s], [0, 0], s)
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.eb_notes_synchronisations WHERE operation_id='{op}'")[1], '1')
        self.assertIsNone(self.ligne(att))

    def test_pagination_deterministe(self):
        for _ in range(3): self.preparer('snap_eb3_vtc_gestion.json')
        vus, apres, pages = [], None, 0
        while True:
            code, d = self.diag(apres=apres, limite=2)
            self.assertEqual(code, 0, d)
            pages += 1
            vus.append(d['scannees'])
            apres = d['suivant']
            if not apres: break
        total = int(self.pg.sql("SELECT count(*) FROM public.exam_attempts_v2 WHERE NOT is_test")[1])
        self.assertEqual(sum(vus), total)
        self.assertGreater(pages, 1)

    def test_ancien_circuit_signale_jamais_reparable(self):
        snap = {'questions': [{'id': 1, 'type': 'QRC', 'points': 2}, {'id': 2, 'type': 'QRC', 'points': 2}, {'id': 3, 'type': 'QCM', 'points': 1}]}
        rid, rid_ok = str(uuid.uuid4()), str(uuid.uuid4())
        for r, corr in ((rid, {'1': {'pointsObtenus': 0}}), (rid_ok, {'1': {'validatedByAdmin': True}, '2': {'manuel': True}})):
            code, out = self.pg.sql(f"INSERT INTO public.apprenant_quiz_results (id, apprenant_id, quiz_type, quiz_id, matiere_id, tentative, score_obtenu, completed_at, details) VALUES "
                                    f"('{r}','{APP}','examen_blanc','EB3-TAXI','t3p',2,0,now(),{lit(json.dumps({'snapshot': snap, 'correctionsIA': corr}))}::jsonb)")
            self.assertEqual(code, 0, out)
        code, out = self.pg.sql(ctx(ADMIN_C, "SELECT public.eb_notes_diagnostic_ancien(NULL, 1000)::text;"))
        self.assertEqual(code, 0, out)
        lignes = {l['result_id']: l for l in json.loads(self.last(out))['lignes']}
        self.assertIn(rid, lignes)
        self.assertNotIn(rid_ok, lignes)
        l = lignes[rid]
        self.assertEqual((l['qrc_sans_correction_humaine'], l['circuit_notation'], l['reparable'], l['tentative'], l['nom']), (2, 'aucun', False, 2, 'CANDIDAT'))
        # Correction auto non transformée : la copie reste signalée, aucune écriture.
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.qrc_historique_corrections WHERE result_id='{rid}'")[1], '0')
        self.assertNotEqual(self.pg.sql(ctx(ELEVE_C, "SELECT public.eb_notes_diagnostic_ancien(NULL, 10);"))[0], 0)

    def test_zz_rollback(self):
        code, out = self.pg.sql(ROLLBACK)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.pg.sql("SELECT count(*) FROM pg_proc WHERE proname LIKE 'eb_notes_%'")[1], '0')
        self.assertEqual(self.pg.sql("SELECT count(*) >= 0 FROM public.eb_notes_synchronisations")[1], 't')  # journal conservé
        code, out = self.pg.sql(SQL)  # réinstallation idempotente
        self.assertEqual(code, 0, out)


for _n in dir(m.EB3):
    if _n.startswith('test_'):
        setattr(Sync, _n, None)

if __name__ == '__main__':
    unittest.main(verbosity=2)
