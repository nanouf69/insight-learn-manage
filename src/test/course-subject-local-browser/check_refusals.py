import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
async def open_quiz(page,subject,part):
 if await page.get_by_role('button',name=re.compile('Progression')).count():await page.get_by_role('button',name=re.compile('Progression')).click()
 await page.get_by_role('button').filter(has_text=re.compile('Quiz — '+subject+' — Partie '+str(part)+r'\s*:')).first.click();await page.wait_for_timeout(600)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for module in [2,10]:
   for width in [1280,390]:
    for mode in ['missing','fail=submit']:
     ctx=await b.new_context(viewport={'width':width,'height':1800 if width==1280 else 844});page=await ctx.new_page()
     await page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://localhost:8080') else r.abort())
     await page.goto(f'http://localhost:8080/src/test/course-subject-local-browser/module-harness.html?module={module}&{mode}');await page.wait_for_timeout(2300)
     await open_quiz(page,'Gestion',3);await page.get_by_role('button',name='Valider l’exercice d’origine Gestion P3',exact=True).click();await page.wait_for_timeout(1800)
     if mode=='missing':
      await page.get_by_role('heading',name='Gestion — Partie 2',exact=True).wait_for()
      assert not [x for x in await page.evaluate('fixtureCalls') if x['name']=='submit_quiz_attempt']
      assert await page.locator(f'[data-course-subject-origin="module_{module}_exo_62/question_8"]').count()==1
     else:
      await page.get_by_role('button',name='Réessayer la validation',exact=True).wait_for()
      assert all(r['status']=='in_progress' for r in await page.evaluate('fixtureRows()'))
     await page.screenshot(path=f'/tmp/browser/course-subject/{mode.replace("=","-")}-{module}-{width}.png')
     print('PASS',mode,module,width,'no false submission; original missing question located')
     await ctx.close()
  await b.close()
asyncio.run(main())
