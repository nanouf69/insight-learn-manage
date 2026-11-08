"""Alignement T3P/Gestion sur PostgreSQL JETABLE. Aucune connexion Cloud."""
import json, os, pathlib, subprocess, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATCH = (ROOT / 'docs/sql-revue/2026-11-08-alignement-bilan-t3p-gestion.sql').read_text()
FIX = ROOT / 'src/test/fixtures'


def q(i, text=None, uid=None, size='sm', choices=None, explication=None):
    value = {
        'id': i, 'uid': uid or f'00000000-0000-4000-8000-{str(i).zfill(12)}',
        'enonce': text or f'Question fictive {i}', 'type': 'QCM',
        'image': None, 'imageSize': size,
        'choix': choices or [{'lettre': 'A', 'texte': 'Réponse A', 'correct': True}, {'lettre': 'B', 'texte': 'Réponse B'}],
    }
    if explication is not None:
        value['explication'] = explication
    return value


def exo(i, questions, key):
    return {'id': i, 'titre': f'Matière fictive {i}', 'matiereKey': key, 'questions': questions}


class Pg:
    def __init__(self, port=55467):
        self.port = port
        self.dir = tempfile.mkdtemp(prefix='pg-bilan-align-', dir='/tmp')
        self.user = [] if os.geteuid() else ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
        if self.user:
            os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ['initdb', '-D', self.dir + '/d', '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8'], check=True, capture_output=True)
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-o', f"-k {self.dir} -p {port} -h ''", '-w', 'start', '-l', self.dir + '/log'], check=True, capture_output=True)

    def sql(self, query, check=True):
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        result = subprocess.run(['psql', '-X', '-At', '-h', self.dir, '-p', str(self.port), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], input=query, capture_output=True, text=True, env=env)
        if check and result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip() if result.returncode == 0 else result.stderr

    def stop(self):
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-m', 'immediate', 'stop'], capture_output=True)


class AlignmentContract(unittest.TestCase):
    def test_complete_contract(self):
        pg = Pg()
        try:
            pg.sql("""
            CREATE ROLE authenticated NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE service_role NOLOGIN;
            CREATE SCHEMA auth;
            CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
            CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.role',true),'')$$;
            CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT current_setting('test.admin',true)='1'$$;
            CREATE TABLE public.module_editor_state(module_id int PRIMARY KEY,module_data jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
            CREATE TABLE public.bilan_question_identites(
              uid uuid PRIMARY KEY,module_id int NOT NULL,filiere text NOT NULL,exercice_id int NOT NULL,matiere text,
              numero_technique text NOT NULL,empreinte_contenu text,etat_initial text NOT NULL DEFAULT 'actif',
              litigieux boolean NOT NULL DEFAULT false,motif text,date_connue timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE(module_id,exercice_id,numero_technique));
            CREATE TABLE public.bilan_question_identite_etats(
              id bigserial PRIMARY KEY,uid uuid NOT NULL REFERENCES public.bilan_question_identites(uid),etat text NOT NULL,
              numero_affiche text,empreinte_contenu text,motif text,created_at timestamptz NOT NULL DEFAULT now());
            CREATE TABLE public.bilan_identite_flags(module_id int PRIMARY KEY,actif boolean NOT NULL);
            INSERT INTO public.bilan_identite_flags VALUES(5,false),(11,false);
            CREATE TABLE public.bilan_future_french_releases(version_id uuid,activated_at timestamptz DEFAULT now());
            CREATE TABLE public.bilan_passage_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),apprenant_id uuid,module_id int,exercice_id int,questions jsonb);
            CREATE TABLE public.bilan_passage_categories(apprenant_id uuid,module_id int);
            CREATE TABLE public.bilan_passages_figes(apprenant_id uuid,module_id int);
            CREATE TABLE public.apprenants(id uuid PRIMARY KEY,auth_user_id uuid,deleted_at timestamptz);
            CREATE TABLE public.reponses_apprenants(id serial PRIMARY KEY,apprenant_id uuid,exercice_id text,reponses jsonb);
            CREATE TABLE public.apprenant_module_completion(apprenant_id uuid,module_id int,status text,details jsonb,PRIMARY KEY(apprenant_id,module_id));
            """)
            pg.sql((FIX / 'shared_exercice_helpers_live_20261107.sql').read_text())
            pg.sql((FIX / 'garde_retrait_massif_questions_live_20261107.sql').read_text())
            pg.sql((FIX / 'propagate_shared_exercices_live_20261107.sql').read_text())
            pg.sql((ROOT / 'drizzle/migrations/0089_bilan_identite_garde_v3.sql').read_text())
            pg.sql("""
            CREATE TRIGGER trg_aaa_garde_retrait_massif BEFORE UPDATE OF module_data ON public.module_editor_state FOR EACH ROW EXECUTE FUNCTION public.garde_retrait_massif_questions();
            CREATE TRIGGER trg_bilan_identite_garde BEFORE INSERT OR UPDATE OF module_data ON public.module_editor_state FOR EACH ROW EXECUTE FUNCTION public.bilan_identite_garde();
            CREATE TRIGGER trg_propagate_shared_exercices AFTER UPDATE OF module_data ON public.module_editor_state FOR EACH ROW EXECUTE FUNCTION public.propagate_shared_exercices();
            """)
            pg.sql((FIX / 'bilan-future-isolated-prototype.sql').read_text())
            pg.sql(PATCH)

            # T3P : deux doublons (25/43), trois questions VTC seules et une TAXI seule.
            vtc_t3p = [q(1), q(25, 'Doublon T3P'), q(43, 'Doublon T3P'), q(60), q(112), q(113), q(114)]
            taxi_t3p = [q(1), q(25, 'Doublon T3P'), q(43, 'Doublon T3P'), q(59, 'Contrôle technique'), q(60)]
            # Gestion : deux doublons (66/100), cinq variantes de forme, deux VTC seules.
            vtc_gestion = [
                q(48, choices=[{'lettre':'A','texte':'Un travailleur  salarié','correct':True},{'lettre':'B','texte':'Autre'}]),
                q(53, choices=[{'lettre':'A','texte':'Pas de régime','correct':False},{'lettre':'C','texte':'Arrêt maladie','correct':True,'explication':'\n'}], explication='Précision VTC'),
                q(75, choices=[{'lettre':'A','texte':'26,00 €','correct':False,'explication':'non'},{'lettre':'B','texte':'26,40 €','correct':True,'explication':'calcul'}]),
                q(101, choices=[{'lettre':'A','texte':'0€','explication':'non'},{'lettre':'B','texte':'650€','correct':True}]),
                q(138, choices=[{'lettre':'A','texte':'Bénéfice','correct':False},{'lettre':'C','texte':'Perte','correct':True}]),
                q(198), q(199), q(66, 'Doublon Gestion'), q(100, 'Doublon Gestion')]
            taxi_gestion = [
                q(48, size=None, choices=[{'lettre':'A','texte':'Un travailleur salarié','correct':True},{'lettre':'B','texte':'Autre'}]),
                q(53, size=None, choices=[{'lettre':'A','texte':'Pas de régime','correct':False},{'lettre':'C','texte':'Arrêt maladie','correct':True}]),
                q(75, size=None, choices=[{'lettre':'A','texte':'26,00 €','correct':False},{'lettre':'B','texte':'26,40 €','correct':True}]),
                q(101, size=None, choices=[{'lettre':'A','texte':'0€'},{'lettre':'B','texte':'650€','correct':True}]),
                q(138, size=None, choices=[{'lettre':'A','texte':'Bénéfice'},{'lettre':'C','texte':'Perte','correct':True}]),
                q(66, 'Doublon Gestion'), q(100, 'Doublon Gestion')]
            # Les UID sont uniques par banque, comme en production.
            all_questions = [(5,500,vtc_t3p),(11,600,taxi_t3p),(5,501,vtc_gestion),(11,601,taxi_gestion)]
            serial = 1000
            for module, ex, questions in all_questions:
                for question in questions:
                    serial += 1
                    question['uid'] = f'00000000-0000-4000-8000-{str(serial).zfill(12)}'
            data5 = {'exercices':[exo(500,vtc_t3p,'t3p_test'),exo(501,vtc_gestion,'gestion_test'),exo(999,[q(999, uid='aaaaaaaa-aaaa-4000-8000-000000000995')],'hors_perimetre')]}
            data11 = {'exercices':[exo(600,taxi_t3p,'t3p_test'),exo(601,taxi_gestion,'gestion_test'),exo(999,[q(999, uid='aaaaaaaa-aaaa-4000-8000-000000000996')],'hors_perimetre')]}
            data2 = {'exercices':[exo(500,[q(1,'Ne pas propager')],'t3p_test')]}
            lit = lambda value: "'" + json.dumps(value).replace("'", "''") + "'::jsonb"
            pg.sql(f"INSERT INTO public.module_editor_state(module_id,module_data) VALUES(5,{lit(data5)}),(11,{lit(data11)}),(2,{lit(data2)});")
            for module, ex, questions in all_questions:
                for question in questions:
                    pg.sql(f"INSERT INTO public.bilan_question_identites(uid,module_id,filiere,exercice_id,numero_technique,etat_initial) VALUES('{question['uid']}',{module},'{ 'VTC' if module==5 else 'TAXI'}',{ex},'{question['id']}','actif')")
            pg.sql("""
            INSERT INTO public.bilan_question_identites(uid,module_id,filiere,exercice_id,numero_technique,etat_initial) VALUES
              ('aaaaaaaa-aaaa-4000-8000-000000000059',5,'VTC',500,'59','supprime'),
              ('aaaaaaaa-aaaa-4000-8000-000000000144',5,'VTC',500,'144','actif'),
              ('aaaaaaaa-aaaa-4000-8000-000000000995',5,'VTC',999,'999','actif'),
              ('aaaaaaaa-aaaa-4000-8000-000000000996',11,'TAXI',999,'999','actif');
            UPDATE public.bilan_identite_flags SET actif=true WHERE module_id IN(5,11);
            """)

            old0 = pg.sql("INSERT INTO public.bilan_future_versions(subject,questions,fingerprint) VALUES(0,'[{\"id\":1}]',md5('[{\"id\":1}]'::jsonb::text)) RETURNING id")
            old1 = pg.sql("INSERT INTO public.bilan_future_versions(subject,questions,fingerprint) VALUES(1,'[{\"id\":1}]',md5('[{\"id\":1}]'::jsonb::text)) RETURNING id")
            pg.sql(f"INSERT INTO public.bilan_future_active VALUES(0,'{old0}'),(1,'{old1}')")
            owners = ['00000000-0000-4000-8000-00000000' + str(n).zfill(4) for n in (1,2,3,4)]
            for owner in owners:
                pg.sql(f"INSERT INTO public.bilan_future_eligibility VALUES('{owner}',5,500,'{old0}'),('{owner}',5,501,'{old1}'),('{owner}',11,600,'{old0}'),('{owner}',11,601,'{old1}')")
            receipt0 = pg.sql(f"INSERT INTO public.bilan_future_receipts(owner_id,module_id,exercise_id,version_id) VALUES('{owners[0]}',5,500,'{old0}') RETURNING id")
            receipt1 = pg.sql(f"INSERT INTO public.bilan_future_receipts(owner_id,module_id,exercise_id,version_id) VALUES('{owners[0]}',5,501,'{old1}') RETURNING id")
            pg.sql(f"INSERT INTO public.bilan_future_drafts VALUES('{receipt0}','{old0}',1,1,'[\"A\"]','aaaaaaaa-aaaa-4000-8000-000000000001')")
            pg.sql(f"INSERT INTO public.bilan_future_submissions VALUES('{receipt1}','{{}}',0,1)")
            pg.sql(f"INSERT INTO public.bilan_passage_snapshots(apprenant_id,module_id,exercice_id,questions) VALUES('{owners[0]}',5,500,'[{{\"ancien\":true}}]')")
            pg.sql(f"INSERT INTO public.reponses_apprenants(apprenant_id,exercice_id,reponses) VALUES('{owners[0]}','module_5_exo_500','{{\"1\":[\"A\"]}}')")
            pg.sql(f"INSERT INTO public.apprenant_module_completion VALUES('{owners[0]}',5,'completed','[]')")

            expected = pg.sql("""
            SELECT jsonb_build_object(
              '5/500',(SELECT md5(e::text) FROM module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e WHERE m.module_id=5 AND e->>'id'='500'),
              '5/501',(SELECT md5(e::text) FROM module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e WHERE m.module_id=5 AND e->>'id'='501'),
              '11/600',(SELECT md5(e::text) FROM module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e WHERE m.module_id=11 AND e->>'id'='600'),
              '11/601',(SELECT md5(e::text) FROM module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e WHERE m.module_id=11 AND e->>'id'='601'))
            """)
            tables = ['bilan_passage_snapshots','reponses_apprenants','apprenant_module_completion','bilan_future_receipts','bilan_future_drafts','bilan_future_submissions','bilan_future_active','bilan_future_eligibility']
            before = {table: pg.sql(f'SELECT md5(coalesce(string_agg(md5(row_to_json(t)::text),\'\' ),\'\')) FROM {table} t') for table in tables}
            old_uids = json.loads(pg.sql("SELECT jsonb_object_agg(module_id||':'||exercice_id||':'||numero_technique,uid) FROM bilan_question_identites WHERE etat_initial='actif'"))
            untouched_before = {
                'module2': pg.sql("SELECT module_data FROM module_editor_state WHERE module_id=2"),
                'exo5_999': pg.sql("SELECT module_data->'exercices'->2 FROM module_editor_state WHERE module_id=5"),
                'exo11_999': pg.sql("SELECT module_data->'exercices'->2 FROM module_editor_state WHERE module_id=11"),
            }
            result = json.loads(pg.sql(f"SELECT public.run_bilan_t3p_gestion_alignment_20261108('{expected}'::jsonb)"))
            self.assertEqual(result['statut'],'applique')
            self.assertEqual(result['nouvel_id_vtc_taxi_q59'],145)
            self.assertEqual((result['t3p_questions'],result['gestion_questions']),(8,9))

            for table, fingerprint in before.items():
                self.assertEqual(pg.sql(f'SELECT md5(coalesce(string_agg(md5(row_to_json(t)::text),\'\' ),\'\')) FROM {table} t'),fingerprint,table)
            self.assertEqual(pg.sql("SELECT etat_initial FROM bilan_question_identites WHERE module_id=5 AND exercice_id=500 AND numero_technique='59'"),'supprime')
            self.assertEqual(pg.sql("SELECT count(*) FROM bilan_question_identites WHERE etat_initial='actif'"),str(len(old_uids)+6))
            for key, uid in old_uids.items():
                if key.startswith('5:500:59') or key.startswith('5:500:144'):
                    continue
                self.assertEqual(pg.sql(f"SELECT uid FROM bilan_question_identites WHERE module_id={key.split(':')[0]} AND exercice_id={key.split(':')[1]} AND numero_technique='{key.split(':')[2]}'"),uid,key)
            self.assertEqual(pg.sql("SELECT module_data FROM module_editor_state WHERE module_id=2"),untouched_before['module2'])
            self.assertEqual(pg.sql("SELECT module_data->'exercices'->2 FROM module_editor_state WHERE module_id=5"),untouched_before['exo5_999'])
            self.assertEqual(pg.sql("SELECT module_data->'exercices'->2 FROM module_editor_state WHERE module_id=11"),untouched_before['exo11_999'])

            canonical = """
            WITH b AS (SELECT m.module_id,e.exercice,q.ordre,q.question q FROM module_editor_state m
              CROSS JOIN LATERAL jsonb_array_elements(m.module_data->'exercices') e(exercice)
              CROSS JOIN LATERAL jsonb_array_elements(e.exercice->'questions') WITH ORDINALITY q(question,ordre)
              WHERE (m.module_id=5 AND e.exercice->>'id' IN('500','501')) OR (m.module_id=11 AND e.exercice->>'id' IN('600','601'))),
            v AS (SELECT * FROM b WHERE module_id=5),t AS (SELECT * FROM b WHERE module_id=11)
            SELECT bool_and(bilan_alignment_canonical(v.q)=bilan_alignment_canonical(t.q)) FROM v JOIN t ON t.exercice->>'id'=(v.exercice->>'id')::int+100 AND t.ordre=v.ordre
            """
            self.assertEqual(pg.sql(canonical),'t')
            self.assertEqual(pg.sql("SELECT q->>'id' FROM (SELECT q,row_number() over() n FROM module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e,jsonb_array_elements(e->'questions') q WHERE m.module_id=5 AND e->>'id'='500') s WHERE n=8"),'145')
            self.assertEqual(pg.sql("SELECT q->>'id' FROM (SELECT q,row_number() over() n FROM module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e,jsonb_array_elements(e->'questions') q WHERE m.module_id=11 AND e->>'id'='600') s WHERE n=8"),'59')
            self.assertEqual(pg.sql("SELECT count(*) FROM module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e,jsonb_array_elements(e->'questions') q WHERE m.module_id=11 AND e->>'id'='601' AND q->>'id' IN('66','100')"),'2')

            self.assertEqual(pg.sql(f"SET test.uid='{owners[0]}'; SET ROLE authenticated; SELECT (bilan_future_open(5,500))->>'version_id'"),old0)
            new0 = pg.sql(f"RESET ROLE; SET test.uid='{owners[1]}'; SET ROLE authenticated; SELECT (bilan_future_open(5,500))->>'version_id'")
            new1 = pg.sql(f"RESET ROLE; SET test.uid='{owners[2]}'; SET ROLE authenticated; SELECT (bilan_future_open(11,601))->>'version_id'")
            self.assertNotIn(new0,[old0,''])
            self.assertNotIn(new1,[old1,''])
            self.assertEqual(pg.sql("SELECT count(*) FROM bilan_future_versions"),'4')
            self.assertEqual(pg.sql("SELECT count(*) FROM bilan_future_common_releases"),'2')
            self.assertEqual(json.loads(pg.sql(f"SELECT public.run_bilan_t3p_gestion_alignment_20261108('{expected}'::jsonb)"))['statut'],'deja_applique')
            refusal = pg.sql("SET ROLE authenticated; SELECT public.run_bilan_t3p_gestion_alignment_20261108('{}')",check=False)
            self.assertIn('permission denied',refusal)
            self.assertIn('Future Bilan proof immutable',pg.sql(f"UPDATE public.bilan_future_common_releases SET version_id='{old0}'",check=False))

            # Retour arrière additif : une publication ultérieure ramène seulement les nouveaux reçus à l'ancienne version.
            pg.sql(f"INSERT INTO public.bilan_future_common_releases(subject,version_id) VALUES(0,'{old0}')")
            rollback = pg.sql(f"SET test.uid='{owners[3]}'; SET ROLE authenticated; SELECT (bilan_future_open(5,500))->>'version_id'")
            self.assertEqual(rollback,old0)
            self.assertEqual(pg.sql(f"RESET ROLE; SET test.uid='{owners[1]}'; SET ROLE authenticated; SELECT (bilan_future_open(5,500))->>'version_id'"),new0)
            print('PASS: ajouts seuls, doublons conservés, contenu+ordre égaux, IDs historiques stables')
            print('PASS: snapshots/réponses/jalons/reçus/brouillons/soumissions inchangés')
            print('PASS: nouveaux passages versionnés, anciens figés, retour arrière additif et aucune propagation hors périmètre')
        finally:
            pg.stop()


if __name__ == '__main__':
    unittest.main()
