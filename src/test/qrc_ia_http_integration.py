"""Vrai handler qrc-ia-correction + PostgREST + PostgreSQL JETABLE.

Fournisseur IA HTTP local fictif : aucun appel payant, aucune donnée réelle.
Les RPC de réservation/budget et les fonctions core de publication sont les vraies
versions du projet ; le correctif G(T) candidat est chargé depuis docs/sql-revue.
Usage : QRC_GT_SQL=docs/sql-revue/2026-11-07-qrc-gt-question-par-question.sql python3 src/test/qrc_ia_http_integration.py
"""
from __future__ import annotations
import hashlib
import http.client
import json
import os
import pathlib
import subprocess
import threading
import time
import unittest
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from upsert_reponse_http_integration import PgJetable, port_libre, jwt_service, attendre_http

ROOT = pathlib.Path(__file__).resolve().parents[2]
GT = pathlib.Path(os.environ.get("QRC_GT_SQL", ROOT / "docs/sql-revue/2026-11-07-qrc-gt-question-par-question.sql"))
if not GT.is_absolute(): GT = ROOT / GT
APP = "11111111-1111-4111-8111-000000000001"


def uuid_depuis(hexadecimal: str) -> str:
    return str(uuid.UUID(hexadecimal[:12] + "4" + hexadecimal[13:16] + "8" + hexadecimal[17:]))


def cle(app: str, exam: str, attempt: str, question: str, reponse: str) -> tuple[str, str]:
    h = hashlib.sha256(reponse.encode()).hexdigest()
    return "|".join([app, exam, "reglementation_taxi2", attempt, question, h]), h


class IntegrationQrcIa(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = PgJetable()
        cls.pg.sql("""
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'))::text $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid $$;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles(user_id uuid,role public.app_role);
CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE TABLE public.apprenants(id uuid PRIMARY KEY,type_apprenant text,modalite_formation text,nom text,prenom text,email text,compte_cours_archive_at timestamptz);
CREATE TABLE public.comptes_test_techniques(apprenant_id uuid PRIMARY KEY);
CREATE TABLE public.core_tentatives_neutralisees(attempt_id uuid PRIMARY KEY);
CREATE TABLE public.core_exam_resets(reset_id uuid DEFAULT gen_random_uuid(),archived_attempt_ids jsonb);
CREATE TABLE public.exam_attempts_v2(attempt_id uuid PRIMARY KEY,apprenant_id uuid,exam_id text,snapshot jsonb,etat text,finished_at timestamptz,is_test boolean DEFAULT false);
CREATE TABLE public.answer_state(attempt_id uuid,question_id text,valeur text);
CREATE TABLE public.qrc_instances_v2(qrc_instance_id uuid PRIMARY KEY,attempt_id uuid,apprenant_id uuid,question_id text,reponse jsonb,etat text,note numeric,corrige_par uuid,corrige_email text,corrige_at timestamptz);
CREATE TABLE public.qrc_ia_config(id boolean PRIMARY KEY,actif boolean,modele text,actif_depuis timestamptz,pause_motif text,pause_depuis timestamptz);
INSERT INTO public.qrc_ia_config VALUES(true,true,'google/gemini-3.8-flash','2026-10-10 12:35+00',NULL,NULL);
CREATE TABLE public.qrc_ia_rattrapages_historiques(attempt_id uuid PRIMARY KEY);
CREATE TABLE public.qrc_ia_suites(attempt_id uuid PRIMARY KEY,token uuid DEFAULT gen_random_uuid(),remaining integer DEFAULT 24,next_at timestamptz DEFAULT now(),lease_until timestamptz,statut text DEFAULT 'attente',message text,created_at timestamptz DEFAULT now(),origine text,dernier_code text,dernier_run_id text,maj_at timestamptz,dispatches integer DEFAULT 0);
CREATE TABLE public.qrc_ia_corrections(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,cle_idempotence text UNIQUE,qrc_instance_id uuid,attempt_id uuid,apprenant_id uuid,question_id text,exam_id text,matiere text,reponse_hash text,statut text,motif text,note numeric,bareme numeric,justification text,modele text,http_status integer,created_at timestamptz DEFAULT now(),termine_at timestamptz,trace jsonb,run_id text);
CREATE TABLE public.qrc_ia_reprises(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,qrc_instance_id uuid,base jsonb,numero integer,statut text DEFAULT 'en_cours',created_at timestamptz DEFAULT now(),lease_until timestamptz DEFAULT now()+interval '10 minutes',termine_at timestamptz,http_status integer,message text,resultat jsonb,run_id text,trace jsonb,UNIQUE(qrc_instance_id,numero));
CREATE TABLE public.alertes_systeme(type text,titre text,message text,details text,lu boolean);
CREATE TABLE public.core_exam_results(result_id uuid DEFAULT gen_random_uuid(),attempt_id uuid UNIQUE,apprenant_id uuid,result_revision integer,status text,score numeric,total numeric,qrc_restantes integer,published_at timestamptz,updated_at timestamptz);
CREATE TABLE public.core_operations(operation_id uuid PRIMARY KEY,operation_type text,apprenant_id uuid,attempt_id uuid,auteur uuid,cible jsonb,resultat jsonb);
CREATE TABLE public.audit_journal(operation text,cible_type text,cible_id text,attempt_id uuid,apprenant_id uuid,auteur uuid,auteur_email text,avant jsonb,apres jsonb,origine text);
GRANT USAGE ON SCHEMA public,auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public,auth TO service_role;
""")
        budget = (ROOT / "drizzle/migrations/0229_controle_qrc_ia_budget.sql").read_text()
        cls.pg.sql(budget[:budget.index("CREATE TABLE IF NOT EXISTS public.controle_qrc_copies")])
        for name in ("core_operation_replay", "core_note_attempt", "core_recalc_result", "core_correct_qrc", "core_correct_qrc_publish"):
            cls.pg.sql((ROOT / f"src/test/fixtures/{name}_live_20261107.sql").read_text())
        for name in ("0178_qrc_ia_reprises_append_only.sql", "0179_qrc_reprise_guard_legacy_reservation.sql", "0180_qrc_ia_reservation_auto.sql", "0182_qrc_ia_auto_publication_guard.sql", "0186_qrc_ia_publication_auto_fenced.sql"):
            source = (ROOT / "drizzle/migrations" / name).read_text()
            if name.startswith("0178"):
                source = source[source.index("CREATE OR REPLACE FUNCTION public.qrc_ia_reserver_reprise"):]
            cls.pg.sql(source)
        file_sql = (ROOT / "drizzle/migrations/0195_qrc_ia_file_serveur.sql").read_text()
        cls.pg.sql(file_sql[file_sql.index("CREATE OR REPLACE FUNCTION public.qrc_ia_suite_claim"):file_sql.index("CREATE OR REPLACE FUNCTION public.qrc_ia_dispatch_suites")])
        cls.pg.sql(GT.read_text())
        cls.pg.sql("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;")

        cls.rest_port, cls.proxy_port, cls.provider_port = port_libre(), port_libre(), port_libre()
        cls.service_jwt = jwt_service()
        env = os.environ.copy()
        env.update({"PGRST_DB_URI": f"postgresql://postgres@127.0.0.1:{cls.pg.port}/postgres?sslmode=disable", "PGRST_DB_SCHEMAS": "public", "PGRST_DB_ANON_ROLE": "service_role", "PGRST_JWT_SECRET": "integration-locale-32-caracteres-minimum", "PGRST_SERVER_HOST": "127.0.0.1", "PGRST_SERVER_PORT": str(cls.rest_port)})
        cls.rest_log = open(cls.pg.dir + "/postgrest-qrc.log", "w")
        cls.rest = subprocess.Popen(["nix", "run", "nixpkgs#postgrest", "--"], env=env, stdout=cls.rest_log, stderr=subprocess.STDOUT)
        attendre_http(cls.rest_port)
        fin_schema = time.time() + 45
        while True:
            try:
                req_schema = Request(f"http://127.0.0.1:{cls.rest_port}/qrc_ia_suites?select=attempt_id&limit=1", headers={"Authorization": f"Bearer {cls.service_jwt}", "apikey": cls.service_jwt})
                with urlopen(req_schema, timeout=2) as res_schema:
                    if res_schema.status == 200: break
            except Exception:
                if time.time() >= fin_schema: raise
                time.sleep(0.2)
        integration = cls

        class Proxy(BaseHTTPRequestHandler):
            def log_message(self, *_): pass
            def _forward(self):
                length = int(self.headers.get("Content-Length", "0")); body = self.rfile.read(length) if length else None
                headers = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "content-length", "connection")}
                path = self.path[len("/rest/v1"):] if self.path.startswith("/rest/v1/") else self.path
                req = Request(f"http://127.0.0.1:{integration.rest_port}{path}", data=body, headers=headers, method=self.command)
                try: res = urlopen(req)
                except HTTPError as exc: res = exc
                payload = res.read(); self.send_response(res.status)
                for k, v in res.headers.items():
                    if k.lower() not in ("connection", "content-length", "transfer-encoding"): self.send_header(k, v)
                self.send_header("Content-Length", str(len(payload))); self.end_headers()
                if self.command != "HEAD": self.wfile.write(payload)
            do_GET = do_POST = do_PATCH = do_HEAD = _forward

        class Provider(BaseHTTPRequestHandler):
            def log_message(self, *_): pass
            def do_POST(self):
                length = int(self.headers.get("Content-Length", "0")); payload = json.loads(self.rfile.read(length))
                integration.provider_prompts.append(payload)
                text = json.dumps({"note": 3, "justification": "Éléments attendus présents.", "confiance": "haute", "ambigu": False}, ensure_ascii=False)
                if "AMBIGU_TEST" in json.dumps(payload): text = json.dumps({"note": 3, "justification": "Doute.", "ambigu": True})
                chunks = [
                    {"id": "local", "object": "chat.completion.chunk", "created": 1, "model": "local", "choices": [{"index": 0, "delta": {"role": "assistant", "content": text}, "finish_reason": None}]},
                    {"id": "local", "object": "chat.completion.chunk", "created": 1, "model": "local", "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}},
                ]
                data = "".join("data: " + json.dumps(c) + "\n\n" for c in chunks) + "data: [DONE]\n\n"
                self.send_response(200); self.send_header("Content-Type", "text/event-stream"); self.send_header("X-Lovable-AIG-Run-ID", str(uuid.uuid4())); self.send_header("Content-Length", str(len(data.encode()))); self.end_headers(); self.wfile.write(data.encode())

        cls.provider_prompts = []
        cls.provider = ThreadingHTTPServer(("127.0.0.1", cls.provider_port), Provider)
        cls.provider_thread = threading.Thread(target=cls.provider.serve_forever, daemon=True); cls.provider_thread.start()
        cls.proxy = ThreadingHTTPServer(("127.0.0.1", cls.proxy_port), Proxy)
        cls.proxy_thread = threading.Thread(target=cls.proxy.serve_forever, daemon=True); cls.proxy_thread.start()
        cls.deno_log = open(cls.pg.dir + "/deno-qrc.log", "w")
        deno_env = os.environ.copy()
        deno_env.update({"SUPABASE_URL": f"http://127.0.0.1:{cls.proxy_port}", "SUPABASE_SERVICE_ROLE_KEY": cls.service_jwt, "SUPABASE_ANON_KEY": cls.service_jwt, "LOVABLE_API_KEY": "fixture-locale-sans-valeur", "QRC_IA_GATEWAY_BASE_URL": f"http://127.0.0.1:{cls.provider_port}/v1"})
        cls.deno = subprocess.Popen(["deno", "run", "--allow-all", "--node-modules-dir=auto", "supabase/functions/qrc-ia-correction/index.ts"], cwd=ROOT, env=deno_env, stdout=cls.deno_log, stderr=subprocess.STDOUT)
        attendre_http(8000, timeout=90)

    @classmethod
    def tearDownClass(cls):
        for proc in (getattr(cls, "deno", None), getattr(cls, "rest", None)):
            if proc and proc.poll() is None:
                proc.terminate()
                try: proc.wait(timeout=5)
                except subprocess.TimeoutExpired: proc.kill()
        for server in (getattr(cls, "proxy", None), getattr(cls, "provider", None)):
            if server: server.shutdown(); server.server_close()
        for f in (getattr(cls, "deno_log", None), getattr(cls, "rest_log", None)):
            if f: f.close()
        if hasattr(cls, "pg"): cls.pg.stop()

    def setUp(self):
        self.provider_prompts.clear()

    def passage(self, reponses=("Réponse un", "Réponse deux"), type_app="taxi-e", nom="FERREIRA", prenom="David", anciennes=True, corrige=None, enonce=None, historique=False):
        attempt, exam = str(uuid.uuid4()), "EB3-TAXI"
        qrc_ids = [str(uuid.uuid4()) for _ in reponses]
        questions = [{"id": str(i + 1), "type": "QRC", "matiere": "reglementation_taxi2", "enonce": enonce or f"Citez 4 musées de Lyon, question {i + 1}.", "reponseQRC": corrige or "Beaux-Arts. Confluences. Imprimerie. Lugdunum.", "points": 4} for i in range(len(reponses))]
        snapshot = {"matieres": [{"subject_id": "reglementation_taxi2"}], "questions": questions}
        if historique:
            snapshot = {"matieres": [{"subject_id": "reglementation_taxi2", "questions": questions}]}
            # core_note_attempt lit le snapshot racine : on conserve aussi la projection figée d'origine.
            snapshot["questions"] = questions
        self.pg.sql(f"INSERT INTO apprenants VALUES('{APP}','{type_app}',NULL,'{nom}','{prenom}',NULL,NULL) ON CONFLICT (id) DO UPDATE SET type_apprenant=EXCLUDED.type_apprenant,nom=EXCLUDED.nom,prenom=EXCLUDED.prenom; INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,snapshot,etat,finished_at,is_test) SELECT '{attempt}','{APP}','{exam}','{json.dumps(snapshot, ensure_ascii=False)}'::jsonb,'terminee',now(),false WHERE NOT EXISTS(SELECT 1 FROM exam_attempts_v2 WHERE attempt_id='{attempt}');")
        for i, (qid, reponse) in enumerate(zip(qrc_ids, reponses)):
            self.pg.sql(f"INSERT INTO qrc_instances_v2(qrc_instance_id,attempt_id,apprenant_id,question_id,reponse,etat) VALUES('{qid}','{attempt}','{APP}','{i+1}','{json.dumps(reponse, ensure_ascii=False)}'::jsonb,'en_attente');")
            if anciennes:
                key, h = cle(APP, exam, attempt, str(i + 1), reponse)
                self.pg.sql(f"INSERT INTO qrc_ia_corrections(cle_idempotence,qrc_instance_id,attempt_id,apprenant_id,question_id,exam_id,matiere,reponse_hash,statut,motif,termine_at) VALUES('{key}','{qid}','{attempt}','{APP}','{i+1}','{exam}','reglementation_taxi2','{h}','exclue','matiere_exclue_gt',now());")
        token = self.pg.sql(f"INSERT INTO qrc_ia_suites(attempt_id) VALUES('{attempt}') RETURNING token").splitlines()[0]
        return attempt, token, qrc_ids

    def appel(self, attempt, token):
        conn = http.client.HTTPConnection("127.0.0.1", 8000, timeout=45)
        conn.request("POST", "/", body=json.dumps({"attempt_id": attempt, "suite_token": token}), headers={"Content-Type": "application/json"})
        res = conn.getresponse(); data = json.loads(res.read().decode()); conn.close()
        if res.status >= 500 or data.get("message") == "Paramètres de correction invalides": raise AssertionError({"attempt": attempt, "token": token, "reponse": data})
        return data

    def relancer(self, attempt, token):
        self.pg.sql(f"UPDATE qrc_ia_suites SET statut='attente',next_at=now()-interval '1 second',lease_until=NULL WHERE attempt_id='{attempt}'")
        return self.appel(attempt, token)

    def test_deux_qrc_publication_definitive_et_aucun_doublon(self):
        attempt, token, qrc_ids = self.passage(historique=True)
        first = self.appel(attempt, token)
        self.assertEqual(first["statut"], "reprise_terminee")
        self.assertEqual(self.pg.sql(f"SELECT status||'|'||qrc_restantes FROM core_exam_results WHERE attempt_id='{attempt}'"), "provisoire|1")
        second = self.relancer(attempt, token)
        self.assertEqual(second["statut"], "reprise_terminee")
        self.assertEqual(self.pg.sql(f"SELECT status||'|'||qrc_restantes||'|'||score FROM core_exam_results WHERE attempt_id='{attempt}'"), "definitif|0|15.00")
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM qrc_ia_reprises r JOIN qrc_instances_v2 q ON q.qrc_instance_id=r.qrc_instance_id WHERE q.attempt_id='{attempt}' AND r.statut='appliquee'"), "2")
        self.assertEqual(len(self.provider_prompts), 2)
        notes_avant = self.pg.sql(f"SELECT string_agg(note::text,',' ORDER BY question_id) FROM qrc_instances_v2 WHERE attempt_id='{attempt}'")
        self.relancer(attempt, token)
        self.assertEqual(len(self.provider_prompts), 2)
        self.assertEqual(self.pg.sql(f"SELECT string_agg(note::text,',' ORDER BY question_id) FROM qrc_instances_v2 WHERE attempt_id='{attempt}'"), notes_avant)
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM qrc_ia_corrections WHERE attempt_id='{attempt}' AND statut='exclue' AND motif='matiere_exclue_gt'"), "2")

    def test_corrige_incomplet_revue_sans_appel(self):
        attempt, token, _ = self.passage(reponses=("Quinze bagages",), enonce="Ces clients ont 15 bagages. Calculez le montant de la prise en charge.", corrige="Prise en charge = 3 € + supplément passagers (4 × 4 € = 16 €) + supplément bagages.")
        result = self.appel(attempt, token)
        self.assertEqual(result["statut"], "revue")
        self.assertEqual(len(self.provider_prompts), 0)
        self.assertEqual(self.pg.sql(f"SELECT statut FROM qrc_ia_suites WHERE attempt_id='{attempt}'"), "a_verifier")
        self.assertEqual(self.pg.sql(f"SELECT etat FROM qrc_instances_v2 WHERE attempt_id='{attempt}'"), "en_attente")

    def test_ambigu_ia_refuse_sans_publication(self):
        attempt, token, _ = self.passage(reponses=("AMBIGU_TEST",))
        result = self.appel(attempt, token)
        self.assertEqual(result["message"], "reponse_ou_corrige_ambigu")
        self.assertEqual(len(self.provider_prompts), 1)
        self.assertEqual(self.pg.sql(f"SELECT etat FROM qrc_instances_v2 WHERE attempt_id='{attempt}'"), "en_attente")
        self.assertEqual(self.pg.sql(f"SELECT statut FROM qrc_ia_reprises r JOIN qrc_instances_v2 q ON q.qrc_instance_id=r.qrc_instance_id WHERE q.attempt_id='{attempt}'"), "a_verifier")

    def test_presentiel_et_comptes_test_exclus_sans_appel(self):
        for type_app, nom, prenom in (("taxi", "FERREIRA", "David"), ("taxi-e", "FICTIF", "ESSAI IA"), ("taxi-e", "COMPTE", "Démo")):
            attempt, token, _ = self.passage(reponses=("Réponse",), type_app=type_app, nom=nom, prenom=prenom)
            result = self.appel(attempt, token)
            self.assertIn(result["statut"], ("non_elearning", "compte_test_exclu"))
            self.assertEqual(self.pg.sql(f"SELECT etat FROM qrc_instances_v2 WHERE attempt_id='{attempt}'"), "en_attente")
        self.assertEqual(len(self.provider_prompts), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
