import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/emargement-parite')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  checks=[]
  for mobile in [False,True]:
   context=await browser.new_context(**({'viewport':{'width':390,'height':844}} if mobile else {}))
   await context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(('http://localhost:8080','data:','blob:','about:')) else route.abort())
   for period in ['octobre','novembre']:
    states=[]
    for role in ['admin','eleve']:
     page=await context.new_page(); errors=[]
     page.on('pageerror',lambda e: errors.append(str(e)))
     await page.goto(f'http://localhost:8080/src/test/emargement-parite-browser/harness.html?period={period}&role={role}',wait_until='networkidle')
     await page.get_by_role('heading',name="Feuilles d'émargement",exact=True).wait_for()
     text=await page.locator('main').inner_text()
     signed=await page.get_by_text('Signé tardivement le',exact=False).count()
     missing=await page.get_by_text('Non signé',exact=True).count()
     assert signed==(4 if period=='octobre' else 0),(period,role,text)
     assert missing==(0 if period=='octobre' else 4),(period,role,text)
     assert await page.get_by_role('button',name='Re-signer',exact=False).count()==0
     assert await page.get_by_role('button',name='Signer ce créneau',exact=True).count()==(4 if period=='novembre' and role=='eleve' else 0)
     assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
     await page.screenshot(path=str(OUT/f'{period}-{role}-{"mobile" if mobile else "pc"}.png'))
     async with page.expect_popup() as popup:
      await page.get_by_role('button',name='Télécharger la feuille complète',exact=True).click()
     pdfpage=await popup.value
     await pdfpage.wait_for_load_state('domcontentloaded')
     pdftext=await pdfpage.locator('body').inner_text()
     assert '14h / 14h' in pdftext,pdftext
     assert ('28 octobre 2026' in pdftext)==(period=='octobre')
     assert ('17 novembre 2026' in pdftext)==(period=='novembre')
     await pdfpage.pdf(path=str(OUT/f'{period}-{role}-{"mobile" if mobile else "pc"}.pdf'),landscape=True,print_background=True)
     states.append((signed,missing,pdftext))
     await pdfpage.close()
     await page.get_by_role('button',name='Actualiser',exact=True).click()
     await page.get_by_role('heading',name="Feuilles d'émargement",exact=True).wait_for()
     assert await page.get_by_text('Non signé',exact=True).count()==missing
     await page.reload(wait_until='networkidle')
     assert await page.get_by_text('Non signé',exact=True).count()==missing
     if period=='novembre':
      await page.evaluate('window.fixtureConfirmRead()')
      await page.get_by_role('button',name='Actualiser',exact=True).click()
      await page.get_by_role('heading',name="Feuilles d'émargement",exact=True).wait_for()
      assert await page.get_by_text('Non signé',exact=True).count()==3
     assert not errors,errors
     checks.append({'period':period,'role':role,'mobile':mobile,'signed':signed,'missing':missing,'pdf':True,'refresh':True,'reload':True})
     await page.close()
    assert states[0][:2]==states[1][:2]
    # Commands are role-specific, printed evidence must be identical.
    assert states[0][2].replace("Signer ici", "").split()==states[1][2].replace("Signer ici", "").split()
   await context.close()
  context=await browser.new_context()
  await context.route('**/*', lambda route: route.continue_() if route.request.url.startswith('http://localhost:8080') else route.abort())
  page=await context.new_page()
  await page.goto('http://localhost:8080/src/test/emargement-parite-browser/harness.html?period=novembre&role=eleve&error=1',wait_until='networkidle')
  assert await page.get_by_role('alert').count()==1
  assert await page.get_by_text('4 signatures manquantes',exact=True).count()==0
  await page.screenshot(path=str(OUT/'read-error.png'))
  await page.goto('http://localhost:8080/src/test/emargement-parite-browser/harness.html?period=octobre&role=eleve&view=documents',wait_until='networkidle')
  assert await page.get_by_text('Signé tardivement le',exact=False).count()==4
  await page.screenshot(path=str(OUT/'documents-fc.png'))
  print(json.dumps({'comparisons':checks,'errorFailsClosed':True,'fcDocumentsUseSameView':True},ensure_ascii=False))
  await browser.close()
asyncio.run(main())
