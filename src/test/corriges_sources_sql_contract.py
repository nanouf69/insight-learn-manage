"""Read-only correction contract on disposable PostgreSQL; no production writes."""
import json, pathlib, sys, unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from core_correction_securite_contract import Pg, SCHEMA, ADMIN, ELEVE_UID, AUTRE_UID, APP, ATT, as_ctx
ROOT=pathlib.Path(__file__).resolve().parents[2]

class Sources(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg=Pg()
        cls.sql(SCHEMA)
        cls.sql("""ALTER TABLE exam_attempts_v2 ADD COLUMN exam_id text, ADD COLUMN etat text;
        CREATE TABLE exam_content_versions(id uuid,exam_id text,version_number int,published_at timestamptz,content jsonb,statut text,retired_at timestamptz,is_test boolean);
        CREATE TABLE apprenant_quiz_results(id uuid,apprenant_id uuid,quiz_id text,matiere_id text,details jsonb,quiz_type text,completed_at timestamptz);
        """)
        cls.sql((ROOT/'docs/sql-revue/2026-11-10-corriges-trois-surfaces.sql').read_text())
        q={'id':'francais:4','type':'QCM','enonce':'titiller','choix':[{'lettre':l,'texte':l,'correct':l=='C'} for l in ['A','B','C']]}
        cls.sql(f"UPDATE exam_attempts_v2 SET exam_id='EB3',etat='terminee',snapshot='{json.dumps({'matiere':'francais','questions':[q]})}' WHERE attempt_id='{ATT}';")
        current=json.loads(json.dumps(q));current['choix'][0]['correct']=True
        cls.sql(f"INSERT INTO exam_content_versions VALUES(gen_random_uuid(),'EB3',23,now(),'{json.dumps({'questions':[current]})}','publiee',NULL,false);")
        cls.sql(f"INSERT INTO apprenant_quiz_results VALUES('{ATT}','{APP}','EB3','francais','{json.dumps({'snapshot':{'questions':[{**q,'id':4}]}})}','examen_blanc',now());")
    @classmethod
    def sql(cls,q):
        c,o=cls.pg.sql(q)
        if c: raise AssertionError(o)
        return o
    @classmethod
    def tearDownClass(cls):cls.pg.stop()
    def read(self,uid=ELEVE_UID):
        return json.loads(self.sql(as_ctx('authenticated',{'sub':uid},f"SELECT corr iges_officiels_sources(ARRAY['{ATT}']::uuid[],ARRAY['{ATT}']::uuid[]);".replace('corr iges','corriges'))).splitlines()[-1])
    def test_owner_native_and_legacy(self):
        rows=self.read();self.assertEqual(len(rows),2)
        for r in rows:
            self.assertEqual(r['question_id'],'francais:4');self.assertEqual(r['statut'],'rapproche');self.assertEqual(r['version'],23)
            self.assertEqual([c['lettre'] for c in r['actuelle']['choix'] if c['correct']],['A','C'])
            self.assertEqual([c['lettre'] for c in r['historique']['choix'] if c['correct']],['C'])
    def test_other_owner(self):self.assertEqual(self.read(AUTRE_UID),[])
    def test_admin(self):self.assertEqual(len(self.read(ADMIN)),2)
    def test_ongoing_hidden(self):
        out=self.sql(f"BEGIN;UPDATE exam_attempts_v2 SET etat='en_cours';"+as_ctx('authenticated',{'sub':ELEVE_UID},f"SELECT corr iges_officiels_sources(ARRAY['{ATT}']::uuid[],ARRAY[]::uuid[]);".replace('corr iges','corriges'))+"ROLLBACK;")
        self.assertIn('[]',out.splitlines())
    def test_content_changed_refuses_match(self):
        out=self.sql("BEGIN;UPDATE exam_content_versions SET content=jsonb_set(content,'{questions,0,choix,0,texte}','\"other\"');"+as_ctx('authenticated',{'sub':ELEVE_UID},f"SELECT corr iges_officiels_sources(ARRAY['{ATT}']::uuid[],ARRAY[]::uuid[]);".replace('corr iges','corriges'))+"ROLLBACK;")
        self.assertIn('non_rapproche',out);self.assertIn('"actuelle": null',out)
    def test_anonymous_refused(self):
        c,_=self.pg.sql(as_ctx('anon',{'role':'anon'},"SELECT corriges_officiels_sources('{}','{}');"));self.assertNotEqual(c,0)
    def test_bound(self):
        c,_=self.pg.sql(as_ctx('authenticated',{'sub':ADMIN},f"SELECT corriges_officiels_sources(array_fill('{ATT}'::uuid,ARRAY[51]),'{{}}');"));self.assertNotEqual(c,0)

if __name__=='__main__':unittest.main(verbosity=2)