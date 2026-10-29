"""Execute future TAXI local snapshot contract on disposable PostgreSQL only."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TEMP = tempfile.mkdtemp(prefix='bilan-local-', dir='/tmp')
os.chown(TEMP, 1000, 1000)
PORT = '55459'
USER = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
SQL_FILE = Path(os.environ.get('BILAN_FUTURE_SQL', '/tmp/bilan-future-local.sql'))

def sql(query):
    return subprocess.check_output(['psql', '-X', '-q', '-h', TEMP, '-p', PORT, '-U', 'lovable', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], text=True, stderr=subprocess.STDOUT).strip()

def literal(value):
    return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"

started = False
try:
    subprocess.run(USER + ['initdb', '-D', TEMP+'/data', '-A', 'trust', '-U', 'lovable'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(USER + ['pg_ctl', '-D', TEMP+'/data', '-l', TEMP+'/log', '-o', f'-k {TEMP} -p {PORT} -c listen_addresses=', '-w', 'start'], check=True, stdout=subprocess.DEVNULL)
    started = True
    sql("""
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
    CREATE FUNCTION is_current_user_apprenant(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
    CREATE TABLE bilan_snapshot_flags(module_id int,actif boolean);
    CREATE TABLE bilan_identite_flags(module_id int,actif boolean);
    CREATE TABLE module_editor_state(module_id int,module_data jsonb);
    CREATE TABLE quiz_questions(question_id uuid DEFAULT gen_random_uuid(),quiz_id text,section_id int,legacy_question_id int,position int,enonce text,choix jsonb,explication text,image text,image_size text,active boolean);
    CREATE TABLE bilan_question_identites(uid uuid DEFAULT gen_random_uuid(),module_id int,exercice_id int,numero_technique text);
    CREATE TABLE bilan_passage_categories(apprenant_id uuid,module_id int,exercice_id int,tentative int,categorie text);
    CREATE TABLE bilan_nouvelle_tentative_autorisations(apprenant_id uuid,module_id int,exercice_id int,tentative_autorisee int);
    CREATE TABLE bilan_passage_snapshots(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,module_id int,exercice_id int,filiere text,matiere text,tentative int,passage_cle text,questions jsonb,nb_questions int,bareme jsonb,empreinte text,empreinte_source text,operation_id uuid,created_at timestamptz DEFAULT now());
    INSERT INTO bilan_snapshot_flags VALUES(5,true),(11,true);
    INSERT INTO bilan_identite_flags VALUES(11,true);
    """)
    choices = [{'lettre': 'A', 'texte': 'Réponse A', 'correct': True}, {'lettre': 'B', 'texte': 'Réponse B'}]
    questions = [{'id': i, 'type': 'QCM', 'enonce': f'Question locale {i}', 'choix': choices, 'explication': 'Ancienne explication', 'image': 'ancienne-image'} for i in range(1,50)]
    sql('INSERT INTO module_editor_state VALUES(11,'+literal({'exercices': [{'id':606,'titre':'Locale','questions':questions}, {'id':605,'titre':'Nationale','questions':[]} ]})+'),(5,'+literal({'exercices':[{'id':506,'questions':[questions[0]]}]})+');')
    sql("INSERT INTO quiz_questions(quiz_id,section_id,legacy_question_id,position,enonce,choix,active) SELECT 'bilan-examen-taxi',606,i,41-i,'Canonique locale '||i,"+literal(choices)+",true FROM generate_series(1,40) i; INSERT INTO bilan_question_identites(module_id,exercice_id,numero_technique) SELECT 11,606,i::text FROM generate_series(1,40) i;")
    sql(SQL_FILE.read_text())
    app = '00000000-0000-0000-0000-000000000001'
    call = f"SELECT to_jsonb(bilan_demarrer_passage('{app}',11,606,1,null));"
    s = json.loads(sql(call))
    assert s['nb_questions'] == 40
    assert [q['question_id'] for q in s['questions']] == [str(i) for i in range(40,0,-1)]
    assert all(q['question_source']['enonce'] == 'Canonique locale '+q['question_id'] for q in s['questions'])
    assert all(q['question_source']['choix'] == choices for q in s['questions'])
    assert all(q['type'] == 'QCM' and q['uid'] for q in s['questions'])
    assert all(q['question_source'].get('image') is None and q['question_source'].get('explication') is None for q in s['questions'])
    print('PASS 6: 40 canonical questions, order, text, choices, QCM identities and null metadata')
    before = sql('SELECT to_jsonb(s)::text FROM bilan_passage_snapshots s')
    sql("UPDATE quiz_questions SET enonce='Changement futur',choix="+literal([{'lettre':'B','correct':True}])+" WHERE legacy_question_id=1 AND section_id=606;")
    assert json.loads(sql(call)) == s
    assert sql('SELECT to_jsonb(s)::text FROM bilan_passage_snapshots s') == before
    print('PASS 2: reopening preserves the entire existing snapshot after canonical changes')
    vtc = json.loads(sql(f"SELECT to_jsonb(bilan_demarrer_passage('{app}',5,506,1,null));"))
    assert vtc['questions'][0]['question_source'] == questions[0]
    print('PASS 1: unrelated VTC source unchanged')
    try:
        sql(f"SELECT bilan_demarrer_passage('{app}',28,701,1,null)")
        raise AssertionError('TA unexpectedly activated')
    except subprocess.CalledProcessError as e:
        assert 'Module non concerné' in e.output
    print('PASS 1: TA is not silently activated')
    sql("DELETE FROM bilan_passage_snapshots WHERE module_id=11; DELETE FROM quiz_questions WHERE section_id=606;")
    try:
        sql(call)
        raise AssertionError('Empty canonical bank fell back to obsolete JSON')
    except subprocess.CalledProcessError as e:
        assert 'Matière sans question canonique' in e.output
    print('PASS 1: empty local canonical bank refuses instead of restoring 49 JSON questions')
    sql("INSERT INTO quiz_questions(quiz_id,section_id,legacy_question_id,position,enonce,choix,active) VALUES('bilan-examen-taxi',605,73,1,'Nouvelle question',"+literal([{'lettre':'A','texte':'Choix A','correct':True},{'lettre':'B','texte':'Choix B'}])+",true),('bilan-examen-taxi',605,49,2,'TVA',"+literal([{'lettre':'B','texte':'TVA collectée − TVA déductible','correct':True}])+",true); INSERT INTO bilan_question_identites(module_id,exercice_id,numero_technique) VALUES(11,605,'73'),(11,605,'49');")
    national = json.loads(sql(f"SELECT to_jsonb(bilan_demarrer_passage('{app}',11,605,1,null));"))
    assert national['nb_questions'] == 1 and national['questions'][0]['question_id'] == '49'
    print('PASS 1: fictitious Q73 excluded only from future national snapshots')
finally:
    if started:
        subprocess.run(USER + ['pg_ctl','-D',TEMP+'/data','-m','fast','-w','stop'], check=True, stdout=subprocess.DEVNULL)