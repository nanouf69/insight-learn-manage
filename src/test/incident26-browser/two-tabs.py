"""Two real Chromium tabs, application queue, fictional HTTP ACKs only; no backend writes."""
import asyncio,json
from playwright.async_api import async_playwright

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context()
  active=peak=0
  receipts=[]
  async def route(r):
   nonlocal active,peak
   u=r.request.url
   if '/functions/v1/upsert-reponse-apprenant' in u:
    active+=1;peak=max(peak,active)
    data=r.request.post_data_json
    await asyncio.sleep(.25)
    receipts.append(data)
    await r.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps({'success':True,'confirmed':True,'write_seq':len(receipts),'accepted_event_ids':[e['event_id'] for e in data.get('events',[])]}))
    active-=1
   elif u=='http://localhost:8080/two-tabs-fixture':
    await r.fulfill(status=200,content_type='text/html',body='<html><body>DONNEES FICTIVES UNIQUEMENT</body></html>')
   elif u.startswith('http://localhost:8080/'):
    await r.continue_()
   else: await r.abort()
  await context.route('**/*',route)
  pages=[await context.new_page(),await context.new_page()]
  for page in pages:
   await page.goto('http://localhost:8080/two-tabs-fixture')
   await page.evaluate("""async()=>{window.queue=await import('/src/lib/answerPersistence.ts');window.queue.setAnswerSaveAuthToken('FICTIF-NON-VALIDE','11111111-1111-4111-8111-111111111111');window.queue.setAnswerSaveOwnership({apprenantId:'22222222-2222-4222-8222-222222222222'});if(!navigator.locks)throw Error('Web Locks absent');}""")
  await asyncio.gather(*[page.evaluate("""exercise=>window.queue.enqueueAnswerSave({apprenant_id:'22222222-2222-4222-8222-222222222222',user_id:'11111111-1111-4111-8111-111111111111',exercice_id:exercise,exercice_type:'quiz',reponses:{q:['A']}})""",f'EXERCICE-FICTIF-{i}') for i,page in enumerate(pages)])
  for page in pages:
   await page.wait_for_function('window.queue.getPendingAnswerSaves()===0',timeout=30000)
  assert {r['exercice_id'] for r in receipts}=={'EXERCICE-FICTIF-0','EXERCICE-FICTIF-1'},receipts
  assert len(receipts)==2,len(receipts)
  assert peak==1,peak
  await pages[1].reload()
  await pages[1].evaluate("async()=>{window.queue=await import('/src/lib/answerPersistence.ts');if(window.queue.getPendingAnswerSaves()!==0)throw Error('ACK perdu après reload');}")
  print('PASS: 2 onglets Chromium, 2 opérations exactes acquittées, concurrence réseau maximale 1, aucun ACK perdu au rechargement; HTTP fictif seulement')
  await browser.close()

asyncio.run(main())