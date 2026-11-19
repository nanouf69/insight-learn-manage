import asyncio
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for module in [2,10]:
   for width,height in [(1280,1800),(390,844)]:
    for fail in ['','submit']:
     c=await b.new_context(viewport={'width':width,'height':height});page=await c.new_page()
     await page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://localhost:8080') else r.abort())
     await page.goto(f'http://localhost:8080/src/test/t3p-local-browser/module-harness.html?module={module}&fail={fail}')
     await page.get_by_role('heading',name='T3P — Partie 1').wait_for()
     if not fail:
      
      if width==390:
       await page.get_by_role('button').filter(has_text='Progression').first.click()
       await page.screenshot(path='/tmp/browser/t3p-integrated/mobile-start.png')
      await page.get_by_role('button').filter(has_text='T3P Partie 2').first.click()
      await page.get_by_role('heading',name='T3P — Partie 2').wait_for()
      for q in [72,75]:
       await page.locator(f'[data-t3p-origin="module_{module}_exo_2/question_{q}"]').get_by_role('button').filter(has_text='Choix A').click()
      await page.get_by_role('button',name='Valider l’exercice d’origine T3P P2',exact=True).click()
      await page.get_by_role('heading',name='T3P — Partie 1').wait_for()
      assert not [x for x in await page.evaluate('fixtureCalls') if x['name']=='submit_quiz_attempt']
      print('PASS missing original question routed back, no submission',module,width)
     else:
      await page.get_by_role('button',name='Valider l’exercice d’origine T3P P1',exact=True).click()
      await page.get_by_role('button',name='Réessayer la validation',exact=True).wait_for()
      assert not await page.get_by_text('Points : 1 / 2',exact=True).count()
      assert all(r['status']=='in_progress' for r in await page.evaluate('fixtureRows()'))
      print('PASS submission refusal no false result',module,width)
     await page.screenshot(path=f'/tmp/browser/t3p-integrated/refusal-{module}-{width}-{fail or "missing"}.png')
     await c.close()
  await b.close()
asyncio.run(main())
