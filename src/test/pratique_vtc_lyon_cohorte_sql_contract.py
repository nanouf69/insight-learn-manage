"""Candidat Lyon sur PostgreSQL jetable. Catalogue lu, jamais de SQL d'écriture distant."""
import pathlib, subprocess, unittest, json
import module_completion_sql_contract as base
ROOT = pathlib.Path(__file__).resolve().parents[2]
CANDIDATE = ROOT / 'docs/candidates/quiz_lyon_cohorte_138.sql'
EX = 'module_8_exo_1785332774763'

def answers(n):
    return json.dumps({f'1785332774763-{i}':['A'] for i in range(1,n+1)})
def call(a, u, query):
    return base.sql(base.learner(u, query.replace('AID',a)))
class SqlResult(unittest.TextTestResult):
    def addError(self, test, err):
        if isinstance(err[1], subprocess.CalledProcessError): print(err[1].output)
        super().addError(test, err)
class Lyon(unittest.TestCase):
    def setUp(self):
        # Chaque scénario a une base distincte ; pas de purge des preuves ni des cohortes.
        self.db = 'lyon_'+self._testMethodName
        subprocess.run(['createdb','-h',base.TEMP,'-p',base.PORT,'-U','lovable','-T','template_lyon',self.db],check=True)
        self.old = base.sql
        base.sql = lambda q, db=None: self.old(q, db or self.db)
    def tearDown(self): base.sql = self.old
    def seuil(self,a=base.A,u=base.U):
        return call(a,u,"SELECT public.quiz_lyon_seuil('AID')")
    def write(self,n,a=base.A,u=base.U):
        return call(a,u,f"INSERT INTO reponses_apprenants(apprenant_id,exercice_id,reponses,status) VALUES('AID','{EX}','{answers(n)}','in_progress')")
    def test_01_historique_99_termine_intact(self):
        base.sql(f"ALTER TABLE reponses_apprenants DISABLE TRIGGER USER; INSERT INTO reponses_apprenants(apprenant_id,exercice_id,reponses,status,submitted_at) VALUES('{base.A}','{EX}','{answers(99)}','submitted','2026-11-01'); ALTER TABLE reponses_apprenants ENABLE TRIGGER USER")
        before=base.sql("SELECT md5(row_to_json(r)::text) FROM reponses_apprenants r")
        self.assertEqual(self.seuil(),'99')
        self.assertEqual(call(base.A,base.U,f"SELECT status FROM save_module_completion('AID',8,true,100,NULL,NULL,NULL)"),'completed')
        self.assertEqual(before,base.sql("SELECT md5(row_to_json(r)::text) FROM reponses_apprenants r"))
        self.assertEqual(base.sql('SELECT count(*) FROM quiz_lyon_cohortes'),'0')
    def test_02_nouveau_99_refuse_138_exige(self):
        self.assertEqual(self.seuil(),'138'); self.write(99)
        self.assertEqual(self.seuil(),'138')
        self.assertIn('138 réponses exigées',base.err(base.learner(base.U,f"SELECT save_module_completion('{base.A}',8,true,100)")) or '')
        self.assertIn('138 réponses exigées',base.err(base.learner(base.U,f"UPDATE reponses_apprenants SET status='submitted',submitted_at=now() WHERE apprenant_id='{base.A}'")) or '')
        self.assertEqual(call(base.A,base.U,"SELECT validated FROM autovalidate_module_if_complete('AID',8,99)"),'f')
        call(base.A,base.U,f"UPDATE reponses_apprenants SET reponses='{answers(138)}' WHERE apprenant_id='AID'")
        self.assertEqual(call(base.A,base.U,"SELECT status FROM save_module_completion('AID',8,true,100)"),'completed')
        call(base.A,base.U,"UPDATE reponses_apprenants SET status='submitted',submitted_at=now() WHERE apprenant_id='AID'")
        self.assertEqual(self.seuil(),'138')
    def test_03_historique_commence_99_meme_si_total_client_138(self):
        base.sql(f"ALTER TABLE reponses_apprenants DISABLE TRIGGER USER; INSERT INTO reponses_apprenants(apprenant_id,exercice_id,reponses,status,total_questions) VALUES('{base.A}','{EX}','{answers(1)}','in_progress',138); ALTER TABLE reponses_apprenants ENABLE TRIGGER USER")
        self.assertEqual(self.seuil(),'99')
    def test_04_archive_et_validation_preservees(self):
        base.sql(f"INSERT INTO reponses_apprenants_historique VALUES('{base.A}','{EX}')")
        self.assertEqual(self.seuil(),'99')
        base.sql(f"ALTER TABLE apprenant_module_completion DISABLE TRIGGER trg_01_lyon_completion; INSERT INTO apprenant_module_completion(apprenant_id,module_id,status,progress,completed_at) VALUES('{base.A2}',8,'completed',100,'2026-11-01'); ALTER TABLE apprenant_module_completion ENABLE TRIGGER trg_01_lyon_completion")
        self.assertEqual(self.seuil(base.A2,base.U2),'99')
        before=base.sql(f"SELECT md5(row_to_json(r)::text) FROM apprenant_module_completion r WHERE apprenant_id='{base.A2}'")
        call(base.A2,base.U2,"SELECT * FROM etat_completion_modules('AID')")
        self.assertEqual(before,base.sql(f"SELECT md5(row_to_json(r)::text) FROM apprenant_module_completion r WHERE apprenant_id='{base.A2}'"))
    def test_05_lecture_jalons_138_pas_faux_100(self):
        self.write(99)
        call(base.A,base.U,"SELECT save_module_completion('AID',8,false,99)")
        self.assertEqual(call(base.A,base.U,"SELECT questions_requises||'|'||questions_prouvees||'|'||preuve_complete FROM etat_completion_modules('AID')"),'138|99|false')
    def test_06_rls_autre_compte_et_anon_refuses(self):
        self.write(1)
        self.assertIn('Not allowed',base.err(base.learner(base.U2,f"SELECT quiz_lyon_seuil('{base.A}')")) or '')
        self.assertEqual(call(base.A2,base.U2,'SELECT count(*) FROM quiz_lyon_cohortes'),'0')
        self.assertIn('permission denied',base.err(f"SET ROLE anon; SELECT quiz_lyon_seuil('{base.A}')") or '')
    def test_07_cohorte_immuable_et_source_99(self):
        self.write(1)
        self.assertIn('Cohorte immuable',base.err("UPDATE quiz_lyon_cohortes SET seuil=138") or '')
        self.assertIn('Cohorte immuable',base.err("DELETE FROM quiz_lyon_cohortes") or '')
        self.assertEqual(base.sql("SELECT jsonb_array_length(module_data->'exercices'->0->'questions') FROM module_editor_state WHERE module_id=8"),'99')
    def test_08_reconnexion_premiere_question_seuil_stable(self):
        self.write(1)
        self.assertEqual(self.seuil(),'138'); self.assertEqual(self.seuil(),'138')
        self.assertEqual(base.sql('SELECT count(*) FROM quiz_lyon_cohortes'),'1')
    def test_09_ecriture_directe_completion_refusee(self):
        self.write(99)
        self.assertIn('138 réponses exigées',base.err(base.learner(base.ADMIN,f"INSERT INTO apprenant_module_completion(apprenant_id,module_id,status,progress,completed_at) VALUES('{base.A}',8,'completed',100,now())")) or '')
        self.assertEqual(base.sql('SELECT count(*) FROM apprenant_module_completion'),'0')
    def test_10_jalon_deja_acquis_ne_rouvre_pas(self):
        base.sql(f"INSERT INTO reponses_apprenants_historique VALUES('{base.A}','{EX}')")
        call(base.A,base.ADMIN,"INSERT INTO apprenant_module_completion(apprenant_id,module_id,status,progress,completed_at) VALUES('AID',8,'completed',100,'2026-11-01')")
        before=base.sql('SELECT status||completed_at||coalesce(details::text,\'\') FROM apprenant_module_completion r')
        self.assertEqual(call(base.A,base.U,"SELECT status FROM save_module_completion('AID',8,false,1)"),'completed')
        self.assertEqual(before,base.sql('SELECT status||completed_at||coalesce(details::text,\'\') FROM apprenant_module_completion r'))

def main():
    funcs=base.live("SELECT string_agg(pg_get_functiondef(oid)||';', E'\n') FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('save_module_completion','autovalidate_module_if_complete','etat_completion_modules')")
    base.DEPS_SQL={fn:base.live(f"SELECT pg_get_functiondef(oid)||';' FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='{fn}'") for fn in base.DEPS}
    for fn in ['reponse_enregistree','fusion_details_progression']:
        base.DEPS.append(fn); base.DEPS_SQL[fn]=base.live(f"SELECT pg_get_functiondef(oid)||';' FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='{fn}'")
    schema=base.capture_live()
    subprocess.run(base.AS_USER+['initdb','-D',base.DATA,'-A','trust','--no-locale','-U','lovable'],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(base.AS_USER+['pg_ctl','-D',base.DATA,'-l',base.TEMP+'/pg.log','-o',f'-k {base.TEMP} -p {base.PORT} -h ""','-w','start'],check=True,stdout=subprocess.DEVNULL)
    try:
        base.build('template_lyon',schema)
        base.sql("ALTER TABLE reponses_apprenants ADD total_questions integer; CREATE TABLE reponses_apprenants_historique(apprenant_id uuid,exercice_id text); GRANT ALL ON reponses_apprenants TO authenticated; GRANT SELECT ON reponses_apprenants_historique TO authenticated; GRANT SELECT,UPDATE ON apprenants TO authenticated;",'template_lyon')
        base.sql(funcs,'template_lyon')
        base.sql(CANDIDATE.read_text(),'template_lyon')
        base.sql("INSERT INTO module_editor_state VALUES(8,jsonb_build_object('exercices',jsonb_build_array(jsonb_build_object('id',1785332774763,'questions',(SELECT jsonb_agg(jsonb_build_object('id',q)) FROM generate_series(1,99) q)))))",'template_lyon')
        if not unittest.TextTestRunner(verbosity=2,resultclass=SqlResult).run(unittest.defaultTestLoader.loadTestsFromTestCase(Lyon)).wasSuccessful(): raise SystemExit(1)
    finally: subprocess.run(base.AS_USER+['pg_ctl','-D',base.DATA,'-m','immediate','stop'],stdout=subprocess.DEVNULL)
if __name__=='__main__': main()
