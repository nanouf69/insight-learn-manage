"""Preuve de liaison ciblée v2 (copies suffixées __tN, colonne tentative à 1) — PostgreSQL jetable uniquement.

Rejoue la migration réellement candidate (PATCH + BACKFILL) sur des copies fictives portant les cinq
identifiants de résultat nommés le 10/11, puis vérifie : preuve atomique, re-vérification live,
append-only, absence d'assouplissement global, notes/verdicts, rollback.
"""
import pathlib, json, uuid, unittest, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from contrat_notation import Contrat, lit, ADMIN, AUTRE, APP
from contrat_audit_permutation import JOURNAL, CATALOGUE, DONNEES

ROOT = pathlib.Path(__file__).resolve().parents[3] / 'docs/sql-revue'
PATCH = (ROOT / '2026-11-10-qrc-liaison-v2-PATCH.sql').read_text()
BACKFILL = (ROOT / '2026-11-10-qrc-liaison-v2-BACKFILL.sql').read_text()
ROLLBACK = (ROOT / '2026-11-10-qrc-liaison-v2-ROLLBACK.sql').read_text()

# Identifiants des cinq résultats nommés dans le rapport (données ici entièrement fictives).
IDS = {'t3p': 'eb1e925b-53ee-4995-8cf2-df3cebdcc478', 'gestion': '7e9d1b67-f6de-4ab0-a8e0-b43ecfd7cf22',
       'francais': '2fa844d9-1e7d-4b66-b2fd-3c38c6088bce', 'reglementation_vtc': 'd1dc3592-95eb-4a95-aed6-0e04b0a8b9e5',
       'reglementation_vtc2': '65ff5584-95cc-4e12-a926-543d809c186c'}
PERMUTEES = {'t3p', 'reglementation_vtc'}


class Base(Contrat):
    def setUp(self):
        super().setUp()
        self.pg.sql(JOURNAL)
        self.pg.sql(ROLLBACK)          # définitions live exactes
        self.prod = self.pg.sql(CATALOGUE)
        self.pg.sql(PATCH)

    def cinq(self, skip_journal=(), autre_journal=(), qrc_diff=(), remise_t3=()):
        """Cinq copies tentative 3 dont la remise porte __t3 et tentative=1 (défaut de colonne)."""
        snap = [{'id': '1', 'type': 'QRC', 'points': 2}, {'id': '2', 'type': 'QRC', 'points': 2},
                {'id': '3', 'type': 'QCM', 'points': 1}, {'id': '4', 'type': 'QCM', 'points': 1}]
        questions = [{'questionId': 1, 'type': 'QRC'}, {'questionId': 2, 'type': 'QRC'},
                     {'questionId': 3, 'type': 'QCM', 'reponseCorrecte': ['A', 'B']},
                     {'questionId': 4, 'type': 'QCM', 'reponseCorrecte': ['C']}]
        for m, rid in IDS.items():
            rep = {'1': 'texte A', '2': 'texte B', '3': ['A', 'B'], '4': ['A']}
            sub = dict(rep, **({'3': ['B', 'A']} if m in PERMUTEES else {}))
            if m in qrc_diff: sub['1'] = 'texte a'
            details = {'snapshot': {'questions': snap}, 'questions': questions, 'reponses': rep,
                       'correctionsIA': {'1': {'pointsObtenus': 0}, '2': {'pointsObtenus': 0}}}
            self.pg.sql(f"INSERT INTO apprenant_quiz_results VALUES('{rid}','{APP}','EB2','examen_blanc',{lit(m)},3,"
                        f"{lit(json.dumps(details))}::jsonb,'2026-11-09T13:23:10.241Z',1,6,3.3,false)")
            self.pg.sql(f"INSERT INTO reponses_apprenants(apprenant_id,exercice_id,tentative,reponses,completed,status,submitted_at) "
                        f"VALUES('{APP}','EB2__{m}__t3',{3 if m in remise_t3 else 1},{lit(json.dumps(sub))}::jsonb,true,'submitted','2026-11-09T13:23:09.6Z')")
            if m not in skip_journal:
                self.pg.sql(f"INSERT INTO reponses_apprenants_journal(apprenant_id,exercice_id,question_id,valeur,tentative) "
                            f"VALUES('{APP}','EB2__{m}__t3','1','\"texte A\"',3)")
            if m in autre_journal:
                self.pg.sql(f"INSERT INTO reponses_apprenants_journal(apprenant_id,exercice_id,question_id,valeur,tentative) "
                            f"VALUES('{APP}','EB2__{m}__t3','1','\"x\"',1)")

    def preflight(self, rid, uid=ADMIN):
        return json.loads(self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SELECT qrc_historique_preuve_remise('{rid}')").splitlines()[-1])

    def preuves(self): return int(self.pg.sql('SELECT count(*) FROM qrc_historique_liaisons_remise'))


class PreuveAtomique(Base):
    def test_cinq_copies_prouvees_sans_toucher_aux_donnees(self):
        self.cinq()
        avant = self.pg.sql(DONNEES)
        self.pg.sql(BACKFILL)
        self.assertEqual(5, self.preuves())
        self.assertEqual(avant, self.pg.sql(DONNEES))            # aucun champ tentative/réponse réécrit
        self.assertEqual('1', self.pg.sql("SELECT DISTINCT tentative FROM reponses_apprenants"))
        for rid in IDS.values():
            self.assertEqual('liaison_prouvee', self.preflight(rid)['provenance'])

    def _refus(self, **kw):
        self.cinq(**kw)
        avant = self.pg.sql(DONNEES)
        with self.assertRaisesRegex(RuntimeError, 'Liaison non prouvée'):
            self.pg.sql('BEGIN;' + BACKFILL + 'COMMIT;')
        self.assertEqual(0, self.preuves())                      # tout ou rien
        self.assertEqual(avant, self.pg.sql(DONNEES))

    def test_journal_absent_refuse(self): self._refus(skip_journal={'gestion'})
    def test_journal_autre_tentative_refuse(self): self._refus(autre_journal={'francais'})
    def test_qrc_differente_refusee(self): self._refus(qrc_diff={'reglementation_vtc2'})
    def test_tentative_renseignee_hors_cas_cible(self): self._refus(remise_t3={'t3p'})

    def test_lien_v2_refuse(self):
        self.cinq()
        self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES(gen_random_uuid(),'{APP}','EB2',jsonb_build_object('result_id','{IDS['t3p']}'))")
        with self.assertRaisesRegex(RuntimeError, 'Liaison non prouvée'): self.pg.sql('BEGIN;' + BACKFILL + 'COMMIT;')
        self.assertEqual(0, self.preuves())

    def test_resultat_double_refuse(self):
        self.cinq()
        self.pg.sql(f"INSERT INTO apprenant_quiz_results SELECT gen_random_uuid(),apprenant_id,quiz_id,quiz_type,matiere_id,tentative,details,completed_at,score_obtenu,score_max,note_sur_20,reussi FROM apprenant_quiz_results WHERE id='{IDS['gestion']}'")
        with self.assertRaisesRegex(RuntimeError, 'Liaison non prouvée'): self.pg.sql('BEGIN;' + BACKFILL + 'COMMIT;')

    def test_backfill_rejouable(self):
        self.cinq(); self.pg.sql(BACKFILL); self.pg.sql(BACKFILL)
        self.assertEqual(5, self.preuves())


class Notation(Base):
    def setUp(self):
        super().setUp(); self.cinq(); self.pg.sql(BACKFILL)

    def test_notation_un_clic_sans_reconnaissance_persistance_et_verdict(self):
        rid = IDS['t3p']; avant = self.ligne(rid)
        r = self.noter(rid, '1', 1.5, 1)
        self.assertEqual('liaison_prouvee', r['provenance'])
        apres = self.ligne(rid)
        for k in ('reponses', 'snapshot', 'questions'): self.assertEqual(avant['details'][k], apres['details'][k])
        self.assertEqual(2.5, float(apres['score_obtenu'])); self.assertEqual(8.3, float(apres['note_sur_20']))
        self.assertEqual(apres, self.ligne(rid))                  # relecture identique
        r2 = self.noter(rid, '2', 2, apres['score_obtenu'])
        fin = self.ligne(rid)
        self.assertTrue(r2['matiere_complete']); self.assertEqual(15.0, float(fin['note_sur_20'])); self.assertTrue(fin['reussi'])
        self.assertTrue(self.pg.sql(f"SELECT qrc_historique_liaison_prouvee('{rid}')") == 't')  # preuve toujours valide après notation

    def test_revision_append_only(self):
        rid = IDS['francais']
        self.noter(rid, '1', 1, 1)
        r = self.reviser(rid, '1', 2, 1, self.ligne(rid)['score_obtenu'])
        self.assertEqual('liaison_prouvee', r['provenance'])
        self.assertEqual('2', self.pg.sql(f"SELECT count(*) FROM qrc_historique_corrections WHERE result_id='{rid}'"))

    def test_revalidation_live_refuse_toute_derive(self):
        for m, mut in (('gestion', "UPDATE reponses_apprenants SET reponses=jsonb_set(reponses,'{1}','\"autre\"') WHERE exercice_id='EB2__gestion__t3'"),
                       ('francais', f"UPDATE apprenant_quiz_results SET details=jsonb_set(details,'{{snapshot,questions,0,points}}','3') WHERE id='{IDS['francais']}'"),
                       ('reglementation_vtc2', "UPDATE reponses_apprenants SET apprenant_id=gen_random_uuid() WHERE exercice_id='EB2__reglementation_vtc2__t3'"),
                       ('t3p', "UPDATE reponses_apprenants SET status='draft' WHERE exercice_id='EB2__t3p__t3'")):
            self.pg.sql(mut)
            avant = self.ligne(IDS[m])
            self.assertEqual('f', self.pg.sql(f"SELECT qrc_historique_liaison_prouvee('{IDS[m]}')"), m)
            with self.assertRaises(RuntimeError): self.noter(IDS[m], '1', 1, 1, reco='forcé')
            self.assertEqual(avant, self.ligne(IDS[m]))

    def test_append_only_et_permissions(self):
        for q in ("UPDATE qrc_historique_liaisons_remise SET motif='x'", "DELETE FROM qrc_historique_liaisons_remise",
                  "TRUNCATE qrc_historique_liaisons_remise"):
            with self.assertRaisesRegex(RuntimeError, 'append-only'): self.pg.sql(q)
        self.assertEqual(5, self.preuves())
        with self.assertRaises(RuntimeError):
            self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ADMIN}'; SELECT qrc_historique_liaison_prouvee('{IDS['t3p']}')")
        with self.assertRaises(RuntimeError):
            self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ADMIN}'; INSERT INTO qrc_historique_liaisons_remise(result_id) VALUES(gen_random_uuid())")
        self.assertEqual('0', self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{AUTRE}'; SELECT count(*) FROM qrc_historique_liaisons_remise"))
        self.assertEqual('5', self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ADMIN}'; SELECT count(*) FROM qrc_historique_liaisons_remise"))
        with self.assertRaisesRegex(RuntimeError, 'Administrateur'): self.noter(IDS['t3p'], '1', 1, 1, uid=AUTRE)


class PasDAssouplissementGlobal(Base):
    def test_meme_motif_sans_preuve_reste_refuse(self):
        # Autre copie suffixée __t3 / tentative=1, réponses identiques, journal présent, mais aucune preuve enregistrée.
        rid = str(uuid.uuid4())
        rep = {'1': 'x', '3': ['A', 'B']}
        det = {'snapshot': {'questions': [{'id': '1', 'type': 'QRC', 'points': 2}, {'id': '3', 'type': 'QCM', 'points': 1}]},
               'questions': [{'questionId': 1, 'type': 'QRC'}, {'questionId': 3, 'type': 'QCM', 'reponseCorrecte': ['A', 'B']}],
               'reponses': rep, 'correctionsIA': {}}
        self.pg.sql(f"INSERT INTO apprenant_quiz_results VALUES('{rid}','{AUTRE}','EB2','examen_blanc','t3p',3,{lit(json.dumps(det))}::jsonb,now(),1,3,6.7,false)")
        self.pg.sql(f"INSERT INTO reponses_apprenants(apprenant_id,exercice_id,tentative,reponses,completed,status,submitted_at) VALUES('{AUTRE}','EB2__t3p__t3',1,{lit(json.dumps(rep))}::jsonb,true,'submitted',now())")
        self.pg.sql(f"INSERT INTO reponses_apprenants_journal(apprenant_id,exercice_id,question_id,valeur,tentative) VALUES('{AUTRE}','EB2__t3p__t3','1','\"x\"',3)")
        self.assertEqual('resultat_seul', self.preflight(rid)['provenance'])
        with self.assertRaisesRegex(RuntimeError, 'Remise non prouvée'): self.noter(rid, '1', 1, 1, reco='vérifié')
        self.assertEqual(0, self.preuves())

    def test_preuve_dune_copie_ne_sert_pas_a_une_autre(self):
        self.cinq(); self.pg.sql(BACKFILL)
        rid = str(uuid.uuid4())
        self.pg.sql(f"INSERT INTO apprenant_quiz_results SELECT '{rid}',apprenant_id,quiz_id,quiz_type,matiere_id,4,details,completed_at,score_obtenu,score_max,note_sur_20,reussi FROM apprenant_quiz_results WHERE id='{IDS['t3p']}'")
        self.assertEqual('f', self.pg.sql(f"SELECT qrc_historique_liaison_prouvee('{rid}')"))
        with self.assertRaises(RuntimeError): self.noter(rid, '1', 1, 1, reco='vérifié')


class Rollback(Base):
    def test_aller_retour_code_seul_preuves_et_notes_conservees(self):
        self.cinq(); self.pg.sql(BACKFILL)
        self.noter(IDS['gestion'], '1', 1, 1)
        donnees = self.pg.sql(DONNEES)
        journal = self.pg.sql("SELECT md5(string_agg(to_jsonb(j)::text,'|' ORDER BY id)) FROM qrc_historique_corrections j")
        self.pg.sql(ROLLBACK)
        self.assertEqual(self.prod, self.pg.sql(CATALOGUE))
        self.assertEqual(donnees, self.pg.sql(DONNEES))
        self.assertEqual(journal, self.pg.sql("SELECT md5(string_agg(to_jsonb(j)::text,'|' ORDER BY id)) FROM qrc_historique_corrections j"))
        self.assertEqual(5, self.preuves())
        # Après retour arrière : comportement live d'origine (aucune preuve consultée).
        with self.assertRaisesRegex(RuntimeError, 'Remise ambiguë'): self.noter(IDS['t3p'], '1', 1, 1)
        self.pg.sql(PATCH); self.pg.sql(ROLLBACK)
        self.assertEqual(self.prod, self.pg.sql(CATALOGUE))


if __name__ == '__main__': unittest.main(verbosity=2)
