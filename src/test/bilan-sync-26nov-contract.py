"""Real SELECT-captured Bilan sync functions, fictitious questions, disposable PostgreSQL only."""
import importlib.util,json,pathlib,re,unittest,uuid
P=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location('core_six',P/'core-six-functions-contract.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Sync(base.Contract):
    @classmethod
    def setUpClass(c):
        super().setUpClass()
        c.sql("""CREATE TABLE module_editor_state(module_id int PRIMARY KEY,module_data jsonb,updated_at timestamptz);
CREATE TABLE bilan_sync_liens(id uuid PRIMARY KEY,matiere_key text,vtc_module_id int,taxi_module_id int,vtc_exercice_id int,taxi_exercice_id int,vtc_question_id int,taxi_question_id int,statut text,empreinte_vtc_ref text,empreinte_taxi_ref text);
CREATE TABLE bilan_sync_journal(lien_id uuid,evenement text,sens text,source_module_id int,cible_module_id int,question_id int,avant jsonb,apres jsonb,empreinte_avant text,empreinte_apres text,auteur uuid,motif text);
ALTER TABLE bilan_sync_journal ADD CHECK(sens IS NULL OR sens IN ('vtc_vers_taxi','taxi_vers_vtc'));
ALTER TABLE reponses_apprenants ADD id uuid DEFAULT gen_random_uuid() PRIMARY KEY,ADD tentative int,ADD submitted_at timestamptz,ADD score numeric,ADD write_seq bigint,ADD reponses jsonb;
CREATE TABLE bilan_505_remise_copies(row_id uuid PRIMARY KEY,apprenant_id uuid,tentative int,mode text,motif text);
CREATE FUNCTION jsonb_as_array(j jsonb) RETURNS jsonb LANGUAGE sql AS $$SELECT CASE WHEN jsonb_typeof(j)='array' THEN j ELSE '[]'::jsonb END$$;
""")
        captured=(P/'fixtures/bilan-sync-functions-20261126.sql').read_text()
        for name in ['bilan_sync_champs','bilan_sync_payload','bilan_sync_empreinte','bilan_sync_mapping','bilan_sync_enregistrer','bilan_sync_router_editeur']:
            definition=re.search(r'CREATE OR REPLACE FUNCTION public\.'+name+r'\([\s\S]*?\$function\$;',captured)
            if not definition: raise AssertionError('missing '+name)
            c.sql(definition.group())
        c.sql('GRANT SELECT ON module_editor_state,bilan_sync_liens,bilan_sync_journal TO authenticated;')
    def seed(self):
        self.sql('TRUNCATE module_editor_state,bilan_sync_liens,bilan_sync_journal;') # disposable fixtures only
        q={'id':1,'enonce':'QUESTION FICTIVE PARTAGÉE','choix':[{'lettre':'A','texte':'oui','correct':True},{'lettre':'B','texte':'non','correct':False}]}
        for module,ex in [(5,500),(11,600)]:
            d={'exercices':[{'id':ex,'questions':[q,{'id':2,'enonce':'DISTINCT TAXI' if module==11 else 'DISTINCT VTC'}]}]}
            self.sql(f"INSERT INTO module_editor_state VALUES({module},'{json.dumps(d)}','2026-01-01')")
        link=str(uuid.uuid4())
        self.sql(f"INSERT INTO bilan_sync_liens SELECT '{link}','bilan_t3p',5,11,500,600,1,1,'liee',bilan_sync_empreinte('{json.dumps(q)}'),bilan_sync_empreinte('{json.dumps(q)}')")
        return link,q
    def test_07_shared_key_updates_exact_pair_without_touching_other_question(self):
        link,q=self.seed();original=self.sql("SELECT string_agg((module_data#>'{exercices,0,questions,1}')::text,'|' ORDER BY module_id) FROM module_editor_state").stdout
        q['choix'][0]['correct']=False;q['choix'][1]['correct']=True
        out=self.call('authenticated',base.ADMIN,f"SELECT bilan_sync_enregistrer('{link}','vtc','{json.dumps(q)}',(SELECT empreinte_vtc_ref FROM bilan_sync_liens WHERE id='{link}'),'fictif');SELECT count(*) FROM bilan_sync_journal",True)
        self.assertIn('synchronise',out)
        # Committed isolated invocation, so assertions examine persisted synthetic data.
        self.sql(f"SET request.jwt.claim.sub='{base.ADMIN}';SELECT bilan_sync_enregistrer('{link}','vtc','{json.dumps(q)}',(SELECT empreinte_vtc_ref FROM bilan_sync_liens WHERE id='{link}'),'fictif');")
        self.assertEqual(self.sql("SELECT count(DISTINCT bilan_sync_payload(module_data#>'{exercices,0,questions,0}')) FROM module_editor_state").stdout.strip(),'1')
        self.assertEqual(self.sql("SELECT string_agg((module_data#>'{exercices,0,questions,1}')::text,'|' ORDER BY module_id) FROM module_editor_state").stdout,original)
        self.assertEqual(self.sql('SELECT count(*) FROM bilan_sync_journal').stdout.strip(),'1')
    def test_08_pending_link_and_stale_reference_do_not_propagate(self):
        link,q=self.seed();q['enonce']='FICTIF MODIFIE'
        self.sql(f"UPDATE bilan_sync_liens SET statut='en_attente' WHERE id='{link}'")
        r=self.sql(f"SELECT bilan_sync_enregistrer('{link}','vtc','{json.dumps(q)}','faux','fictif')",False)
        self.assertNotEqual(r.returncode,0);self.assertIn('LIEN_NON_ACTIF',r.stderr)
        self.sql(f"UPDATE bilan_sync_liens SET statut='liee' WHERE id='{link}'")
        r=self.sql(f"SELECT bilan_sync_enregistrer('{link}','vtc','{json.dumps(q)}','faux','fictif')",False)
        self.assertNotEqual(r.returncode,0);self.assertIn('VERSION_PERIMEE',r.stderr)
        self.assertEqual(self.sql('SELECT count(*) FROM bilan_sync_journal').stdout.strip(),'0')
    def test_09_reference_candidate_idempotent_and_refuses_content_drift(self):
        self.seed()
        self.sql('TRUNCATE bilan_sync_liens,bilan_sync_journal;')
        script=(P.parents[1]/'docs/sql-revue/2026-11-26-references-bilan.sql').read_text()
        tuples=re.findall(r"\('([0-9a-f-]{36})'::uuid,'([0-9a-f]{32})','([0-9a-f]{32})'\)",script)
        self.assertEqual(len(tuples),2)
        questions=[{'id':5,'enonce':'REFERENCE FICTIVE A'},{'id':85,'enonce':'REFERENCE FICTIVE B'}]
        for module,ex in [(5,503),(11,603)]:
            data=json.dumps({'exercices':[{'id':ex,'questions':questions}]})
            self.sql(f"UPDATE module_editor_state SET module_data='{data}' WHERE module_id={module}")
        for (lid,old,new),q in zip(tuples,questions):
            actual=self.sql(f"SELECT bilan_sync_empreinte('{json.dumps(q)}')").stdout.strip()
            # Only expected-content hashes are replaced for fictional fixtures; SQL logic remains exact.
            script=script.replace(new,actual)
            self.sql(f"INSERT INTO bilan_sync_liens VALUES('{lid}','bilan_francais',5,11,503,603,{q['id']},{q['id']},'liee','{old}','{old}')")
        before=self.sql('SELECT jsonb_agg(to_jsonb(m) ORDER BY module_id) FROM module_editor_state m').stdout
        self.sql(script);self.sql(script)
        self.assertEqual(self.sql('SELECT count(*) FROM bilan_sync_journal').stdout.strip(),'2')
        self.assertEqual(self.sql('SELECT jsonb_agg(to_jsonb(m) ORDER BY module_id) FROM module_editor_state m').stdout,before)
        self.sql("UPDATE module_editor_state SET module_data=jsonb_set(module_data,'{exercices,0,questions,1,enonce}','\"DIVERGENCE FICTIVE\"') WHERE module_id=11")
        refused=self.sql(script,False)
        self.assertNotEqual(refused.returncode,0);self.assertIn('CONTENU_CHANGE',refused.stderr)
        self.assertEqual(self.sql('SELECT count(*) FROM bilan_sync_journal').stdout.strip(),'2')
    def test_10_lot505_candidate_preserves_all_rows_and_aborts_on_late_seq_drift(self):
        self.sql('TRUNCATE reponses_apprenants,bilan_505_remise_copies;')
        script=(P.parents[1]/'docs/sql-revue/2026-11-26-lot-505.sql').read_text()
        rows=re.findall(r"\('([0-9a-f-]{36})'::uuid,'([0-9a-f-]{36})'::uuid,(\d+),'([0-9a-f]{32})','(remise|recuperation)'",script)
        self.assertEqual(len(rows),4)
        for rid,aid,seq,old,mode in rows:
            data=json.dumps({'fictif':['A']})
            actual=self.sql(f"SELECT md5('{data}'::jsonb::text)").stdout.strip();script=script.replace(old,actual)
            self.sql(f"INSERT INTO reponses_apprenants(id,apprenant_id,exercice_id,tentative,status,submitted_at,completed,score,write_seq,reponses) VALUES('{rid}','{aid}','module_5_exo_505',1,'in_progress',NULL,false,NULL,{seq},'{data}')")
        before=self.sql('SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM reponses_apprenants r').stdout
        self.sql(script);self.sql(script)
        self.assertEqual(self.sql('SELECT count(*) FROM bilan_505_remise_copies').stdout.strip(),'4')
        self.assertEqual(self.sql("SELECT count(*) FROM bilan_505_remise_copies WHERE mode='recuperation'").stdout.strip(),'2')
        self.assertEqual(self.sql('SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM reponses_apprenants r').stdout,before)
        self.sql(f"TRUNCATE bilan_505_remise_copies;UPDATE reponses_apprenants SET write_seq=write_seq+1 WHERE id='{rows[-1][0]}'")
        refused=self.sql(script,False)
        self.assertNotEqual(refused.returncode,0);self.assertIn('LOT_505_CHANGE',refused.stderr)
        self.assertEqual(self.sql('SELECT count(*) FROM bilan_505_remise_copies').stdout.strip(),'0')
if __name__=='__main__':unittest.main(verbosity=2)
