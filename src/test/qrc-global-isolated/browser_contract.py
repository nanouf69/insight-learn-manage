"""Actual V2 screen -> local HTTP -> disposable PostgreSQL. Synthetic auth ONLY."""
import asyncio,json,threading,pathlib,sys
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
from fixture import Fixture,EXAMS
ROOT=pathlib.Path(__file__).resolve().parents[3]
async def main():
 f=Fixture()
 try:
  for exam in EXAMS:
   for matter in 'ABCDEFG':f.historical(exam,matter)
  # Native rows loaded through the same matrix, never graded by the historical function.
  f.native('EB1-TAXI','N');f.native('EB2-TAXI','N')
  before=f.fingerprint()
  class Handler(BaseHTTPRequestHandler):
   lost=False
   def log_message(self,*args):pass
   def send(self,status,value):
    self.send_response(status);self.send_header('Access-Control-Allow-Origin','http://localhost:8080');self.send_header('Access-Control-Allow-Headers','Content-Type');self.send_header('Access-Control-Allow-Methods','GET,POST,OPTIONS');self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(value).encode())
   def do_OPTIONS(self):self.send(200,{})
   def do_GET(self):self.send(200,f.rows(limit=1000))
   def do_POST(self):
    p=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
    try:
     row=next(r for r in f.rows(limit=1000) if r['identity']==p['identity'])
     # Use CLIENT fingerprint/revision, not a refreshed server value.
     row.update(fingerprint=p['fingerprint'],revision=p['revision'])
     result=f.grade(row,p['operation'],p['note'])
     if self.__class__.lost:
      self.__class__.lost=False;self.send(503,{'error':'Confirmation réseau perdue après enregistrement'});return
     self.send(200,result)
    except Exception as e:self.send(409,{'error':str(e)})
  api=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=api.serve_forever,daemon=True).start()
  url=f'http://127.0.0.1:{api.server_port}'
  screenshots=pathlib.Path('/tmp/browser/qrc-global/screenshots');screenshots.mkdir(parents=True,exist_ok=True)
  async with async_playwright() as p:
   browser=await p.chromium.launch(headless=True)
   for width,height,name in [(1280,1800,'desktop'),(820,1180,'tablet'),(390,844,'phone')]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},has_touch=name!='desktop')
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    async def substitute(route):
     path=route.request.url
     if '/noyauReel.ts' in path:
      body='globalThis.__QRC_LOCAL_API__='+json.dumps(url)+';\n'+pathlib.Path(__file__).with_name('browserTransport.js').read_text()
     elif '/correctionIa.ts' in path:
      body='export const lireConfigIa=async()=>({actif:false});export const lireCorrectionsIa=async()=>[];export const lireDemandesVerification=async()=>[];export const compterCopiesEnAttenteIa=async()=>({reponses:0,passages:0});export const definirIaActif=async()=>{};export const LIBELLES_MOTIF_IA={};'
     else:
      body="export const supabase={auth:{getUser:async()=>({data:{user:{email:'admin@synthetic.invalid'}}})},from:()=>({select:()=>({in:async()=>({data:[],error:null})})})};"
     await route.fulfill(status=200,content_type='application/javascript',body=body)
    await page.route('**/src/features/correction-qrc-v2/noyauReel.ts*',substitute)
    await page.route('**/src/features/correction-qrc-v2/correctionIa.ts*',substitute)
    await page.route('**/src/integrations/supabase/client.ts*',substitute)
    # Any unexpected connection to real services is prohibited.
    await page.route('**/*.supabase.co/**',lambda r:r.abort())
    if name=='desktop':
     for exam in EXAMS:
      await page.goto('http://localhost:8080/src/test/qrc-global-isolated/harness.html?qrc_groupe=day&qrc_eb=day:'+exam)
      await page.get_by_test_id('cellule-'+next(r['identity'] for r in f.rows(exam=exam) if r['subject_id']=='A')).wait_for()
      for matter in 'ABCDEFG':
       row=next(r for r in f.rows(exam=exam) if r['subject_id']==matter)
       await page.get_by_test_id('cellule-'+row['identity']).click()
       await page.get_by_test_id('note-1').click()
       # Database readback plus UI guard must clear before the next action.
       await page.get_by_test_id('copie-suivante').wait_for()
       await page.wait_for_function("!document.querySelector('[data-testid=\"note-1\"]')?.disabled && !document.body.innerText.includes('Enregistrement…')")
       assert next(r for r in f.rows(exam=exam) if r['subject_id']==matter)['note']==1
      print('PASS actual V2 screen seven subjects',exam)
     row=next(r for r in f.rows(exam='EB2') if r['subject_id']=='A')
     await page.goto('http://localhost:8080/src/test/qrc-global-isolated/harness.html?qrc_groupe=day&qrc_eb=day:EB2&qrc='+row['identity'])
     await page.get_by_test_id('modifier-note').click()
     page.on('dialog',lambda d:d.accept())
     Handler.lost=True
     await page.get_by_test_id('revision-note-2').click()
     await page.get_by_test_id('erreur-correction-copie').wait_for()
     assert next(r for r in f.rows(exam='EB2') if r['subject_id']=='A')['note']==2
     await page.get_by_test_id('revision-note-2').click()
     await page.wait_for_function("!document.body.innerText.includes('Enregistrement…') && !document.body.innerText.includes('NON ENREGISTRÉE')")
     assert f.pg.sql('SELECT count(*) FROM qrc_history_events')=='169'
     print('PASS lost HTTP confirmation after commit, same-intent retry and V2 readback, no duplicate')
    else:
     exam='EB2';session='evening' if name=='phone' else 'day'
     row=next(r for r in f.rows(exam=exam) if r['subject_id']=='A')
     await page.goto(f'http://localhost:8080/src/test/qrc-global-isolated/harness.html?qrc_groupe={session}&qrc_eb={session}:{exam}&qrc='+row['identity'])
     await page.get_by_test_id('reponse-eleve').wait_for();await page.reload();await page.get_by_test_id('reponse-eleve').wait_for()
     assert 'Réponse synthétique A' in await page.get_by_test_id('reponse-eleve').inner_text()
     print('PASS reload another device',name,session)
    await page.screenshot(path=str(screenshots/(name+'.png')))
    assert not errors,errors
    await ctx.close()
   await browser.close()
  assert before==f.fingerprint(),'source mutation'
  assert f.pg.sql('SELECT count(*) FROM qrc_history_events')=='169'
  print('PASS 168 actual screen corrections + 1 append-only revision, 24 exams; sources unchanged; no JS errors')
  api.shutdown()
 finally:f.pg.stop()
asyncio.run(main())
