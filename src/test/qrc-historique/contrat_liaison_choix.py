"""Prepared live RPC patch exercised only on disposable PostgreSQL."""
import pathlib, json, unittest, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from contrat_notation import Contrat, lit, ADMIN, APP
PATCH = pathlib.Path(__file__).resolve().parents[3] / 'docs/sql-revue/2026-11-10-qrc-liaison-choix-ordre.sql'

class Liaison(Contrat):
    def setUp(self):
        super().setUp()
        self.pg.sql(PATCH.read_text())

    def test_remise_ambigue_exige_confirmation_tracee(self):
        rid,s=self.copie(remise='decalee')
        r=self.noter(rid,'1',1,s)
        self.assertEqual('remise_horodatage_divergent',r['provenance'])
        rid2,s2=self.copie(remise=None,matiere='autre')
        with self.assertRaisesRegex(RuntimeError,'Remise non prouvée'): self.noter(rid2,'1',1,s2,reco='confirmation inventée')

    def test_permutation_relecture_persistance_note_et_preuves(self):
        rid,s=self.copie()
        before=self.ligne(rid)
        self.pg.sql(f"UPDATE reponses_apprenants SET reponses=jsonb_set(reponses,'{{3}}','[\"A\",\"B\"]')")
        r=self.noter(rid,'1',1,s)
        self.assertEqual('remise_identique',r['provenance'])
        after=self.ligne(rid)
        self.assertEqual(1, after['details']['correctionsIA']['1']['pointsObtenus'])
        self.assertEqual(2.5,float(after['score_obtenu']))
        for k in ('reponses','snapshot','questions'): self.assertEqual(before['details'][k],after['details'][k])
        reread=self.ligne(rid)
        self.assertEqual(after,reread)
        self.noter(rid,'2',2,after['score_obtenu'])
        self.assertEqual(13.3,float(self.ligne(rid)['note_sur_20']))

    def test_qrc_different_refuse_meme_avec_confirmation(self):
        rid,s=self.copie()
        before=self.ligne(rid)
        self.pg.sql("UPDATE reponses_apprenants SET reponses=jsonb_set(reponses,'{1}','\"texte AUTRE\"')")
        with self.assertRaisesRegex(RuntimeError,'Remise non prouvée'): self.noter(rid,'1',1,s,reco='vérifié')
        self.assertEqual(before,self.ligne(rid))

    def test_preflight_proprietaire_et_tentative(self):
        rid,s=self.copie()
        proof=json.loads(self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ADMIN}'; SELECT qrc_historique_preuve_remise('{rid}')").splitlines()[-1])
        self.assertEqual(APP,proof['apprenant_id']);self.assertEqual(rid,proof['result_id'])
        self.pg.sql("UPDATE reponses_apprenants SET tentative=2")
        with self.assertRaisesRegex(RuntimeError,'Remise non prouvée'):self.noter(rid,'1',1,s)

if __name__ == '__main__': unittest.main()