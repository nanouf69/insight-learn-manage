"""Activation contrôlée 505 sur PostgreSQL JETABLE (catalogue production figé + candidat SQL + lot exact).
Données fictives uniquement ; les 4 UUID du lot sont réutilisés sur des lignes FICTIVES pour prouver le ciblage.
Usage : python3 src/test/bilan_505_activation_contract.py
"""
import json, pathlib, unittest, uuid
from bilan_505_catalogue_prod_contract import load_db, Eleve, ANS, COMPLETE, MISSING, base_journal, autre, j, ROOT
from core_correction_securite_contract import as_ctx
LOT = (ROOT / 'docs/livraison-505/bilan_505_lot_4_copies.sql').read_text()
REAL = [('d5c2b4eb-c1df-48d6-8c90-80d257b6cf07', 'a12b358b-d833-4022-a956-5e3d7d0d5200', 'remise'),
        ('4d66a7f6-cc9e-4b0f-acce-006a8562bdb3', '4d676c71-f298-44c4-b504-ad2f64334114', 'remise'),
        ('cee4183a-4b52-4311-846c-a70442b3fbf1', 'f582fc9d-3003-4d8d-a619-d6373e70684c', 'recuperation'),
        ('a527fb4e-1596-403d-9ecf-229981139804', '10c15d2c-221f-428d-8076-fe9b1f43f7ab', 'recuperation')]
ADMIN = str(uuid.uuid4())

class Activation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = load_db(activer=False); cls.addClassCleanup(cls.pg.stop)
        cls.sql(f"INSERT INTO user_roles(user_id,role) VALUES('{ADMIN}','admin')")
    @classmethod
    def sql(cls, q):
        c, o = cls.pg.sql(q)
        if c: raise AssertionError(o)
        return o
    def assertEqual2(self, a, b): self.assertEqual(a, b)
    def as_user(self, uid, q): return self.pg.sql(as_ctx('authenticated', {'sub': uid, 'role': 'authenticated'}, q))
    def basculer(self, actif, motif='go test jetable', who=ADMIN):
        return self.as_user(who, f"SELECT bilan_505_remise_basculer({str(actif).lower()},{'NULL' if motif is None else repr(motif)});")
    def eligible(self, e, who=None):
        c, o = self.as_user(who or e.uid, f"SELECT bilan_505_remise_eligible('{e.app}');"); self.assertEqual(c, 0, o)
        return json.loads(o.splitlines()[-1])
    def setUp(self): self.assertEqual(self.basculer(False, 'remise à zéro du test')[0], 0)

    def test_01_off_by_default_everything_refused_row_untouched(self):
        self.assertEqual(self.sql("SELECT count(*) FROM bilan_505_remise_activation_journal"), '1')  # only setUp
        self.assertEqual(self.sql("SELECT actif FROM bilan_505_remise_activation"), 'f')
        e = Eleve(self, ANS, base_journal(ANS)); before = e.row()
        self.assertEqual(self.eligible(e), {'actif': False})
        c, o = e.rpc(f"SELECT bilan_505_remise_prepare('{e.app}');"); self.assertNotEqual(c, 0); self.assertIn('bilan505_desactive', o)
        p = {'id': e.rid, 'tentative': 1, 'write_seq': 40, 'reponses': ANS}
        for fn in ['bilan_505_remise_commit', 'bilan_505_recuperer_reponses']:
            c, o = e.commit(p, confirm=True, fn=fn); self.assertNotEqual(c, 0); self.assertIn('bilan505_desactive', o)
        self.assertEqual(e.row(), before)

    def test_02_switch_admin_only_with_reason_and_journal(self):
        e = Eleve(self, ANS, base_journal(ANS))
        c, o = self.basculer(True, who=e.uid); self.assertIn('bilan505_admin_requis', o)
        c, o = self.basculer(True, motif=None); self.assertIn('bilan505_motif_requis', o)
        c, o = self.basculer(True, motif='  '); self.assertIn('bilan505_motif_requis', o)
        self.assertEqual(self.sql("SELECT actif FROM bilan_505_remise_activation"), 'f')
        self.assertEqual(self.basculer(True)[0], 0)
        self.assertEqual(self.sql("SELECT actif||'|'||motif||'|'||par FROM bilan_505_remise_activation_journal ORDER BY id DESC LIMIT 1"), f't|go test jetable|{ADMIN}')
        c, o = self.as_user(e.uid, "SELECT count(*) FROM bilan_505_remise_copies"); self.assertEqual(o.splitlines()[-1], '0')  # learner reads nothing

    def test_03_not_allow_listed_learner_unchanged_even_when_on(self):
        self.basculer(True)
        e = Eleve(self, ANS, base_journal(ANS), mode=None); before = e.row()
        self.assertEqual(self.eligible(e), {'actif': False})
        c, o = e.rpc(f"SELECT bilan_505_remise_prepare('{e.app}');"); self.assertIn('bilan505_hors_lot', o)
        c, o = e.commit({'id': e.rid, 'tentative': 1, 'write_seq': 40, 'reponses': ANS}); self.assertIn('bilan505_hors_lot', o)
        self.assertEqual(e.row(), before)

    def test_04_other_account_learns_nothing(self):
        self.basculer(True)
        e = Eleve(self, ANS, base_journal(ANS)); other = str(uuid.uuid4())
        self.assertEqual(self.eligible(e, who=other), {'actif': False})
        self.assertEqual(self.eligible(e), {'actif': True, 'mode': 'remise'})

    def test_05_recuperation_mode_can_never_submit_even_with_full_key(self):
        self.basculer(True)
        copie = {**ANS, '505-37': []}
        e = Eleve(self, copie, base_journal(copie) + [('505-37', ANS['505-37'], '2026-11-13T20:38:00+00', '2026-11-13T20:38:01+00')], mode='recuperation')
        p = e.prepare(); self.assertEqual(p['grading_status'], 'verifiable')
        c, o = e.commit(p, confirm=True); self.assertIn('bilan505_hors_lot', o)
        self.assertEqual(e.row()['status'], 'in_progress')
        c, o = e.commit(p, confirm=True, fn='bilan_505_recuperer_reponses'); self.assertEqual(c, 0, o)
        r = e.row(); self.assertEqual((r['status'], r['score'], r['submitted_at'], r['reponses']['505-37']), ('in_progress', None, None, ANS['505-37']))

    def test_06_immediate_stop_between_prepare_and_click(self):
        self.basculer(True)
        e = Eleve(self, ANS, base_journal(ANS)); p = e.prepare(); before = e.row()
        self.assertEqual(self.basculer(False, 'arrêt immédiat test')[0], 0)
        c, o = e.commit(p); self.assertNotEqual(c, 0); self.assertIn('bilan505_desactive', o)
        self.assertEqual(e.row(), before); self.assertEqual(self.eligible(e), {'actif': False})
        self.basculer(True); c, o = e.commit(p); self.assertEqual(c, 0, o); self.assertEqual(e.row()['status'], 'submitted')

    def test_07_allow_list_and_journal_append_only(self):
        e = Eleve(self, ANS, base_journal(ANS))
        for q in [f"UPDATE bilan_505_remise_copies SET mode='remise' WHERE row_id='{e.rid}'", f"DELETE FROM bilan_505_remise_copies WHERE row_id='{e.rid}'",
                  "UPDATE bilan_505_remise_activation_journal SET motif='x'", "DELETE FROM bilan_505_remise_activation_journal"]:
            c, o = self.pg.sql(q); self.assertNotEqual(c, 0); self.assertIn('bilan505_append_only', o)
        for q in ["UPDATE bilan_505_remise_activation SET actif=true", f"INSERT INTO bilan_505_remise_copies VALUES('{uuid.uuid4()}','{uuid.uuid4()}',1,'remise','x')"]:
            c, o = self.as_user(e.uid, q); self.assertNotEqual(c, 0)

    def test_08_exact_lot_refuses_in_block_then_targets_exactly_four(self):
        n0 = self.sql("SELECT count(*) FROM bilan_505_remise_copies")
        c, o = self.pg.sql(LOT); self.assertNotEqual(c, 0); self.assertIn('lot_505_change: 0', o)
        self.assertEqual(self.sql("SELECT count(*) FROM bilan_505_remise_copies"), n0)
        for rid, app, _ in REAL:  # FICTITIOUS rows carrying the lot UUIDs
            self.sql(f"INSERT INTO apprenants(id,nom,prenom,auth_user_id) VALUES('{app}','FICTIF','Lot','{uuid.uuid4()}');"
                     f"INSERT INTO reponses_apprenants(id,apprenant_id,user_id,exercice_id,exercice_type,reponses,tentative,write_seq,status,completed) VALUES('{rid}','{app}','{uuid.uuid4()}','module_5_exo_505','quiz',{j(ANS)},1,1,'in_progress',false)")
        self.sql(f"UPDATE reponses_apprenants SET tentative=2 WHERE id='{REAL[0][0]}'")
        c, o = self.pg.sql(LOT); self.assertIn('lot_505_change: 3', o)
        self.sql(f"UPDATE reponses_apprenants SET tentative=1 WHERE id='{REAL[0][0]}'")
        self.sql(LOT)
        got = self.sql("SELECT string_agg(row_id||':'||mode, ',' ORDER BY row_id) FROM bilan_505_remise_copies WHERE motif<>'test jetable'")
        self.assertEqual(got, ','.join(f'{r}:{m}' for r, _, m in sorted(REAL)))
        self.assertEqual(self.sql("SELECT actif FROM bilan_505_remise_activation"), 'f')  # lot never activates

if __name__ == '__main__':
    unittest.main(verbosity=2)
