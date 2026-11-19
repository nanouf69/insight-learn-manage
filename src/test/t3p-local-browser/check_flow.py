import asyncio,json
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  c=await b.new_context(viewport={'width':int(__import__('os').environ.get('WIDTH','1280')),'height':844 if __import__('os').environ.get('WIDTH')=='390' else 1800});page=await c.new_page()
  module=int(__import__('os').environ.get('MODULE','2'))
  await page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://localhost:8080') else r.abort())
  await page.goto(f'http://localhost:8080/src/test/t3p-local-browser/module-harness.html?module={module}')
  await page.wait_for_timeout(3000)
  for q in [73,74,76]:
   await page.locator(f'[data-t3p-origin="module_{module}_exo_2/question_{q}"]').get_by_role('button').filter(has_text='Choix A').click()
  await page.get_by_role('button',name='Valider l’exercice d’origine T3P P1',exact=True).click()
  await page.get_by_text('Points : 1 / 2',exact=True).wait_for()
  await page.get_by_role('button',name='Partie 2',exact=True).click()
  await page.get_by_role('heading',name='T3P — Partie 2').wait_for()
  print('q59 count',await page.locator('[data-t3p-origin]').filter(has_text='Q59').count())
  for q in [72,75]:
   await page.locator(f'[data-t3p-origin="module_{module}_exo_2/question_{q}"]').get_by_role('button').filter(has_text='Choix A').click()
  await page.get_by_role('button',name='Valider l’exercice d’origine T3P P2',exact=True).click()
  await page.get_by_text('Points : 6 / 6',exact=True).wait_for()
  submissions=[x['args'] for x in await page.evaluate('fixtureCalls') if x['name']=='submit_quiz_attempt']
  assert len(submissions)==2
  assert submissions[0]['_exercice_id']==f'module_{module}_exo_1' and submissions[0]['_total_questions']==2 and submissions[0]['_score']==50
  assert submissions[1]['_exercice_id']==f'module_{module}_exo_2' and submissions[1]['_total_questions']==6 and submissions[1]['_score']==100
  assert '1-59' not in submissions[1]['_reponses'] and '2-59' not in submissions[0]['_reponses']
  print('PASS original submissions and scores',module)
  await page.reload();await page.wait_for_timeout(3000)
  restored=await page.evaluate('fixtureRows().map(r=>({id:r.exercice_id,status:r.status,answers:r.reponses}))')
  assert all(r['status']=='submitted' for r in restored)
  assert restored[0]['answers']['1-59']=='B' and restored[1]['answers']['2-59']=='A'
  print('PASS restore distinct Q59',module)
  await page.screenshot(path=f'/tmp/browser/t3p-integrated/end-{module}-{__import__("os").environ.get("WIDTH","1280")}.png')
  await b.close()
asyncio.run(main())
