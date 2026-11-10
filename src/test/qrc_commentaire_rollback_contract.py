import sys, pathlib, unittest
sys.path.insert(0, str(__import__('pathlib').Path(__file__).parent))
import eb3_correction_v2_contract as m
R = pathlib.Path(__file__).resolve().parents[2] / 'docs/sql-revue'
CAT = "SELECT md5(string_agg(proname||md5(pg_get_functiondef(p.oid))||coalesce(array_to_string(proacl,','),''),'|' ORDER BY proname)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname NOT IN ('core_commenter_qrc')"
class T(m.EB3):
    def test_zz_rollback_puis_reapplication(self):
        att, qrcs, *_ = self.preparer('snap_eb3_vtc_gestion.json')
        qi, pts = qrcs[0]; self.corriger(qi, 1)
        (c, o), _ = self.commenter(qi, 1, self.dernier_ev(qi), 'Précisez !!!'); self.assertEqual(c, 0, o)
        avant_cat = self.pg.sql(CAT)[1]; nb = self.pg.sql("SELECT count(*) FROM qrc_correction_events")[1]; emp = self.empreinte(att)
        c, o = self.pg.sql((R/'2026-11-10-qrc-commentaire-seul-ROLLBACK.sql').read_text()); self.assertEqual(c, 0, o)
        self.assertEqual(self.pg.sql("SELECT count(*) FROM pg_proc WHERE proname='core_commenter_qrc'")[1], '0')
        self.assertEqual(avant_cat, self.pg.sql(CAT)[1])   # autres fonctions/droits identiques
        self.assertEqual(nb, self.pg.sql("SELECT count(*) FROM qrc_correction_events")[1]); self.assertEqual(emp, self.empreinte(att))
        # Correction normale toujours fonctionnelle après retour arrière.
        (c, o), _ = self.corriger(qrcs[1][0], 0); self.assertEqual(c, 0, o)
        c, o = self.pg.sql((R/'2026-11-10-qrc-commentaire-seul.sql').read_text().split('CREATE OR REPLACE FUNCTION public.qrc_historique_commenter')[0]); self.assertEqual(c, 0, o)
        (c, o), _ = self.commenter(qi, 1, self.dernier_ev(qi), 'Précisez !!!\nMal dit !!!'); self.assertEqual(c, 0, o)
if __name__ == '__main__':
    unittest.main(argv=['x', 'T.test_zz_rollback_puis_reapplication'], verbosity=2)
