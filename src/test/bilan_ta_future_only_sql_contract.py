"""Future-only TA prototype: isolated PostgreSQL, no Cloud writes or real accounts."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TEMP = tempfile.mkdtemp(prefix='ta-future-only-', dir='/tmp')
os.chown(TEMP, 1000, 1000)
USER = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
PORT = '55460'
def sql(query):
    return subprocess.check_output(['psql','-X','-q','-h',TEMP,'-p',PORT,'-U','lovable','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',query],text=True,stderr=subprocess.STDOUT).strip()
def lit(value):
    return "'"+json.dumps(value).replace("'","''")+"'::jsonb"
started=False
try:
    subprocess.run(USER+['initdb','-D',TEMP+'/data','-A','trust','-U','lovable'],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(USER+['pg_ctl','-D',TEMP+'/data','-l',TEMP+'/log','-o',f'-k {TEMP} -p {PORT} -c listen_addresses=','-w','start'],check=True,stdout=subprocess.DEVNULL)
    started=True
    sql("""
    CREATE SCHEMA auth; CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE TABLE apprenants(id uuid,auth_user_id uuid);
    CREATE FUNCTION is_current_user_apprenant(a uuid) RETURNS boolean LANGUAGE sql AS $$SELECT EXISTS(SELECT 1 FROM apprenants WHERE id=a AND auth_user_id=auth.uid())$$;
    CREATE TABLE quiz_questions(question_id uuid DEFAULT gen_random_uuid(),quiz_id text,section_id int,legacy_question_id int,position int,enonce text,choix jsonb,image text,image_size text,explication text,active boolean);
    CREATE TABLE reponses_apprenants(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,exercice_id text,reponses jsonb,status text,tentative int,score numeric);
    CREATE TABLE reponses_apprenants_historique(LIKE reponses_apprenants);
    CREATE TABLE bilan_passage_snapshots(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,module_id int,exercice_id int,filiere text,matiere text,tentative int,passage_cle text,questions jsonb,nb_questions int,empreinte text,empreinte_source text,UNIQUE(apprenant_id,module_id,exercice_id,tentative));
    """)
    fixture=json.loads((ROOT/'src/test/fixtures/bilan-examen-national-local-20261029.json').read_text())
    for q in fixture:
        sql("INSERT INTO quiz_questions(question_id,quiz_id,section_id,legacy_question_id,position,enonce,choix,active) VALUES('"+q['question_id']+"','bilan-examen-taxi',"+str(q['section_id'])+','+str(q['legacy_question_id'])+','+str(q['position'])+",'"+q['enonce'].replace("'","''")+"',"+lit(q['choix'])+','+str(q['active']).lower()+')')
    app='00000000-0000-0000-0000-000000000028'
    sql(f"INSERT INTO apprenants VALUES('{app}','{app}')")
    sql((ROOT/'src/test/fixtures/bilan-ta-future-only.sql').read_text())
    prefix=f"SET test.uid='{app}';"
    def opening(ex): return json.loads(sql(prefix+f'SELECT bilan_ta_ouvrir_futur({ex})'))
    sql(f"INSERT INTO reponses_apprenants(apprenant_id,exercice_id,reponses,status,tentative,score) VALUES('{app}','module_28_exo_701',"+lit({'701-1':['A']})+",'in_progress',1,null)")
    before=sql('SELECT to_jsonb(r) FROM reponses_apprenants r')
    assert opening(701)=={'statut':'ancien'}
    assert sql('SELECT count(*) FROM bilan_passage_snapshots')=='0'
    assert sql('SELECT to_jsonb(r) FROM reponses_apprenants r')==before
    sql("UPDATE reponses_apprenants SET reponses="+lit({'701-1':['A'],'701-2':['B']})+" WHERE exercice_id='module_28_exo_701'")
    assert json.loads(sql('SELECT reponses FROM reponses_apprenants')).get('701-2')==['B']
    print('PASS: existing partial TA copy unchanged by opening, no retrospective snapshot, remains writable')
    national=opening(700)
    assert national['statut']=='fige'
    assert opening(700)==national
    snap=json.loads(sql("SELECT to_jsonb(s) FROM bilan_passage_snapshots s WHERE exercice_id=700"))
    assert snap['nb_questions']==84
    expected=sorted([q for q in fixture if q['section_id']==605 and q['active']],key=lambda q:(q['position'],q['legacy_question_id']))
    assert [q['question_source']['id'] for q in snap['questions']]==[q['legacy_question_id'] for q in expected]
    assert [q['question_source']['choix'] for q in snap['questions']]==[q['choix'] for q in expected]
    assert [q['question_source']['enonce'] for q in snap['questions']]==[q['enonce'] for q in expected]
    assert all(q['question_source']['id']!=73 for q in snap['questions'])
    sql("UPDATE quiz_questions SET choix='[]'::jsonb,enonce='Future change' WHERE section_id=605")
    assert opening(700)==national
    assert json.loads(sql('SELECT to_jsonb(s) FROM bilan_passage_snapshots s WHERE exercice_id=700'))==snap
    print('PASS: future national84 exact IDs/order/statements/keys; Q73 excluded; reopening idempotent after canonical changes')
    new='00000000-0000-0000-0000-000000000029'
    sql(f"INSERT INTO apprenants VALUES('{new}','{new}')")
    prefix=f"SET test.uid='{new}';"
    assert opening(701)['statut']=='fige'
    assert sql(f"SELECT nb_questions FROM bilan_passage_snapshots WHERE apprenant_id='{new}' AND exercice_id=701")=='40'
    print('PASS: new local TA40 uses same bank as administration')
    for ex in (699,702):
        try:
            opening(ex);raise AssertionError('Unrelated exercise accepted')
        except subprocess.CalledProcessError as e: assert 'Matière TA non concernée' in e.output
    prefix="SET test.uid='00000000-0000-0000-0000-000000000099';"
    try:
        opening(700);raise AssertionError('Unowned account accepted')
    except subprocess.CalledProcessError as e: assert 'Accès refusé' in e.output
    print('PASS: other exercises and unauthenticated/unowned accounts refused')
finally:
    if started: subprocess.run(USER+['pg_ctl','-D',TEMP+'/data','-m','fast','-w','stop'],check=True,stdout=subprocess.DEVNULL)