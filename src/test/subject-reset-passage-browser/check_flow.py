import asyncio,json,sys,uuid
from pathlib import Path
from urllib.parse import urlparse,parse_qs
sys.path.insert(0,'/dev-server/src/test')
from admin_subject_reset_sql_contract import Contract,A,U,ADMIN
from playwright.async_api import async_playwright
L=lambda v:"'"+str(v).replace("'","''")+"'"
async def main():
 Contract.setUpClass()
 try:
  Contract.sql("CREATE ROLE authenticator LOGIN;GRANT authenticated TO authenticator;")
  subjects=[{'id':'t3p','nom':'A T3P','duree':45,'coefficient':3,'noteSur':20,'noteEliminatoire':6,'questions':[{'id':1,'type':'QCM','enonce':'Question fictive de passage','choix':[{'lettre':'A','texte':'Oui','correct':True},{'lettre':'B','texte':'Non'}]}]}]
  for idx,exam in enumerate(['EB3','EB4-TAXI']):
   Contract.sql(f"INSERT INTO examens_blancs_parcours VALUES({35 if idx==0 else 36},'{exam}');INSERT INTO module_editor_state(module_id,module_data) VALUES({910+idx},'{json.dumps({'id':exam,'matieres':subjects})}');")
   if idx:
    content={'exam_id':exam,'exam_libelle':'Fictif','matieres':[{'subject_id':'t3p','titre':'A T3P','ordre':1,'duree':45,'coefficient':3,'note_sur':20,'note_eliminatoire':6,'pts_qcm':1}], 'questions':[{'id':'t3p:1','matiere':'t3p','ordre':1,'type':'QCM','enonce':'Question fictive de passage','points':1,'choix':subjects[0]['questions'][0]['choix']}]}
    Contract.sql(f"INSERT INTO exam_content_versions(filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif,is_test) VALUES('TAXI','4','{exam}',1,'publiee','{json.dumps(content)}','fictif','test',true)")
   c=Contract().context(exam,'t3p');Contract().authorize(c,str(uuid.uuid4()))
  async with async_playwright() as p:
   browser=await p.chromium.launch(headless=True)
   for exam,width,height in [('EB3',1280,1800),('EB4-TAXI',390,844)]:
    context=await browser.new_context(viewport={'width':width,'height':height});page=await context.new_page(); failures=[]
    async def rpcsql(sql):
     import subprocess
     query=f"SET ROLE authenticated;SET request.jwt.claim.sub='{U}';SET request.jwt.claims='{json.dumps({'sub':U,'role':'authenticated'})}';"+sql
     r=subprocess.run(['psql','-X','-At','-h',Contract.d,'-p','55487','-U','authenticator','-d','postgres','-v','ON_ERROR_STOP=1'],input=query,env=Contract.env,text=True,capture_output=True)
     return r
    async def route(r):
     req=r.request;url=req.url
     if url.startswith('http://localhost:8080'):return await r.continue_()
     args=req.post_data_json if req.method=='POST' else None
     if '/rest/v1/rpc/' in url:
      name=url.split('/rpc/')[1].split('?')[0];vals=['NULL' if v is None else L(json.dumps(v))+'::jsonb' if isinstance(v,dict) else "ARRAY[]::text[]" if isinstance(v,list) and not v else L(json.dumps(v))+'::jsonb' if isinstance(v,list) else str(v) if isinstance(v,int) else L(v) for v in (args or {}).values()]
      if name not in ['exam_subject_reset_context','start_exam_subject_retake','start_or_get_exam_timer','core_save_answer','core_finalize_attempt','core_recalc_result']:return await r.fulfill(json=False)
      sql=f"SELECT to_jsonb(x) FROM {name}({','.join(vals)}) x";out=await rpcsql(sql)
      if out.returncode:failures.append((name,out.stderr));return await r.fulfill(status=400,json={'message':out.stderr,'code':'TEST'})
      rows=[json.loads(x) for x in out.stdout.splitlines() if x.startswith(('{','[','"'))];data=rows if False else rows[-1] if rows else None
      return await r.fulfill(json=data)
     if '/functions/v1/upsert-reponse-apprenant' in url:
      d=args or {};out=Contract.sql(f"UPDATE reponses_apprenants SET reponses={L(json.dumps(d['reponses']))}::jsonb,completed={str(d.get('completed',False)).lower()} WHERE apprenant_id='{A}' AND exercice_id={L(d['exercice_id'])}",False)
      if out.returncode:failures.append(('legacy_save',out.stderr));return await r.fulfill(status=400,json={'message':out.stderr})
      return await r.fulfill(json={'success':True,'confirmed':True,'write_seq':1,'accepted_event_ids':[e['event_id'] for e in d.get('events',[]) if 'event_id' in e],'stored_reponses':d['reponses']})
     if '/rest/v1/' in url:
      parts=urlparse(url);tab=parts.path.split('/rest/v1/')[1];filters=parse_qs(parts.query);where=[]
      if tab not in ['reponses_apprenants','exam_subject_retakes','exam_attempts_v2','answer_state','core_exam_results']:return await r.fulfill(json=[])
      for k,vs in filters.items():
       if k in ['select','order','limit']:continue
       val=vs[0]
       if val.startswith('eq.'):where.append('"'+k+'"='+L(val[3:]))
      q=f'SELECT to_jsonb(t) FROM {tab} t'+(' WHERE '+' AND '.join(where) if where else '')
      out=Contract.sql(q,False)
      rows=[json.loads(x) for x in out.stdout.splitlines() if x.startswith('{')]
      if 'application/vnd.pgrst.object' in req.headers.get('accept',''):return await r.fulfill(json=rows[0] if rows else None)
      return await r.fulfill(json=rows)
     return await r.fulfill(json={})
    await context.route('**/*',route);await page.goto(f'http://localhost:8080/src/test/subject-reset-passage-browser/harness.html?exam={exam}');await page.get_by_role('button',name='Démarrer la matière ciblée').click();await page.wait_for_timeout(2000);print('INITIAL',await page.locator('body').inner_text(),failures);await page.screenshot(path='/tmp/browser/subject-passage/diagnostic.png');await page.get_by_text('Question fictive de passage',exact=True).wait_for();await page.get_by_role('checkbox').first.click()
    await page.wait_for_timeout(1000);print(exam,'before reload',await page.locator('body').inner_text());await page.reload();await page.get_by_role('button',name='Démarrer la matière ciblée').click();await page.get_by_text('Question fictive de passage',exact=True).wait_for();await page.wait_for_timeout(1800);await page.screenshot(path=f'/tmp/browser/subject-passage/{exam}-reload.png');await page.get_by_role('button',name='Terminer la matière').click();await page.wait_for_timeout(2500);print('AFTER SUBMIT',await page.locator('body').inner_text(),failures);await page.screenshot(path='/tmp/browser/subject-passage/submit-diagnostic.png');await page.get_by_text('Matière remise',exact=True).wait_for(timeout=20000);print(exam,'complete',failures);await page.screenshot(path=f'/tmp/browser/subject-passage/{exam}-done.png');await context.close()
   await browser.close()
 finally:Contract.cleanup()
asyncio.run(main())
