"""Optional AI receipts and limits, disposable PostgreSQL only, never Cloud."""
import concurrent.futures, json, os, subprocess, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TEMP = tempfile.mkdtemp(prefix='taxi-ia-sql-', dir='/tmp'); os.chown(TEMP, 1000, 1000)
USER = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']; PORT='55472'; started=False
def sql(q):
    return subprocess.check_output(['psql','-X','-q','-h',TEMP,'-p',PORT,'-U','lovable','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',q], text=True, stderr=subprocess.STDOUT).strip()
def claim(u, identity='answer1', retry=False):
    return json.loads(sql(f"SET ROLE service_role; SELECT public.qrc_taxi_ia_claim('{u}','{identity}','complet','v1',2,'hash',{str(retry).lower()});"))
try:
    subprocess.run(USER+['initdb','-D',TEMP+'/data','-A','trust','-U','lovable'],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(USER+['pg_ctl','-D',TEMP+'/data','-l',TEMP+'/log','-o',f'-k {TEMP} -p {PORT} -c listen_addresses=','-w','start'],check=True,stdout=subprocess.DEVNULL); started=True
    sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;')
    sql((ROOT/'drizzle/migrations/0226_qrc_taxi_optional_ai_receipts.sql').read_text())
    a,b,c=['00000000-0000-0000-0000-'+str(i).zfill(12) for i in (801,802,803)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as p: results=list(p.map(lambda _:claim(a),range(2)))
    assert sum(r['claimed'] for r in results)==1
    assert results[0]['receipt']['id']==results[1]['receipt']['id']; print('PASS: concurrent double click creates one receipt')
    assert claim(a,'answer2')['status']==409
    assert claim(b)['claimed']; print('PASS: one active/account, distinct account isolated')
    rid=results[0]['receipt']['id']
    sql(f"UPDATE qrc_taxi_ia_receipts SET status='done',result='{{\"score\":1}}' WHERE id='{rid}'")
    assert not claim(a)['claimed']; assert claim(a)['receipt']['result']['score']==1
    assert claim(a,'answer2')['claimed']; print('PASS: readback does not consume another claim')
    sql(f"UPDATE qrc_taxi_ia_receipts SET status='unknown' WHERE user_id='{a}' AND status='active'")
    assert not claim(a,'answer2',True)['claimed']; print('PASS: unknown outcomes never replayed')
    for count,interval in [(60,'10 minutes'),(200,'2 hours')]:
        u=c if count==60 else '00000000-0000-0000-0000-000000000804'
        sql(f"INSERT INTO qrc_taxi_ia_receipts(user_id,identity_hash,quiz,version,question_id,answer_hash,status,created_at) SELECT '{u}', 'seed'||g,'complet','v1',2,'h','done',now()-interval '{interval}' FROM generate_series(1,{count}) g")
        assert claim(u)['status']==429
        print(f'PASS: exact {count} rolling-window limit enforced')
    u='00000000-0000-0000-0000-000000000805'; r=claim(u)
    sql(f"UPDATE qrc_taxi_ia_receipts SET status='error',http_status=503,retry_at=now()+interval '1 hour' WHERE id='{r['receipt']['id']}'")
    assert not claim(u,retry=True)['claimed']
    sql(f"UPDATE qrc_taxi_ia_receipts SET retry_at=now()-interval '1 second' WHERE id='{r['receipt']['id']}'")
    r2=claim(u,retry=True); assert r2['claimed'] and r2['receipt']['attempt']==2
    sql(f"UPDATE qrc_taxi_ia_receipts SET status='error',http_status=503,retry_at=now()-interval '1 second' WHERE id='{r2['receipt']['id']}'")
    r3=claim(u,retry=True); assert r3['receipt']['attempt']==3
    sql(f"UPDATE qrc_taxi_ia_receipts SET status='error',http_status=503,retry_at=now()-interval '1 second' WHERE id='{r3['receipt']['id']}'")
    assert not claim(u,retry=True)['claimed']; print('PASS: backoff and three-attempt bound; previous receipts retained')
    try: sql("SET ROLE authenticated; SELECT * FROM qrc_taxi_ia_receipts")
    except subprocess.CalledProcessError as e: assert 'permission denied' in e.output
    else: raise AssertionError('Learner reads private receipt table')
    try: sql(f"SET ROLE authenticated; SELECT qrc_taxi_ia_claim('{a}','forged','complet','v1',2,'h',false)")
    except subprocess.CalledProcessError as e: assert 'permission denied' in e.output
    else: raise AssertionError('Learner forges service claim')
    print('PASS: table and claiming RPC denied to learner, service only')
finally:
    if started: subprocess.run(USER+['pg_ctl','-D',TEMP+'/data','-m','immediate','stop'],stdout=subprocess.DEVNULL)