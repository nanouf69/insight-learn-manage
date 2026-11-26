"""Real mouse/touch UI and PDF bytes, fictional intercepted HTTP only; no official signature."""
import asyncio,base64,hashlib,json
from pathlib import Path
from playwright.async_api import async_playwright

def fictional_pdf():
 stream=b'BT /F1 18 Tf 40 700 Td (DOCUMENT FICTIF I21 - TEST UNIQUEMENT) Tj ET'
 objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
 b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream']
 data=b'%PDF-1.4\n';offsets=[0]
 for i,o in enumerate(objects,1):
  offsets.append(len(data));data+=str(i).encode()+b' 0 obj\n'+o+b'\nendobj\n'
 xref=len(data);data+=b'xref\n0 6\n0000000000 65535 f \n'
 data+=b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
 return data+b'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+str(xref).encode()+b'\n%%EOF\n'

async def main():
 output=Path('/tmp/browser/incident26-suite');output.mkdir(parents=True,exist_ok=True)
 pdf=fictional_pdf()
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for mobile in [False,True]:
   c=await browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':1280,'height':1800},has_touch=mobile,device_scale_factor=2 if mobile else 1)
   requests=[];errors=[]
   async def route(r):
    u=r.request.url
    if '/functions/v1/competences-intervenant' in u:
     body=r.request.post_data_json
     if body['action']=='review_i21':
      requests.append(body)
      response={'success':True,'review':{'id':'fictif-review'}}
      if len(requests)>1:response['preuve_i21_id']='preuve-FICTIVE'
     elif body['action']=='admin_evaluation_pdf':response={'url':'https://fiction.invalid/document.pdf'}
     else:raise AssertionError('unexpected action')
     await r.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(response))
    elif '/functions/v1/pdf-prive' in u:
     await r.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps({'pdf_base64':base64.b64encode(pdf).decode()}))
    elif u.startswith('http://localhost:8080/'):await r.continue_()
    else:await r.abort()
   await c.route('**/*',route)
   page=await c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8080/src/test/incident26-browser/harness.html?mode=i21',wait_until='networkidle')
   button=page.get_by_role('button',name='Signer manuscritement et enregistrer l’évaluation I21')
   assert await button.is_disabled()
   await page.get_by_role('checkbox').check()
   canvas=page.locator('canvas');await canvas.scroll_into_view_if_needed();box=await canvas.bounding_box();assert box
   x=box['x']+30;y=box['y']+35
   if mobile:
    cd=await c.new_cdp_session(page)
    await cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for i in range(1,8):await cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+i*12,'y':y+(i%3)*8}]})
    await cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    await page.mouse.move(x,y);await page.mouse.down()
    await page.mouse.move(x+85,y+25,steps=8);await page.mouse.up()
   await page.wait_for_function("!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Signer manuscritement et enregistrer')).disabled")
   assert await canvas.evaluate("c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)")
   await canvas.screenshot(path=str(output/f'i21-trace-{mobile}.png'))
   await button.click()
   await page.get_by_role('alert').wait_for()
   assert await page.get_by_role('status').count()==0
   assert not await button.is_disabled() # missing proof keeps the explicit trace for retry
   await button.click()
   await page.get_by_role('status').wait_for()
   assert len(requests)==2 and requests[0]['operation_id']==requests[1]['operation_id']
   assert requests[0]['signature']==requests[1]['signature']
   assert await page.get_by_role('button',name='Signer manuscritement et enregistrer l’évaluation I21').count()==0
   await page.get_by_role('button',name='Relire le compte rendu signé').click()
   await page.locator('.react-pdf__Page__canvas').wait_for(timeout=30000)
   await page.wait_for_function("(()=>{const c=document.querySelector('.react-pdf__Page__canvas');return c&&c.getBoundingClientRect().width<=c.closest('.react-pdf__Document').parentElement.clientWidth})()",timeout=3000)
   await page.get_by_role('dialog').screenshot(path=str(output/f'i21-pdf-{mobile}.png'))
   await page.keyboard.press('Escape')
   async with page.expect_download() as download:
    await page.get_by_role('button',name='Télécharger',exact=True).click()
   saved=output/f'i21-fictif-{mobile}.pdf';await (await download.value).save_as(saved)
   assert hashlib.sha256(saved.read_bytes()).digest()==hashlib.sha256(pdf).digest()
   await page.goto('http://localhost:8080/src/test/incident26-browser/harness.html?mode=i21-signe',wait_until='networkidle')
   assert await page.get_by_role('button',name='Signer manuscritement et enregistrer l’évaluation I21').count()==0
   await page.get_by_role('button',name='Relire le compte rendu signé').wait_for()
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert not errors,errors
   print(('Mobile tactile' if mobile else 'PC souris')+': PASS trace non vide, refus sans preuve, réessai même opération, état signé relu, PDF affiché/téléchargé identique; aucune écriture réelle')
   await c.close()
  await browser.close()
asyncio.run(main())