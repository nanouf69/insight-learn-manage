"""Real PostgreSQL transaction tests; disposable data only, no Cloud writes."""
import concurrent.futures
import json
import pathlib
import unittest
import uuid
from upsert_reponse_http_integration import PgJetable

ROOT = pathlib.Path(__file__).resolve().parents[2]
OWNER = '11111111-1111-4111-8111-000000000001'
UID = '22222222-2222-4222-8222-000000000002'
OTHER = '33333333-3333-4333-8333-000000000003'
COPY = '44444444-4444-4444-8444-000000000004'


class RevisionVersionnee(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = PgJetable()
        cls.pg.sql("""
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TYPE app_role AS ENUM ('admin','moderator','user');
CREATE TABLE apprenants(id uuid PRIMARY KEY,auth_user_id uuid);
CREATE FUNCTION core_est_proprietaire(uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM apprenants WHERE id=$1 AND auth_user_id=auth.uid())$$;
CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$;
CREATE TABLE exam_attempts_v2(attempt_id uuid PRIMARY KEY,apprenant_id uuid,exam_id text,etat text,snapshot jsonb,is_test boolean DEFAULT false);
CREATE TABLE answer_state(attempt_id uuid,question_id text,valeur jsonb);
CREATE TABLE apprenant_quiz_results(id uuid PRIMARY KEY,apprenant_id uuid,quiz_id text,matiere_id text,details jsonb,quiz_type text,completed_at timestamptz,note numeric,tentative integer);
CREATE TABLE exam_content_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),exam_id text,version_number integer,published_at timestamptz,content jsonb,statut text,retired_at timestamptz,is_test boolean);
CREATE TABLE bilan_passage_snapshots(id uuid PRIMARY KEY,apprenant_id uuid,module_id integer,exercice_id integer,tentative integer,passage_cle text,questions jsonb);
CREATE TABLE reponses_apprenants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),apprenant_id uuid,exercice_id text,tentative integer,status text,completed boolean,reponses jsonb,UNIQUE(apprenant_id,exercice_id));
CREATE TABLE module_editor_state(module_id integer PRIMARY KEY,module_data jsonb,deleted_exercices jsonb,source_fingerprint text,updated_at timestamptz DEFAULT now());
CREATE TABLE bilan_future_versions(id uuid PRIMARY KEY,subject integer,questions jsonb,fingerprint text,created_at timestamptz DEFAULT now());
CREATE TABLE bilan_future_active(subject integer PRIMARY KEY,version_id uuid);
CREATE TABLE bilan_future_receipts(id uuid PRIMARY KEY,owner_id uuid,module_id integer,exercise_id integer,version_id uuid);
CREATE TABLE bilan_future_submissions(receipt_id uuid PRIMARY KEY,answers jsonb,submitted_at timestamptz DEFAULT now());
GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
""")
        cls.pg.sql((ROOT/'docs/sql-revue/2026-11-10-corriges-v2-adaptateurs.sql').read_text())
        q={'id':'francais:4','type':'QCM','enonce':'titiller','points':2,'choix':[{'lettre':l,'texte':l,'correct':l in ['A','C']} for l in ['A','B','C']]}
        cls.pg.sql(f"INSERT INTO apprenants VALUES('{OWNER}','{UID}'); INSERT INTO exam_attempts_v2 VALUES('{COPY}','{OWNER}','EB3','terminee','{json.dumps({'matiere':'francais','questions':[q]})}',false); INSERT INTO exam_content_versions(exam_id,version_number,published_at,content,statut,is_test) VALUES('EB3',23,now(),'{json.dumps({'questions':[q]})}','publiee',false)")

    @classmethod
    def tearDownClass(cls):
        cls.pg.stop()

    def setUp(self):
        # Each test owns a different dossier/copy; reload-resume must not leak across tests.
        global OWNER,COPY
        OWNER=str(uuid.uuid4());COPY=str(uuid.uuid4())
        self.pg.sql(f"INSERT INTO apprenants VALUES('{OWNER}','{UID}'); INSERT INTO exam_attempts_v2 SELECT '{COPY}','{OWNER}',exam_id,etat,snapshot,false FROM exam_attempts_v2 WHERE exam_id='EB3' LIMIT 1")

    def call(self, sql, user=UID):
        raw=self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{user}'; "+sql)
        return json.loads(raw.splitlines()[-1])

    def open(self):
        refs=[{'type':'attempt','id':COPY,'question':'francais:4'}]
        return self.call(f"SELECT revision_corrige_ouvrir('{OWNER}','{json.dumps(refs)}')")

    def command(self,state,payload,op=None):
        return self.call(f"SELECT revision_corrige_commande('{state['id']}',{state['seq']},'{state['epoch']}','{op or uuid.uuid4()}','{json.dumps(payload)}')")

    def answer(self,state,answer,op=None):
        return self.command(state,{'kind':'answer','key':f'attempt|{COPY}|francais:4','answer':answer},op)

    def test_exact_sets(self):
        for answer,points in [(['A','C'],1),(['C','A'],1),(['A'],0),(['C'],0),(['A','B','C'],0),(['B'],0)]:
            state=self.answer(self.open(),answer)
            result=self.command(state,{'kind':'submit'})
            self.assertEqual(result['submission']['perfect'],points)
            self.assertFalse(result['submission']['note_examen_modifiee'])

    def test_reload_latest_timestamp(self):
        state=self.answer(self.open(),['B'])
        state=self.answer(state,['C','A'])
        reread=self.call(f"SELECT revision_corrige_etat('{state['id']}')")
        self.assertEqual(reread['answers'][f'attempt|{COPY}|francais:4'],['C','A'])
        self.assertEqual(reread['seq'],2)
        self.assertEqual(self.pg.sql(f"SELECT count(*),count(DISTINCT created_at) FROM revision_corrige_events WHERE session_id='{state['id']}'"),'2|2')

    def test_two_tabs_cas_preserves_both_local_inputs(self):
        state=self.open()
        def attempt(a):
            try: return self.answer(state,a)
            except RuntimeError as exc: return str(exc)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(attempt,[['A'],['C']]))
        self.assertEqual(sum(isinstance(x,dict) for x in results),1)
        self.assertTrue(any('Conflit de version' in str(x) for x in results))
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM revision_corrige_events WHERE session_id='{state['id']}'"),'1')

    def test_idempotent_lost_ack_and_operation_reuse(self):
        state=self.open();op=uuid.uuid4()
        first=self.answer(state,['A','C'],op)
        self.assertEqual(first,self.answer(state,['A','C'],op))
        with self.assertRaisesRegex(RuntimeError,'Operation reutilisee'):
            self.answer(state,['B'],op)

    def test_current_version_changed_keeps_answer_requires_revalidation(self):
        state=self.answer(self.open(),['A','C'])
        self.pg.sql("BEGIN; UPDATE exam_content_versions SET version_number=24,content=jsonb_set(content,'{questions,0,choix,0,correct}','false'); COMMIT;")
        try:
            with self.assertRaisesRegex(RuntimeError,'Corrige modifie'):
                self.command(state,{'kind':'submit'})
            fresh=self.call(f"SELECT revision_corrige_etat('{state['id']}')")
            self.assertEqual(fresh['answers'],state['answers'])
            result=self.command(fresh,{'kind':'submit'})
            self.assertEqual(result['submission']['perfect'],0)
            self.assertEqual(result['sources'][0]['version'],24)
            self.assertEqual(result['saved'][f'attempt|{COPY}|francais:4']['corrige']['version'],23)
            self.assertEqual(result['saved'][f'attempt|{COPY}|francais:4']['corrige']['bonnes'],['A','C'])
        finally:
            self.pg.sql("UPDATE exam_content_versions SET version_number=23,content=jsonb_set(content,'{questions,0,choix,0,correct}','true')")

    def test_submission_immutable_and_double_click(self):
        state=self.answer(self.open(),['A','C']);op=uuid.uuid4()
        first=self.command(state,{'kind':'submit'},op)
        self.assertEqual(first,self.command(state,{'kind':'submit'},op))
        with self.assertRaisesRegex(RuntimeError,'deja remise'):
            self.answer(first,['B'])
        with self.assertRaisesRegex(RuntimeError,'immuable'):
            self.pg.sql(f"UPDATE revision_corrige_events SET payload='{{}}' WHERE session_id='{state['id']}'")

    def test_no_answer_no_validation(self):
        state=self.open()
        with self.assertRaisesRegex(RuntimeError,'Toutes les reponses'):
            self.command(state,{'kind':'submit'})
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM revision_corrige_events WHERE session_id='{state['id']}'"),'0')

    def test_owner_and_direct_writes(self):
        state=self.open()
        with self.assertRaisesRegex(RuntimeError,'Acces eleve refuse'):
            self.call(f"SELECT revision_corrige_etat('{state['id']}')",OTHER)
        self.assertEqual(self.pg.sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{OTHER}'; SELECT count(*) FROM revision_corrige_sessions WHERE id='{state['id']}'").splitlines()[-1],'0')
        with self.assertRaisesRegex(RuntimeError,'permission denied'):
            self.pg.sql("SET ROLE anon; SELECT revision_corrige_etat(gen_random_uuid())")
        with self.assertRaisesRegex(RuntimeError,'permission denied'):
            self.pg.sql(f"SET ROLE authenticated; INSERT INTO revision_corrige_events(session_id,seq,operation_id,payload) VALUES('{state['id']}',1,gen_random_uuid(),'{{}}')")

    def test_admin_latest_answer_and_time(self):
        state=self.answer(self.open(),['B']);state=self.answer(state,['C','A'])
        with self.assertRaisesRegex(RuntimeError,'Administrateur requis'):
            self.call(f"SELECT revision_corrige_admin('{OWNER}')")
        self.pg.sql(f"CREATE OR REPLACE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT $1='{OTHER}'::uuid AND $2='admin'$$")
        try:
            rows=self.call(f"SELECT revision_corrige_admin('{OWNER}')",OTHER)
            self.assertEqual(len(rows),1)
            self.assertEqual(rows[0]['answers'][0]['answer'],['C','A'])
            self.assertEqual(rows[0]['answers'][0]['seq'],2)
            self.assertTrue(rows[0]['answers'][0]['saved_at'])
            self.assertEqual(rows[0]['refs'][0]['id'],COPY)
        finally:
            self.pg.sql("CREATE OR REPLACE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$")

    def test_historical_fingerprint_unchanged(self):
        before=self.pg.sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY attempt_id)::text) FROM exam_attempts_v2 t")
        self.command(self.answer(self.open(),['A','C']),{'kind':'submit'})
        self.assertEqual(before,self.pg.sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY attempt_id)::text) FROM exam_attempts_v2 t"))

    def test_timeout_rolls_back_operation_can_retry(self):
        state=self.open();op=uuid.uuid4()
        with self.assertRaisesRegex(RuntimeError,'statement timeout'):
            self.pg.sql("SET statement_timeout='5ms'; SELECT pg_sleep(0.03)")
        self.assertEqual(self.answer(state,['A','C'],op)['seq'],1)

    def test_reload_open_resumes_same_identity(self):
        state=self.answer(self.open(),['C'])
        resumed=self.open()
        self.assertEqual(resumed['id'],state['id'])
        self.assertEqual(resumed['answers'],state['answers'])

    def test_unknown_or_duplicate_choices_refused(self):
        state=self.open()
        for answer in [['Z'],['A','A','C']]:
            with self.assertRaisesRegex(RuntimeError,'Choix inconnu ou duplique'):
                self.answer(state,answer)

    def test_all_24_eb_identities_are_isolated(self):
        for number in range(1,7):
            for suffix in ['', '-TAXI', '-ta', '-va']:
                exam=f'EB{number}{suffix}' if suffix not in ['-ta','-va'] else f'eb{number}{suffix}'
                copy=str(uuid.uuid4())
                q={'id':'francais:4','type':'QCM','enonce':'titiller','choix':[{'lettre':l,'texte':l,'correct':l in ['A','C']} for l in ['A','B','C']]}
                if exam!='EB3':
                    self.pg.sql(f"INSERT INTO exam_content_versions(exam_id,version_number,published_at,content,statut,is_test) VALUES('{exam}',1,now(),'{json.dumps({'questions':[q]})}','publiee',false)")
                self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES('{copy}','{OWNER}','{exam}','terminee','{json.dumps({'matiere':'francais','questions':[q]})}',false)")
                refs=[{'type':'attempt','id':copy,'question':'francais:4'}]
                state=self.call(f"SELECT revision_corrige_ouvrir('{OWNER}','{json.dumps(refs)}')")
                self.assertEqual(state['sources'][0]['exam_id'],exam)
                state=self.command(state,{'kind':'answer','key':f'attempt|{copy}|francais:4','answer':['C','A']})
                self.assertEqual(self.command(state,{'kind':'submit'})['submission']['perfect'],1)

    def test_schema_rollback_preserves_original_exam(self):
        before=self.pg.sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY attempt_id)::text) FROM exam_attempts_v2 t")
        self.pg.sql("BEGIN;REVOKE EXECUTE ON FUNCTION revision_corrige_commande(uuid,bigint,text,uuid,jsonb) FROM authenticated;ROLLBACK")
        self.command(self.answer(self.open(),['A','C']),{'kind':'submit'})
        self.assertEqual(before,self.pg.sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY attempt_id)::text) FROM exam_attempts_v2 t"))

    def test_qrc_literal_only_never_human_grade(self):
        copy=str(uuid.uuid4())
        q={'id':'gestion:1','type':'QRC','enonce':'Valeur','reponseQRC':'−10 €','points':2}
        self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES('{copy}','{OWNER}','EBQ','terminee','{json.dumps({'matiere':'gestion','questions':[q]})}',false); INSERT INTO exam_content_versions(exam_id,version_number,published_at,content,statut,is_test) VALUES('EBQ',1,now(),'{json.dumps({'questions':[q]})}','publiee',false)")
        refs=[{'type':'attempt','id':copy,'question':'gestion:1'}]
        for text,perfect,pending in [('−10 €',1,0),('10 €',0,1),('-10 euros',0,1)]:
            state=self.call(f"SELECT revision_corrige_ouvrir('{OWNER}','{json.dumps(refs)}')")
            state=self.command(state,{'kind':'answer','key':f'attempt|{copy}|gestion:1','answer':text})
            result=self.command(state,{'kind':'submit'})['submission']
            self.assertEqual(result['perfect'],perfect)
            self.assertEqual(result['qrc_a_verifier'],pending)
            self.assertFalse(result['note_examen_modifiee'])

    # ---- Adapters, coverage, >50 questions, admin provenance (v2 candidate) ----
    def lit(self,v): return "'"+json.dumps(v).replace("'","''")+"'::jsonb"

    def sources(self,copies,user=UID):
        return self.call(f"SELECT corriges_sources_v2({self.lit(copies)})",user)

    def bilan_snapshot(self,submitted=True,tentative=1,edit=None):
        sid=str(uuid.uuid4());qs=[]
        for n in range(1,4):
            qs.append({'cle':f'500-{n}','uid':str(uuid.uuid4()),'type':'QCM','enonce':f'Q{n}','choix':[{'lettre':l,'texte':l,'correct':l=='B'} for l in 'ABC'],'question_source':{'x':1}})
        cur=json.loads(json.dumps([{k:v for k,v in q.items() if k not in ('cle','question_source')} for q in qs]))
        cur[0]['choix'][0]['correct']=True   # official key changed B -> A+B
        if edit: edit(cur)
        self.pg.sql(f"INSERT INTO bilan_passage_snapshots VALUES('{sid}','{OWNER}',5,500,{tentative},'module_5_exo_500',{self.lit(qs)});"
            f"INSERT INTO module_editor_state(module_id,module_data,deleted_exercices,source_fingerprint) VALUES(5,{self.lit({'exercices':[{'id':500,'questions':cur}]})},'[]','fp1') ON CONFLICT(module_id) DO UPDATE SET module_data=EXCLUDED.module_data;"
            f"INSERT INTO reponses_apprenants(apprenant_id,exercice_id,tentative,status,completed,reponses) VALUES('{OWNER}','module_5_exo_500',1,'{'submitted' if submitted else 'in_progress'}',{str(submitted).lower()},{self.lit({'500-1':['B'],'500-2':['A']})}) ON CONFLICT DO NOTHING")
        return sid,qs

    def test_bilan_historique_adapter_uid_and_current_editor(self):
        sid,qs=self.bilan_snapshot()
        rows=self.sources([{'type':'bilan_snapshot','id':sid}])
        self.assertEqual(len(rows),3)
        r=rows[0]
        self.assertEqual((r['statut'],r['question_id'],r['circuit']),('rapproche',qs[0]['uid'],'bilan_historique'))
        self.assertEqual([c['lettre'] for c in r['actuelle']['choix'] if c['correct']],['A','B'])
        self.assertEqual([c['lettre'] for c in r['historique']['choix'] if c['correct']],['B'])
        self.assertNotIn('question_source',r['historique'])
        self.assertEqual(r['reponse_initiale'],['B'])
        self.assertEqual(r['provenance']['kind'],'editeur');self.assertEqual(r['provenance']['empreinte'],'fp1')
        # revision on the Bilan: A+B exact under current key, original snapshot untouched
        before=self.pg.sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM bilan_passage_snapshots t")
        refs=[{'type':'bilan_snapshot','id':sid,'question':qs[0]['uid']}]
        st=self.call(f"SELECT revision_corrige_ouvrir('{OWNER}',{self.lit(refs)})")
        st=self.command(st,{'kind':'answer','key':f"bilan_snapshot|{sid}|{qs[0]['uid']}",'answer':['B','A']})
        self.assertEqual(self.command(st,{'kind':'submit'})['submission']['perfect'],1)
        self.assertEqual(before,self.pg.sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM bilan_passage_snapshots t"))

    def test_bilan_historique_not_submitted_or_changed_never_matched(self):
        sid,_=self.bilan_snapshot(submitted=False)
        rows=self.sources([{'type':'bilan_snapshot','id':sid}])
        self.assertEqual([(r['question_id'],r['raison']) for r in rows],[(None,'copie_non_terminee')])
        self.pg.sql(f"UPDATE reponses_apprenants SET status='submitted',completed=true WHERE apprenant_id='{OWNER}'")
        def change(cur): cur[1]['enonce']='autre texte'; cur[2]['uid']=str(uuid.uuid4())
        sid2,_=self.bilan_snapshot(edit=change)
        rows=self.sources([{'type':'bilan_snapshot','id':sid2}])
        self.assertEqual([r['raison'] for r in rows],[None,'contenu_modifie','question_absente'])
        self.assertIsNone(rows[1]['actuelle'])
        with self.assertRaisesRegex(RuntimeError,'non rapproche'):
            self.call(f"SELECT revision_corrige_ouvrir('{OWNER}',{self.lit([{'type':'bilan_snapshot','id':sid2,'question':rows[1]['question_id']}])})")

    def future(self,submitted=True,active_same=False):
        rid=str(uuid.uuid4());v1=str(uuid.uuid4());v2=str(uuid.uuid4());subj=abs(hash(rid))%100000
        q=[{'id':n,'type':'QCM','enonce':f'F{n}','choix':[{'lettre':l,'texte':l,'correct':l=='C'} for l in 'ABC']} for n in (1,2)]
        q2=json.loads(json.dumps(q));q2[0]['choix'][0]['correct']=True
        self.pg.sql(f"INSERT INTO bilan_future_versions(id,subject,questions,fingerprint) VALUES('{v1}',{subj},{self.lit(q)},'f1'),('{v2}',{subj},{self.lit(q2)},'f2');"
            f"INSERT INTO bilan_future_active VALUES({subj},'{v1 if active_same else v2}');"
            f"INSERT INTO bilan_future_receipts VALUES('{rid}','{UID}',5,500,'{v1}');"
            +(f"INSERT INTO bilan_future_submissions(receipt_id,answers) VALUES('{rid}',{self.lit({'1':['C'],'2':['A']})});" if submitted else ''))
        return rid,v2

    def test_bilan_futur_adapter_active_version(self):
        rid,v2=self.future()
        rows=self.sources([{'type':'bilan_future','id':rid}])
        self.assertEqual([r['statut'] for r in rows],['rapproche','rapproche'])
        self.assertEqual(rows[0]['provenance'],{**rows[0]['provenance'],'kind':'bilan_future','version_id':v2})
        self.assertEqual([c['lettre'] for c in rows[0]['actuelle']['choix'] if c['correct']],['A','C'])
        self.assertEqual(rows[0]['reponse_initiale'],['C'])
        self.assertEqual(self.sources([{'type':'bilan_future','id':rid}],OTHER),[])
        rid2,_=self.future(submitted=False)
        self.assertEqual([r['raison'] for r in self.sources([{'type':'bilan_future','id':rid2}])],['copie_non_terminee'])
        refs=[{'type':'bilan_future','id':rid,'question':'1'}]
        st=self.call(f"SELECT revision_corrige_ouvrir('{OWNER}',{self.lit(refs)})")
        st=self.command(st,{'kind':'answer','key':f'bilan_future|{rid}|1','answer':['C']})
        self.assertEqual(st['saved'][f'bilan_future|{rid}|1']['statut'],'fausse')
        st=self.command(st,{'kind':'answer','key':f'bilan_future|{rid}|1','answer':['C','A']})
        self.assertEqual(self.command(st,{'kind':'submit'})['submission']['perfect'],1)

    def test_eb_legacy_without_snapshot_and_eb2_vtc_without_publication(self):
        r1=str(uuid.uuid4());r2=str(uuid.uuid4());a=str(uuid.uuid4())
        q={'id':4,'type':'QCM','enonce':'x','choix':[{'lettre':'A','texte':'A','correct':True}]}
        self.pg.sql(f"INSERT INTO apprenant_quiz_results VALUES('{r1}','{OWNER}','EB1','francais',{self.lit({'reponses':{'4':['A']}})},'examen_blanc',now(),NULL,1),"
            f"('{r2}','{OWNER}','EB2X','francais',{self.lit({'snapshot':{'questions':[q]},'reponses':{'4':['A']}})},'examen_blanc',now(),NULL,2);"
            f"INSERT INTO exam_attempts_v2 VALUES('{a}','{OWNER}','EB2X','terminee',{self.lit({'matieres':[{'subject_id':'francais'}],'questions':[q]})},false)")
        rows=self.sources([{'type':'result','id':r1},{'type':'result','id':r2},{'type':'attempt','id':a}])
        got={(r['source_id'],r['question_id']):r['raison'] for r in rows}
        self.assertEqual(got[(r1,None)],'sans_snapshot')
        self.assertEqual(got[(r2,'francais:4')],'sans_publication')
        self.assertEqual(got[(a,'francais:4')],'sans_publication')   # matieres[0] fallback gives an identity, never a key
        self.assertTrue(all(r.get('actuelle') is None for r in rows))
        self.assertEqual([r for r in rows if r['source_id']==r2][0]['tentative'],2)

    def test_multi_subject_snapshot_is_ambiguous(self):
        a=str(uuid.uuid4())
        self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES('{a}','{OWNER}','EB3','terminee',{self.lit({'matieres':[{'subject_id':'francais'},{'subject_id':'t3p'}],'questions':[{'id':'1'}]})},false)")
        self.assertEqual([r['raison'] for r in self.sources([{'type':'attempt','id':a}])],['matiere_ambigue'])

    def test_more_than_50_questions_and_copies_one_session_exhaustive(self):
        exam='EBBIG';qs=[{'id':f'francais:{n}','type':'QCM','enonce':f'q{n}','choix':[{'lettre':l,'texte':l,'correct':l=='A'} for l in 'AB']} for n in range(1,4)]
        self.pg.sql(f"INSERT INTO exam_content_versions(exam_id,version_number,published_at,content,statut,is_test) VALUES('{exam}',1,now(),{self.lit({'questions':qs})},'publiee',false)")
        refs=[]
        for _ in range(60):   # 60 copies x 3 questions = 180 identities, resolved in two bounded calls
            c=str(uuid.uuid4())
            self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES('{c}','{OWNER}','{exam}','terminee',{self.lit({'matiere':'francais','questions':qs})},false)")
            refs+= [{'type':'attempt','id':c,'question':q['id']} for q in qs]
        with self.assertRaisesRegex(RuntimeError,'TROP_DE_COPIES'):
            self.sources([{'type':'attempt','id':r['id']} for r in refs[::3]])
        st=self.call(f"SELECT revision_corrige_ouvrir('{OWNER}',{self.lit(refs)})")
        self.assertEqual(len(st['sources']),180)
        self.assertEqual(len({(s['source_id'],s['question_id']) for s in st['sources']}),180)
        same=self.call(f"SELECT revision_corrige_ouvrir('{OWNER}',{self.lit(list(reversed(refs)))})")
        self.assertEqual(same['id'],st['id'])
        for s in st['sources']:
            st=self.command(st,{'kind':'answer','key':f"attempt|{s['source_id']}|{s['question_id']}",'answer':['A']})
        res=self.command(st,{'kind':'submit'})['submission']
        self.assertEqual((res['perfect'],res['total']),(180,180))
        with self.assertRaisesRegex(RuntimeError,'400 questions'):
            self.call(f"SELECT revision_corrige_ouvrir('{OWNER}',{self.lit(refs+[{**r,'question':r['question']+'x'} for r in refs]+refs[:50])})")

    def test_admin_reader_provenance_and_saves_count(self):
        st=self.answer(self.open(),['B']);st=self.answer(st,['C','A'])
        self.command(st,{'kind':'submit'})
        self.pg.sql(f"CREATE OR REPLACE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT $1='{OTHER}'::uuid AND $2='admin'$$")
        try:
            rows=self.call(f"SELECT revision_corrige_admin('{OWNER}')",OTHER)
            a=rows[0]['answers'][0]
            self.assertEqual((a['answer'],a['statut'],a['nb_sauvegardes'],a['corrige']['version'],a['corrige']['bonnes']),(['C','A'],'juste',2,23,['A','C']))
            self.assertEqual((rows[0]['submission']['perfect'],rows[0]['submission']['total']),(1,1))
            self.assertNotIn('answers',rows[0]['submission'])
            src=self.sources([{'type':'attempt','id':COPY}],OTHER)
            self.assertEqual(src[0]['statut'],'rapproche')
        finally:
            self.pg.sql("CREATE OR REPLACE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$")

    def test_coverage_keyset_no_duplicate_no_omission(self):
        self.pg.sql(f"CREATE OR REPLACE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT $1='{OTHER}'::uuid AND $2='admin'$$")
        try:
            with self.assertRaisesRegex(RuntimeError,'Administrateur requis'):
                self.call("SELECT corriges_couverture_admin('attempt')")
            expected=set(self.pg.sql("SELECT attempt_id FROM exam_attempts_v2 WHERE etat='terminee' AND is_test IS NOT TRUE").split())
            seen=[];after='NULL'
            while True:
                page=self.call(f"SELECT corriges_couverture_admin('attempt',{after},7)",OTHER)
                seen+=[i['source_id'] for i in page['items']]
                if not page['next']: break
                after=f"'{page['next']}'"
            self.assertEqual(len(seen),len(set(seen)));self.assertEqual(set(seen),expected)
        finally:
            self.pg.sql("CREATE OR REPLACE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$")

    def test_answer_payload_shape_strict(self):
        st=self.open()
        with self.assertRaisesRegex(RuntimeError,'Question et reponse requises'):
            self.command(st,{'kind':'answer','key':f'attempt|{COPY}|francais:4','answer':['A'],'statut':'juste'})
        with self.assertRaisesRegex(RuntimeError,'Commande inconnue'):
            self.command(st,{'kind':'submit','perfect':99})

    def test_timeout_in_middle_of_command_rolls_back_then_same_operation_retries(self):
        state=self.open();op=uuid.uuid4()
        payload={'kind':'answer','key':f'attempt|{COPY}|francais:4','answer':['A','C']}
        def hold():  # concurrent publication holds the official row while the command waits on it
            self.pg.sql("BEGIN; SELECT 1 FROM exam_content_versions WHERE exam_id='EB3' FOR UPDATE; SELECT pg_sleep(1.5); COMMIT;")
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            fut=pool.submit(hold)
            import time; time.sleep(0.4)
            with self.assertRaisesRegex(RuntimeError,'statement timeout'):
                self.call(f"SET statement_timeout='300ms'; SELECT revision_corrige_commande('{state['id']}',0,'{state['epoch']}','{op}',{self.lit(payload)})")
            fut.result()
        self.assertEqual(self.pg.sql(f"SELECT count(*) FROM revision_corrige_events WHERE session_id='{state['id']}'"),'0')
        self.assertEqual(self.command(state,payload,op)['seq'],1)

    def test_real_shape_qrc_choix_null_and_scalar_content(self):
        # Production V2 snapshots store "choix": null on QRC; must never raise "cannot extract elements from a scalar".
        a=str(uuid.uuid4());exam='EBNULL'
        qrc={'id':'1','type':'QRC','choix':None,'enonce':'Valeur ?','reponseQRC':'4 800 €'}
        qcm={'id':'2','type':'QCM','choix':[{'lettre':'A','texte':'A','correct':True},{'lettre':'B','texte':'B'}],'enonce':'Q'}
        cur_qrc={**qrc,'id':'gestion:1'};cur_qcm={**qcm,'id':'gestion:2'}
        self.pg.sql(f"INSERT INTO exam_attempts_v2 VALUES('{a}','{OWNER}','{exam}','terminee',{self.lit({'matieres':[{'subject_id':'gestion'}],'questions':[qrc,qcm]})},false);"
            f"INSERT INTO exam_content_versions(exam_id,version_number,published_at,content,statut,is_test) VALUES('{exam}',1,now(),{self.lit({'questions':[cur_qrc,cur_qcm,{'id':'gestion:3','type':'QCM','choix':'oops','enonce':'z'}]})},'publiee',false)")
        rows=self.sources([{'type':'attempt','id':a}])
        self.assertEqual([(r['question_id'],r['statut']) for r in rows],[('gestion:1','rapproche'),('gestion:2','rapproche')])
        st=self.call(f"SELECT revision_corrige_ouvrir('{OWNER}',{self.lit([{'type':'attempt','id':a,'question':'gestion:1'},{'type':'attempt','id':a,'question':'gestion:2'}])})")
        st=self.command(st,{'kind':'answer','key':f'attempt|{a}|gestion:1','answer':'4 800 €'})
        st=self.command(st,{'kind':'answer','key':f'attempt|{a}|gestion:2','answer':['A']})
        res=self.command(st,{'kind':'submit'})['submission']
        self.assertEqual((res['perfect'],res['qrc_a_verifier']),(2,0))


if __name__=='__main__': unittest.main(verbosity=2)