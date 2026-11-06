"""Contrat du candidat snapshots/édition : PostgreSQL jetable, aucune donnée Cloud."""
import os, shutil, subprocess, tempfile, unittest
from pathlib import Path

ADMIN = "11111111-1111-1111-1111-111111111111"
ATTEMPT = "22222222-2222-2222-2222-222222222222"
AS = ["setpriv", "--reuid=1000", "--regid=1000", "--clear-groups"]
PORT = "55480"

class ExamSnapshotEditorContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = tempfile.mkdtemp(dir="/tmp")
        os.chown(cls.d, 1000, 1000)
        cls.addClassCleanup(cls.tearDownClass)
        cls.env = {k:v for k,v in os.environ.items() if not k.startswith("PG")}
        subprocess.run(AS+["initdb","-D",cls.d+"/db","-U","postgres","-A","trust","--no-locale","--encoding=UTF8"],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=cls.env)
        subprocess.run(AS+["pg_ctl","-D",cls.d+"/db","-l",cls.d+"/log","-o",f"-k {cls.d} -p {PORT} -h \"\"","-w","start"],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=cls.env)
        cls.sql(f"""
        CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '{ADMIN}'::uuid $$;
        CREATE TABLE exam_content_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),filiere text,exam_numero text,module_id integer,exam_id text,version_number integer,statut text,content jsonb,fingerprint text,motif text,created_by uuid,created_email text,published_by uuid,published_email text,published_at timestamptz,retired_at timestamptz,is_test boolean);
        CREATE TABLE core_operations(operation_id uuid PRIMARY KEY,operation_type text,auteur uuid,cible jsonb,resultat jsonb);
        CREATE TABLE audit_journal(operation text,cible_type text,cible_id text,exam_id text,exam_version_id uuid,auteur uuid,apres jsonb,origine text);
        CREATE TABLE exam_attempts_v2(attempt_id uuid PRIMARY KEY,apprenant_id uuid,exam_id text,snapshot jsonb,etat text);
        CREATE TABLE qrc_instances_v2(qrc_instance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attempt_id uuid,question_id text);
        CREATE TABLE core_exam_results(result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attempt_id uuid,score numeric);
        CREATE FUNCTION has_role(uid uuid,role text) RETURNS boolean LANGUAGE sql AS $$ SELECT uid='{ADMIN}' AND role='admin' $$;
        CREATE FUNCTION core_operation_replay(op uuid,typ text) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('resultat',o.resultat) FROM core_operations o WHERE o.operation_id=op AND o.operation_type=typ $$;
        """)
        cls.sql(Path("docs/candidates/exam_snapshot_editor_hardening.sql").read_text())

    @classmethod
    def tearDownClass(cls):
        if not os.path.exists(cls.d): return
        subprocess.run(AS+["pg_ctl","-D",cls.d+"/db","-m","immediate","stop"],capture_output=True,env=cls.env)
        shutil.rmtree(cls.d)

    @classmethod
    def sql(cls,query,check=True):
        r=subprocess.run(["psql","-X","-At","-h",cls.d,"-p",PORT,"-U","postgres","-v","ON_ERROR_STOP=1","-c",query],capture_output=True,text=True,env=cls.env)
        if check and r.returncode: raise RuntimeError(r.stderr)
        return r

    def setUp(self):
        self.sql("TRUNCATE exam_content_versions,core_operations,audit_journal,exam_attempts_v2,qrc_instances_v2,core_exam_results")

    def content(self,questions=None,points=1,correct=True,qrc="Corrigé"):
        if questions is None:
            questions=[{"id":"gestion:1","matiere":"gestion","type":"QCM","enonce":"Q1","points":points,"choix":[{"lettre":"A","texte":"A","correct":correct}]},{"id":"gestion:2","matiere":"gestion","type":"QRC","enonce":"Q2","points":2,"reponseQRC":qrc}]
        import json
        return json.dumps({"matieres":[{"subject_id":"gestion","titre":"Gestion","duree":30,"coefficient":2,"note_sur":20,"note_eliminatoire":6}],"questions":questions})

    def publish(self,op,content):
        return self.sql(f"SELECT id FROM core_publish_version_contenu('{op}','VTC','1',90000,'EB-TEST','{content}'::jsonb,'admin@example.test',true)",check=False)

    def test_publication_complete_et_versions_successives(self):
        self.assertEqual(self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",self.content()).returncode,0)
        changed=self.content(qrc="Corrigé V2")
        self.assertEqual(self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",changed).returncode,0)
        self.assertEqual(self.sql("SELECT count(*) FROM exam_content_versions WHERE statut='publiee'").stdout.strip(),"1")
        self.assertEqual(self.sql("SELECT count(*) FROM exam_content_versions WHERE statut='retiree'").stdout.strip(),"1")

    def test_cle_qcm_ou_corrige_qrc_absent_refuse(self):
        self.assertIn("clé QCM absente",self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",self.content(correct=False)).stderr)
        self.assertIn("corrigé QRC absent",self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",self.content(qrc="")).stderr)

    def test_version_retiree_immuable(self):
        self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",self.content())
        self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",self.content(qrc="V2"))
        refused=self.sql("UPDATE exam_content_versions SET content='{}' WHERE statut='retiree'",check=False)
        self.assertNotEqual(refused.returncode,0)
        self.assertIn("EXAM_VERSION_IMMUTABLE",refused.stderr)

    def test_id_disparu_non_reutilisable(self):
        self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",self.content())
        only_qrc=[{"id":"gestion:2","matiere":"gestion","type":"QRC","enonce":"Q2","points":2,"reponseQRC":"Corrigé"}]
        self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",self.content(only_qrc))
        reused=[{"id":"gestion:1","matiere":"gestion","type":"QCM","enonce":"Autre question","points":1,"choix":[{"lettre":"A","texte":"A","correct":True}]},*only_qrc]
        refused=self.publish("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",self.content(reused))
        self.assertIn("QUESTION_ID_REUTILISE",refused.stderr)

    def test_question_hors_tableau_snapshot_refusee(self):
        result=self.sql("SELECT core_snapshot_has_question('{\"questions\":[],\"matieres\":[{\"id\":\"gestion:9\"}]}','gestion:9')")
        self.assertEqual(result.stdout.strip(),"f")

    def test_resultat_snapshot_incomplet_refuse(self):
        self.sql(f"INSERT INTO exam_attempts_v2 VALUES('{ATTEMPT}',null,'EB-TEST','{{\"questions\":[{{\"id\":\"gestion:1\",\"type\":\"QCM\",\"enonce\":\"Q1\",\"points\":null}}]}}','en_cours')")
        refused=self.sql(f"INSERT INTO core_exam_results(attempt_id) VALUES('{ATTEMPT}')",check=False)
        self.assertIn("SNAPSHOT_A_REVOIR",refused.stderr)

    def test_cloture_exige_toutes_et_seules_qrc_figees(self):
        snapshot='{"questions":[{"id":"gestion:2","type":"QRC","enonce":"Q2","points":2}]}'
        self.sql(f"INSERT INTO exam_attempts_v2 VALUES('{ATTEMPT}',null,'EB-TEST','{snapshot}','en_cours')")
        refused=self.sql(f"UPDATE exam_attempts_v2 SET etat='terminee' WHERE attempt_id='{ATTEMPT}'",check=False)
        self.assertIn("QRC_SNAPSHOT_INCOMPLET",refused.stderr)
        self.sql(f"INSERT INTO qrc_instances_v2(attempt_id,question_id) VALUES('{ATTEMPT}','gestion:2')")
        self.sql(f"UPDATE exam_attempts_v2 SET etat='terminee' WHERE attempt_id='{ATTEMPT}'")
        self.assertEqual(self.sql(f"SELECT etat FROM exam_attempts_v2 WHERE attempt_id='{ATTEMPT}'").stdout.strip(),"terminee")

if __name__ == "__main__": unittest.main(verbosity=2)
