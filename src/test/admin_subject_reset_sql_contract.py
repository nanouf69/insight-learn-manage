"""Execute candidate against live schema on a disposable cluster. No production rows."""
import os,subprocess,tempfile,unittest,json,shutil
from pathlib import Path
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
U='22222222-2222-2222-2222-222222222222'; A='11111111-1111-1111-1111-111111111111'; ADMIN='33333333-3333-3333-3333-333333333333'
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(prefix='admin-subject-',dir='/tmp');os.chown(c.d,1000,1000);c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};c.addClassCleanup(c.cleanup)
  subprocess.run(AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],env=c.env,check=True,capture_output=True)
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55487 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
  c.sql("""CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text); CREATE TABLE storage.buckets(id text PRIMARY KEY);CREATE TABLE storage.objects(id uuid);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'::text$$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('sub',auth.uid(),'role',auth.role())$$;
  GRANT USAGE ON SCHEMA auth TO authenticated,anon;GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated,anon;""")
  catalog=json.loads(Path('src/test/fixtures/subject-reset-catalog-20261111.json').read_text())
  c.sql(catalog['schema'])
  for definition in catalog['functions']:c.sql(definition)
  c.sql(catalog['rls']);c.sql(catalog['triggers'])
  # Mirrors production: core_tentatives_neutralisees_pkey PRIMARY KEY (attempt_id).
  c.sql("DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid='public.core_tentatives_neutralisees'::regclass AND i.indisunique AND i.indnatts=1) THEN ALTER TABLE public.core_tentatives_neutralisees ADD PRIMARY KEY(attempt_id); END IF; END$$")
  c.sql(Path('docs/sql-revue/2026-11-11-subject-reset.sql').read_text())
  c.sql(Path('docs/sql-revue/2026-11-11-subject-reset-expired-empty.sql').read_text())
  c.sql(Path('docs/sql-revue/2026-11-27-subject-reset-empty-legacy-row.sql').read_text())
  c.sql(f"INSERT INTO auth.users VALUES('{U}','learner@example.invalid'),('{ADMIN}','admin@example.invalid');INSERT INTO apprenants(id,auth_user_id,nom,prenom,email) VALUES('{A}','{U}','FICTIF','Élève','learner@example.invalid');UPDATE apprenants SET modules_autorises=ARRAY[35,36,37,38];INSERT INTO user_roles(user_id,role) VALUES('{ADMIN}','admin');")
 @classmethod
 def sql(c,q,check=True):
  r=subprocess.run(['psql','-X','-At','-h',c.d,'-p','55487','-U','postgres','-v','ON_ERROR_STOP=1'],input=q,env=c.env,text=True,capture_output=True)
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 @classmethod
 def cleanup(c):
  if hasattr(c,'d'):
   subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True);shutil.rmtree(c.d,ignore_errors=True)
 def call(self,q,uid=ADMIN,check=True):return self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';"+q,check)
 def seed(self,exam,mid):
  s={'id':exam,'matieres':[{'id':mid,'nom':'A T3P','duree':45,'questions':[{'id':1,'enonce':'Fictif','type':'QCM','choix':[{'id':'A','texte':'Oui','correct':True}]}]},{'id':'anglais','nom':'E Anglais','duree':30,'questions':[{'id':1,'enonce':'Other','type':'QCM'}]}]}
  self.sql(f"INSERT INTO examens_blancs_parcours(module_id,exam_id) VALUES({36 if '-TAXI' in exam else 37 if '-ta' in exam else 38 if '-va' in exam else 35},'{exam}') ON CONFLICT DO NOTHING")
  existing=self.sql(f"SELECT module_data FROM module_editor_state WHERE module_data->>'id'='{exam}'").stdout.strip()
  if existing:
   data=json.loads(existing)
   if not any(m.get('id')==mid for m in data['matieres']):
    data['matieres'].append(s['matieres'][0]);self.sql(f"UPDATE module_editor_state SET module_data='{json.dumps(data)}' WHERE module_data->>'id'='{exam}'")
  else:self.sql(f"INSERT INTO module_editor_state(module_id,module_data) VALUES((SELECT coalesce(max(module_id),0)+1 FROM module_editor_state),'{json.dumps(s)}')")
 def context(self,exam,mid,uid=ADMIN):return json.loads(self.call(f"SELECT exam_subject_reset_context('{A}','{exam}','{mid}')",uid).stdout.splitlines()[-1])
 def authorize(self,c,op=None,uid=ADMIN,check=True):
  op=op or 'aaaaaaaa-1111-1111-1111-111111111111'
  return self.call(f"SELECT row_to_json(r) FROM admin_authorize_exam_subject_reset('{op}','{A}','{c['exam_id']}','{c['filiere']}','{c['matiere_id']}','Élève FICTIF','{c['source_token']}','{c['version_token']}')r",uid,check)
 def start(self,c,op=None):
  attempt="'%s'"%c['source_attempt_id'] if c['source_attempt_id'] else 'NULL'
  return self.call(f"SELECT row_to_json(r) FROM start_exam_subject_retake('{op or 'bbbbbbbb-1111-1111-1111-111111111111'}','{A}','{c['exam_id']}','{c['matiere_id']}','{c['source_exercice_id']}',{attempt})r",U)
 def test_01_unstarted_admin_then_learner_no_zero_timer_deferred_replay(self):
  self.seed('EB3','t3p');c=self.context('EB3','t3p');self.assertEqual(c['status'],'non_commencee')
  self.authorize(c);self.assertEqual(self.sql('SELECT count(*) FROM apprenant_examen_timers').stdout.strip(),'0');self.assertEqual(self.sql('SELECT count(*) FROM apprenant_quiz_results').stdout.strip(),'0')
  r=json.loads(self.start(c).stdout.splitlines()[-1]);self.assertEqual(r['tentative'],1);self.assertEqual(r['exercice_id'],'EB3__t3p');self.assertEqual(json.loads(self.start(c).stdout.splitlines()[-1]),r);self.assertEqual(self.sql('SELECT count(*) FROM apprenant_examen_timers').stdout.strip(),'1')
  self.assertEqual(self.sql('SELECT count(*) FROM apprenant_quiz_results').stdout.strip(),'0')
 def test_02_rights_and_identity(self):
  c=self.context('EB3','anglais');self.assertNotEqual(self.authorize(c,uid=U,check=False).returncode,0)
  wrong={**c,'filiere':'taxi'};self.assertNotEqual(self.authorize(wrong,check=False).returncode,0)
  self.assertNotEqual(self.call(f"SELECT exam_subject_reset_context('{A}','EB3','t3p')",'44444444-4444-4444-4444-444444444444',False).returncode,0)
 def test_03_scoped_48h_other_subject_and_history_intact(self):
  self.seed('EB4-TAXI','reglementation_taxi')
  self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at) VALUES('{A}','{U}','EB4-TAXI__reglementation_taxi','examen_blanc','{{\"1\":[\"A\"]}}',true,'submitted',now()),('{A}','{U}','EB4-TAXI__anglais','examen_blanc','{{\"1\":\"old\"}}',true,'submitted',now())")
  before=self.sql("SELECT json_agg(r ORDER BY exercice_id) FROM reponses_apprenants r WHERE exercice_id IN ('EB4-TAXI__reglementation_taxi','EB4-TAXI__anglais')").stdout
  c=self.context('EB4-TAXI','reglementation_taxi');self.authorize(c,'aaaaaaaa-2222-1111-1111-111111111111');r=json.loads(self.start(c,'bbbbbbbb-2222-1111-1111-111111111111').stdout.splitlines()[-1]);self.assertEqual(r['tentative'],2)
  self.assertEqual(before,self.sql("SELECT json_agg(r ORDER BY exercice_id) FROM reponses_apprenants r WHERE exercice_id IN ('EB4-TAXI__reglementation_taxi','EB4-TAXI__anglais')").stdout)
  other=self.context('EB4-TAXI','anglais');self.assertNotEqual(self.call(f"SELECT start_exam_subject_retake(gen_random_uuid(),'{A}','EB4-TAXI','anglais','EB4-TAXI__anglais',NULL)",U,False).returncode,0)
 def test_04_current_passage_refused(self):
  c=self.context('EB3','t3p');self.assertEqual(c['status'],'en_cours');self.assertNotEqual(self.authorize(c,'aaaaaaaa-3333-1111-1111-111111111111',check=False).returncode,0)
 def test_05_ta_va_real_compositions_no_cross_track(self):
  for i,(exam,mid) in enumerate([('eb5-ta','reglementation_taxi'),('eb6-va','reglementation_vtc')]):
   self.seed(exam,mid);c=self.context(exam,mid);self.authorize(c,f'aaaaaaaa-444{i}-1111-1111-111111111111');r=json.loads(self.start(c,f'bbbbbbbb-444{i}-1111-1111-111111111111').stdout.splitlines()[-1]);self.assertEqual(r['matiere_id'],mid)
   self.assertNotEqual(self.call(f"SELECT exam_subject_reset_context('{A}','{exam}','t3p')",U,False).returncode,0)
 def test_06_append_only_direct_write_and_replay(self):
  self.assertNotEqual(self.call("INSERT INTO exam_subject_reset_authorizations(operation_id) VALUES(gen_random_uuid())",U,False).returncode,0)
  self.assertNotEqual(self.sql("UPDATE exam_subject_reset_authorizations SET learner_name='bad'",False).returncode,0)
 def test_07_v2_native_published_snapshot_preserved_and_no_ai(self):
  self.seed('EB2','gestion')
  content={'exam_id':'EB2','exam_libelle':'Fictif EB2','matieres':[{'subject_id':'gestion','titre':'B Gestion','ordre':1,'duree':30,'coefficient':2,'note_sur':20,'note_eliminatoire':6}], 'questions':[{'id':'gestion:1','matiere':'gestion','ordre':1,'type':'QCM','enonce':'Fictif','points':1,'choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  version='cccccccc-1111-1111-1111-111111111111';attempt='dddddddd-1111-1111-1111-111111111111'
  snap={**content,'matiere':'gestion','tentative':1}
  self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif,is_test) VALUES('{version}','VTC','2','EB2',1,'publiee','{json.dumps(content)}','test','isolated',true);INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,finished_at,is_test) VALUES('{attempt}','{A}','EB2','{version}','{json.dumps(snap)}','old','terminee',now(),true)")
  before=self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{attempt}'").stdout
  c=self.context('EB2','gestion');self.assertEqual(c['source_attempt_id'],attempt);self.authorize(c,'aaaaaaaa-5555-1111-1111-111111111111')
  r=json.loads(self.start(c,'bbbbbbbb-5555-1111-1111-111111111111').stdout.splitlines()[-1]);self.assertEqual(r['moteur'],'v2');self.assertNotEqual(r['attempt_id'],attempt)
  self.assertEqual(before,self.sql(f"SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{attempt}'").stdout)
  self.assertEqual(self.sql("SELECT count(*) FROM qrc_ia_corrections").stdout.strip(),'0')
 def test_08_concurrency_single_authorization(self):
  from concurrent.futures import ThreadPoolExecutor
  c=self.context('EB3','anglais')
  with ThreadPoolExecutor(max_workers=2) as pool:
   results=list(pool.map(lambda op:json.loads(self.authorize(c,op).stdout.splitlines()[-1]),['aaaaaaaa-6666-1111-1111-111111111111','aaaaaaaa-7777-1111-1111-111111111111']))
  self.assertEqual(results[0]['operation_id'],results[1]['operation_id'])
  self.assertEqual(self.sql(f"SELECT count(*) FROM exam_subject_reset_authorizations WHERE apprenant_id='{A}' AND exam_id='EB3' AND matiere_id='anglais'").stdout.strip(),'1')
 def test_09_first_start_then_real_retake_does_not_replay_initial_copy(self):
  self.seed('EB6','t3p');c=self.context('EB6','t3p');self.authorize(c,'aaaaaaaa-8888-1111-1111-111111111111')
  first=json.loads(self.start(c,'bbbbbbbb-8888-1111-1111-111111111111').stdout.splitlines()[-1])
  self.sql(f"UPDATE reponses_apprenants SET completed=true,status='submitted',submitted_at=now(),reponses='{{\"1\":[\"A\"]}}' WHERE apprenant_id='{A}' AND exercice_id='EB6__t3p';INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,score_obtenu) VALUES('{A}','{U}','EB6','Fictif','t3p','T3P',1,20)")
  before=self.sql("SELECT to_jsonb(r) FROM reponses_apprenants r WHERE exercice_id='EB6__t3p'").stdout
  c=self.context('EB6','t3p');self.authorize(c,'aaaaaaaa-9999-1111-1111-111111111111')
  second=json.loads(self.start(c,'bbbbbbbb-9999-1111-1111-111111111111').stdout.splitlines()[-1])
  self.assertEqual(second['tentative'],2);self.assertEqual(second['exercice_id'],'EB6__t3p__t2');self.assertNotEqual(second['operation_id'],first['operation_id'])
  self.assertEqual(before,self.sql("SELECT to_jsonb(r) FROM reponses_apprenants r WHERE exercice_id='EB6__t3p'").stdout)
  self.assertEqual(json.loads(self.start(c,'bbbbbbbb-9999-1111-1111-111111111111').stdout.splitlines()[-1]),second)
  self.assertEqual(self.sql("SELECT count(*) FROM apprenant_quiz_results WHERE quiz_id='EB6'").stdout.strip(),'1')
 def test_10_taxi_fg_separate_authorizations_preserve_all_originals(self):
  self.seed('EB1-TAXI','reglementation_taxi')
  self.sql("UPDATE module_editor_state SET module_data=jsonb_set(module_data,'{matieres}',module_data->'matieres'||'[ {\"id\":\"reglementation_taxi2\",\"nom\":\"G(T) - Locale TAXI\",\"duree\":20,\"questions\":[{\"id\":1,\"type\":\"QCM\",\"enonce\":\"Fictif G\"}]} ]'::jsonb) WHERE module_data->>'id'='EB1-TAXI'")
  for mid,score in [('reglementation_taxi',15),('reglementation_taxi2',8),('anglais',12)]:
   self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at,tentative) VALUES('{A}','{U}','EB1-TAXI__{mid}','examen_blanc','{{\"1\":[\"A\"]}}',true,'submitted',now(),1);INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,score_obtenu,score_max) VALUES('{A}','{U}','examen_blanc','EB1-TAXI','Fictif','{mid}','Fictif',1,{score},20)")
  proof="SELECT jsonb_build_object('answers',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM reponses_apprenants r WHERE exercice_id LIKE 'EB1-TAXI__%'),'grades',(SELECT jsonb_agg(to_jsonb(q) ORDER BY id) FROM apprenant_quiz_results q WHERE quiz_id='EB1-TAXI'),'timers',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM apprenant_examen_timers t))"
  before=self.sql(proof).stdout
  f=self.context('EB1-TAXI','reglementation_taxi');g=self.context('EB1-TAXI','reglementation_taxi2')
  self.assertEqual((f['status'],g['status']),('notee','notee'))
  self.authorize(f,'aaaaaaaa-ab01-1111-1111-111111111111')
  self.assertIsNone(self.context('EB1-TAXI','reglementation_taxi2')['authorization_id'])
  self.assertIsNone(self.context('EB1-TAXI','anglais')['authorization_id'])
  self.authorize(g,'aaaaaaaa-ab02-1111-1111-111111111111')
  self.assertEqual(self.sql("SELECT matiere_id FROM exam_subject_reset_authorizations WHERE exam_id='EB1-TAXI' ORDER BY matiere_id").stdout.splitlines(),['reglementation_taxi','reglementation_taxi2'])
  self.assertEqual(before,self.sql(proof).stdout)
  self.assertEqual(self.sql("SELECT count(*) FROM exam_subject_reset_authorizations WHERE exam_id='EB1-TAXI' AND actor IS NOT NULL AND learner_name='Élève FICTIF'").stdout.strip(),'2')
 def _expired_copy(self,exam,mid,attempt,legacy):
  self.seed(exam,mid);version='ffffffff-'+attempt[9:13]+'-1111-1111-111111111111'
  content={'exam_id':exam,'matieres':[{'subject_id':mid,'titre':'Securite','duree':30}],'questions':[{'id':mid+':1','matiere':mid,'type':'QCM','enonce':'Fictif','choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  snap={**content,'matiere':mid,'matieres':[{'id':mid,'duree':30}]}
  self.sql(f"INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif,is_test) VALUES('{version}','VTC','{exam[2]}','{exam}',(SELECT coalesce(max(version_number),0)+1 FROM exam_content_versions WHERE exam_id='{exam}'),'publiee','{json.dumps(content)}','t','isolated',true);INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,started_at,is_test) VALUES('{attempt}','{A}','{exam}','{version}','{json.dumps(snap)}','t',now()-interval '65 days',true);INSERT INTO apprenant_examen_timers(apprenant_id,user_id,exercice_id,duree_secondes,started_at,tentative) VALUES('{A}','{U}','{exam}__{mid}',1800,now()-interval '65 days',1);SET session_replication_role=replica;INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,submitted_at,tentative) VALUES('{A}','{U}','{exam}__{mid}','examen_blanc','{legacy}',true,'submitted',now()-interval '65 days',1);SET session_replication_role=origin")  # historical row predates P0530
 def test_11_anonymized_empty_legacy_row_expired_v2_copy_recoverable(self):
  # Anonymized 27/11 case: legacy row submitted with {} + expired V2 copy without answers.
  attempt='eeeeeeee-1111-1111-1111-111111111111';self._expired_copy('EB5','securite',attempt,'{}')
  proof="SELECT jsonb_build_object('r',(SELECT jsonb_agg(to_jsonb(r)) FROM reponses_apprenants r WHERE exercice_id='EB5__securite'),'t',(SELECT jsonb_agg(to_jsonb(t)) FROM apprenant_examen_timers t WHERE exercice_id='EB5__securite'))"
  before=self.sql(proof).stdout
  c=self.context('EB5','securite');self.assertTrue(c['expired_empty']);self.assertEqual(c['status'],'en_attente');self.assertEqual(c['source_attempt_id'],attempt)
  self.authorize(c,'aaaaaaaa-c001-1111-1111-111111111111')
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{attempt}'").stdout.strip(),'abandonnee')
  r=json.loads(self.start(self.context('EB5','securite'),'bbbbbbbb-c001-1111-1111-111111111111').stdout.splitlines()[-1]);self.assertEqual(r['tentative'],2)
  self.assertEqual(before,self.sql(proof).stdout)
 def test_12_filled_legacy_row_keeps_copy_locked(self):
  attempt='eeeeeeee-2222-1111-1111-111111111111';self._expired_copy('EB2-TAXI','securite',attempt,'{"1":["A"]}')
  c=self.context('EB2-TAXI','securite');self.assertFalse(c['expired_empty']);self.assertEqual(c['status'],'en_cours')
  self.assertNotEqual(self.authorize(c,'aaaaaaaa-c002-1111-1111-111111111111',check=False).returncode,0)
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{attempt}'").stdout.strip(),'en_cours')
 def _gestion_t2(self,exam,tag,legacy_age="65 days"):
  # Anonymized 27/11 case: attempt 1 graded (18-answer row left in_progress), attempt 2 V2 copy opened, never answered, expired.
  self.seed(exam,'gestion');v=f'ffffffff-{tag}-1111-1111-111111111111';old=f'eeeeeeee-{tag}-1111-1111-111111111111';new=f'eeeeeeee-{tag}-2222-1111-111111111111'
  content={'exam_id':exam,'matieres':[{'subject_id':'gestion','titre':'Gestion','duree':45}],'questions':[{'id':'gestion:1','matiere':'gestion','type':'QCM','enonce':'Fictif','choix':[{'id':'A','texte':'Oui','correct':True}]}]}
  snap={**content,'matiere':'gestion','matieres':[{'subject_id':'gestion','duree':45}]}
  legacy=json.dumps({str(i):['A'] for i in range(1,19)})
  self.sql(f"""INSERT INTO exam_content_versions(id,filiere,exam_numero,exam_id,version_number,statut,content,fingerprint,motif,is_test) VALUES('{v}','VA','{exam[2]}','{exam}',(SELECT coalesce(max(version_number),0)+1 FROM exam_content_versions WHERE exam_id='{exam}'),'publiee','{json.dumps(content)}','t','isolated',true);
  INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,started_at,finished_at,etat,is_test) VALUES('{old}','{A}','{exam}','{v}','{json.dumps(snap)}','t',now()-interval '65 days',now()-interval '65 days'+interval '10 minutes','terminee',true),('{new}','{A}','{exam}','{v}','{json.dumps(snap)}','t',date_trunc('second',now()-interval '10 days')+interval '333 milliseconds',NULL,'en_cours',true);
  INSERT INTO apprenant_examen_timers(apprenant_id,user_id,exercice_id,duree_secondes,started_at,tentative) VALUES('{A}','{U}','{exam}__gestion',2700,now()-interval '65 days',1),('{A}','{U}','{exam}__gestion__t2',2700,date_trunc('second',now()-interval '10 days')+interval '716 milliseconds',2);
  SET session_replication_role=replica;
  INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,tentative,created_at,updated_at) VALUES('{A}','{U}','{exam}__gestion','examen_blanc','{legacy}',false,'in_progress',1,now()-interval '65 days',now()-interval '{legacy_age}');
  INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,score_obtenu,score_max,completed_at) VALUES('{A}','{U}','examen_blanc','{exam}','Fictif','gestion','Gestion',1,8,20,now()-interval '65 days');
  SET session_replication_role=origin;""")
  proof=f"SELECT jsonb_build_object('r',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM reponses_apprenants r WHERE exercice_id LIKE '{exam}__gestion%' AND exercice_id<>'{exam}__gestion__t3'),'q',(SELECT jsonb_agg(to_jsonb(q) ORDER BY id) FROM apprenant_quiz_results q WHERE quiz_id='{exam}'),'t',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM apprenant_examen_timers t WHERE exercice_id LIKE '{exam}__gestion%' AND exercice_id<>'{exam}__gestion__t3'),'old',(SELECT to_jsonb(a) FROM exam_attempts_v2 a WHERE attempt_id='{old}'))"
  return old,new,proof
 def _assert_pairing_refused(self,exam,new,proof):
  before=self.sql(proof).stdout
  neutralizations=self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{new}'").stdout.strip()
  r=self.call(f"SELECT exam_subject_reset_context('{A}','{exam}','gestion')",ADMIN,False)
  if r.returncode==0:
   c=json.loads(r.stdout.splitlines()[-1]);self.assertIn(c['status'],('ambigu','en_cours'));self.assertFalse(c['expired_empty']);self.assertNotEqual(c['source_attempt_id'],new)
  else:self.assertIn('passages différents',r.stderr)
  self.assertEqual(before,self.sql(proof).stdout)
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{new}'").stdout.strip(),'en_cours')
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_tentatives_neutralisees WHERE attempt_id='{new}'").stdout.strip(),neutralizations)
  self.assertEqual(self.sql(f"SELECT count(*) FROM exam_subject_retakes WHERE exam_id='{exam}' AND matiere_id='gestion'").stdout.strip(),'0')
 def test_13_stale_graded_row_does_not_hide_expired_empty_t2_copy(self):
  old,new,proof=self._gestion_t2('eb1-va','d013');before=self.sql(proof).stdout
  c=self.context('eb1-va','gestion');self.assertEqual(c['source_exercice_id'],'eb1-va__gestion__t2');self.assertEqual(c['source_attempt_id'],new);self.assertTrue(c['expired_empty']);self.assertEqual(c['status'],'en_attente');self.assertIsNone(c['source_result_id'])
  self.authorize(c,'aaaaaaaa-d013-1111-1111-111111111111')
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{new}'").stdout.strip(),'abandonnee')
  self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{old}'").stdout.strip(),'terminee')
  c2=self.context('eb1-va','gestion');self.assertEqual(c2['source_token'],c['source_token']);self.assertIsNotNone(c2['authorization_id'])
  r=json.loads(self.start(c2,'bbbbbbbb-d013-1111-1111-111111111111').stdout.splitlines()[-1])
  self.assertEqual(r['exercice_id'],'eb1-va__gestion__t3');self.assertNotEqual(r['attempt_id'],new)
  self.assertEqual(before,self.sql(proof).stdout)
 def test_14_legacy_row_touched_after_copy_start_stays_locked(self):
  old,new,proof=self._gestion_t2('eb2-va','d014',legacy_age='9 days')
  r=self.call(f"SELECT exam_subject_reset_context('{A}','eb2-va','gestion')",ADMIN,False);self.assertNotEqual(r.returncode,0);self.assertIn('passages différents',r.stderr)
 def test_15_copy_with_saved_answer_stays_locked(self):
  old,new,proof=self._gestion_t2('eb3-va','d015')
  self.sql(f"INSERT INTO answer_state(attempt_id,apprenant_id,question_id,valeur) VALUES('{new}','{A}','gestion:1','\"A\"')")
  self._assert_pairing_refused('eb3-va',new,proof)
 def test_16_timer_in_another_utc_second_stays_locked(self):
  old,new,proof=self._gestion_t2('eb4-va','d016')
  self.sql(f"UPDATE apprenant_examen_timers SET started_at=started_at+interval '1 second' WHERE exercice_id='eb4-va__gestion__t2'")
  self._assert_pairing_refused('eb4-va',new,proof)
 def test_17_multiple_timers_in_same_second_stay_locked(self):
  old,new,proof=self._gestion_t2('eb5-va','d017')
  self.sql(f"INSERT INTO apprenant_examen_timers(apprenant_id,user_id,exercice_id,duree_secondes,started_at,tentative) SELECT '{A}','{U}','eb5-va__gestion__t3',2700,started_at,3 FROM apprenant_examen_timers WHERE exercice_id='eb5-va__gestion__t2'")
  self._assert_pairing_refused('eb5-va',new,proof)
 def test_18_multiple_open_copies_stay_locked(self):
  old,new,proof=self._gestion_t2('eb6-va','d018')
  self.sql(f"INSERT INTO exam_attempts_v2(attempt_id,apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,started_at,is_test) SELECT 'eeeeeeee-d018-3333-1111-111111111111',apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,started_at+interval '100 milliseconds',true FROM exam_attempts_v2 WHERE attempt_id='{new}'")
  self._assert_pairing_refused('eb6-va',new,proof)
 def test_19_answer_event_on_empty_copy_stays_locked(self):
  old,new,proof=self._gestion_t2('EB1','d019')
  self.sql(f"INSERT INTO answer_events(response_id,attempt_id,apprenant_id,question_id,valeur_nouvelle,revision_nouvelle) VALUES(gen_random_uuid(),'{new}','{A}','gestion:1','[\"A\"]',1)")
  self._assert_pairing_refused('EB1',new,proof)
  self.assertEqual(self.sql(f"SELECT count(*) FROM answer_events WHERE attempt_id='{new}'").stdout.strip(),'1')
 def test_20_core_result_on_empty_copy_stays_locked(self):
  old,new,proof=self._gestion_t2('EB3','d020')
  self.sql(f"INSERT INTO core_exam_results(attempt_id,apprenant_id,score,total) VALUES('{new}','{A}',10,20)")
  self._assert_pairing_refused('EB3',new,proof)
  self.assertEqual(self.sql(f"SELECT count(*) FROM core_exam_results WHERE attempt_id='{new}'").stdout.strip(),'1')
 def test_21_candidate_exercise_response_stays_locked(self):
  old,new,proof=self._gestion_t2('EB4','d021')
  self.sql(f"SET session_replication_role=replica;INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,completed,status,tentative) VALUES('{A}','{U}','EB4__gestion__t2','examen_blanc','{{\"1\":[\"A\"]}}',false,'in_progress',2);SET session_replication_role=origin")
  self._assert_pairing_refused('EB4',new,proof)
 def test_22_existing_neutralization_stays_locked(self):
  old,new,proof=self._gestion_t2('EB5','d022')
  self.sql(f"INSERT INTO core_tentatives_neutralisees(attempt_id,apprenant_id,exam_id,motif) VALUES('{new}','{A}','EB5','fixture-other-operation')")
  self._assert_pairing_refused('EB5',new,proof)
 def test_23_timer_duration_mismatch_stays_locked(self):
  old,new,proof=self._gestion_t2('EB6','d023')
  self.sql("UPDATE apprenant_examen_timers SET duree_secondes=1800 WHERE exercice_id='EB6__gestion__t2'")
  self._assert_pairing_refused('EB6',new,proof)
 def test_24_result_for_candidate_attempt_stays_locked(self):
  old,new,proof=self._gestion_t2('EB1-TAXI','d024')
  self.sql(f"INSERT INTO apprenant_quiz_results(apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,matiere_id,matiere_nom,tentative,score_obtenu,score_max,completed_at) VALUES('{A}','{U}','examen_blanc','EB1-TAXI','Fictif','gestion','Gestion',2,10,20,now()-interval '9 days')")
  self._assert_pairing_refused('EB1-TAXI',new,proof)
if __name__=='__main__':unittest.main(verbosity=2)
