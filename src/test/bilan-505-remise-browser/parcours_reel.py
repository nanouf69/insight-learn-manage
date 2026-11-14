"""Parcours navigateur RÉEL de la remise 505, entièrement jetable et local.

Écran ModuleDetailView réel + supabase-js réel → PostgREST local → PostgreSQL jetable chargé avec le
catalogue de production figé (30 fonctions, 18 déclencheurs, RLS, droits) + candidat SQL 505 ;
clics enregistrés par la VRAIE fonction upsert-reponse-apprenant exécutée sous Deno.
Données fictives. Toute requête hors localhost est bloquée. Aucune connexion à la base réelle.
Usage : python3 src/test/bilan-505-remise-browser/parcours_reel.py
"""
import asyncio, base64, hashlib, hmac, json, os, pathlib, re, subprocess, sys, threading, time, urllib.request, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'src/test'))
from bilan_505_catalogue_prod_contract import load_db, Eleve, ANS, OPTS, COMPLETE, MISSING, base_journal, autre
from playwright.async_api import async_playwright
SHOTS = pathlib.Path('/tmp/browser/b505reel'); SHOTS.mkdir(parents=True, exist_ok=True)
SECRET = 'local-disposable-secret-' + uuid.uuid4().hex
PGRST, GW, EDGE = 3555, 3556, 8000
SUPA = re.compile(r'^https://[a-z0-9]+\.supabase\.co/')

def jwt(claims):
    b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b'=').decode()
    h = b({'alg': 'HS256', 'typ': 'JWT'}) + '.' + b({**claims, 'exp': int(time.time()) + 3600})
    return h + '.' + base64.urlsafe_b64encode(hmac.new(SECRET.encode(), h.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()

class T:  # adapter for Eleve helper
    def __init__(s, pg): s.pg = pg
    def sql(s, q):
        c, o = s.pg.sql(q)
        if c: raise AssertionError(o)
        return o
    def assertEqual(s, a, b, m=None): assert a == b, (a, b, m)

class Gateway(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Methods', '*')
        self.send_header('Access-Control-Expose-Headers', '*')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def _proxy(self):
        n = int(self.headers.get('Content-Length') or 0); body = self.rfile.read(n) if n else None
        if self.path.startswith('/auth/v1/user'):
            tok = (self.headers.get('Authorization') or '').split()[-1]
            claims = json.loads(base64.urlsafe_b64decode(tok.split('.')[1] + '=='))
            out = json.dumps({'id': claims['sub'], 'aud': 'authenticated', 'role': 'authenticated'}).encode()
            self.send_response(200); self._cors(); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(out); return
        if self.path.startswith('/rest/v1/'): url = f'http://127.0.0.1:{PGRST}/' + self.path[len('/rest/v1/'):]
        elif self.path.startswith('/functions/v1/upsert-reponse-apprenant'): url = f'http://127.0.0.1:{EDGE}/'
        else:
            self.send_response(404); self._cors(); self.end_headers(); return
        hdr = {k: v for k, v in self.headers.items() if k.lower() not in ('host', 'content-length', 'origin')}
        req = urllib.request.Request(url, data=body, method=self.command, headers=hdr)
        try: r = urllib.request.urlopen(req, timeout=30); status, data, rh = r.status, r.read(), r.headers
        except urllib.error.HTTPError as e: status, data, rh = e.code, e.read(), e.headers
        self.send_response(status); self._cors()
        for k, v in rh.items():
            if k.lower() not in ('content-length', 'transfer-encoding', 'connection', 'date', 'server') and not k.lower().startswith('access-control'):
                self.send_header(k, v)
        self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
    do_GET = do_POST = do_PATCH = do_DELETE = do_HEAD = do_PUT = _proxy

def wait_port(port, t=60):
    end = time.time() + t
    while time.time() < end:
        try: urllib.request.urlopen(f'http://127.0.0.1:{port}/', timeout=2); return
        except urllib.error.HTTPError: return
        except Exception: time.sleep(0.5)
    raise RuntimeError(f'port {port} not ready')

async def scenario(browser, name, e, steps, viewport):
    ctx = await browser.new_context(viewport=viewport)
    page = await ctx.new_page()
    external = []
    async def route(r):
        u = r.request.url
        if u.startswith('http://localhost:8080') or u.startswith('ws://localhost'): return await r.continue_()
        if SUPA.match(u):
            resp = await r.fetch(url=SUPA.sub(f'http://127.0.0.1:{GW}/', u))
            if '/rpc/bilan_505' in u or '/functions/' in u:
                (SHOTS / f'{name}_net.log').open('a').write(f'{r.request.method} {u[-60:]} {resp.status} {(await resp.text())[:300]}\n')
            return await r.fulfill(response=resp)
        if not u.startswith('https://fonts.'): external.append(u)
        return await r.abort()
    await ctx.route('**/*', route)
    page.on('pageerror', lambda err: print(f'  [{name}] pageerror', err))
    page.on('console', lambda m: (SHOTS / f'{name}_console.log').open('a').write(m.text[:300] + '\n') if m.type in ('error', 'warning') else None)
    await page.goto(f'http://localhost:8080/src/test/bilan-505-remise-browser/harness.html?case=reel&app={e.app}&uid={e.uid}&jwt={jwt({"sub": e.uid, "role": "authenticated", "aud": "authenticated"})}')
    await page.get_by_text(COMPLETE['questions'][0]['enonce'][:40]).first.wait_for(timeout=60000)
    await page.wait_for_timeout(1500)
    res = await steps(page)
    assert not external, external
    await ctx.close(); return res

async def main():
    pg = load_db(); t = T(pg); procs = []
    try:
        t.sql(f"ALTER ROLE authenticator SET search_path=public;")
        # Fictitious learners reproducing the 4 real shapes.
        div7 = ['505-32', '505-34', '505-35', '505-38', '505-45', '505-51', '505-56']
        def abd():
            copie = {**ANS, **{k: autre(k, ANS[k]) for k in div7}}
            return Eleve(t, copie, base_journal(copie, '2026-11-13T18:10') + [(k, ANS[k], '2026-11-13T18:53:53+00', '2026-11-13T18:53:53.2+00') for k in div7]), copie
        A, A_copie = abd(); B, B_copie = abd()
        div3 = ['505-38', '505-45', '505-56']
        C_copie = {**ANS, **{k: autre(k, ANS[k]) for k in div3}}
        C = Eleve(t, C_copie, base_journal(C_copie, '2026-11-12T12:17') + [(k, ANS[k], '2026-11-12T12:21:34+00', '2026-11-12T12:21:36+00') for k in div3], snapshot=MISSING)
        D = Eleve(t, ANS, base_journal(ANS))
        sock = pg.dir
        conf = SHOTS / 'pgrst.conf'
        conf.write_text(f'db-uri = "postgres://authenticator@/postgres?host={sock}&port=55461"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "{SECRET}"\nserver-port = {PGRST}\nserver-host = "127.0.0.1"\n')
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        procs.append(subprocess.Popen(['nix', 'run', 'nixpkgs#postgrest', '--', str(conf)], env=env, stdout=open(SHOTS / 'pgrst.log', 'w'), stderr=subprocess.STDOUT))
        threading.Thread(target=ThreadingHTTPServer(('127.0.0.1', GW), Gateway).serve_forever, daemon=True).start()
        edge_env = {**env, 'SUPABASE_URL': f'http://127.0.0.1:{GW}', 'SUPABASE_SERVICE_ROLE_KEY': jwt({'role': 'service_role'}), 'SUPABASE_ANON_KEY': jwt({'role': 'anon'})}
        procs.append(subprocess.Popen(['deno', 'run', '-A', str(ROOT / 'supabase/functions/upsert-reponse-apprenant/index.ts')], env=edge_env, stdout=open(SHOTS / 'edge.log', 'w'), stderr=subprocess.STDOUT))
        wait_port(PGRST, 120); wait_port(EDGE, 120)
        results = {}
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            valider = lambda page: page.get_by_role('button', name=re.compile(r'Valider', re.I)).last

            async def flow_a(page):  # Abdelhak-like, PC
                before = A.row()
                await valider(page).click(); await page.get_by_test_id('bilan505-revue').wait_for(timeout=20000)
                txt = await page.get_by_test_id('bilan505-revue').inner_text()
                await page.screenshot(path=str(SHOTS / 'A1_revue_pc.png'))
                assert txt.count('Question ') == 7, txt
                assert A.row() == before, 'restitution must not write'
                await valider(page).click(); await page.wait_for_timeout(2500)
                assert A.row()['status'] == 'in_progress', 'no submission without ticked review'
                await page.get_by_role('checkbox', name='Je confirme mes choix').check()
                await valider(page).click(); await page.wait_for_timeout(4000)
                r = A.row(); await page.screenshot(path=str(SHOTS / 'A2_remise_pc.png'))
                assert (r['status'], r['reponses'], r['bonnes_reponses'], r['total_questions']) == ('submitted', ANS, 49, 49), r['status']
                return 'restitution 7 → revue cochée → remise serveur 49/49'

            async def flow_b(page):  # Abdelhak-like + new click after restore, mobile
                await valider(page).click(); await page.get_by_test_id('bilan505-revue').wait_for(timeout=20000)
                await page.screenshot(path=str(SHOTS / 'B1_revue_mobile.png'))
                q = next(x for x in COMPLETE['questions'] if x['cle'] == '505-51')
                other = next(c for c in q['choix'] if c['lettre'] not in ANS['505-51'])
                card = page.locator('[data-learner-question]').filter(has_text=q['enonce'][:40]).first
                await card.get_by_text(other['texte'], exact=True).first.click()
                await page.wait_for_timeout(6000)
                expected = sorted(set(ANS['505-51']) ^ {other['lettre']})
                last = t.sql(f"SELECT valeur FROM reponses_apprenants_journal WHERE apprenant_id='{B.app}' AND question_id='505-51' ORDER BY created_at DESC LIMIT 1")
                assert sorted(json.loads(last)) == expected, (last, expected)
                for _ in range(3):
                    await valider(page).click(); await page.wait_for_timeout(3000)
                    cb = page.get_by_role('checkbox', name='Je confirme mes choix')
                    if await cb.count() and not await cb.is_checked(): await cb.check()
                    if B.row()['status'] == 'submitted': break
                r = B.row(); await page.screenshot(path=str(SHOTS / 'B2_remise_mobile.png'))
                assert r['status'] == 'submitted' and sorted(r['reponses']['505-51']) == expected, (r['status'], r['reponses'].get('505-51'))
                assert all(r['reponses'][k] == ANS[k] for k in div7 if k != '505-51')
                return f'nouveau clic 505-51 {expected} conservé dans la copie remise ({r["bonnes_reponses"]}/49)'

            async def flow_c(page):  # Alpha-like, missing key
                await valider(page).click(); await page.get_by_test_id('bilan505-revue').wait_for(timeout=20000)
                await page.get_by_role('checkbox', name='Je confirme mes choix').check()
                await valider(page).click(); await page.wait_for_timeout(4000)
                r = C.row(); await page.screenshot(path=str(SHOTS / 'C_recuperation.png'))
                assert (r['status'], r['score'], r['submitted_at']) == ('in_progress', None, None)
                assert all(r['reponses'][k] == ANS[k] for k in div3)
                assert await page.get_by_text('Vos réponses sont enregistrées sur le serveur').count() > 0
                return 'réponses récupérées en copie, statut en cours, aucune note'

            async def flow_d(page):  # Cabral-like
                await valider(page).click(); await page.wait_for_timeout(4000)
                r = D.row(); await page.screenshot(path=str(SHOTS / 'D_concordant.png'))
                assert (r['status'], float(r['score'])) == ('submitted', 100.0)
                assert await page.get_by_test_id('bilan505-revue').count() == 0
                return 'remise directe, aucune revue, note serveur'

            for name, e, f, vp in [('A', A, flow_a, {'width': 1280, 'height': 1800}), ('B', B, flow_b, {'width': 390, 'height': 844}),
                                   ('C', C, flow_c, {'width': 1280, 'height': 1800}), ('D', D, flow_d, {'width': 390, 'height': 844})]:
                try: results[name] = 'PASS ' + await scenario(browser, name, e, f, vp)
                except Exception as ex: results[name] = f'FAIL {type(ex).__name__}: {str(ex)[:400]}'
                print(name, results[name], flush=True)
            await browser.close()
        sys.exit(0 if all(v.startswith('PASS') for v in results.values()) else 1)
    finally:
        for pr in procs: pr.terminate()
        pg.stop()

asyncio.run(main())
