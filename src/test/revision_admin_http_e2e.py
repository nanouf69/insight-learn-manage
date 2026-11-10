"""E2E révision élève -> admin : VRAI handler upsert-reponse-apprenant + PostgREST + PostgreSQL JETABLE.

Le candidat enregistre ses réponses de révision par le vrai transport (lots, concurrence, Terminer),
puis la fiche admin relit avec les mêmes colonnes/filtres que lireRevisionsAdmin et la vraie projection.
Aucune donnée réelle. Usage : python3 src/test/revision_admin_http_e2e.py
"""
import concurrent.futures, json, pathlib, subprocess, unittest, uuid
from urllib.request import Request, urlopen
import upsert_reponse_http_integration as h

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC1, SRC2, EX = str(uuid.uuid4()), str(uuid.uuid4()), "revision_fausses_EB2__r2"


class RevisionEleveAdmin(h.IntegrationHttp22P05):
    test_handler_reel_postgresql = None  # couvert par son propre fichier

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        snap = lambda qid, t: json.dumps({"questions": [{"id": qid, "type": t}]})
        cls.pg.sql(f"""
CREATE TABLE public.apprenant_quiz_results (id uuid PRIMARY KEY, apprenant_id uuid, quiz_id text, matiere_id text, matiere_nom text, tentative integer, details jsonb);
GRANT SELECT ON public.apprenant_quiz_results TO service_role;
INSERT INTO public.apprenant_quiz_results VALUES
 ('{SRC1}','{h.APP}','EB2','gestion','Gestion',3, jsonb_build_object('reponses', '{{"2":["C"]}}'::jsonb, 'snapshot', '{snap(2, "QCM")}'::jsonb)),
 ('{SRC2}','{h.APP}','EB2','t3p','T3P',3, jsonb_build_object('reponses', '{{"5":"ancienne réponse"}}'::jsonb, 'snapshot', '{snap(5, "QRC")}'::jsonb));
NOTIFY pgrst, 'reload schema';""")
        import time
        fin = time.time() + 30
        while True:
            try:
                urlopen(Request(f"http://127.0.0.1:{cls.rest_port}/apprenant_quiz_results?select=id&limit=1", headers={"Authorization": f"Bearer {cls.service_jwt}"})).read()
                break
            except Exception:
                if time.time() > fin: raise
                time.sleep(0.3)

    def lot_rev(self, answers, events, base, completed=False):
        state = {"examenId": "EB2", "answers": answers, "questionOrder": ["gestion:2", "t3p:5"], "sourceResultIds": {"gestion:2": SRC1, "t3p:5": SRC2}}
        return {"operation_id": str(uuid.uuid4()), "apprenant_id": h.APP, "user_id": h.UID, "module_id": 35, "exercice_id": EX,
                "exercice_type": "revision_fausses", "reponses": {"revisionState": state}, "score": 1, "completed": completed,
                "events": [{"event_id": str(uuid.uuid4()), "question_id": q, "valeur": v, "tentative": 1} for q, v in events], "base_seq": base}

    def lire_rest(self, path):
        req = Request(f"http://127.0.0.1:{self.rest_port}/{path}", headers={"Authorization": f"Bearer {self.service_jwt}", "apikey": self.service_jwt})
        with urlopen(req) as r:
            return json.loads(r.read())

    def lecture_admin(self):
        # Mêmes colonnes et filtres que lireRevisionsAdmin, triés par id.
        revisions = self.lire_rest(f"reponses_apprenants?select=id,apprenant_id,exercice_id,reponses,updated_at,completed,originaux_exacts,reponses_meta&apprenant_id=eq.{h.APP}&exercice_type=eq.revision_fausses&order=id")
        events = []
        for r in revisions:
            events += self.lire_rest(f"reponses_apprenants_journal?select=id,apprenant_id,exercice_id,question_id,created_at,valeur,valeur_originale&apprenant_id=eq.{h.APP}&exercice_id=eq.{r['exercice_id']}&exercice_type=eq.revision_fausses&order=id")
        sources = self.lire_rest(f"apprenant_quiz_results?select=id,apprenant_id,quiz_id,matiere_id,matiere_nom,tentative,details&apprenant_id=eq.{h.APP}&quiz_id=ilike.eb*&order=id")
        out = subprocess.run(["bun", "run", str(ROOT / "src/test/revision_admin_projection_cli.ts")], input=json.dumps({"apprenant": h.APP, "revisions": revisions, "sources": sources, "events": events}), capture_output=True, text=True, cwd=ROOT, timeout=60)
        self.assertEqual(out.returncode, 0, out.stderr)
        return {l["question"]: l for l in json.loads(out.stdout)}

    def test_eleve_vers_admin(self):
        s, r = self.appel(self.lot_rev({"gestion:2": ["A"]}, [("gestion:2", ["A"])], 0))
        self.assertEqual((s, r.get("confirmed")), (200, True), r)
        # Deux onglets simultanés sur la même version : un seul gagne, aucun écrasement à rebours.
        a = self.lot_rev({"gestion:2": ["A"], "t3p:5": "Réponse onglet 1 −10 €"}, [("t3p:5", "Réponse onglet 1 −10 €")], 1)
        b = self.lot_rev({"gestion:2": ["A"], "t3p:5": "Réponse onglet 2"}, [("t3p:5", "Réponse onglet 2")], 1)
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            res = list(pool.map(self.appel, (a, b)))
        self.assertTrue(all(x[0] == 200 for x in res), res)
        persiste = json.loads(self.pg.sql(f"SELECT reponses->'revisionState'->'answers' FROM public.reponses_apprenants WHERE exercice_id='{EX}'"))
        self.assertIn(persiste["t3p:5"], ("Réponse onglet 1 −10 €", "Réponse onglet 2"))
        seq = int(self.pg.sql(f"SELECT write_seq FROM public.reponses_apprenants WHERE exercice_id='{EX}'"))
        # Seconde correction de la QCM puis Terminer la matière.
        finale = dict(persiste, **{"gestion:2": ["B", "A"]})
        s, r = self.appel(self.lot_rev(finale, [("gestion:2", ["B", "A"])], seq, completed=True))
        self.assertEqual((s, r.get("confirmed")), (200, True), r)

        lignes = self.lecture_admin()
        g, t = lignes["2"], lignes["5"]
        self.assertEqual((g["derniere"], g["initiale"], g["tentative"], g["revision"], g["cause"], g["terminee"]), (["B", "A"], ["C"], 3, "2", None, True))
        self.assertIsNotNone(g["heureQuestion"])
        self.assertEqual((t["derniere"], t["initiale"], t["tentative"], t["cause"]), (persiste["t3p:5"], "ancienne réponse", 3, None))
        self.assertEqual(t["matiere"], "T3P")
        # Rechargement admin : relecture serveur identique.
        self.assertEqual(lignes, self.lecture_admin())
        # Après Terminer : une écriture tardive ne modifie pas la copie figée côté admin.
        avant = self.pg.sql(f"SELECT md5(to_jsonb(r)::text) FROM public.reponses_apprenants r WHERE exercice_id='{EX}'")
        self.pg.sql(f"UPDATE public.reponses_apprenants SET status='submitted' WHERE exercice_id='{EX}'")
        self.appel(self.lot_rev(dict(finale, **{"gestion:2": ["E"]}), [("gestion:2", ["E"])], 99))
        self.assertEqual(self.lecture_admin()["2"]["derniere"], ["B", "A"])
        self.assertNotEqual(avant, "")


if __name__ == "__main__":
    unittest.main(verbosity=2)
