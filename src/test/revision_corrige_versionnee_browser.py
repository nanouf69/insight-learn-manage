"""Browser -> real PostgreSQL candidate; all hosted network calls intercepted.
No production session, no hosted database writes. A test-only entry renders the real proposed screen.
"""
import asyncio
import json
import pathlib
from playwright.async_api import async_playwright
from revision_corrige_versionnee_sql_contract import RevisionVersionnee, UID

OUT=pathlib.Path('/tmp/browser/revision-versionnee')
OUT.mkdir(parents=True,exist_ok=True)

async def main():
    RevisionVersionnee.setUpClass()
    pg=RevisionVersionnee.pg
    saved_session=None
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        try:
            for width,height in [(1280,1800),(390,844)]:
                saved_session=None
                context=await browser.new_context(viewport={'width':width,'height':height})
                page=await context.new_page()
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                async def intercept(route):
                    nonlocal saved_session
                    url=route.request.url
                    if '/rest/v1/rpc/revision_corrige_' not in url:
                        await route.fulfill(status=200,content_type='application/json',body='[]')
                        return
                    fn=url.split('/rpc/')[-1]
                    args=route.request.post_data_json
                    literal=lambda v:"'"+json.dumps(v).replace("'","''")+"'::jsonb"
                    if fn=='revision_corrige_ouvrir' and saved_session:
                        sql=f"SELECT revision_corrige_etat('{saved_session}')"
                    elif fn=='revision_corrige_ouvrir':
                        sql=f"SELECT revision_corrige_ouvrir('{args['p_owner']}',{literal(args['p_refs'])})"
                    elif fn=='revision_corrige_etat':
                        sql=f"SELECT revision_corrige_etat('{args['p_session']}')"
                    else:
                        sql=f"SELECT revision_corrige_commande('{args['p_session']}',{args['p_seq']},'{args['p_epoch']}','{args['p_operation']}',{literal(args['p_payload'])})"
                    try:
                        out=pg.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{UID}';"+sql)
                        state=json.loads(out.splitlines()[-1]);saved_session=state['id']
                        await route.fulfill(status=200,content_type='application/json',body=json.dumps(state))
                    except RuntimeError as exc:
                        await route.fulfill(status=409,content_type='application/json',body=json.dumps({'code':'P0556','message':str(exc)}))
                await context.route('**/*supabase.co/**',intercept)
                await page.goto('http://localhost:8080/src/test/verdict-eb-browser/revision.html')
                await page.get_by_text('Corrigé actuel : A + C',exact=True).wait_for()
                await page.get_by_label('A. A',exact=True).check()
                await page.get_by_label('C. C',exact=True).check()
                await page.get_by_role('button',name='Enregistrer la réponse').click()
                await page.get_by_text('Dernière réponse enregistrée : A + C',exact=False).wait_for()
                await page.screenshot(path=str(OUT/f'{width}-saved.png'))
                await page.reload()
                await page.get_by_text('Dernière réponse enregistrée : A + C',exact=False).wait_for()
                # Publication changes only the disposable official row; frozen attempt stays intact.
                before=pg.sql("SELECT md5(snapshot::text) FROM exam_attempts_v2")
                pg.sql("UPDATE exam_content_versions SET version_number=24,content=jsonb_set(content,'{questions,0,choix,0,correct}','false')")
                await page.get_by_role('button',name='Terminer la révision').click()
                await page.get_by_role('alert').wait_for()
                await page.get_by_role('button',name='Relire les réponses enregistrées').click()
                await page.get_by_text('Corrigé actuel : C',exact=True).wait_for()
                await page.get_by_text('Dernière réponse enregistrée : A + C',exact=False).wait_for()
                await page.get_by_label('A. A',exact=True).uncheck()
                await page.get_by_role('button',name='Enregistrer la réponse').click()
                await page.get_by_text('Dernière réponse enregistrée : C · juste',exact=True).wait_for()
                await page.get_by_role('button',name='Terminer la révision').click()
                await page.get_by_text('Révision remise : 1/1 réponses parfaites.',exact=True).wait_for()
                await page.screenshot(path=str(OUT/f'{width}-submitted.png'))
                assert before==pg.sql("SELECT md5(snapshot::text) FROM exam_attempts_v2")
                assert not errors,errors
                assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
                print(f'PASS {width}: real SQL save/readback/reload/CAS official version change/revalidation/submit, historical snapshot unchanged')
                pg.sql("UPDATE exam_content_versions SET version_number=23,content=jsonb_set(content,'{questions,0,choix,0,correct}','true')")
                await context.close()
        finally:
            await browser.close()
            RevisionVersionnee.tearDownClass()

asyncio.run(main())