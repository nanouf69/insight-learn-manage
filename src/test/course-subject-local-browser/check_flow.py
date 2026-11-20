import asyncio,json,os,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path('/tmp/browser/course-subject'); ROOT.mkdir(exist_ok=True)
async def open_quiz(page,subject,part):
 if await page.get_by_role('button',name=re.compile('Progression')).count():
  await page.get_by_role('button',name=re.compile('Progression')).click()
 # Existing progression labels distinguish course from quiz.
 label=page.get_by_role('button').filter(has_text=re.compile('Quiz — '+('Gestion' if subject=='Gestion' else 'Sécurité Routière')+' — Partie '+str(part)+r'\s*:'))
 await label.first.click();await page.wait_for_timeout(650)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for module in [2,10]:
   for width in [1280,390]:
    ctx=await browser.new_context(viewport={'width':width,'height':1800 if width==1280 else 844});page=await ctx.new_page();errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    await page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://localhost:8080') else r.abort())
    await page.goto(f'http://localhost:8080/src/test/course-subject-local-browser/module-harness.html?module={module}');await page.wait_for_timeout(2500)
    seen=[];counts=[]
    for subject,expected in [('Gestion',[47,61,38]),('Sécurité routière',[112,45,83])]:
     for part,count in enumerate(expected,1):
      await open_quiz(page,subject,part)
      await page.get_by_role('heading',name=f'{subject} — Partie {part}',exact=True).wait_for()
      entries=await page.locator('[data-course-subject-origin]').evaluate_all('(els)=>els.map(el=>el.dataset.courseSubjectOrigin)')
      assert len(entries)==count,(module,width,subject,part,len(entries),count)
      seen.extend(entries);counts.append(count)
    assert len(seen)==386 and len(set(seen))==386
    await open_quiz(page,'Gestion',2)
    moved=page.locator(f'[data-course-subject-origin="module_{module}_exo_62/question_8"]')
    # Answer under the moved question; original P3 key only.
    await moved.get_by_role('button').filter(has_text='Abattement automatique de 50').click()
    await page.wait_for_timeout(1700)
    rows=await page.evaluate('fixtureRows()')
    row=next(r for r in rows if r['exercice_id']==f'module_{module}_exo_62')
    assert set(row['reponses']['62-8'])=={'A','C'},row['reponses']['62-8']
    await open_quiz(page,'Gestion',3)
    await page.get_by_role('button',name='Valider l’exercice d’origine Gestion P3',exact=True).click()
    await page.wait_for_timeout(2000)
    subs=[c['args'] for c in await page.evaluate('fixtureCalls') if c['name']=='submit_quiz_attempt']
    assert len(subs)==1 and subs[0]['_exercice_id']==f'module_{module}_exo_62' and subs[0]['_total_questions']==43
    assert len(subs[0]['_reponses'])==43 and set(subs[0]['_reponses']['62-8'])=={'A','C'}
    await page.reload();await page.wait_for_timeout(2200)
    assert next(r for r in await page.evaluate('fixtureRows()') if r['exercice_id']==f'module_{module}_exo_62')['status']=='submitted'
    await open_quiz(page,'Gestion',2)
    assert await page.locator(f'[data-course-subject-origin="module_{module}_exo_62/question_8"]').count()==1
    await page.screenshot(path=str(ROOT/f'gestion-{module}-{width}.png'))
    await open_quiz(page,'Sécurité routière',1)
    moved=page.locator(f'[data-course-subject-origin="module_{module}_exo_81/question_44"]')
    await moved.get_by_role('button').filter(has_text='vérification des pneus').click();await page.wait_for_timeout(1600)
    await open_quiz(page,'Sécurité routière',2)
    await page.get_by_role('button',name='Valider l’exercice d’origine Sécurité routière P2',exact=True).click();await page.wait_for_timeout(2200)
    subs=[c['args'] for c in await page.evaluate('fixtureCalls') if c['name']=='submit_quiz_attempt']
    assert len(subs)==1 and subs[0]['_total_questions']==50 and subs[0]['_exercice_id']==f'module_{module}_exo_81'
    assert set(subs[0]['_reponses']['81-44'])=={'A','B'}
    await page.reload();await page.wait_for_timeout(2000)
    row=next(r for r in await page.evaluate('fixtureRows()') if r['exercice_id']==f'module_{module}_exo_81');assert row['status']=='submitted' and set(row['reponses']['81-44'])=={'A','B'}
    await open_quiz(page,'Sécurité routière',3);await page.screenshot(path=str(ROOT/f'securite-{module}-{width}.png'))
    assert not errors,errors
    print('PASS',module,width,'386 unique identities; displayed',counts,'save, original submission 43/50, reload')
    await ctx.close()
  await browser.close()
asyncio.run(main())
