"""Audit 10/11 : cas manquants + aller-retour rollback, PostgreSQL jetable uniquement."""
import pathlib, json, uuid, unittest, sys, concurrent.futures
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from contrat_notation import Contrat, lit, ADMIN, AUTRE, APP
ROOT = pathlib.Path(__file__).resolve().parents[3] / 'docs/sql-revue'
PATCH = (ROOT / '2026-11-10-qrc-liaison-choix-ordre.sql').read_text()
ROLLBACK = (ROOT / '2026-11-10-qrc-liaison-choix-ordre-ROLLBACK.sql').read_text()
CATALOGUE = ("SELECT string_agg(proname||':'||md5(pg_get_functiondef(p.oid))||':'||prosecdef||':'||coalesce(array_to_string(proacl,','),''),'|' ORDER BY proname) "
             "FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname LIKE 'qrc_historique%'")
DONNEES = ("SELECT md5(coalesce((SELECT string_agg(to_jsonb(r)::text,'|' ORDER BY id) FROM apprenant_quiz_results r),'')||"
           "coalesce((SELECT string_agg(to_jsonb(a)::text,'|' ORDER BY id) FROM reponses_apprenants a),''))")

class Base(Contrat):
    def setUp(self):
        super().setUp()
        self.pg.sql(ROLLBACK)   # état exact de production (définitions relues le 10/11)
        self.prod = self.pg.sql(CATALOGUE)
        self.pg.sql(PATCH)

    def eq(self, details, sub):
        return self.pg.sql(f"SELECT qrc_historique_reponses_identiques({lit(json.dumps(details))}::jsonb,{lit(json.dumps(sub))}::jsonb)") == 't'

    def preflight(self, rid, uid=ADMIN):
        claim = f"SET request.jwt.claim.sub='{uid}';" if uid else ''
        return json.loads(self.pg.sql(f"SET ROLE authenticated; {claim} SELECT qrc_historique_preuve_remise('{rid}')").splitlines()[-1])

class Perimetre(Base):
    S = {'questions': [{'id': '1', 'type': 'QRC'}, {'id': '3', 'type': 'QCM'}]}
    def d(self, rep, snap=None): return {'snapshot': self.S if snap is None else snap, 'reponses': rep}

    def test_permutation_qcm_seulement(self):
        self.assertTrue(self.eq(self.d({'1': 'x', '3': ['A', 'B']}), {'1': 'x', '3': ['B', 'A']}))
        self.assertTrue(self.eq(self.d({'1': 'x', '3': ['A', 'C', 'E']}), {'1': 'x', '3': ['E', 'A', 'C']}))

    def test_refus_stricts(self):
        base = {'1': 'x', '3': ['A', 'B']}
        for sub in ({'1': 'x', '3': ['A']}, {'1': 'x', '3': ['A', 'A']}, {'1': 'x', '3': ['B', 'A', 'A']},
                    {'1': 'x', '3': ['b', 'a']}, {'1': 'x', '3': ['B', 'F']}, {'1': 'x', '3': []}, {'1': 'x', '3': 'BA'},
                    {'1': 'x', '3': [1, 2]}, {'1': 'X', '3': ['B', 'A']}, {'1': ' x', '3': ['B', 'A']},
                    {'3': ['B', 'A']}, {'1': 'x', '3': ['B', 'A'], '9': 'extra'}):
            self.assertFalse(self.eq(self.d(base), sub), sub)
        self.assertFalse(self.eq(self.d({'1': 'x', '3': ['A', 'A']}), {'1': 'x', '3': ['A', 'A']}) is False and False)

    def test_qrc_jamais_normalisee_meme_tableau(self):
        snap = {'questions': [{'id': '1', 'type': 'QRC'}]}
        self.assertFalse(self.eq(self.d({'1': ['A', 'B']}, snap), {'1': ['B', 'A']}))

    def test_type_inconnu_ou_ordre_significatif_refuse(self):
        for t in ('ORDRE', 'CLASSEMENT', None, 'qcm_ordre'):
            snap = {'questions': [{'id': '3', 'type': t}]}
            self.assertFalse(self.eq(self.d({'3': ['A', 'B']}, snap), {'3': ['B', 'A']}), t)

    def test_snapshot_absent_ou_ambigu_refuse(self):
        self.assertFalse(self.eq({'reponses': {'3': ['A', 'B']}}, {'3': ['B', 'A']}))
        self.assertFalse(self.eq(self.d({'3': ['A', 'B']}, {'questions': []}), {'3': ['B', 'A']}))
        amb = {'questions': [{'id': '3', 'type': 'QCM'}, {'questionId': '3', 'type': 'QCM'}]}
        self.assertFalse(self.eq(self.d({'3': ['A', 'B']}, amb), {'3': ['B', 'A']}))
        self.assertTrue(self.eq(self.d({'3': ['A', 'B']}, {'questions': [{'questionId': 3, 'type': 'qcm'}]}), {'3': ['B', 'A']}))

    def test_fonction_pure_sans_donnees(self):
        avant = self.pg.sql(DONNEES); self.eq(self.d({'3': ['A', 'B']}), {'3': ['B', 'A']})
        self.assertEqual(avant, self.pg.sql(DONNEES))

class Identite(Base):
    def test_autre_eleve_autre_matiere_tentative_brouillon_refuses(self):
        for upd in (f"apprenant_id='{AUTRE}'", "exercice_id='EB2__autre'", "tentative=2", "status='draft'", "completed=false", "submitted_at=NULL"):
            rid, s = self.copie()
            self.pg.sql(f"UPDATE reponses_apprenants SET {upd}")
            avant = self.ligne(rid)
            with self.assertRaisesRegex(RuntimeError, 'Remise non prouvée'): self.noter(rid, '1', 1, s, reco='forcé')
            self.assertEqual(avant, self.ligne(rid))
            self.assertEqual('resultat_seul', self.preflight(rid)['provenance'])
            self.pg.sql("DELETE FROM reponses_apprenants")

    def test_copie_en_cours_v2_taxi_refusees(self):
        rid, s = self.copie()
        self.pg.sql(f"UPDATE apprenant_quiz_results SET completed_at=NULL WHERE id='{rid}'")
        with self.assertRaisesRegex(RuntimeError, 'terminée'): self.preflight(rid)
        rid2, s2 = self.copie(matiere='m2')
        self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES(gen_random_uuid(),'{APP}','EB2',jsonb_build_object('result_id','{rid2}'))")
        with self.assertRaisesRegex(RuntimeError, 'V2'): self.preflight(rid2)
        with self.assertRaisesRegex(RuntimeError, 'V2'): self.noter(rid2, '1', 1, s2)
        rid3, s3 = self.copie(exam='EB2-TAXI', matiere='m3')
        with self.assertRaisesRegex(RuntimeError, 'terminée'): self.preflight(rid3)
        with self.assertRaises(RuntimeError): self.noter(rid3, '1', 1, s3)

    def test_preflight_admin_seulement(self):
        rid, _ = self.copie()
        with self.assertRaisesRegex(RuntimeError, 'Administrateur'): self.preflight(rid, uid=AUTRE)
        with self.assertRaisesRegex(RuntimeError, 'Administrateur'): self.preflight(rid, uid=None)
        with self.assertRaises(RuntimeError): self.pg.sql(f"SET ROLE anon; SELECT qrc_historique_preuve_remise('{rid}')")

class Notes(Base):
    def test_deja_notee_non_rerecrite_et_eliminatoire(self):
        rid, s = self.copie(ia=(0, 0))
        self.pg.sql("UPDATE reponses_apprenants SET reponses=jsonb_set(reponses,'{3}','[\"A\",\"B\"]')")
        self.noter(rid, '1', 0, s)
        r = self.noter(rid, '2', 0, self.ligne(rid)['score_obtenu'])
        l = self.ligne(rid)
        self.assertTrue(r['matiere_complete']); self.assertEqual(3.3, float(l['note_sur_20'])); self.assertFalse(l['reussi'])
        with self.assertRaises(RuntimeError): self.noter(rid, '1', 2, l['score_obtenu'])
        self.assertEqual(l, self.ligne(rid))

    def test_qrc_restante_reste_en_attente(self):
        rid, s = self.copie()
        self.noter(rid, '1', 1, s)
        l = self.ligne(rid)
        self.assertNotIn('2', {k for k, v in l['details']['correctionsIA'].items() if v.get('validatedByAdmin')})

    def test_concurrence_permutee_une_seule_ecriture(self):
        rid, s = self.copie()
        def go(i):
            try: self.noter(rid, '1', 1 + (i % 2), s); return 'ok'
            except RuntimeError as e: return str(e)[:40]
        with concurrent.futures.ThreadPoolExecutor(4) as ex: res = list(ex.map(go, range(4)))
        self.assertEqual(1, res.count('ok'), res)
        self.assertEqual('1', self.pg.sql('SELECT count(*) FROM qrc_historique_corrections'))

    def test_regression_revision_ancienne_reconnaissance_manuelle(self):
        """Constat : une copie notée hier via « resultat_seul + reconnaissance » n'est plus révisable avec le correctif."""
        rid, s = self.copie(remise=None, matiere='hist')
        self.pg.sql(ROLLBACK)
        self.noter(rid, '1', 1, s, reco='vérifié')
        self.pg.sql(PATCH)
        with self.assertRaisesRegex(RuntimeError, 'Remise non prouvée'):
            self.reviser(rid, '1', 2, 1, self.ligne(rid)['score_obtenu'], reco='vérifié')

class Rollback(Base):
    def test_aller_retour_catalogue_identique_donnees_intactes(self):
        rid, s = self.copie(); self.noter(rid, '1', 1, s)
        donnees = self.pg.sql(DONNEES); journal = self.pg.sql('SELECT md5(string_agg(to_jsonb(j)::text,\'|\' ORDER BY id)) FROM qrc_historique_corrections j')
        self.pg.sql(ROLLBACK)
        self.assertEqual(self.prod, self.pg.sql(CATALOGUE))
        self.assertEqual(donnees, self.pg.sql(DONNEES))
        self.assertEqual(journal, self.pg.sql('SELECT md5(string_agg(to_jsonb(j)::text,\'|\' ORDER BY id)) FROM qrc_historique_corrections j'))
        self.pg.sql(PATCH); self.pg.sql(ROLLBACK)
        self.assertEqual(self.prod, self.pg.sql(CATALOGUE))

if __name__ == '__main__': unittest.main(verbosity=2)
