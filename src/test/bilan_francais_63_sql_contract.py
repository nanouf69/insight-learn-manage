"""French release routing on disposable PostgreSQL only, no Cloud writes."""
import json, os, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
TMP=tempfile.mkdtemp(prefix='francais-63-',dir='/tmp'); os.chown(TMP,1000,1000)
USER=['setpriv','--reuid=1000','--regid=1000','--clear-groups']; PORT='55469'; started=False
def sql(q):
    return subprocess.check_output(['psql','-X','-q','-h',TMP,'-p',PORT,'-U','lovable','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',q],text=True,stderr=subprocess.STDOUT).strip()
def lit(v): return "'"+json.dumps(v,ensure_ascii=False).replace("'","''")+"'::jsonb"
def refuse(q,text):
    try: sql(q)
    except subprocess.CalledProcessError as e:
        assert text in e.output,e.output;return
    raise AssertionError('accepted '+text)
try:
    subprocess.run(USER+['initdb','-D',TMP+'/data','-A','trust','-U','lovable'],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(USER+['pg_ctl','-D',TMP+'/data','-l',TMP+'/log','-o',f'-k {TMP} -p {PORT} -c listen_addresses=','-w','start'],check=True,stdout=subprocess.DEVNULL);started=True
    sql("""CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'')='1' $$;
    CREATE TABLE apprenants(id uuid,auth_user_id uuid,deleted_at timestamptz);
    CREATE TABLE reponses_apprenants(apprenant_id uuid,exercice_id text);
    CREATE TABLE bilan_passage_snapshots(apprenant_id uuid,module_id int);
    CREATE TABLE bilan_passage_categories(apprenant_id uuid,module_id int);
    CREATE TABLE bilan_passages_figes(apprenant_id uuid,module_id int);
    CREATE TABLE apprenant_module_completion(apprenant_id uuid,module_id int,status text,progress int,completed_at timestamptz,score_obtenu int,score_max int,details jsonb,updated_at timestamptz,UNIQUE(apprenant_id,module_id));""")
    sql((ROOT/'drizzle/migrations/0221_bilan_future_versioned.sql').read_text())
    # No production payload needed: immutable old copies have their own separate fixture.
    oldbank=[{'id':1,'type':'QCM','enonce':'Ancienne copie','choix':[{'lettre':'A','texte':'Ancienne réponse','correct':True}]}]
    old=sql('INSERT INTO bilan_future_versions(subject,questions,fingerprint) VALUES(3,'+lit(oldbank)+',md5(('+lit(oldbank)+')::text)) RETURNING id')
    owners=['00000000-0000-0000-0000-'+str(n).zfill(12) for n in range(701,706)]
    prefix=lambda o:f"SET test.uid='{o}'; SET ROLE authenticated;"
    for o in owners: sql(f"INSERT INTO bilan_future_eligibility VALUES('{o}',5,503,'{old}',clock_timestamp()),('{o}',11,603,'{old}',clock_timestamp())")
    oldrec=json.loads(sql(prefix(owners[0])+'SELECT bilan_future_open(5,503)'))
    sql(prefix(owners[0])+f"SELECT bilan_future_save_draft('{oldrec['id']}','{old}',1,1,'[\"A\"]','11111111-1111-1111-1111-111111111111')")
    done=json.loads(sql(prefix(owners[1])+'SELECT bilan_future_open(11,603)'))
    sql(prefix(owners[1])+f"SELECT bilan_future_submit('{done['id']}','{{\"1\":[\"A\"]}}')")
    before={t:sql(f'SELECT coalesce(jsonb_agg(to_jsonb(t)),\'[]\') FROM {t} t') for t in ['bilan_future_eligibility','bilan_future_receipts','bilan_future_drafts','bilan_future_submissions','bilan_future_versions']}
    sql((ROOT/'docs/bilan-francais-63-qcm-2026-11-05/schema-prepare.sql').read_text())
    bank=json.loads((ROOT/'docs/bilan-francais-63-qcm-2026-11-05/candidate.json').read_text())
    new=sql('INSERT INTO bilan_future_versions(subject,questions,fingerprint) VALUES(3,'+lit(bank)+',md5(('+lit(bank)+')::text)) RETURNING id')
    for t in list(before)[:-1]: assert before[t]==sql(f'SELECT coalesce(jsonb_agg(to_jsonb(t)),\'[]\') FROM {t} t')
    assert json.loads(sql(prefix(owners[2])+'SELECT bilan_future_open(5,503)'))['version_id']==old
    sql(f"INSERT INTO bilan_future_french_releases(version_id) VALUES('{new}')")
    assert json.loads(sql(prefix(owners[0])+'SELECT bilan_future_open(5,503)'))==oldrec
    assert json.loads(sql(prefix(owners[1])+'SELECT bilan_future_open(11,603)'))==done
    assert json.loads(sql(prefix(owners[2])+'SELECT bilan_future_open(5,503)'))['version_id']==old
    print('PASS old receipts (started/submitted/pre-activation) retain version; staging alone does not route')
    for owner,module,exo in [(owners[3],5,503),(owners[4],11,603)]:
        r=json.loads(sql(prefix(owner)+f'SELECT bilan_future_open({module},{exo})')); assert r['version_id']==new
        projection=json.loads(sql(prefix(owner)+f"SELECT bilan_future_questions('{r['id']}')")); assert len(projection['questions'])==63
        assert 'correct' not in json.dumps(projection) and 'sourceNumber' not in json.dumps(projection)
        assert len({q['support']['numero'] for q in projection['questions']})==9
        answers={str(q['id']):[c['lettre'] for c in q['choix'] if c['correct']] for q in bank}
        if module==5:
            answers['14']=['A']
        result=json.loads(sql(prefix(owner)+f"SELECT bilan_future_submit('{r['id']}',"+lit(answers)+')'))
        assert result['question_count']==63 and result['correct_count']==(62 if module==5 else 63)
        assert json.loads(sql(prefix(owner)+f"SELECT bilan_future_submit('{r['id']}',"+lit(answers)+')'))==result
        assert json.loads(sql(prefix(owner)+f"SELECT bilan_future_open({module},{exo})"))==r
    print('PASS VTC/TAXI new receipts 63, nine supports, key-free projection, server multichoice 62/63 and 63/63, readback and idempotence')
    refuse(prefix(owners[0])+f"SELECT bilan_future_questions('{r['id']}')",'Receipt ownership required')
    refuse(prefix(owners[0])+f"INSERT INTO bilan_future_french_releases VALUES('{old}',clock_timestamp())",'permission denied')
    refuse(f"INSERT INTO bilan_future_french_releases VALUES('{old}',clock_timestamp())",'63 verified QCM')
    refuse(f"UPDATE bilan_future_receipts SET version_id='{new}' WHERE id='{oldrec['id']}'",'immutable')
    assert sql(f"SELECT questions FROM bilan_future_versions WHERE id='{old}'")==json.dumps(oldbank) or json.loads(sql(f"SELECT questions FROM bilan_future_versions WHERE id='{old}'"))==oldbank
    for t in ['bilan_future_eligibility','bilan_future_drafts']:
        assert before[t]==sql(f'SELECT coalesce(jsonb_agg(to_jsonb(t)),\'[]\') FROM {t} t')
    assert sql('SELECT count(*) FROM apprenant_module_completion')=='0'
    assert json.loads(sql(prefix(owners[0])+f"SELECT bilan_future_resume('{oldrec['id']}')"))['answers']['1']['answer']==['A']
    print('PASS ownership, direct writes, invalid release and receipt mutation refused; old bank/drafts/eligibility and progression intact')
finally:
    if started: subprocess.run(USER+['pg_ctl','-D',TMP+'/data','-m','fast','-w','stop'],check=True,stdout=subprocess.DEVNULL)