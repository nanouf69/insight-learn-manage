"""Receipt/version prototype on disposable PostgreSQL. Never connects to Cloud."""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TEMP = tempfile.mkdtemp(prefix='bilan-future-isolated-', dir='/tmp')
os.chown(TEMP, 1000, 1000)
USER = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
PORT = '55465'
started = False

def sql(query):
    return subprocess.check_output(['psql', '-X', '-q', '-h', TEMP, '-p', PORT, '-U', 'lovable', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], text=True, stderr=subprocess.STDOUT).strip()

def literal(value):
    return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"

def refusal(query, fragment):
    try:
        sql(query)
    except subprocess.CalledProcessError as error:
        assert fragment in error.output, error.output
        return
    raise AssertionError('Unsafe request accepted: ' + fragment)

try:
    subprocess.run(USER + ['initdb', '-D', TEMP + '/data', '-A', 'trust', '-U', 'lovable'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(USER + ['pg_ctl', '-D', TEMP + '/data', '-l', TEMP + '/log', '-o', f'-k {TEMP} -p {PORT} -c listen_addresses=', '-w', 'start'], check=True, stdout=subprocess.DEVNULL)
    started = True
    sql("""
    CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.admin',true)='1'$$;
    CREATE TABLE legacy_copies(id integer PRIMARY KEY,kind text,payload jsonb);
    INSERT INTO legacy_copies VALUES(1,'without_snapshot','{"question":"old Q104","key":"C","score":12,"status":"in_progress"}'),
      (2,'with_snapshot','{"question":"original Q104","key":"C","score":15,"status":"submitted","snapshot":[1,2,3]}');
    """)
    sql((ROOT / 'src/test/fixtures/bilan-future-isolated-prototype.sql').read_text())
    old = sql('SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM legacy_copies l')
    a, b, c = ['00000000-0000-0000-0000-' + str(n).zfill(12) for n in (501, 502, 503)]
    prefix = lambda owner: f"SET test.uid='{owner}'; SET ROLE authenticated;"
    q = [{'id':104,'enonce':'Racolage verified','choix':[{'lettre':'A','texte':'Maraude'},{'lettre':'B','texte':'Racolage','correct':True}]},
         {'id':114,'enonce':'Access verified','choix':[{'lettre':'A','texte':'Formation'},{'lettre':'C','texte':'Examen','correct':True}]}]
    version = sql('INSERT INTO bilan_future_versions(subject,questions,fingerprint) VALUES(0,' + literal(q) + ',md5((' + literal(q) + ')::text)) RETURNING id')
    assert json.loads(sql(prefix(c) + 'SELECT bilan_future_open(5,500)')) == {'route':'legacy'}
    assert sql('SELECT count(*) FROM bilan_future_receipts') == '0'
    print('PASS: no explicit eligibility keeps legacy route, no retrospective receipt')
    sql(f"INSERT INTO bilan_future_eligibility(owner_id,module_id,exercise_id,version_id) VALUES('{a}',5,500,'{version}'),('{b}',11,600,'{version}')")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        opened = list(pool.map(lambda _: json.loads(sql(prefix(a) + 'SELECT bilan_future_open(5,500)')), range(2)))
    assert opened[0] == opened[1]
    ra = opened[0]
    rb = json.loads(sql(prefix(b) + 'SELECT bilan_future_open(11,600)'))
    assert ra['version_id'] == rb['version_id'] == version
    assert ra['id'] != rb['id']
    print('PASS: concurrent opening idempotent, TAXI/VTC share one immutable version with separate receipts')
    learner_questions = json.loads(sql(prefix(a) + f"SELECT questions FROM bilan_future_versions WHERE id='{version}'"))
    admin_questions = json.loads(sql("SET test.admin='1'; SET ROLE authenticated;" + f"SELECT questions FROM bilan_future_versions WHERE id='{version}'"))
    assert learner_questions == admin_questions == q
    assert sql(prefix(c) + 'SELECT count(*) FROM bilan_future_versions') == '0'
    print('PASS: learner/admin exact content and key readback, unrelated learner cannot read bank')
    refusal(prefix(a) + 'SELECT bilan_future_open(11,605)', 'Outside common Bilan scope')
    refusal(prefix(c) + f"SELECT bilan_future_submit('{ra['id']}'," + literal({'104':['B'],'114':['C']}) + ')', 'Receipt ownership required')
    refusal(prefix(a) + f"INSERT INTO bilan_future_receipts(owner_id,module_id,exercise_id,version_id) VALUES('{a}',5,501,'{version}')", 'permission denied')
    refusal(prefix(a) + f"SELECT bilan_future_submit('{ra['id']}'," + literal({'104':['B'],'999':['A']}) + ')', 'Answer outside frozen bank')
    refusal(prefix(a) + f"SELECT bilan_future_submit('{ra['id']}'," + literal({'104':['B']}) + ')', 'Incomplete answers')
    refusal(prefix(a) + f"SELECT bilan_future_submit('{ra['id']}'," + literal({'104':['Z'],'114':['C']}) + ')', 'Unknown choice')
    print('PASS: receipt ownership, direct insert, foreign questions, unknown choices, incomplete answers rejected')
    t1, t2 = '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'
    save = lambda owner, rec, ver, qid, rev, answer, tok: sql(prefix(owner) + f"SELECT bilan_future_save_draft('{rec}','{ver}',{qid},{rev}," + literal(answer) + f",'{tok}')")
    d1 = json.loads(save(a, ra['id'], version, 104, 1, ['A'], t1))
    assert json.loads(save(a, ra['id'], version, 104, 1, ['A'], t1)) == d1
    refusal(prefix(a) + f"SELECT bilan_future_save_draft('{ra['id']}','{version}',104,1," + literal(['B']) + f",'{t2}')", 'Stale draft revision')
    refusal(prefix(a) + f"SELECT bilan_future_save_draft('{ra['id']}','{version}',104,5," + literal(['B']) + f",'{t2}')", 'Stale draft revision')
    save(a, ra['id'], version, 104, 2, ['B'], t2)
    other_version = sql('INSERT INTO bilan_future_versions(subject,questions,fingerprint) VALUES(0,' + literal(q) + ",'x') RETURNING id")
    refusal(prefix(a) + f"SELECT bilan_future_save_draft('{ra['id']}','{other_version}',104,3," + literal(['B']) + f",'{t2}')", 'Receipt version mismatch')
    refusal(prefix(b) + f"SELECT bilan_future_save_draft('{ra['id']}','{version}',104,3," + literal(['B']) + f",'{t2}')", 'Receipt ownership required')
    refusal(prefix(a) + f"SELECT bilan_future_save_draft('{ra['id']}','{version}',999,1," + literal(['A']) + f",'{t2}')", 'Answer outside frozen bank')
    refusal(prefix(a) + f"INSERT INTO bilan_future_drafts VALUES('{ra['id']}','{version}',114,1,'[\"C\"]','{t1}')", 'permission denied')
    resumed = json.loads(sql(prefix(a) + f"SELECT bilan_future_resume('{ra['id']}')"))
    assert resumed['version_id'] == version and resumed['answers'] == {'104': {'revision': 2, 'answer': ['B']}} and not resumed['submitted']
    refusal(prefix(b) + f"SELECT bilan_future_resume('{ra['id']}')", 'Receipt ownership required')
    print('PASS: receipt+version scoped drafts: idempotent retry, stale/old-tab revision, foreign version/account/question and direct insert rejected; resume exact')
    ans = {'104':['B'],'114':['C']}
    result = json.loads(sql(prefix(a) + f"SELECT bilan_future_submit('{ra['id']}'," + literal(ans) + ')'))
    assert result['correct_count'] == result['question_count'] == 2
    assert json.loads(sql(prefix(a) + f"SELECT bilan_future_submit('{ra['id']}'," + literal(ans) + ')')) == result
    refusal(prefix(a) + f"SELECT bilan_future_submit('{ra['id']}'," + literal({'104':['A'],'114':['C']}) + ')', 'Submitted proof immutable')
    print('PASS: frozen-bank server correction 2/2, submit/readback/retry exact and append-only')
    refusal(prefix(a) + f"SELECT bilan_future_save_draft('{ra['id']}','{version}',114,1," + literal(['C']) + f",'{t1}')", 'Passage already submitted')
    print('PASS: late draft from an old tab after submission rejected')
    refusal(f"UPDATE bilan_future_versions SET questions='[]' WHERE id='{version}'", 'Future Bilan proof immutable')
    refusal(f"UPDATE bilan_future_receipts SET version_id='{version}' WHERE id='{ra['id']}'", 'Future Bilan proof immutable')
    assert sql('SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM legacy_copies l') == old
    sql("UPDATE legacy_copies SET payload=payload||'{\"late_old_answer\":\"C\"}' WHERE id=1")
    assert json.loads(sql(prefix(a) + f"SELECT bilan_future_submit('{ra['id']}'," + literal(ans) + ')')) == result
    assert json.loads(sql('SELECT payload FROM legacy_copies WHERE id=2'))['score'] == 15
    print('PASS: old copies unchanged through new opening/submission; late legacy save stays separate, old finished score unchanged')
    print('NON PROUVE: real eligibility, real learner UI, completion bridge and old-device rollover. Prototype remains inactive.')
finally:
    if started:
        subprocess.run(USER + ['pg_ctl', '-D', TEMP + '/data', '-m', 'fast', '-w', 'stop'], check=True, stdout=subprocess.DEVNULL)