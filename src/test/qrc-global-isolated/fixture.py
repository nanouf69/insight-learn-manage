"""Synthetic source fixtures only. No real credentials or row data."""
import pathlib,sys,json,uuid
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from upsert_reponse_http_integration import PgJetable
ADMIN='44444444-4444-4444-8444-000000000004'
LEARNER='22222222-2222-4222-8222-000000000002'
APP='11111111-1111-4111-8111-000000000001'
DAY='55555555-5555-4555-8555-000000000005'
EVENING='66666666-6666-4666-8666-000000000006'
EXAMS=[f'EB{n}' if t=='VTC' else f'EB{n}-TAXI' if t=='TAXI' else f'eb{n}-{t.lower()}' for n in range(1,7) for t in ['VTC','TAXI','TA','VA']]
def literal(v): return "'"+str(v).replace("'","''")+"'"
class Fixture:
 def __init__(self):
  self.pg=PgJetable()
  assert self.pg.dir.startswith('/tmp/pg-http-22p05-') and self.pg.port!=5432, 'unverified isolation'
  self.pg.sql('''
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TABLE public.user_roles(user_id uuid,role text);
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role=$2)$$;
CREATE TABLE public.apprenant_quiz_results(id uuid PRIMARY KEY,apprenant_id uuid,quiz_id text,quiz_type text DEFAULT 'examen_blanc',matiere_id text,tentative integer,details jsonb,completed_at timestamptz,note_sur_20 numeric DEFAULT 12);
GRANT ALL ON public.apprenant_quiz_results TO service_role;
ALTER TABLE public.apprenant_quiz_results ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.reponses_apprenants(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,exercice_id text,tentative integer,reponses jsonb,completed boolean,status text,submitted_at timestamptz);
GRANT ALL ON public.reponses_apprenants TO service_role;
ALTER TABLE public.reponses_apprenants ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.exam_attempts_v2(attempt_id uuid PRIMARY KEY,apprenant_id uuid,exam_id text,snapshot jsonb,snapshot_fingerprint text,etat text,started_at timestamptz,finished_at timestamptz);
GRANT ALL ON public.exam_attempts_v2 TO service_role;
ALTER TABLE public.exam_attempts_v2 ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.qrc_instances_v2(qrc_instance_id uuid PRIMARY KEY,attempt_id uuid,apprenant_id uuid,question_id text,reponse jsonb,etat text,note numeric);
GRANT ALL ON public.qrc_instances_v2 TO service_role;
ALTER TABLE public.qrc_instances_v2 ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.sessions(id uuid PRIMARY KEY,nom text,date_debut date,date_fin date);
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.session_apprenants(apprenant_id uuid,session_id uuid,date_debut date,date_fin date);
GRANT ALL ON public.session_apprenants TO service_role;
ALTER TABLE public.session_apprenants ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
''')
  self.pg.sql(f"INSERT INTO user_roles VALUES('{ADMIN}','admin'); INSERT INTO sessions VALUES('{DAY}','Novembre journée','2026-11-02','2026-11-13'),('{EVENING}','Novembre soirée','2026-11-02','2026-11-13'); INSERT INTO session_apprenants VALUES('{APP}','{DAY}',NULL,NULL),('{APP}','{EVENING}',NULL,NULL)")
  self.pg.sql(pathlib.Path(__file__).with_name('candidate.sql').read_text())
 def historical(self,exam='EB2',matter='A',tentative=1,questions=None,submitted=True,ambiguous=False):
  rid=str(uuid.uuid4()); exercise=rid
  qs=questions if questions is not None else [{'id':'q1','type':'QRC','enonce':'Question figée '+matter,'points':2,'reponseQRC':'Réponse officielle figée'}]
  answers={q.get('id','q1'):'Réponse synthétique '+matter for q in qs}
  details={'snapshot':{'questions':qs},'reponses':answers,'source_exercice_id':exercise,'source_tentative':tentative}
  if ambiguous: details['questions']=[{**q,'enonce':'différent'} for q in qs]
  self.pg.sql(f"INSERT INTO apprenant_quiz_results VALUES('{rid}','{APP}',{literal(exam)},'examen_blanc',{literal(matter)},{tentative},{literal(json.dumps(details))}::jsonb,'2026-11-09T10:00:00Z',12); INSERT INTO reponses_apprenants(apprenant_id,exercice_id,tentative,reponses,completed,status,submitted_at) VALUES('{APP}','{exercise}',{tentative},{literal(json.dumps(answers))}::jsonb,{'true' if submitted else 'false'},'submitted','2026-11-09T10:00:00Z')")
  return rid
 def native(self,exam='EB2',matter='A',linked=None,state='terminee'):
  aid=str(uuid.uuid4()); qid=str(uuid.uuid4())
  snapshot={'matiere':matter,'tentative':1,'questions':[{'id':'q1','type':'QRC','matiere':matter,'enonce':'Question native','points':2,'reponseQRC':'Corrigé natif'}]}
  if linked:
   snapshot['result_id']=linked
   snapshot['source_historique']={'details':json.loads(self.pg.sql(f"SELECT details FROM apprenant_quiz_results WHERE id={literal(linked)}"))}
  self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES('{aid}','{APP}',{literal(exam)},{literal(json.dumps(snapshot))}::jsonb,'fingerprint-native',{literal(state)},now(),{'now()' if state=='terminee' else 'NULL'}); INSERT INTO qrc_instances_v2 VALUES('{qid}','{aid}','{APP}','q1','\"Réponse native\"','corrigee',1)")
  return aid
 def admin(self,sql,uid=ADMIN): return self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; "+sql).splitlines()[-1]
 def rows(self,after='',limit=500,session=None,exam=None):
  return json.loads(self.admin(f"SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM qrc_unified_read({literal(after)},{limit},{literal(session)+'::uuid' if session else 'NULL'},{literal(exam) if exam else 'NULL'}) r"))
 def grade(self,row,op,note=1,expected=None,uid=ADMIN):
  return json.loads(self.admin(f"SELECT to_jsonb(qrc_history_grade({literal(op)},{literal(row['identity'])},{row['revision'] if expected is None else expected},{literal(row['fingerprint'])},{note},''))",uid))
 def fingerprint(self):
  return self.pg.sql("SELECT md5(string_agg(t,',' ORDER BY t)) FROM (SELECT to_jsonb(r)::text t FROM apprenant_quiz_results r UNION ALL SELECT to_jsonb(r)::text FROM reponses_apprenants r UNION ALL SELECT to_jsonb(r)::text FROM exam_attempts_v2 r UNION ALL SELECT to_jsonb(r)::text FROM qrc_instances_v2 r) x")
