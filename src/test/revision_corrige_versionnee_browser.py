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
                    if fn=='revision_corrige_ouvrir':
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
                        msg=str(exc)
                        code='P0555' if 'Conflit de version' in msg else 'P0556' if 'Corrige modifie' in msg else 'P0557' if 'Toutes les reponses' in msg else 'P0554' if 'deja remise' in msg else '22023'
                        await route.fulfill(status=409,content_type='application/json',body=json.dumps({'code':code,'message':msg}))
                await context.route('**/*supabase.co/**',intercept)
                await page.goto('http://localhost:8080/src/test/verdict-eb-browser/revision.html')
                await page.get_by_text('Corrigé actuel : A + C',exact=True).wait_for()
                await page.get_by_label('A. A',exact=True).check()
                await page.get_by_label('C. C',exact=True).check()
                # Durable autosave: no click, the answer is confirmed by the server.
                await page.get_by_text('Dernière réponse enregistrée : A + C',exact=False).wait_for()
                await page.get_by_text('Enregistrée le',exact=False).wait_for()
                await page.screenshot(path=str(OUT/f'{width}-saved.png'))
                await page.reload()
                await page.get_by_text('Dernière réponse enregistrée : A + C',exact=False).wait_for()
                # Second tab of the same learner changes the same question.
                tab2=await context.new_page()
                tab2.on('pageerror',lambda e:errors.append(str(e)))
                await tab2.goto('http://localhost:8080/src/test/verdict-eb-browser/revision.html')
                await tab2.get_by_text('Dernière réponse enregistrée : A + C',exact=False).wait_for()
                await tab2.get_by_label('C. C',exact=True).uncheck()
                await tab2.get_by_text('Dernière réponse enregistrée : A ·',exact=False).wait_for()
                # Stale first tab edits too: CAS refusal, both versions kept, learner chooses.
                await page.get_by_label('B. B',exact=True).check()
                await page.get_by_text('Une autre fenêtre a enregistré une réponse différente',exact=False).wait_for()
                await page.get_by_text('Réponse enregistrée : A · Votre saisie ici : A + C + B',exact=True).wait_for()
                await page.screenshot(path=str(OUT/f'{width}-conflict.png'))
                await page.get_by_role('button',name='Garder ma saisie').click()
                await page.get_by_text('Dernière réponse enregistrée : A + C + B',exact=False).wait_for()
                await page.get_by_label('B. B',exact=True).uncheck()
                await page.get_by_text('Dernière réponse enregistrée : A + C ·',exact=False).wait_for()
                n_events=pg.sql("SELECT count(*) FROM revision_corrige_events")
                await tab2.close()
                # Publication changes only the disposable official row; frozen attempt stays intact.
                before=pg.sql("SELECT md5(snapshot::text) FROM exam_attempts_v2")
                pg.sql("UPDATE exam_content_versions SET version_number=24,content=jsonb_set(content,'{questions,0,choix,0,correct}','false')")
                await page.get_by_role('button',name='Terminer la révision').click()
                await page.get_by_role('alert').wait_for()
                await page.get_by_role('button',name='Relire les réponses enregistrées').click()
                await page.get_by_text('Corrigé actuel : C',exact=True).wait_for()
                await page.get_by_text('Dernière réponse enregistrée : A + C',exact=False).wait_for()
                await page.get_by_label('A. A',exact=True).uncheck()
                await page.get_by_text('Dernière réponse enregistrée : C · juste',exact=True).wait_for()
                await page.get_by_role('button',name='Terminer la révision').click()
                await page.get_by_text('Révision remise : 1/1 réponses parfaites.',exact=True).wait_for()
                await page.screenshot(path=str(OUT/f'{width}-submitted.png'))
                assert before==pg.sql("SELECT md5(snapshot::text) FROM exam_attempts_v2")
                assert not errors,errors
                assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
                print(f'PASS {width}: autosave/readback/reload, two tabs CAS conflict kept both then chosen, official version change/revalidation/submit, events={n_events}, snapshot unchanged')
                pg.sql("UPDATE exam_content_versions SET version_number=23,content=jsonb_set(content,'{questions,0,choix,0,correct}','true')")
                await context.close()
        finally:
            await browser.close()
            RevisionVersionnee.tearDownClass()

asyncio.run(main())