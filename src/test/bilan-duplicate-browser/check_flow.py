import asyncio,re,json
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for m in [4,9]:
   for w in [1280,390]:
    for ex,total,first,last,pos in [(100,122,1066,2077,114),(101,146,62031,62050,141)]:
     c=await b.new_context(viewport={'width':w,'height':1800 if w==1280 else 844});page=await c.new_page()
     await page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://localhost:8080') else r.abort())
     await page.goto(f'http://localhost:8080/src/test/bilan-duplicate-browser/harness.html?module={m}&exercise={ex}');await page.wait_for_timeout(3800)
     if m==9 and ex==101:
      if await page.get_by_role('button',name=re.compile('Progression')).count(): await page.get_by_role('button',name=re.compile('Progression')).click()
      await page.get_by_role('button').filter(has_text=re.compile('Quiz — Bilan Gestion')).first.click();await page.wait_for_timeout(700)
     print('case',m,w,ex,'validate buttons',await page.get_by_role('button').filter(has_text=re.compile('Valider')).all_text_contents())
     validate=page.get_by_role('button',name='Valider',exact=True)
     if not await validate.count(): validate=page.get_by_role('button').filter(has_text=re.compile('Valider')).first
     await validate.click()
     await page.get_by_text('Répondez à toutes les questions QCM avant de valider',exact=True).wait_for()
     assert not [x for x in await page.evaluate('fixtureCalls') if x['name']=='submit_quiz_attempt']
     rows=await page.evaluate('fixtureRows()');assert f'{ex}-{last}' not in rows[0]['reponses'];assert f'{ex}-{first}' in rows[0]['reponses']
     card=page.locator(f'#exo-q-{ex}-{pos}')
     await card.screenshot(path=f'/tmp/browser/bilan-dedup/missing-{m}-{w}-{ex}.png')
     print('cardbuttons',await card.get_by_role('button').all_text_contents())
     fixture=json.load(open('/dev-server/src/test/bilan-duplicate-browser/audited-bilan-fixture.json'))
     q=next(q for e in fixture['exercises'] if e['id']==ex for q in e['questions'] if q['id']==last)
     for choice in q['choix']:
      if choice.get('correct'): await card.get_by_role('button').filter(has_text=choice['texte']).click()
     await page.wait_for_timeout(1800);await validate.click();await page.wait_for_timeout(2300)
     calls=await page.evaluate('fixtureCalls');subs=[x['args'] for x in calls if x['name']=='submit_quiz_attempt']
     assert len(subs)==1,(len(subs),calls[-4:]);assert subs[0]['_total_questions']==total
     assert len(subs[0]['_reponses'])==total;assert subs[0]['_bonnes_reponses']==total
     await card.screenshot(path=f'/tmp/browser/bilan-dedup/corrected-{m}-{w}-{ex}.png')
     await page.reload();await page.wait_for_timeout(3000)
     rows=await page.evaluate('fixtureRows()'); assert rows[0]['status']=='submitted';assert len(rows[0]['reponses'])==total
     assert set(rows[0]['reponses'][f'{ex}-{last}'])==set(rows[0]['reponses'][f'{ex}-{first}'])
     print('PASS',m,w,ex,'missing refused; explicit answer saved/submitted',total,'/',total,'reload confirmed')
     await c.close()
  await b.close()
asyncio.run(main())
