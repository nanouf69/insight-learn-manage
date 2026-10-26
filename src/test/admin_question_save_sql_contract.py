"""P0520 unchanged: execute the guard on disposable PostgreSQL, never on Cloud.
Uses only artificial questions; no learners, mail or external calls.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TEMP = tempfile.mkdtemp(prefix='admin-save-p0520-', dir='/tmp')
os.chown(TEMP, 1000, 1000)
PORT = '55449'
USER = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']

def sql(query):
    return subprocess.check_output(['psql', '-X', '-q', '-h', TEMP, '-p', PORT, '-U', 'lovable', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], text=True, stderr=subprocess.STDOUT).strip()

def literal(value):
    return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"

def update(data):
    return "SET request.jwt.claim.role='authenticated'; UPDATE module_editor_state SET module_data=" + literal(data) + ' WHERE module_id=10;'

started = False
try:
    subprocess.run(USER + ['initdb', '-D', TEMP+'/data', '-A', 'trust', '-U', 'lovable'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(USER + ['pg_ctl', '-D', TEMP+'/data', '-l', TEMP+'/log', '-o', f'-k {TEMP} -p {PORT} -c listen_addresses=', '-w', 'start'], check=True, stdout=subprocess.DEVNULL)
    started = True
    sql("CREATE SCHEMA auth; CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$; CREATE TABLE module_editor_state(module_id int PRIMARY KEY,module_data jsonb);")
    sql((ROOT/'drizzle/migrations/0114_garde_ecritures_auto_ajout_seulement.sql').read_text())
    sql('CREATE TRIGGER trg_aaa_garde_retrait_massif BEFORE UPDATE ON module_editor_state FOR EACH ROW EXECUTE FUNCTION garde_retrait_massif_questions();')
    data = {'exercices': [{'id': 70, 'questions': [{'id': i} for i in range(1,65)]}, {'id': 71, 'questions': [{'id': i,'choix':[{'lettre':'D','texte':'1,30 €','correct':False}], 'explication':'Original'} for i in range(1,36)]}]}
    sql('INSERT INTO module_editor_state VALUES(10,'+literal(data)+');')
    initial = sql('SELECT module_data::text FROM module_editor_state WHERE module_id=10')
    incomplete = json.loads(json.dumps(data)); incomplete['exercices'][1]['questions'] = incomplete['exercices'][1]['questions'][:-7]
    try:
        sql('\\set VERBOSITY verbose\n'+update(incomplete))
        raise AssertionError('Seven removals unexpectedly accepted')
    except subprocess.CalledProcessError as error:
        assert 'P0520' in error.output and 'retirerait 7 questions' in error.output, error.output
    assert sql('SELECT module_data::text FROM module_editor_state WHERE module_id=10') == initial
    print('PASS: before, seven removals rejected P0520, transaction unchanged')
    corrected = json.loads(json.dumps(data)); corrected['exercices'][1]['questions'][9]['choix'][0]['correct'] = True; corrected['exercices'][1]['questions'][9]['explication'] = 'Explication modifiée'
    sql(update(corrected))
    readback = json.loads(sql('SELECT module_data::text FROM module_editor_state WHERE module_id=10'))
    assert readback == corrected
    assert readback['exercices'][0] == data['exercices'][0]
    assert len(readback['exercices'][1]['questions']) == 35
    print('PASS: after, targeted correct choice and explanation persisted, all IDs intact on fresh connection')
    incomplete3 = json.loads(json.dumps(corrected)); incomplete3['exercices'][1]['questions'] = incomplete3['exercices'][1]['questions'][:-3]
    try:
        sql('\\set VERBOSITY verbose\n'+update(incomplete3))
        raise AssertionError('Three removals unexpectedly accepted')
    except subprocess.CalledProcessError as error:
        assert 'P0520' in error.output and 'maximum 2' in error.output
    assert json.loads(sql('SELECT module_data::text FROM module_editor_state WHERE module_id=10')) == corrected
    print('PASS: unchanged threshold of two, three removals still rejected after successful save')
finally:
    if started:
        subprocess.run(USER + ['pg_ctl','-D',TEMP+'/data','-m','fast','-w','stop'], check=True, stdout=subprocess.DEVNULL)