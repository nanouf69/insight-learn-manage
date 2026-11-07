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
SQL_FILE = Path(os.environ.get('BILAN_FUTURE_SQL', str(ROOT / 'drizzle/migrations/0219_bilan_taxi_locale_futurs_canoniques.sql')))

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
    CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.admin',true)='1'$$;
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
    if os.environ.get('RLS_CONFIG_CANDIDATE'):
        sql("""
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
        CREATE TABLE bilan_future_opening(id int, open_to_new boolean);
        CREATE TABLE module_regles_validation(module_id int);
        INSERT INTO bilan_future_opening VALUES(1,false);
        INSERT INTO module_regles_validation VALUES(3);
        GRANT SELECT ON bilan_future_opening, bilan_identite_flags, bilan_snapshot_flags, module_regles_validation TO anon, authenticated;
        GRANT ALL ON bilan_future_opening, bilan_identite_flags, bilan_snapshot_flags, module_regles_validation TO service_role;
        ALTER TABLE bilan_future_opening ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bilan_identite_flags ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bilan_snapshot_flags ENABLE ROW LEVEL SECURITY;
        ALTER TABLE module_regles_validation ENABLE ROW LEVEL SECURITY;
        CREATE POLICY future_opening_read ON bilan_future_opening FOR SELECT TO authenticated USING(true);
        CREATE POLICY "Lecture flags identites" ON bilan_identite_flags FOR SELECT TO authenticated USING(true);
        CREATE POLICY "Lecture flags snapshot bilan" ON bilan_snapshot_flags FOR SELECT TO authenticated USING(true);
        CREATE POLICY "Lecture règles modules" ON module_regles_validation FOR SELECT TO authenticated USING(true);
        """)
        # Avant : la faille est bien reproductible, pas seulement déduite du SQL.
        assert sql("SET ROLE authenticated; SELECT count(*) FROM bilan_snapshot_flags") == '2'
        sql((ROOT / 'docs/sql-revue/2026-11-07-rls-configuration-admin.sql').read_text())
        for table, expected in [('bilan_future_opening','1'),('bilan_identite_flags','1'),('bilan_snapshot_flags','2'),('module_regles_validation','1')]:
            try:
                sql(f"SET ROLE anon; SELECT count(*) FROM {table}")
                raise AssertionError('anonymous configuration read accepted: '+table)
            except subprocess.CalledProcessError as e:
                assert 'permission denied' in e.output, e.output
            assert sql(f"SET ROLE authenticated; SET test.admin='0'; SELECT count(*) FROM {table}") == '0'
            assert sql(f"SET ROLE authenticated; SET test.admin='0'; SET test.uid='00000000-0000-0000-0000-000000000099'; SELECT count(*) FROM {table}") == '0'
            admin_count = sql(f"SET ROLE authenticated; SET test.admin='1'; SELECT count(*) FROM {table}")
            assert admin_count == expected, (table, 'admin', admin_count, expected, sql("SET ROLE authenticated; SET test.admin='1'; SELECT current_setting('test.admin',true), public.has_role(null,'admin')"))
            assert sql(f"SET ROLE service_role; SELECT count(*) FROM {table}") == expected
        print('PASS: anonymous denied, learners/other account zero rows, admin and service read all four configuration tables')
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
    if os.environ.get('RLS_CONFIG_CANDIDATE'):
        # Vraie garde d'identité 0089 : la lecture du flag reste disponible au trigger interne.
        sql("""
        ALTER TABLE bilan_question_identites ADD COLUMN filiere text, ADD COLUMN matiere text,
          ADD COLUMN empreinte_contenu text, ADD COLUMN etat_initial text DEFAULT 'actif',
          ADD COLUMN litigieux boolean DEFAULT false, ADD COLUMN motif text,
          ADD COLUMN date_connue timestamptz, ADD COLUMN created_at timestamptz DEFAULT now();
        CREATE TABLE bilan_question_identite_etats(id bigserial PRIMARY KEY, uid uuid,
          etat text, numero_affiche text, empreinte_contenu text, motif text, created_at timestamptz DEFAULT now());
        """)
        sql((ROOT / 'drizzle/migrations/0089_bilan_identite_garde_v3.sql').read_text())
        sql('CREATE TRIGGER trg_test_identite BEFORE INSERT OR UPDATE OF module_data ON module_editor_state FOR EACH ROW EXECUTE FUNCTION bilan_identite_garde()')
        sql('GRANT INSERT ON module_editor_state TO service_role')
        sql("""SET ROLE service_role; INSERT INTO module_editor_state VALUES(11,
          '{"exercices":[{"id":699,"titre":"TEST INTERNE","questions":[{"id":"99001","enonce":"Question fictive"}]}]}'::jsonb)""")
        saved = json.loads(sql("SELECT module_data::text FROM module_editor_state WHERE module_id=11 AND module_data->'exercices'->0->>'id'='699'"))
        uid = saved['exercices'][0]['questions'][0].get('uid')
        assert uid and sql(f"SELECT count(*) FROM bilan_question_identites WHERE uid='{uid}' AND module_id=11 AND exercice_id=699") == '1'
        print('PASS: internal identity trigger still reads its flag and assigns a permanent ID')
        sql((ROOT / 'docs/sql-revue/2026-11-07-rls-configuration-admin-RETOUR-ARRIERE.sql').read_text())
        assert sql("SET ROLE authenticated; SET test.admin='0'; SELECT count(*) FROM bilan_snapshot_flags") == '2'
        print('PASS: targeted rollback restores the exact prior read behavior')
finally:
    if started:
        subprocess.run(USER + ['pg_ctl','-D',TEMP+'/data','-m','fast','-w','stop'], check=True, stdout=subprocess.DEVNULL)