"""Real current Bilan link/journal constraints and immutable guards; fictional questions only."""
import importlib.util,json,pathlib,re,unittest,uuid
P=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location('six',P/'core-six-functions-contract.py')
six=importlib.util.module_from_spec(spec);spec.loader.exec_module(six)

class SyncCatalogue(unittest.TestCase):
 @classmethod
 def sql(c,s,ok=True):return six.Contract.sql.__func__(c,s,ok)
 @classmethod
 def setUpClass(c):
  six.Contract.setUpClass.__func__(c)
  catalog=json.loads((P/'fixtures/sauvegarde-catalogue-20261126.json').read_text())
  table=next(t for t in catalog['tables'] if t['name']=='module_editor_state')
  c.sql('CREATE TABLE module_editor_state('+','.join('"'+x['name']+'" '+x['type']+(' NOT NULL' if x['not_null'] else '') for x in table['columns'])+','+table['primary_key']+');')
  c.sql('CREATE UNIQUE INDEX ON module_editor_state(module_id);')
  c.sql((P/'fixtures/bilan-sync-schema-20261126.sql').read_text())
  c.sql("CREATE FUNCTION jsonb_as_array(j jsonb) RETURNS jsonb LANGUAGE sql AS $$SELECT CASE WHEN jsonb_typeof(j)='array' THEN j ELSE '[]'::jsonb END$$;")
  captured=(P/'fixtures/bilan-sync-functions-20261126.sql').read_text()
  for name in ['bilan_sync_champs','bilan_sync_payload','bilan_sync_empreinte','bilan_sync_mapping','bilan_sync_enregistrer','bilan_sync_router_editeur']:
   m=re.search(r'CREATE OR REPLACE FUNCTION public\.'+name+r'\([\s\S]*?\$function\$;',captured)
   if not m:raise AssertionError(name)
   c.sql(m.group())
  c.script=(P.parents[1]/'docs/sql-revue/2026-11-26-references-bilan.sql').read_text()
  tuples=re.findall(r"\('([0-9a-f-]{36})'::uuid,'([0-9a-f]{32})','([0-9a-f]{32})'\)",c.script)
  c.questions=[{'id':5,'enonce':'FICTIF A','choix':[{'lettre':'A','correct':True},{'lettre':'B','correct':False}]},{'id':85,'enonce':'FICTIF B'}]
  for module,ex in [(5,503),(11,603)]:
   record={x['name']:None for x in table['columns']}
   record.update(id=str(uuid.uuid4()),module_id=module,module_data={'exercices':[{'id':ex,'questions':c.questions}]},deleted_cours=[],deleted_exercices=[],created_at='2026-01-01T00:00:00Z',updated_at='2026-01-01T00:00:00Z')
   for column in table['columns']:
    if column['not_null'] and record[column['name']] is None:raise AssertionError('unseeded '+column['name'])
   raw=json.dumps([record]).replace("'","''")
   c.sql(f"INSERT INTO module_editor_state SELECT * FROM jsonb_populate_recordset(NULL::module_editor_state,'{raw}'::jsonb)")
  for (lid,old,new),q in zip(tuples,c.questions):
   actual=c.sql(f"SELECT bilan_sync_empreinte('{json.dumps(q)}')").stdout.strip()
   c.script=c.script.replace(new,actual)
   c.sql(f"INSERT INTO bilan_sync_liens(id,matiere_key,vtc_exercice_id,vtc_question_id,taxi_exercice_id,taxi_question_id,statut,empreinte_vtc_ref,empreinte_taxi_ref) VALUES('{lid}','bilan_francais',503,{q['id']},603,{q['id']},'liee','{old}','{old}')")
  c.link=tuples[0][0]
  c.sql(f"INSERT INTO bilan_sync_journal(lien_id,evenement,motif) VALUES('{c.link}','preuve_FICTIVE_preexistante','ne pas modifier')")
 def test_01_candidate_repairs_only_references_and_preserves_journal_and_identities(self):
  module_hash=lambda:self.sql('SELECT md5(jsonb_agg(to_jsonb(m) ORDER BY module_id)::text) FROM module_editor_state m').stdout
  identity_hash=lambda:self.sql("SELECT md5(jsonb_agg(to_jsonb(l)-'empreinte_vtc_ref'-'empreinte_taxi_ref'-'updated_at' ORDER BY id)::text) FROM bilan_sync_liens l").stdout
  before=module_hash();ids=identity_hash()
  original=self.sql("SELECT to_jsonb(j) FROM bilan_sync_journal j WHERE evenement='preuve_FICTIVE_preexistante'").stdout
  self.sql(self.script);self.sql(self.script)
  self.assertEqual(module_hash(),before);self.assertEqual(identity_hash(),ids)
  self.assertEqual(self.sql('SELECT count(*) FROM bilan_sync_journal').stdout.strip(),'3')
  self.assertEqual(self.sql("SELECT to_jsonb(j) FROM bilan_sync_journal j WHERE evenement='preuve_FICTIVE_preexistante'").stdout,original)
 def test_02_identity_and_append_only_protections_remain_active(self):
  for statement,code in [(f"UPDATE bilan_sync_liens SET vtc_question_id=86 WHERE id='{self.link}'",'IDENTITE_IMMUABLE'),('UPDATE bilan_sync_journal SET motif=\'EFFACE FICTIF\'','APPEND_ONLY')]:
   r=self.sql(statement,False);self.assertNotEqual(r.returncode,0);self.assertIn(code,r.stderr)
 def test_03_native_sync_keeps_pair_ids_and_refuses_wrong_question(self):
  q={**self.questions[0],'choix':[{'lettre':'A','correct':False},{'lettre':'B','correct':True}]}
  raw=json.dumps(q)
  self.sql(f"SELECT bilan_sync_enregistrer('{self.link}','vtc','{raw}',(SELECT empreinte_vtc_ref FROM bilan_sync_liens WHERE id='{self.link}'),'FICTIF')")
  self.assertEqual(self.sql("SELECT count(DISTINCT bilan_sync_payload(module_data#>'{exercices,0,questions,0}')) FROM module_editor_state").stdout.strip(),'1')
  self.assertEqual(self.sql('SELECT count(*) FROM bilan_sync_journal').stdout.strip(),'4')
  bad=json.dumps({**q,'id':86})
  r=self.sql(f"SELECT bilan_sync_enregistrer('{self.link}','vtc','{bad}',(SELECT empreinte_vtc_ref FROM bilan_sync_liens WHERE id='{self.link}'),'FICTIF')",False)
  self.assertNotEqual(r.returncode,0);self.assertIn('QUESTION_DIFFERENTE',r.stderr)
  self.assertEqual(self.sql('SELECT count(*) FROM bilan_sync_journal').stdout.strip(),'4')

if __name__=='__main__':unittest.main(verbosity=2)