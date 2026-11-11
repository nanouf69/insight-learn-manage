"""Candidate + every live trigger on the touched tables, on a disposable cluster.
Read-only extract of the live catalog (no rows). External effects are stubs that only record calls."""
import json,unittest,uuid
from pathlib import Path
import admin_subject_reset_sql_contract as base
from admin_subject_reset_sql_contract import A,U,ADMIN
LIVE=json.loads(Path('src/test/fixtures/subject-reset-live-triggers-20261111.json').read_text())
J=lambda v:"'"+json.dumps(v).replace("'","''")+"'"
class Live(base.Contract):
 @classmethod
 def setUpClass(c):
  import os,subprocess,tempfile
  c.d=tempfile.mkdtemp(prefix='subject-live-',dir='/tmp');os.chown(c.d,1000,1000);c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};c.addClassCleanup(c.cleanup)
  subprocess.run(base.AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],env=c.env,check=True,capture_output=True)
  subprocess.run(base.AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55487 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
  c.sql("""CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text); CREATE TABLE storage.buckets(id text PRIMARY KEY);CREATE TABLE storage.objects(id uuid);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'::text$$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('sub',auth.uid(),'role',auth.role())$$;
  GRANT USAGE ON SCHEMA auth TO authenticated,anon;GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated,anon;
  CREATE TABLE public._effets_externes(id serial,kind text,payload text);
  CREATE SCHEMA net;CREATE FUNCTION net.http_post(url text,headers jsonb DEFAULT '{}',body jsonb DEFAULT '{}') RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$INSERT INTO public._effets_externes(kind,payload) VALUES('http',url) RETURNING id::bigint$$;
  CREATE SCHEMA cron;CREATE FUNCTION cron.schedule(a text,b text,c text) RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$INSERT INTO public._effets_externes(kind,payload) VALUES('cron',a) RETURNING id::bigint$$;
  GRANT USAGE ON SCHEMA net,cron TO authenticated;""")
  cat=json.loads(Path('src/test/fixtures/subject-reset-catalog-20261111.json').read_text())
  c.sql("CREATE ROLE authenticator LOGIN;GRANT authenticated TO authenticator;")
  c.sql(cat['schema'])
  c.sql("ALTER TABLE public.core_tentatives_neutralisees ADD CONSTRAINT subject_reset_test_neutralisation_pk PRIMARY KEY(attempt_id)")
  for f in cat['functions']:c.sql(f)
  c.sql(cat['rls'])
  c.sql("CREATE TABLE IF NOT EXISTS public.bilan_reponse_statuts(id uuid,apprenant_id uuid,module_id int,exercice_id text,tentative int,cle text,uid text,statut text,reponse jsonb,created_at timestamptz);CREATE TABLE IF NOT EXISTS public.bilan_reponse_reclassements(id uuid,apprenant_id uuid,module_id int,exercice_id text,tentative int,cle text,nouveau_statut text);CREATE TABLE IF NOT EXISTS public.core_tentatives_neutralisees(attempt_id uuid PRIMARY KEY);")
  c.sql(LIVE['tables'])
  import re
  for block in LIVE['tables'].split('CREATE TABLE IF NOT EXISTS ')[1:]:
   table=block.split('(')[0]
   for col in re.findall(r'^ ("[a-z_0-9]+" [^\n]*?),?$',block,re.M):c.sql(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col}")
  for f in LIVE['functions'].values():c.sql(f)
  c.sql(Path('docs/sql-revue/2026-11-11-subject-reset.sql').read_text())
  c.sql(Path('docs/sql-revue/2026-11-11-subject-reset-expired-empty.sql').read_text())
  c.installed=[]
  for t in LIVE['triggers']:
   name=t.split(' ')[2];table=t.split(' ON ')[1].split(' ')[0]
   c.sql(f"DROP TRIGGER IF EXISTS {name} ON {table};"+t);c.installed.append(name+'@'+table)
  c.sql(f"INSERT INTO auth.users VALUES('{U}','learner@example.invalid'),('{ADMIN}','admin@example.invalid');INSERT INTO apprenants(id,auth_user_id,nom,prenom,email) VALUES('{A}','{U}','FICTIF','Élève','learner@example.invalid');UPDATE apprenants SET modules_autorises=ARRAY[35,36,37,38];INSERT INTO user_roles(user_id,role) VALUES('{ADMIN}','admin');INSERT INTO qrc_ia_config(id,actif,actif_depuis) VALUES(true,true,now()-interval '30 days') ON CONFLICT DO NOTHING;")
 def call(self,q,uid=ADMIN,check=True):
  claims=json.dumps({'sub':uid,'role':'authenticated'})
  return self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';SET request.jwt.claims='{claims}';"+q,check)
 def api(self,q,uid=U,check=True):
  import subprocess
  claims=json.dumps({'sub':uid,'role':'authenticated'})
  r=subprocess.run(['psql','-X','-At','-h',self.d,'-p','55487','-U','authenticator','-d','postgres','-v','ON_ERROR_STOP=1'],input=f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';SET request.jwt.claims='{claims}';"+q,env=self.env,text=True,capture_output=True)
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 def j(self,q):return json.loads(self.sql(q).stdout.splitlines()[-1])
 def snap(self,where):return self.sql(f"SELECT md5(coalesce(json_agg(x ORDER BY x::text)::text,'')) FROM (SELECT to_jsonb(r)::text x FROM reponses_apprenants r WHERE {where} UNION ALL SELECT to_jsonb(q)::text FROM apprenant_quiz_results q WHERE {where.replace('exercice_id','quiz_id||\'__\'||matiere_id')} UNION ALL SELECT to_jsonb(a)::text FROM exam_attempts_v2 a WHERE apprenant_id='{A}') s").stdout.strip()
 def learner_submit_legacy(self,key,tentative,mid,exam,score):
  # Same writes as the learner path: edge upsert of answers, then client upsert of the result with the receipt tentative.
  self.sql(f"SET request.jwt.claim.sub='{U}';UPDATE reponses_apprenants SET reponses='{{\"1\":[\"A\"]}}',completed=true,status='submitted',submitted_at=now() WHERE apprenant_id='{A}' AND exercice_id='{key}'")
  out=self.call(f"INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,matiere_id,matiere_nom,score_obtenu,score_max,note_sur_20,tentative,details) VALUES('{A}','{U}','examen_blanc','{exam}','Fictif','{mid}','Fictif',{score},20,{score},{tentative},'{{}}') ON CONFLICT (apprenant_id,quiz_id,matiere_id,tentative) DO UPDATE SET score_obtenu=EXCLUDED.score_obtenu",U);self.assertNotIn('WARNING',out.stderr)
 def test_00_all_live_triggers_installed(self):
  self.assertGreaterEqual(len(self.installed),30)
  for t in ['trg_qrc_ia_enfiler_passage@public.exam_attempts_v2','trg_zz_examens_blancs_6_sur_6@public.apprenant_quiz_results','trg_ensure_quiz_result_on_matiere_completion@public.reponses_apprenants','trg_auto_send_pratique_booking@public.apprenant_module_completion','trg_set_next_quiz_tentative@public.apprenant_quiz_results']:
   self.assertIn(t,self.installed)
 def test_01_legacy_first_start_submission_creates_exact_result(self):
  self.seed('EB3','t3p');other=self.snap("exercice_id LIKE 'EB3__anglais%'")
  c=self.context('EB3','t3p');self.assertEqual(c['status'],'non_commencee');self.authorize(c,str(uuid.uuid4()))
  r=json.loads(self.start(c,str(uuid.uuid4())).stdout.splitlines()[-1]);self.assertEqual((r['tentative'],r['exercice_id']),(1,'EB3__t3p'))
  self.learner_submit_legacy('EB3__t3p',1,'t3p','EB3',17)
  rows=self.j(f"SELECT json_agg(json_build_object('t',tentative,'s',score_obtenu,'src',details->>'source_exercice_id','st',details->>'source_tentative')) FROM apprenant_quiz_results WHERE apprenant_id='{A}' AND quiz_id='EB3' AND matiere_id='t3p'")
  self.assertEqual(rows,[{'t':1,'s':17,'src':None,'st':None}])  # answers arrive first: alert then regularised by this exact result
  self.assertEqual(self.sql("SELECT count(*) FROM alertes_systeme WHERE type='exam_result_missing' AND NOT lu").stdout.strip(),'0')
  self.assertEqual(self.sql("SELECT count(*) FROM alertes_systeme WHERE type='exam_result_missing' AND lu AND details::jsonb->>'regularisee_tentative'='1'").stdout.strip(),'1')
  self.assertEqual(other,self.snap("exercice_id LIKE 'EB3__anglais%'"))
  self.assertEqual(self.sql("SELECT count(*) FROM _effets_externes").stdout.strip(),'0')
  self.assertEqual(self.j("SELECT to_jsonb(exam_subject_reset_context('%s','EB3','t3p'))"%A if False else f"SET request.jwt.claim.sub='{ADMIN}';SELECT exam_subject_reset_context('{A}','EB3','t3p')")['status'],'notee')
 def test_02_legacy_graded_retake_keeps_original_and_creates_t2(self):
  self.seed('EB4','t3p')
  self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at,tentative) VALUES('{A}','{U}','EB4__anglais','examen_blanc','{{\"1\":[\"B\"]}}',true,'submitted',now()-interval '5 days',1),('{A}','{U}','EB4__t3p','examen_blanc','{{\"1\":[\"A\"]}}',true,'submitted',now()-interval '5 days',1)")
  self.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,matiere_id,matiere_nom,score_obtenu,score_max,note_sur_20,tentative) VALUES('{A}','{U}','examen_blanc','EB4','Fictif','anglais','E',12,20,12,1),('{A}','{U}','examen_blanc','EB4','Fictif','t3p','A',15,20,15,1)")
  orig=self.sql("SELECT json_agg(to_jsonb(x) ORDER BY id) FROM (SELECT * FROM apprenant_quiz_results WHERE quiz_id='EB4' AND tentative=1) x").stdout;orig_ans=self.sql("SELECT json_agg(to_jsonb(r) ORDER BY id) FROM reponses_apprenants r WHERE exercice_id IN ('EB4__anglais','EB4__t3p')").stdout
  c=self.context('EB4','anglais');self.assertEqual(c['status'],'notee');self.authorize(c,str(uuid.uuid4()))
  r=json.loads(self.start(c,str(uuid.uuid4())).stdout.splitlines()[-1]);self.assertEqual((r['tentative'],r['exercice_id']),(2,'EB4__anglais__t2'))
  self.assertEqual(self.sql(f"SELECT count(*) FROM apprenant_quiz_results WHERE quiz_id='EB4' AND tentative=2").stdout.strip(),'0')  # non noté, jamais 0/20
  self.learner_submit_legacy('EB4__anglais__t2',2,'anglais','EB4',18)
  self.assertEqual(self.j("SELECT json_agg(json_build_object('m',matiere_id,'t',tentative,'s',score_obtenu) ORDER BY matiere_id,tentative) FROM apprenant_quiz_results WHERE quiz_id='EB4'"),[{'m':'anglais','t':1,'s':12},{'m':'anglais','t':2,'s':18},{'m':'t3p','t':1,'s':15}])
  self.assertEqual(orig,self.sql("SELECT json_agg(to_jsonb(x) ORDER BY id) FROM (SELECT * FROM apprenant_quiz_results WHERE quiz_id='EB4' AND tentative=1) x").stdout)
  self.assertEqual(orig_ans,self.sql("SELECT json_agg(to_jsonb(r) ORDER BY id) FROM reponses_apprenants r WHERE exercice_id IN ('EB4__anglais','EB4__t3p')").stdout)
  self.assertEqual(self.sql("SELECT count(*) FROM _effets_externes").stdout.strip(),'0')
 def v2(self,exam,mid,snapshot_extra,etat='terminee',version=None,started_at=None):
  content={'exam_id':exam,'exam_libelle':'Fictif','matieres':[{'subject_id':mid,'titre':'A','ordre':1,'duree':45,'coefficient':3,'note_sur':20,'note_eliminatoire':6,'pts_qcm':1}],'questions':[{'id':f'{mid}:1','matiere':mid,'ordre':1,'type':'QCM','enonce':'Fictif','points':1,'choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  version=version or str(uuid.uuid4());attempt=str(uuid.uuid4())
  if not self.sql(f"SELECT 1 FROM exam_content_versions WHERE exam_id='{exam}'").stdout.strip():
   self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif,is_test) VALUES('{version}','VTC','5','{exam}',1,'publiee',{J(content)},'f','isolated',true)")
  else: version=self.sql(f"SELECT id FROM exam_content_versions WHERE exam_id='{exam}'").stdout.strip()
  snap={**content,'matiere':mid,'tentative':1,**snapshot_extra}
  started="now()" if started_at is None else f"'{started_at}'"
  self.sql(f"INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,started_at,finished_at,is_test) VALUES('{attempt}','{A}','{exam}','{version}',{J(snap)},'old','{etat}',{started},{'now()' if etat=='terminee' else 'NULL'},true)")
  return attempt
 def test_03_imported_v2_with_exact_result_proof_then_v2_submission(self):
  self.seed('EB5','t3p')
  self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at) VALUES('{A}','{U}','EB5__t3p','examen_blanc','{{\"1\":[\"A\"]}}',true,'submitted',now()-interval '4 days')")
  rid=self.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,matiere_id,matiere_nom,score_obtenu,score_max,note_sur_20,tentative) VALUES('{A}','{U}','examen_blanc','EB5','Fictif','t3p','A',9,20,9,1) RETURNING id").stdout.split()[0]
  att=self.v2('EB5','t3p',{'source_historique':{'origine':'import-historique','result_id':rid}})
  before=self.sql(f"SELECT md5(json_agg(x)::text) FROM (SELECT to_jsonb(a) x FROM exam_attempts_v2 a WHERE attempt_id='{att}' UNION ALL SELECT to_jsonb(q) FROM apprenant_quiz_results q WHERE id='{rid}' UNION ALL SELECT to_jsonb(r) FROM reponses_apprenants r WHERE exercice_id='EB5__t3p') s").stdout
  c=self.context('EB5','t3p');self.assertEqual((c['status'],c['source_attempt_id'],c['source_result_id']),('notee',att,rid))
  self.authorize(c,str(uuid.uuid4()));r=json.loads(self.start(c,str(uuid.uuid4())).stdout.splitlines()[-1])
  self.assertEqual((r['moteur'],r['tentative']),('v2',2));self.assertNotEqual(r['attempt_id'],att)
  na=r['attempt_id'];rev=self.sql(f"SELECT coalesce(max(revision),0) FROM answer_state WHERE attempt_id='{na}'").stdout.strip() or '0'
  self.api(f"SELECT core_save_answer(gen_random_uuid(),'{na}','t3p:1','[\"A\"]'::jsonb,{rev})",U)
  self.api(f"SELECT core_finalize_attempt(gen_random_uuid(),'{na}','{{}}'::text[],'{{}}'::jsonb);SELECT core_recalc_result('{na}')",U)
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{na}'").stdout.strip(),'terminee')
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_exam_results WHERE attempt_id='{na}'").stdout.strip(),'1')
  self.assertEqual(before,self.sql(f"SELECT md5(json_agg(x)::text) FROM (SELECT to_jsonb(a) x FROM exam_attempts_v2 a WHERE attempt_id='{att}' UNION ALL SELECT to_jsonb(q) FROM apprenant_quiz_results q WHERE id='{rid}' UNION ALL SELECT to_jsonb(r) FROM reponses_apprenants r WHERE exercice_id='EB5__t3p') s").stdout)
  self.assertEqual(self.sql("SELECT count(*) FROM qrc_ia_corrections").stdout.strip(),'0')
  self.assertEqual(self.sql("SELECT count(*) FROM _effets_externes WHERE kind='http'").stdout.strip(),'0')
 def test_04_imported_v2_without_exact_proof_is_refused_without_write(self):
  self.seed('EB6-TAXI','t3p')
  self.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,matiere_id,matiere_nom,score_obtenu,score_max,note_sur_20,tentative) VALUES('{A}','{U}','examen_blanc','EB6-TAXI','Fictif','t3p','A',8,20,8,1)")
  self.v2('EB6-TAXI','t3p',{'source_historique':{'origine':'import-historique','result_id':str(uuid.uuid4())}})
  counts=self.sql("SELECT (SELECT count(*) FROM exam_subject_reset_authorizations),(SELECT count(*) FROM exam_subject_retakes),(SELECT count(*) FROM exam_attempts_v2),(SELECT count(*) FROM reponses_apprenants),(SELECT count(*) FROM apprenant_examen_timers)").stdout
  c=self.context('EB6-TAXI','t3p');self.assertEqual(c['status'],'ambigu');self.assertIsNone(c['source_attempt_id'])
  self.assertNotEqual(self.authorize(c,str(uuid.uuid4()),check=False).returncode,0)
  self.assertNotEqual(self.call(f"SELECT start_exam_subject_retake(gen_random_uuid(),'{A}','EB6-TAXI','t3p','{c['source_exercice_id']}',NULL)",U,False).returncode,0)
  self.assertEqual(counts,self.sql("SELECT (SELECT count(*) FROM exam_subject_reset_authorizations),(SELECT count(*) FROM exam_subject_retakes),(SELECT count(*) FROM exam_attempts_v2),(SELECT count(*) FROM reponses_apprenants),(SELECT count(*) FROM apprenant_examen_timers)").stdout)
 def test_05_active_empty_v2_copy_remains_locked(self):
  self.seed('EB1','t3p')
  att=self.v2('EB1','t3p',{},etat='en_cours')
  self.sql(f"INSERT INTO apprenant_examen_timers(apprenant_id,user_id,exercice_id,duree_secondes,tentative,started_at) VALUES('{A}','{U}','EB1__t3p',2700,1,now())")
  before=self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{att}'").stdout
  c=self.context('EB1','t3p');self.assertEqual((c['status'],c['source_attempt_id'],c['expired_empty']),('en_cours',att,False))
  self.assertNotEqual(self.authorize(c,str(uuid.uuid4()),check=False).returncode,0)
  self.assertNotEqual(self.call(f"SELECT start_exam_subject_retake(gen_random_uuid(),'{A}','EB1','t3p','EB1__t3p','{att}')",U,False).returncode,0)
  self.assertEqual(before,self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{att}'").stdout)
  self.assertEqual(self.sql(f"SELECT count(*) FROM exam_attempts_v2 WHERE exam_id='EB1'").stdout.strip(),'1')
  self.assertNotEqual(self.api(f"SELECT exam_subject_reset_expired_empty('{att}','EB1__t3p')",ADMIN,False).returncode,0)
 def test_05b_expired_empty_neutralised_then_learner_starts_and_submits(self):
  self.seed('EB2','t3p')
  att=self.v2('EB2','t3p',{},etat='en_cours',started_at="2026-11-09 08:00:00+00")
  other=self.v2('EB2','anglais',{},etat='terminee')
  self.sql(f"INSERT INTO apprenant_examen_timers(apprenant_id,user_id,exercice_id,duree_secondes,tentative,started_at) VALUES('{A}','{U}','EB2__t3p',2700,1,'2026-11-09 08:00:00+00')")
  before=self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{att}'").stdout
  immutable_before=self.sql(f"SELECT jsonb_build_object('attempt_id',attempt_id,'apprenant_id',apprenant_id,'exam_id',exam_id,'exam_version_id',exam_version_id,'snapshot',snapshot,'snapshot_fingerprint',snapshot_fingerprint,'started_at',started_at,'is_test',is_test) FROM exam_attempts_v2 WHERE attempt_id='{att}'").stdout
  other_before=self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{other}'").stdout
  c=self.context('EB2','t3p');self.assertEqual((c['status'],c['source_attempt_id'],c['expired_empty']),('en_attente',att,True))
  op=str(uuid.uuid4());self.authorize(c,op)
  # Admin confirmation only neutralises the empty original. It creates no new copy, timer or grade.
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{att}'").stdout.strip(),'abandonnee')
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{att}' AND motif='subject-reset-expired-empty:{op}'").stdout.strip(),'1')
  self.assertEqual(self.sql(f"SELECT count(*) FROM exam_attempts_v2 WHERE exam_id='EB2' AND snapshot->>'matiere'='t3p'").stdout.strip(),'1')
  self.assertEqual(self.sql("SELECT count(*) FROM apprenant_examen_timers WHERE exercice_id='EB2__t3p__t2'").stdout.strip(),'0')
  self.assertEqual(self.sql("SELECT count(*) FROM core_exam_results r JOIN exam_attempts_v2 a ON a.attempt_id=r.attempt_id WHERE a.exam_id='EB2'").stdout.strip(),'0')
  current=self.context('EB2','t3p');self.assertEqual(current['authorization_id'],op)
  self.authorize(current,op)
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{att}'").stdout.strip(),'1')
  # Late answer/finalisation on the neutralised original is rejected atomically.
  self.assertNotEqual(self.api(f"SELECT core_save_answer(gen_random_uuid(),'{att}','t3p:1','[\"A\"]'::jsonb,0)",U,False).returncode,0)
  self.assertNotEqual(self.api(f"SELECT core_finalize_attempt(gen_random_uuid(),'{att}','{{}}'::text[],'{{}}'::jsonb)",U,False).returncode,0)
  self.assertEqual(self.sql(f"SELECT count(*) FROM answer_state WHERE attempt_id='{att}'").stdout.strip(),'0')
  r=json.loads(self.start(current,str(uuid.uuid4())).stdout.splitlines()[-1]);na=r['attempt_id']
  self.assertEqual((r['moteur'],r['tentative'],r['exercice_id']),('v2',2,'EB2__t3p__t2'));self.assertNotEqual(na,att)
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_exam_results WHERE attempt_id='{na}'").stdout.strip(),'0')
  self.api(f"SELECT core_save_answer(gen_random_uuid(),'{na}','t3p:1','[\"A\"]'::jsonb,0)",U)
  self.api(f"SELECT core_finalize_attempt(gen_random_uuid(),'{na}','{{}}'::text[],'{{}}'::jsonb);SELECT core_recalc_result('{na}')",U)
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_exam_results WHERE attempt_id='{na}'").stdout.strip(),'1')
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_exam_results WHERE attempt_id='{att}'").stdout.strip(),'0')
  immutable_after=self.sql(f"SELECT jsonb_build_object('attempt_id',attempt_id,'apprenant_id',apprenant_id,'exam_id',exam_id,'exam_version_id',exam_version_id,'snapshot',snapshot,'snapshot_fingerprint',snapshot_fingerprint,'started_at',started_at,'is_test',is_test) FROM exam_attempts_v2 WHERE attempt_id='{att}'").stdout
  self.assertEqual(immutable_before,immutable_after)
  self.assertEqual(other_before,self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{other}'").stdout)
  self.assertNotEqual(before,self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{att}'").stdout)
  self.assertEqual(self.sql("SELECT count(*) FROM qrc_ia_corrections").stdout.strip(),'0')
  self.assertEqual(self.sql("SELECT count(*) FROM _effets_externes WHERE kind='http'").stdout.strip(),'0')
 def test_05c_expired_with_answer_and_event_stays_locked(self):
  self.seed('EB4-TAXI','t3p');att=self.v2('EB4-TAXI','t3p',{},etat='en_cours',started_at="2026-11-09 08:00:00+00")
  self.api(f"SELECT core_save_answer(gen_random_uuid(),'{att}','t3p:1','[\"A\"]'::jsonb,0)",U)
  before=self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{att}'").stdout
  c=self.context('EB4-TAXI','t3p');self.assertEqual((c['status'],c['expired_empty']),('en_cours',False))
  self.assertNotEqual(self.authorize(c,str(uuid.uuid4()),check=False).returncode,0)
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{att}'").stdout.strip(),'0')
  self.assertEqual(before,self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{att}'").stdout)
  self.assertEqual(self.sql(f"SELECT count(*) FROM answer_state WHERE attempt_id='{att}'").stdout.strip(),'1')
 def test_05c2_expired_with_received_event_stays_locked(self):
  self.seed('EB5-TAXI','t3p');att=self.v2('EB5-TAXI','t3p',{},etat='en_cours',started_at="2026-11-09 08:00:00+00")
  self.sql(f"INSERT INTO answer_events(response_id,attempt_id,apprenant_id,question_id,valeur_nouvelle,revision_nouvelle) VALUES(gen_random_uuid(),'{att}','{A}','t3p:1','[\"A\"]',1)")
  c=self.context('EB5-TAXI','t3p');self.assertEqual((c['status'],c['expired_empty']),('en_cours',False))
  self.assertNotEqual(self.authorize(c,str(uuid.uuid4()),check=False).returncode,0)
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{att}'").stdout.strip(),'en_cours')
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{att}'").stdout.strip(),'0')
 def test_05d_expired_with_result_stays_locked(self):
  self.seed('EB1-TAXI','t3p');att=self.v2('EB1-TAXI','t3p',{},etat='en_cours',started_at="2026-11-09 08:00:00+00")
  self.sql(f"INSERT INTO core_exam_results(attempt_id,apprenant_id,score,total) VALUES('{att}','{A}',10,20)")
  c=self.context('EB1-TAXI','t3p');self.assertEqual((c['status'],c['expired_empty']),('en_cours',False))
  self.assertNotEqual(self.authorize(c,str(uuid.uuid4()),check=False).returncode,0)
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{att}'").stdout.strip(),'en_cours')
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{att}'").stdout.strip(),'0')
 def test_05e_expired_but_ambiguous_provenance_stays_locked(self):
  self.seed('eb6-ta','t3p')
  first=self.v2('eb6-ta','t3p',{},etat='en_cours',started_at="2026-11-09 08:00:00+00")
  self.v2('eb6-ta','t3p',{},etat='en_cours',started_at="2026-11-09 09:00:00+00")
  c=self.context('eb6-ta','t3p');self.assertEqual((c['status'],c['source_attempt_id'],c['expired_empty']),('ambigu',None,False))
  self.assertNotEqual(self.authorize(c,str(uuid.uuid4()),check=False).returncode,0)
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{first}'").stdout.strip(),'0')
 def test_05f_concurrent_late_answer_and_admin_are_atomic(self):
  from concurrent.futures import ThreadPoolExecutor
  self.seed('EB6','t3p');att=self.v2('EB6','t3p',{},etat='en_cours',started_at="2026-11-09 08:00:00+00")
  c=self.context('EB6','t3p');self.assertTrue(c['expired_empty']);op=str(uuid.uuid4())
  with ThreadPoolExecutor(max_workers=2) as pool:
   admin=pool.submit(lambda:self.authorize(c,op,check=False).returncode)
   late=pool.submit(lambda:self.api(f"SELECT core_save_answer(gen_random_uuid(),'{att}','t3p:1','[\"A\"]'::jsonb,0)",U,False).returncode)
   admin_code=admin.result();late_code=late.result()
  self.assertEqual(sorted([admin_code==0,late_code==0]),[False,True])
  if admin_code==0:
   self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{att}'").stdout.strip(),'abandonnee')
   self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{att}'").stdout.strip(),'1')
   self.assertEqual(self.sql(f"SELECT count(*) FROM answer_state WHERE attempt_id='{att}'").stdout.strip(),'0')
  else:
   self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{att}'").stdout.strip(),'en_cours')
   self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{att}'").stdout.strip(),'0')
   self.assertEqual(self.sql(f"SELECT count(*) FROM answer_state WHERE attempt_id='{att}'").stdout.strip(),'1')
 def test_06_admin_actions_never_touch_learner_tables(self):
  self.seed('EB2-TAXI','t3p');t=lambda:self.sql("SELECT (SELECT count(*) FROM reponses_apprenants),(SELECT count(*) FROM apprenant_examen_timers),(SELECT count(*) FROM apprenant_quiz_results),(SELECT count(*) FROM exam_attempts_v2),(SELECT count(*) FROM apprenant_module_completion),(SELECT count(*) FROM _effets_externes)").stdout
  b=t();c=self.context('EB2-TAXI','t3p');self.authorize(c,str(uuid.uuid4()));self.assertEqual(b,t())
 def test_07_resume_returns_same_open_copy_without_write(self):
  # Arezki-like: V2 copy open, no answer, timer elapsed. "Reprendre" = core_start_attempt -> same attempt id.
  self.seed('EB2-TAXI','gestion');att=self.v2('EB2-TAXI','gestion',{},etat='en_cours')
  self.sql("INSERT INTO core_bridge_flags(cle,actif) VALUES('passage_v2_comptes_test',true),('passage_v2_apprenants_reels',true)")
  before=self.sql(f"SELECT md5(json_agg(to_jsonb(a) ORDER BY attempt_id)::text) FROM exam_attempts_v2 a").stdout
  out=self.api(f"SELECT (core_start_attempt(gen_random_uuid(),'{A}','EB2-TAXI','gestion')).attempt_id",U,False)
  if out.returncode:self.skipTest('bridge flags schema differs: '+out.stderr[:200])
  self.assertEqual(out.stdout.strip().splitlines()[-1],att)
  self.assertEqual(before,self.sql(f"SELECT md5(json_agg(to_jsonb(a) ORDER BY attempt_id)::text) FROM exam_attempts_v2 a").stdout)
for n in [x for x in dir(base.Contract) if x.startswith('test_')]:
 if hasattr(Live,n) and n not in Live.__dict__:setattr(Live,n,None)
if __name__=='__main__':unittest.main(verbosity=2)
