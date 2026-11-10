"""Commentaire seul sur une ancienne copie EB déjà corrigée — PostgreSQL jetable uniquement.

Définitions live (ROLLBACK liaison v2 + PATCH) puis docs/sql-revue/2026-11-10-qrc-commentaire-seul.sql :
journal append-only, note/score/réponses intacts, CAS révision, rejeu, concurrence, lecture candidat propriétaire.
"""
import pathlib, sys, json, uuid, unittest, concurrent.futures
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from contrat_notation import lit, ADMIN, AUTRE, APP
from contrat_liaison_v2 import Base, IDS
from contrat_audit_permutation import DONNEES

SQL = (pathlib.Path(__file__).resolve().parents[3] / 'docs/sql-revue/2026-11-10-qrc-commentaire-seul.sql').read_text()
HIST = SQL[SQL.index('CREATE OR REPLACE FUNCTION public.qrc_historique_commenter'):]
ELEVE = '66666666-4444-4444-8444-000000000006'


class CommentaireSeul(Base):
    def setUp(self):
        super().setUp()
        self.pg.sql("CREATE TABLE IF NOT EXISTS public.apprenants(id uuid PRIMARY KEY, auth_user_id uuid);"
                    f"INSERT INTO public.apprenants VALUES('{APP}','{ELEVE}');"
                    "CREATE OR REPLACE FUNCTION public.core_est_proprietaire(p uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER "
                    "SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM public.apprenants WHERE id=p AND auth_user_id=auth.uid())$$;")
        self.pg.sql(HIST)

    def commenter(self, rid, q, note, rev, txt, op=None, uid=ADMIN):
        op = op or str(uuid.uuid4())
        out = self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SELECT qrc_historique_commenter({lit(op)},'{rid}',{lit(q)},{note},{rev},{lit(txt)})")
        return json.loads(out.splitlines()[-1])

    def journal(self, rid, q='1'):
        return self.pg.sql(f"SELECT count(*) FROM qrc_historique_corrections WHERE result_id='{rid}' AND question_id={lit(q)}")

    def lecture_eleve(self, rid, uid=ELEVE):
        out = self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SELECT coalesce(json_agg(x),'[]') FROM qrc_historique_commentaires_eleve(ARRAY['{rid}'::uuid]) x")
        return json.loads(out.splitlines()[-1])

    def test_commentaire_seul_append_only_note_et_copie_intactes(self):
        rid, s = self.copie()
        self.noter(rid, '1', 1.5, s)
        avant = self.pg.sql(DONNEES)
        r1 = self.commenter(rid, '1', 1.5, 1, 'Précisez !!!')
        self.assertTrue(r1['commentaire_seul']); self.assertEqual(2, r1['revision'])
        self.assertEqual(float(r1['note']), 1.5); self.assertEqual(float(r1['note_precedente']), 1.5)
        r2 = self.commenter(rid, '1', 1.5, 2, 'Précisez !!!\nMal dit !!!')
        self.assertEqual(3, r2['revision'])
        self.assertEqual(avant, self.pg.sql(DONNEES))          # copie, score, réponses, remise inchangés
        self.assertEqual('3', self.journal(rid))
        lu = self.lecture_eleve(rid)
        self.assertEqual([('1', 'Précisez !!!\nMal dit !!!', 1.5)], [(x['question_id'], x['commentaire'], float(x['note'])) for x in lu])
        with self.assertRaises(RuntimeError): self.pg.sql(f"UPDATE qrc_historique_corrections SET commentaire='x' WHERE result_id='{rid}'")
        # Une révision de note ultérieure reste possible et continue la numérotation.
        r3 = self.reviser(rid, '1', 2, 1.5, self.ligne(rid)['score_obtenu'])
        self.assertEqual(4, r3['revision'])

    def test_cas_rejeu_conflit_inchange(self):
        rid, s = self.copie()
        self.noter(rid, '1', 1, s)
        with self.assertRaisesRegex(RuntimeError, 'modifiée depuis'): self.commenter(rid, '1', 1, 0, 'x')      # révision périmée
        with self.assertRaisesRegex(RuntimeError, 'Note modifiée'): self.commenter(rid, '1', 0.5, 1, 'x')    # note périmée
        a = self.commenter(rid, '1', 1, 1, 'Attention aux fautes !!!', op='c-1')
        b = self.commenter(rid, '1', 1, 1, 'Attention aux fautes !!!', op='c-1')
        self.assertFalse(a['rejeu']); self.assertTrue(b['rejeu']); self.assertEqual(a['id'], b['id'])
        with self.assertRaisesRegex(RuntimeError, 'Conflit'): self.commenter(rid, '1', 1, 2, 'autre', op='c-1')
        c = self.commenter(rid, '1', 1, 2, 'Attention aux fautes !!!')
        self.assertTrue(c['inchange'])
        self.assertEqual('2', self.journal(rid))

    def test_concurrence_un_seul_commentaire(self):
        rid, s = self.copie()
        self.noter(rid, '1', 2, s)
        def essai(i):
            try: self.commenter(rid, '1', 2, 1, f'Mal dit !!! {i}', op=f'app-{i}'); return 1
            except RuntimeError: return 0
        with concurrent.futures.ThreadPoolExecutor(6) as ex:
            self.assertEqual(1, sum(ex.map(essai, range(6))))
        self.assertEqual('2', self.journal(rid))

    def test_refus_non_admin_non_corrigee_lien_v2_et_lecture_isolee(self):
        rid, s = self.copie()
        with self.assertRaisesRegex(RuntimeError, 'non corrigée'): self.commenter(rid, '1', 0, 0, 'x')
        self.noter(rid, '1', 1, s)
        with self.assertRaisesRegex(RuntimeError, 'Administrateur'): self.commenter(rid, '1', 1, 1, 'x', uid=AUTRE)
        with self.assertRaisesRegex(RuntimeError, 'Administrateur'): self.commenter(rid, '1', 1, 1, 'x', uid=ELEVE)
        with self.assertRaisesRegex(RuntimeError, 'non QRC'): self.commenter(rid, '3', 1, 0, 'x')
        self.assertEqual([], self.lecture_eleve(rid, uid=AUTRE))            # autre compte : rien
        self.assertEqual(1, len(self.lecture_eleve(rid)))
        self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES(gen_random_uuid(),'{APP}','EB2',jsonb_build_object('result_id','{rid}'))")
        with self.assertRaisesRegex(RuntimeError, 'liée au moteur V2'): self.commenter(rid, '1', 1, 1, 'x')
        self.assertEqual('1', self.journal(rid))

    def test_copie_liaison_prouvee_multi_tentatives(self):
        self.cinq(); self.pg.sql((pathlib.Path(__file__).resolve().parents[3] / 'docs/sql-revue/2026-11-10-qrc-liaison-v2-BACKFILL.sql').read_text())
        rid = IDS['gestion']
        self.noter(rid, '1', 1, 1)
        r = self.commenter(rid, '1', 1, 1, 'Précisez permis de conduire hors période probatoire')
        self.assertEqual('liaison_prouvee', r['provenance']); self.assertEqual(3, r['tentative'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
