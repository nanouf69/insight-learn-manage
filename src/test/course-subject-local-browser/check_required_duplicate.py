import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for m in [2,10]:
   for w in [1280,390]:
    c=await b.new_context(viewport={'width':w,'height':1800 if w==1280 else 844});page=await c.new_page()
    await page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://localhost:8080') else r.abort())
    await page.goto(f'http://localhost:8080/src/test/course-subject-local-browser/module-harness.html?module={m}&missingDuplicate=1');await page.wait_for_timeout(2300)
    if await page.get_by_role('button',name=re.compile('Progression')).count():await page.get_by_role('button',name=re.compile('Progression')).click()
    await page.get_by_role('button').filter(has_text=re.compile(r'Quiz — Gestion — Partie 3\s*:')).first.click();await page.wait_for_timeout(650)
    await page.get_by_role('button',name='Valider l’exercice d’origine Gestion P3',exact=True).click()
    await page.get_by_text('Répondez à toutes les questions QCM avant de valider',exact=True).wait_for()
    assert not [x for x in await page.evaluate('fixtureCalls') if x['name']=='submit_quiz_attempt']
    card=page.locator(f'[data-course-subject-origin="module_{m}_exo_62/question_50"]')
    assert await card.count()==1
    await card.screenshot(path=f'/tmp/browser/doublons-1022/obligation-{m}-{w}.png')
    await card.get_by_role('button').filter(has_text='Répertoire des métiers').click();await page.wait_for_timeout(1600)
    await page.get_by_role('button',name='Valider l’exercice d’origine Gestion P3',exact=True).click();await page.wait_for_timeout(2200)
    subs=[x['args'] for x in await page.evaluate('fixtureCalls') if x['name']=='submit_quiz_attempt'];assert len(subs)==1 and subs[0]['_total_questions']==43
    assert set(subs[0]['_reponses']['62-31'])=={'B'} and set(subs[0]['_reponses']['62-50'])=={'B'}
    await page.reload();await page.wait_for_timeout(2100)
    r=next(r for r in await page.evaluate('fixtureRows()') if r['exercice_id']==f'module_{m}_exo_62');assert r['status']=='submitted' and set(r['reponses']['62-31'])=={'B'} and set(r['reponses']['62-50'])=={'B'}
    print('PASS required duplicate',m,w,'Q31 answered does not satisfy Q50; explicit Q50 then 43-answer submission/readback')
    await c.close()
  await b.close()
asyncio.run(main())
