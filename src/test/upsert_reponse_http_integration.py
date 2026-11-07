"""Intégration 22P05 : VRAI handler Deno + PostgREST + PostgreSQL JETABLE.

Aucune donnée réelle, aucun accès au projet Cloud. Une fixture apprenant fictive est créée
localement. Le handler upsert-reponse-apprenant est servi sans modification ; seuls l'annuaire
d'authentification (une réponse HTTP fixture) et la base sont locaux. PostgREST exécute les vraies
fonctions v2/v3 et les vraies relectures du handler.

Usage : python3 src/test/upsert_reponse_http_integration.py
Prérequis : deno, bun, initdb/pg_ctl/psql et nix (postgrest), déjà disponibles dans le sandbox.
"""
from __future__ import annotations

import base64
import concurrent.futures
import hashlib
import hmac
import http.client
import json
import os
import pathlib
import socket
import subprocess
import tempfile
import threading
import time
import unittest
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = pathlib.Path(__file__).resolve().parents[2]
V2 = (ROOT / "src/test/fixtures/persist_answer_batch_v2_live_20261107.sql").read_text()
V3 = (ROOT / "docs/sql-revue/2026-11-07-originaux-exacts-nul.sql").read_text()
APP, UID = str(uuid.uuid4()), str(uuid.uuid4())
USER_TOKEN = "fixture-utilisateur-local-uniquement"
JWT_SECRET = "integration-locale-32-caracteres-minimum"


def port_libre() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def jwt_service() -> str:
    def b64(v: bytes) -> str:
        return base64.urlsafe_b64encode(v).rstrip(b"=").decode()
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = b64(json.dumps({"role": "service_role", "iat": 1, "exp": 4_000_000_000}, separators=(",", ":")).encode())
    sig = b64(hmac.new(JWT_SECRET.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest())
    return f"{head}.{body}.{sig}"


def attendre_http(port: int, path: str = "/", timeout: float = 45) -> None:
    fin = time.time() + timeout
    derniere = None
    while time.time() < fin:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return
        except OSError as exc:
            derniere = exc
            time.sleep(0.15)
    raise RuntimeError(f"service local {port}{path} indisponible: {derniere}")


class PgJetable:
    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix="pg-http-22p05-", dir="/tmp")
        self.port = port_libre()
        self.user = [] if os.geteuid() else ["setpriv", "--reuid=1000", "--regid=1000", "--clear-groups"]
        if self.user:
            os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ["initdb", "-D", self.dir + "/d", "-U", "postgres", "-A", "trust", "--no-locale", "-E", "UTF8"], check=True, capture_output=True)
        subprocess.run(self.user + ["pg_ctl", "-D", self.dir + "/d", "-o", f"-k {self.dir} -p {self.port} -h 127.0.0.1", "-w", "start", "-l", self.dir + "/pg.log"], check=True, capture_output=True)

    def sql(self, query: str) -> str:
        env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
        r = subprocess.run(["psql", "-X", "-At", "-h", "127.0.0.1", "-p", str(self.port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", query], capture_output=True, text=True, env=env)
        if r.returncode:
            raise RuntimeError((r.stdout + r.stderr).strip())
        return r.stdout.strip()

    def stop(self):
        subprocess.run(self.user + ["pg_ctl", "-D", self.dir + "/d", "-m", "immediate", "stop"], capture_output=True)


class IntegrationHttp22P05(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = PgJetable()
        cls.pg.sql(f"""
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.apprenants (id uuid PRIMARY KEY, auth_user_id uuid);
CREATE TABLE public.reponses_apprenants (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, apprenant_id uuid, user_id uuid, exercice_id text, exercice_type text DEFAULT 'quiz', reponses jsonb DEFAULT '{{}}', score numeric, completed boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), status text DEFAULT 'in_progress', submitted_at timestamptz, tentative integer DEFAULT 1, bonnes_reponses integer, total_questions integer, reponses_meta jsonb DEFAULT '{{}}', write_seq bigint DEFAULT 0, source_noyau text, UNIQUE (apprenant_id, exercice_id));
CREATE TABLE public.reponses_apprenants_journal (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, apprenant_id uuid, user_id uuid, module_id integer, exercice_id text, exercice_type text DEFAULT 'quiz', question_id text, valeur jsonb DEFAULT '[]', tentative integer DEFAULT 1, client_saved_at timestamptz, created_at timestamptz DEFAULT now(), event_id uuid DEFAULT gen_random_uuid() UNIQUE);
INSERT INTO public.apprenants VALUES ('{APP}', '{UID}');
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.apprenants, public.reponses_apprenants, public.reponses_apprenants_journal TO service_role;
""" + V2 + V3 + "GRANT EXECUTE ON FUNCTION public.persist_answer_batch_v2(uuid,uuid,integer,text,text,jsonb,boolean,numeric,bigint,jsonb) TO service_role;")

        cls.rest_port, cls.proxy_port = port_libre(), port_libre()
        cls.service_jwt = jwt_service()
        env = os.environ.copy()
        env.update({
            "PGRST_DB_URI": f"postgresql://postgres@127.0.0.1:{cls.pg.port}/postgres",
            "PGRST_DB_SCHEMAS": "public",
            "PGRST_DB_ANON_ROLE": "service_role",
            "PGRST_JWT_SECRET": JWT_SECRET,
            "PGRST_SERVER_HOST": "127.0.0.1",
            "PGRST_SERVER_PORT": str(cls.rest_port),
        })
        cls.rest_log = open(cls.pg.dir + "/postgrest.log", "w")
        cls.rest = subprocess.Popen(["nix", "run", "nixpkgs#postgrest", "--"], env=env, stdout=cls.rest_log, stderr=subprocess.STDOUT)
        attendre_http(cls.rest_port)

        integration = cls

        class Proxy(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def _auth(self) -> bool:
                if self.path.startswith("/auth/v1/user"):
                    if self.headers.get("Authorization") != f"Bearer {USER_TOKEN}":
                        self.send_response(401)
                        self.end_headers()
                        self.wfile.write(b'{"message":"invalid token"}')
                    else:
                        payload = json.dumps({"id": UID, "aud": "authenticated", "role": "authenticated", "email": "fixture@local.invalid"}).encode()
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_header("Content-Length", str(len(payload)))
                        self.end_headers()
                        self.wfile.write(payload)
                    return True
                return False

            def _forward(self):
                if self._auth():
                    return
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length) if length else None
                headers = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "content-length", "connection")}
                req = Request(f"http://127.0.0.1:{integration.rest_port}{self.path}", data=body, headers=headers, method=self.command)
                try:
                    res = urlopen(req)
                except HTTPError as exc:
                    res = exc
                payload = res.read()
                self.send_response(res.status)
                for k, v in res.headers.items():
                    if k.lower() not in ("connection", "content-length", "transfer-encoding"):
                        self.send_header(k, v)
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(payload)

            do_GET = do_POST = do_HEAD = _forward

        cls.proxy = ThreadingHTTPServer(("127.0.0.1", cls.proxy_port), Proxy)
        cls.proxy_thread = threading.Thread(target=cls.proxy.serve_forever, daemon=True)
        cls.proxy_thread.start()

        cls.deno_log = open(cls.pg.dir + "/deno.log", "w")
        deno_env = os.environ.copy()
        deno_env.update({"SUPABASE_URL": f"http://127.0.0.1:{cls.proxy_port}", "SUPABASE_SERVICE_ROLE_KEY": cls.service_jwt})
        cls.deno = subprocess.Popen(["deno", "run", "--allow-all", "supabase/functions/upsert-reponse-apprenant/index.ts"], cwd=ROOT, env=deno_env, stdout=cls.deno_log, stderr=subprocess.STDOUT)
        attendre_http(8000)

    @classmethod
    def tearDownClass(cls):
        for proc in (getattr(cls, "deno", None), getattr(cls, "rest", None)):
            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        if hasattr(cls, "proxy"):
            cls.proxy.shutdown()
            cls.proxy.server_close()
        for f in (getattr(cls, "deno_log", None), getattr(cls, "rest_log", None)):
            if f:
                f.close()
        if hasattr(cls, "pg"):
            cls.pg.stop()

    def appel(self, payload: dict | None, token: str | None = USER_TOKEN) -> tuple[int, dict]:
        conn = http.client.HTTPConnection("127.0.0.1", 8000, timeout=30)
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        conn.request("POST", "/", body=json.dumps(payload or {}), headers=headers)
        res = conn.getresponse()
        data = json.loads(res.read().decode())
        conn.close()
        return res.status, data

    def lot(self, ex: str, reponses: dict, events: list | None = None, base: int = 0) -> dict:
        return {"operation_id": str(uuid.uuid4()), "apprenant_id": APP, "user_id": UID, "module_id": 35, "exercice_id": ex, "exercice_type": "examen_blanc", "reponses": reponses, "events": events or [], "base_seq": base, "completed": False, "score": None}

    def test_handler_reel_postgresql(self):
        # Authentification et propriété : refus avant toute écriture.
        p = self.lot("auth", {"1": "x"})
        self.assertEqual(self.appel(p, None)[0], 401)
        self.assertEqual(self.appel(p, "mauvais-token")[0], 401)
        autre = dict(p, apprenant_id=str(uuid.uuid4()))
        self.assertEqual(self.appel(autre)[0], 403)
        self.assertEqual(self.pg.sql("SELECT count(*) FROM public.reponses_apprenants"), "0")

        # Lot ordinaire : chemin v2 conservé, aucune colonne d'original peuplée.
        statut, rep = self.appel(self.lot("ordinaire", {"1": "Réponse é😀"}))
        self.assertEqual((statut, rep.get("confirmed")), (200, True), rep)
        self.assertEqual(self.pg.sql("SELECT originaux_exacts::text FROM public.reponses_apprenants WHERE exercice_id='ordinaire'"), "{}")

        # Lot U+0000 + ␀ littéral + Unicode valide : vrai handler -> vraie RPC -> PostgreSQL.
        texte = "texte\u0000invisible ␀ littéral ␀\u034f é😀"
        ev1, ev2 = str(uuid.uuid4()), str(uuid.uuid4())
        events = [
            {"event_id": ev1, "question_id": "1", "valeur": "normal", "client_saved_at": "2026-11-07T10:00:00Z"},
            {"event_id": ev2, "question_id": "2", "valeur": texte, "client_saved_at": "2026-11-07T10:00:01Z"},
        ]
        lot = self.lot("nul", {"1": "normal", "2": texte, "3": ["A", "C"]}, events)
        statut, rep = self.appel(lot)
        self.assertEqual((statut, rep.get("confirmed")), (200, True), rep)
        self.assertEqual(rep.get("original_exact_preserve"), ["2"])
        row = json.loads(self.pg.sql("SELECT to_jsonb(r)::text FROM public.reponses_apprenants r WHERE exercice_id='nul'"))
        self.assertEqual(row["reponses"]["2"], texte.replace("\u0000", ""))
        original = base64.b64decode(row["originaux_exacts"]["2"]["b64"]).decode()
        self.assertEqual(json.loads(original), texte)
        journal = json.loads(self.pg.sql(f"SELECT to_jsonb(j)::text FROM public.reponses_apprenants_journal j WHERE event_id='{ev2}'"))
        self.assertEqual(json.loads(base64.b64decode(journal["valeur_originale"]["b64"]).decode()), texte)

        # Réponse perdue après commit : le renvoi ne duplique pas le journal et restitue les valeurs.
        statut, rep2 = self.appel(lot)
        self.assertEqual(statut, 200, rep2)
        self.assertEqual(sorted(rep2["skipped_questions"]), ["1", "2", "3"])
        self.assertEqual(rep2["stored_reponses"]["2"], texte)
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM public.reponses_apprenants_journal WHERE exercice_id='nul'"), "2")

        # Concurrence réelle sur la même base : jamais d'écrasement à rebours ni de séquence régressive.
        avant = self.lot("concurrence", {"2": "A\u0000"}, [{"event_id": str(uuid.uuid4()), "question_id": "2", "valeur": "A\u0000"}])
        self.assertEqual(self.appel(avant)[0], 200)
        b1 = self.lot("concurrence", {"2": "B\u0000"}, [{"event_id": str(uuid.uuid4()), "question_id": "2", "valeur": "B\u0000"}], base=1)
        b2 = self.lot("concurrence", {"2": "C\u0000"}, [{"event_id": str(uuid.uuid4()), "question_id": "2", "valeur": "C\u0000"}], base=1)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            resultats = list(pool.map(self.appel, (b1, b2)))
        self.assertTrue(all(s == 200 for s, _ in resultats), resultats)
        self.assertEqual(sum("2" in r.get("skipped_questions", []) for _, r in resultats), 1)
        final = json.loads(self.pg.sql("SELECT reponses->>'2', write_seq::text FROM public.reponses_apprenants WHERE exercice_id='concurrence'").split("|")[0])
        self.assertIn(final, ("B", "C"))
        self.assertEqual(self.pg.sql("SELECT write_seq FROM public.reponses_apprenants WHERE exercice_id='concurrence'"), "2")

        # Gel : la réponse et l'original restent identiques ; le handler le signale explicitement.
        self.pg.sql("UPDATE public.reponses_apprenants SET status='submitted', completed=true WHERE exercice_id='nul'")
        fige_avant = self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM public.reponses_apprenants r WHERE exercice_id='nul'")
        statut, rep = self.appel(self.lot("nul", {"2": "INTERDIT\u0000"}, [{"event_id": str(uuid.uuid4()), "question_id": "2", "valeur": "INTERDIT\u0000"}], base=99))
        self.assertEqual((statut, rep.get("frozen")), (200, True), rep)
        self.assertEqual(self.pg.sql("SELECT md5(to_jsonb(r)::text) FROM public.reponses_apprenants r WHERE exercice_id='nul'"), fige_avant)

        # Faux ACK impossible : la relecture du journal est refusée APRÈS commit de la RPC.
        # Le handler doit répondre 500 ; une fois le droit rendu, le renvoi confirme sans doublon.
        self.pg.sql("REVOKE SELECT ON public.reponses_apprenants_journal FROM service_role")
        ev = str(uuid.uuid4())
        a_relire = self.lot("ack", {"1": "A\u0000"}, [{"event_id": ev, "question_id": "1", "valeur": "A\u0000"}])
        statut, rep = self.appel(a_relire)
        self.assertEqual(statut, 500, rep)
        self.assertEqual(rep.get("code"), "ORIGINAL_NON_PROUVE")
        self.assertEqual(self.pg.sql("SELECT count(*) FROM public.reponses_apprenants_journal WHERE exercice_id='ack'"), "1")
        self.pg.sql("GRANT SELECT ON public.reponses_apprenants_journal TO service_role")
        statut, rep = self.appel(a_relire)
        self.assertEqual((statut, rep.get("confirmed")), (200, True), rep)
        self.assertEqual(self.pg.sql("SELECT count(*) FROM public.reponses_apprenants_journal WHERE exercice_id='ack'"), "1")

        # La copie serveur du lecteur exact reste strictement identique à la copie client.
        self.assertEqual((ROOT / "src/lib/originauxExacts.ts").read_bytes(), (ROOT / "supabase/functions/upsert-reponse-apprenant/originauxExacts.ts").read_bytes())


if __name__ == "__main__":
    unittest.main(verbosity=2)
