"""Optional durable quiz: disposable PostgreSQL only, never Cloud data."""
import concurrent.futures, json, os, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
TEMP=tempfile.mkdtemp(prefix='qrc-practice-sql-',dir='/tmp');os.chown(TEMP,1000,1000)
USER=['setpriv','--reuid=1000','--regid=1000','--clear-groups'];PORT='55473';started=False
def sql(q):
 result=subprocess.run(['psql','-X','-q','-h',TEMP,'-p',PORT,'-U','lovable','-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True)
 if result.returncode:raise subprocess.CalledProcessError(result.returncode,'isolated SQL',output=result.stderr)
 return result.stdout.strip()
A='00000000-0000-0000-0000-000000000901';B='00000000-0000-0000-0000-000000000902'
def call(q,user=A):return json.loads(sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{user}'; SELECT {q};"))
def uid(n):return '00000000-0000-0000-0001-'+str(n).zfill(12)
def fail(q,code,user=A):
 try:call(q,user)
 except subprocess.CalledProcessError as e:assert code in e.output,e.output
 else:raise AssertionError('Expected refusal: '+q)
try:
 subprocess.run(USER+['initdb','-D',TEMP+'/data','-A','trust','-U','lovable'],check=True,stdout=subprocess.DEVNULL)
 subprocess.run(USER+['pg_ctl','-D',TEMP+'/data','-l',TEMP+'/log','-o',f'-k {TEMP} -p {PORT} -c listen_addresses=','-w','start'],check=True,stdout=subprocess.DEVNULL);started=True
 sql("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated; CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$; CREATE TABLE apprenants(id uuid,auth_user_id uuid,modules_autorises int[],date_debut_cours_en_ligne date,date_fin_cours_en_ligne date,deleted_at timestamptz,compte_cours_archive_at timestamptz,abandonnee boolean); CREATE FUNCTION crm_lire_extension_acces(uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{\"autorise\":false}'::jsonb $$;")
 sql(f"INSERT INTO apprenants(id,auth_user_id,modules_autorises,date_debut_cours_en_ligne,date_fin_cours_en_ligne) VALUES('{A}','{A}',ARRAY[11],current_date-1,current_date+2),('{B}','{B}',ARRAY[28],current_date-1,current_date+2)")
 sql((ROOT/'docs/qrc-durable-schema.sql').read_text())
 a=call(f"qrc_practice_open('complet','{uid(1)}')");aid=a['id'];assert len(a['manifest'])==78
 b=call(f"qrc_practice_open('specialites','{uid(2)}')",B);assert len(b['manifest'])==84
 fail(f"qrc_practice_open('complet','{uid(3)}')",'non accessible',B)
 fail(f"qrc_practice_read('{aid}')",'Accès refusé',B)
 assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{B}'; SELECT count(*) FROM qrc_practice_attempts WHERE id='{aid}'")=='0'
 print('PASS: owner RLS, module11/28 isolation, manifests78/84')
 incomplete=call(f"qrc_practice_submit('{aid}',0,'{uid(4)}')");assert not incomplete['submitted_at'] and len(incomplete['missing'])==78
 print('PASS: incomplete submission never completed')
 op=uid(5)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(lambda _:call(f"qrc_practice_save('{aid}',0,'mcq:1','\"A\"','{op}')"),range(2)))
 assert [r['revision'] for r in results]==[1,1]
 assert sql(f"SELECT count(*) FROM qrc_practice_answer_events WHERE attempt_id='{aid}'")=='1'
 fail(f"qrc_practice_save('{aid}',0,'mcq:1','\"B\"','{op}')",'Opération différente')
 fail(f"qrc_practice_save('{aid}',0,'mcq:1','\"B\"','{uid(6)}')",'autre sauvegarde')
 print('PASS: double-click idempotence, two-device stale-write refusal')
 fail(f"qrc_practice_save('{aid}',1,'unknown','\"A\"','{uid(7)}')",'invalide')
 fail(f"qrc_practice_save('{aid}',1,'mcq:2','\"Z\"','{uid(8)}')",'invalide')
 r=call(f"qrc_practice_save('{aid}',1,'qrc:2','\"   \"','{uid(9)}')")
 assert len(call(f"qrc_practice_submit('{aid}',2,'{uid(10)}')")['missing'])==77
 print('PASS: no unknown choices, whitespace not complete')
 rules=a['manifest'];rev=2
 for i,rule in enumerate(rules):
  value='réponse non vide' if rule['kind']=='text' else ('\n'.join('élément '+str(j) for j in range(rule['min'])) if rule['kind']=='list' else ([rule['options'][0]] if rule['kind']=='choices' else rule['options'][0]))
  encoded=json.dumps(value,ensure_ascii=False).replace("'","''")
  r=call(f"qrc_practice_save('{aid}',{rev},'{rule['key']}','{encoded}'::jsonb,'{uid(100+i)}')");rev=r['revision']
 submitted=call(f"qrc_practice_submit('{aid}',{rev},'{uid(300)}')")
 assert submitted['submitted_at'] and len(submitted['answers'])==78
 assert call(f"qrc_practice_submit('{aid}',{rev},'{uid(300)}')")['submitted_at']==submitted['submitted_at']
 fail(f"qrc_practice_save('{aid}',{rev},'qrc:2','\"late\"','{uid(301)}')",'déjà soumise')
 assert call(f"qrc_practice_read('{aid}')")['answers']==submitted['answers']
 print('PASS: full atomic submission, readback, immutable late autosave')
 new=call(f"qrc_practice_open('complet','{uid(302)}',true)");assert new['id']!=aid
 assert call(f"qrc_practice_read('{aid}')")['submitted_at']
 print('PASS: new attempt preserves previous submitted proof')
 def race_save():
  try:return call(f"qrc_practice_save('{new['id']}',0,'mcq:1','\"B\"','{uid(303)}')")
  except subprocess.CalledProcessError as e:return e.output
 def race_submit():
  try:return call(f"qrc_practice_submit('{new['id']}',0,'{uid(304)}')")
  except subprocess.CalledProcessError as e:return e.output
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures=[pool.submit(race_save),pool.submit(race_submit)];out=[f.result() for f in futures]
 assert call(f"qrc_practice_read('{new['id']}')")['submitted_at'] is None
 print('PASS: actual concurrent save/submit cannot finalize incomplete attempt')
 sql(f"UPDATE apprenants SET date_fin_cours_en_ligne=current_date-1 WHERE auth_user_id='{A}'")
 fail(f"qrc_practice_save('{new['id']}',1,'qrc:2','\"test\"','{uid(305)}')",'expiré')
 for statement in ["SET ROLE authenticated; UPDATE qrc_practice_attempts SET revision=999", "SET ROLE authenticated; INSERT INTO qrc_practice_answer_events(attempt_id,question_key,revision,answer,operation_id) VALUES(gen_random_uuid(),'fake',1,'null',gen_random_uuid())", "UPDATE qrc_practice_answer_events SET answer='null'", "UPDATE qrc_practice_attempts SET manifest='[]'"]:
  try:sql(statement)
  except subprocess.CalledProcessError:pass
  else:raise AssertionError('Forbidden direct write accepted')
 print('PASS: revoked access, direct writes and history mutation refused')
finally:
 if started:subprocess.run(USER+['pg_ctl','-D',TEMP+'/data','-m','immediate','stop'],stdout=subprocess.DEVNULL)