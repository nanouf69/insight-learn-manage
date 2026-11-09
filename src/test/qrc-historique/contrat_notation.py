"""Contrat isolé de qrc_historique_noter sur PostgreSQL jetable (aucune donnée réelle)."""
import pathlib, sys, json, uuid, unittest, concurrent.futures
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from upsert_reponse_http_integration import PgJetable

ADMIN = '44444444-4444-4444-8444-000000000004'
AUTRE = '55555555-4444-4444-8444-000000000005'
APP = '11111111-1111-4111-8111-000000000001'
MIGRATION = pathlib.Path(__file__).with_name('migration.sql').read_text() + '\n' + pathlib.Path(__file__).with_name('migration_revision.sql').read_text()

def lit(v): return "'" + str(v).replace("'", "''") + "'"

BASE = '''
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TABLE public.user_roles(user_id uuid, role text);
CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role=$2)$$;
CREATE TABLE public.apprenant_quiz_results(id uuid PRIMARY KEY, apprenant_id uuid, quiz_id text, quiz_type text, matiere_id text,
  tentative integer, details jsonb, completed_at timestamptz, score_obtenu numeric, score_max numeric, note_sur_20 numeric, reussi boolean);
CREATE TABLE public.reponses_apprenants(id uuid DEFAULT gen_random_uuid(), apprenant_id uuid, exercice_id text, tentative integer,
  reponses jsonb, completed boolean, status text, submitted_at timestamptz);
CREATE TABLE public.exam_attempts_v2(attempt_id uuid PRIMARY KEY, apprenant_id uuid, exam_id text, snapshot jsonb);
GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
-- Copies des gardes réelles.
CREATE FUNCTION public.protect_nonzero_quiz_score_on_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF COALESCE(OLD.score_obtenu,0)>0 AND COALESCE(NEW.score_obtenu,0)<=0 THEN NEW.score_obtenu:=OLD.score_obtenu;
 NEW.note_sur_20:=ROUND(((NEW.score_obtenu/NEW.score_max)*20)::numeric,1); NEW.reussi:=COALESCE(OLD.reussi,NEW.reussi); END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_protect BEFORE UPDATE ON public.apprenant_quiz_results FOR EACH ROW EXECUTE FUNCTION public.protect_nonzero_quiz_score_on_update();
CREATE FUNCTION public.garde_correction_admin_quiz() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(OLD.details->'correctionsIA')='object' THEN OLD.details->'correctionsIA' ELSE '{}' END) e
   WHERE e.value->>'validatedByAdmin'='true') AND NEW.details IS DISTINCT FROM OLD.details THEN RAISE EXCEPTION 'CORRECTION_ADMIN_PROTEGEE' USING ERRCODE='42501'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER trg_garde BEFORE UPDATE ON public.apprenant_quiz_results FOR EACH ROW EXECUTE FUNCTION public.garde_correction_admin_quiz();
'''

class Contrat(unittest.TestCase):
    def setUp(self):
        self.pg = PgJetable(); self.addCleanup(self.pg.stop)
        assert self.pg.port != 5432 and self.pg.dir.startswith('/tmp/'), 'isolation non prouvée'
        self.pg.sql(BASE)
        self.pg.sql(f"INSERT INTO user_roles VALUES('{ADMIN}','admin')")
        self.pg.sql(MIGRATION)

    def copie(self, ia=(0, 0.5), reponses_qrc=('texte A', 'texte B'), remise='identique', exam='EB2', matiere='t3p'):
        rid = str(uuid.uuid4())
        snap = [{'id': '1', 'type': 'QRC', 'points': 2}, {'id': '2', 'type': 'QRC', 'points': 2},
                {'id': '3', 'type': 'QCM', 'points': 1}, {'id': '4', 'type': 'QCM', 'points': 1}]
        questions = [{'questionId': 1, 'type': 'QRC'}, {'questionId': 2, 'type': 'QRC'},
                     {'questionId': 3, 'type': 'QCM', 'reponseCorrecte': ['A', 'B']},
                     {'questionId': 4, 'type': 'QCM', 'reponseCorrecte': ['C']}]
        rep = {'1': reponses_qrc[0], '2': reponses_qrc[1], '3': ['B', 'A'], '4': ['A']}  # Q3 juste (A+B), Q4 fausse
        corr = {'1': {'pointsObtenus': ia[0]}, '2': {'pointsObtenus': ia[1]}}
        score = 1 + ia[0] + ia[1]
        details = {'snapshot': {'questions': snap}, 'questions': questions, 'reponses': rep, 'correctionsIA': corr,
                   'qrc_pending_correction': True}
        self.pg.sql(f"INSERT INTO apprenant_quiz_results VALUES('{rid}','{APP}',{lit(exam)},'examen_blanc',{lit(matiere)},1,"
                    f"{lit(json.dumps(details))}::jsonb,'2026-11-09T10:00:00Z',{score},6,{round(score/6*20,1)},true)")
        if remise:
            at = '2026-11-09T10:00:00Z' if remise == 'identique' else '2026-11-09T10:03:00Z'
            self.pg.sql(f"INSERT INTO reponses_apprenants(apprenant_id,exercice_id,tentative,reponses,completed,status,submitted_at) "
                        f"VALUES('{APP}','EB2__{matiere}',1,{lit(json.dumps(rep))}::jsonb,true,'submitted','{at}')")
        return rid, score

    def noter(self, rid, q, note, attendu, op=None, uid=ADMIN, seuil=6, reco=None):
        op = op or str(uuid.uuid4())
        out = self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SELECT qrc_historique_noter({lit(op)},'{rid}',{lit(q)},{note},{attendu},{seuil},'',{lit(reco) if reco else 'NULL'})")
        return json.loads(out.splitlines()[-1])

    def ligne(self, rid):
        return json.loads(self.pg.sql(f"SELECT to_jsonb(r) FROM apprenant_quiz_results r WHERE id='{rid}'"))

    def test_notation_prouvee_recalcul_et_preuves_intactes(self):
        rid, s = self.copie()
        avant = self.ligne(rid)
        r = self.noter(rid, '1', 1.5, s)
        apres = self.ligne(rid)
        self.assertEqual('remise_identique', r['provenance'])
        self.assertEqual(3.0, float(apres['score_obtenu']))  # 1 QCM + 1.5 + 0.5 IA en attente conservée
        self.assertEqual(10.0, float(apres['note_sur_20']))
        self.assertTrue(apres['reussi'])  # inchangé tant qu'une QRC reste à valider
        for k in ('reponses', 'snapshot', 'questions'):
            self.assertEqual(avant['details'][k], apres['details'][k])
        c = apres['details']['correctionsIA']['1']
        self.assertTrue(c['validatedByAdmin']); self.assertEqual({'pointsObtenus': 0}, c['propositionPrecedente'])
        self.assertEqual({'pointsObtenus': 0.5}, apres['details']['correctionsIA']['2'])  # IA en attente non convertie

    def test_derniere_qrc_fixe_verdict_selon_seuil(self):
        rid, s = self.copie()
        self.noter(rid, '1', 0, s)
        r = self.noter(rid, '2', 0, self.ligne(rid)['score_obtenu'])
        a = self.ligne(rid)
        self.assertTrue(r['matiere_complete']); self.assertEqual(1.0, float(a['score_obtenu']))
        self.assertEqual(3.3, float(a['note_sur_20'])); self.assertFalse(a['reussi'])

    def test_rejeu_idempotent_et_conflit(self):
        rid, s = self.copie()
        a = self.noter(rid, '1', 2, s, op='op-1')
        b = self.noter(rid, '1', 2, s, op='op-1')
        self.assertFalse(a['rejeu']); self.assertTrue(b['rejeu']); self.assertEqual(a['id'], b['id'])
        self.assertEqual(3.5, float(self.ligne(rid)['score_obtenu']))
        with self.assertRaisesRegex(RuntimeError, 'Conflit'): self.noter(rid, '1', 1, s, op='op-1')
        self.assertEqual('1', self.pg.sql('SELECT count(*) FROM qrc_historique_corrections'))

    def test_deja_notee_jamais_reecrite(self):
        rid, s = self.copie()
        self.noter(rid, '1', 2, s)
        with self.assertRaisesRegex(RuntimeError, 'déjà corrigée'): self.noter(rid, '1', 0, self.ligne(rid)['score_obtenu'])
        rid2, s2 = self.copie()
        self.pg.sql(f"UPDATE apprenant_quiz_results SET details=jsonb_set(details,'{{correctionsIA,1}}','{{\"pointsObtenus\":1,\"validatedByAdmin\":true}}') WHERE id='{rid2}'")
        self.pg.sql(f"UPDATE apprenant_quiz_results SET score_obtenu=2.5 WHERE id='{rid2}'")
        with self.assertRaisesRegex(RuntimeError, 'déjà corrigée'): self.noter(rid2, '1', 2, 2.5)

    def test_concurrence_deux_appareils_une_seule_correction(self):
        rid, s = self.copie()
        with concurrent.futures.ThreadPoolExecutor(6) as ex:
            res = list(ex.map(lambda i: self._essai(rid, s, i), range(6)))
        self.assertEqual(1, sum(res))
        self.assertEqual('1', self.pg.sql('SELECT count(*) FROM qrc_historique_corrections'))
        self.assertEqual(3.5, float(self.ligne(rid)['score_obtenu']))

    def _essai(self, rid, s, i):
        try: self.noter(rid, '1', 2, s, op=f'app-{i}'); return 1
        except RuntimeError: return 0

    def test_refus_non_admin_lien_v2_score_perime_hors_bareme(self):
        rid, s = self.copie()
        with self.assertRaisesRegex(RuntimeError, 'Administrateur'): self.noter(rid, '1', 1, s, uid=AUTRE)
        with self.assertRaisesRegex(RuntimeError, 'modifiée depuis'): self.noter(rid, '1', 1, s + 1)
        with self.assertRaisesRegex(RuntimeError, 'hors barème'): self.noter(rid, '1', 2.5, s)
        with self.assertRaisesRegex(RuntimeError, 'hors barème'): self.noter(rid, '1', 0.3, s)
        with self.assertRaisesRegex(RuntimeError, 'Identité'): self.noter(rid, '9', 1, s)
        with self.assertRaisesRegex(RuntimeError, 'non QRC'): self.noter(rid, '3', 1, s)
        self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES(gen_random_uuid(),'{APP}','EB2',jsonb_build_object('source_historique',jsonb_build_object('result_id','{rid}')))")
        with self.assertRaisesRegex(RuntimeError, 'liée au moteur V2'): self.noter(rid, '1', 1, s)
        self.assertEqual('0', self.pg.sql('SELECT count(*) FROM qrc_historique_corrections'))

    def test_score_non_prouve_refuse(self):
        rid, s = self.copie()
        self.pg.sql(f"UPDATE apprenant_quiz_results SET score_obtenu=4 WHERE id='{rid}'")
        with self.assertRaisesRegex(RuntimeError, 'non prouvé'): self.noter(rid, '1', 1, 4)

    def test_remise_ambigue_exige_confirmation_tracee(self):
        # Réponses identiques + IDs : identité prouvée, plus de case malgré l'horodatage différent.
        rid, s = self.copie(remise='decalee')
        r = self.noter(rid, '1', 1, s)
        self.assertEqual('remise_horodatage_divergent', r['provenance']); self.assertIsNone(r['reconnaissance'])
        # Aucune fiche identique : confirmation explicite toujours exigée.
        rid2, s2 = self.copie(remise=None, matiere='autre')
        with self.assertRaisesRegex(RuntimeError, 'resultat_seul'): self.noter(rid2, '1', 1, s2)
        r2 = self.noter(rid2, '1', 1, s2, reco='vérifié')
        self.assertEqual('resultat_seul', r2['provenance'])

    def reviser(self, rid, q, note, ancienne, attendu, op=None, uid=ADMIN, reco=None):
        op = op or str(uuid.uuid4())
        out = self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; SELECT qrc_historique_reviser({lit(op)},'{rid}',{lit(q)},{note},{ancienne},{attendu},6,'motif',{lit(reco) if reco else 'NULL'})")
        return json.loads(out.splitlines()[-1])

    def test_modifier_la_note_revision_tracee(self):
        rid, s = self.copie()
        self.noter(rid, '1', 2, s)
        avant = self.ligne(rid)
        r = self.reviser(rid, '1', 1, 2, avant['score_obtenu'], op='rev-1')
        apres = self.ligne(rid)
        self.assertEqual(2, r['revision']); self.assertEqual(2, float(r['note_precedente']))
        self.assertEqual(float(avant['score_obtenu']) - 1, float(apres['score_obtenu']))
        self.assertEqual(avant['details']['reponses'], apres['details']['reponses'])
        self.assertEqual(2, apres['details']['correctionsIA']['1']['propositionPrecedente']['pointsObtenus'])
        self.assertEqual('2', self.pg.sql('SELECT count(*) FROM qrc_historique_corrections'))
        # rejeu idempotent, puis ancienne note périmée refusée
        self.assertTrue(self.reviser(rid, '1', 1, 2, avant['score_obtenu'], op='rev-1')['rejeu'])
        with self.assertRaisesRegex(RuntimeError, 'modifiée depuis'): self.reviser(rid, '1', 0, 2, apres['score_obtenu'])
        with self.assertRaisesRegex(RuntimeError, 'identique'): self.reviser(rid, '1', 1, 1, apres['score_obtenu'])
        with self.assertRaisesRegex(RuntimeError, 'Administrateur'): self.reviser(rid, '1', 0, 1, apres['score_obtenu'], uid=AUTRE)
        self.assertEqual('2', self.pg.sql('SELECT count(*) FROM qrc_historique_corrections'))

    def test_revision_refusee_si_non_notee_et_correction_ancienne_revisable(self):
        rid, s = self.copie()
        with self.assertRaisesRegex(RuntimeError, 'non corrigée'): self.reviser(rid, '1', 1, 0, s)
        rid2, _ = self.copie()
        self.pg.sql(f"UPDATE apprenant_quiz_results SET details=jsonb_set(details,'{{correctionsIA,1}}','{{\"pointsObtenus\":1,\"validatedByAdmin\":true}}'), score_obtenu=2.5 WHERE id='{rid2}'")
        r = self.reviser(rid2, '1', 2, 1, 2.5)
        self.assertEqual(1, r['revision']); self.assertEqual(3.5, float(self.ligne(rid2)['score_obtenu']))

    def test_journal_append_only(self):
        rid, s = self.copie(); self.noter(rid, '1', 1, s)
        with self.assertRaisesRegex(RuntimeError, 'ajout seul'): self.pg.sql('UPDATE qrc_historique_corrections SET note=2')
        with self.assertRaisesRegex(RuntimeError, 'ajout seul'): self.pg.sql('DELETE FROM qrc_historique_corrections')

    def test_qrc_vide_ne_bloque_pas_le_verdict(self):
        rid, s = self.copie(ia=(0, 0), reponses_qrc=('texte', ''))
        r = self.noter(rid, '1', 2, s)
        self.assertTrue(r['matiere_complete'])
        self.assertTrue(self.ligne(rid)['reussi'])  # 3/6 = 10/20 >= 6

if __name__ == '__main__':
    unittest.main(verbosity=2)
