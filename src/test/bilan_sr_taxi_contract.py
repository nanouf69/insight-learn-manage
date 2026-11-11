"""Real disposable PostgreSQL: only fictional learners and fictional 255-question banks."""
import json, pathlib, unittest
from bilan_t3p_gestion_alignment_contract import Pg
ROOT=pathlib.Path(__file__).resolve().parents[2]
F=json.loads((ROOT/'src/test/fixtures/bilan-sr-functions-20261111.json').read_text())
PATCH=(ROOT/'docs/sql-revue/2026-11-11-bilan-sr-taxi.sql').read_text()
L=lambda x:"'"+json.dumps(x).replace("'","''")+"'::jsonb"
class Contract(unittest.TestCase):
 def test_scope_freeze_projection_and_rights(self):
  p=Pg(55469)
  try:
   p.sql("""CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
    CREATE TABLE module_editor_state(module_id int primary key,module_data jsonb);
    CREATE TABLE bilan_question_identites(module_id int,exercice_id int,numero_technique text,uid uuid,litigieux bool);
   """)
   prototype=(ROOT/'src/test/fixtures/bilan-future-isolated-prototype.sql').read_text()
   # Only the tested receipt/version transport; unrelated grant/legacy helpers are not installed.
   p.sql(prototype[:prototype.index('-- Proof that a learner has NO legacy trace')])
   p.sql("CREATE TABLE bilan_future_common_releases(subject int,version_id uuid,activated_at timestamptz,id uuid); CREATE TABLE bilan_future_french_releases(version_id uuid,activated_at timestamptz);")
   for k in ['bilan_alignment_canonical','bilan_alignment_future','bilan_future_open','bilan_future_questions','bilan_future_resume','bilan_future_correction']: p.sql(F[k]+';')
   source=[{'id':i,'type':'QCM','enonce':f'Fiction {i}','image':'/cours/exercices/securite/image1.png' if i%2 else None,'imageSize':'sm','choix':[{'lettre':'A','texte':'Oui','correct':True},{'lettre':'B','texte':'Non'}]} for i in range(1,256)]
   old=[{**q,'uid':f'00000000-0000-4000-8000-{q["id"]:012}'} for q in source[:252]]
   # Reserved historical identity must not be reused.
   p.sql("INSERT INTO bilan_question_identites VALUES(11,602,'300','ffffffff-ffff-4000-8000-000000000300',true);")
   for q in old: p.sql(f"INSERT INTO bilan_question_identites VALUES(11,602,'{q['id']}','{q['uid']}',false);")
   se={'id':502,'questions':source}; te={'id':602,'questions':old}
   p.sql(f"INSERT INTO module_editor_state VALUES(5,{L({'exercices':[se]})}),(11,{L({'exercices':[te]})});")
   target=[dict(q) for q in source]; target[252]['id']=301;target[253]['id']=302;target[254]['id']=303
   mapping=[{'position':i+1,'source_id':q['id'],'target_id':target[i]['id']} for i,q in enumerate(source)]
   oldid=p.sql(f"INSERT INTO bilan_future_versions(subject,questions,fingerprint) VALUES(2,{L(source[:249])},md5({L(source[:249])}::text)) RETURNING id")
   newid=p.sql(f"INSERT INTO bilan_future_versions(subject,questions,fingerprint) VALUES(2,{L(target)},md5({L(target)}::text)) RETURNING id")
   owners=[f'00000000-0000-4000-8000-{i:012}' for i in range(1,6)]
   for o in owners: p.sql(f"INSERT INTO bilan_future_eligibility(owner_id,module_id,exercise_id,version_id) VALUES('{o}',11,602,'{oldid}'),('{o}',5,502,'{oldid}'),('{o}',11,601,'{oldid}');")
   rid=p.sql(f"SET test.uid='{owners[0]}'; SELECT bilan_future_open(11,602)->>'id'")
   p.sql(f"SET test.uid='{owners[0]}'; SELECT bilan_future_save_draft('{rid}','{oldid}',1,1,'[\"A\"]','aaaaaaaa-aaaa-4000-8000-000000000001')")
   before=p.sql("SELECT md5(jsonb_agg(to_jsonb(m) ORDER BY module_id)::text) FROM module_editor_state m")
   p.sql(PATCH)
   insert=f"INSERT INTO bilan_sr_taxi_releases(operation,version_id,source_fingerprint,target_fingerprint,previous_value,mapping) VALUES('bilan_sr_taxi_20261111','{newid}',md5({L(se)}::text),md5({L(te)}::text),{L(te)},{L(mapping)})"
   self.assertIn('stale_source_or_target',p.sql(insert.replace('md5('+L(se)+'::text)',"'stale'"),False))
   p.sql(insert)
   self.assertEqual(before,p.sql("SELECT md5(jsonb_agg(to_jsonb(m) ORDER BY module_id)::text) FROM module_editor_state m"))
   self.assertEqual(p.sql(f"SET test.uid='{owners[0]}'; SELECT bilan_future_open(11,602)->>'version_id'"),oldid)
   self.assertEqual(p.sql(f"SET test.uid='{owners[1]}'; SET ROLE authenticated; SELECT bilan_future_open(11,602)->>'version_id'"),newid)
   self.assertEqual(p.sql(f"SET test.uid='{owners[2]}'; SET ROLE authenticated; SELECT bilan_future_open(5,502)->>'version_id'"),oldid)
   nr=p.sql(f"SET test.uid='{owners[1]}'; SELECT bilan_future_open(11,602)->>'id'")
   projection=json.loads(p.sql(f"SET test.uid='{owners[1]}'; SELECT bilan_future_questions('{nr}')"))
   self.assertEqual(len(projection['questions']),255)
   self.assertEqual([x['id'] for x in projection['questions']],[x['id'] for x in target])
   self.assertNotIn('correct',json.dumps(projection))
   for a,b in zip(source,projection['questions']): self.assertEqual(a.get('image'),b.get('image'));self.assertEqual(a.get('imageSize'),b.get('imageSize'))
   self.assertIn('permission denied',p.sql("SET ROLE authenticated; INSERT INTO bilan_sr_taxi_releases(operation) VALUES('x')",False))
   self.assertIn('immutable',p.sql("UPDATE bilan_sr_taxi_releases SET operation='x'",False))
   self.assertEqual(p.sql(f"SET test.uid='{owners[0]}'; SELECT bilan_future_resume('{rid}')->'answers'->'1'->'answer'"),'["A"]')
   self.assertEqual(p.sql(f"SET test.uid='{owners[1]}'; SELECT bilan_future_open(11,602)->>'id'"),nr)
   self.assertEqual(p.sql("SELECT count(*) FROM bilan_sr_taxi_releases"),'1')
   print('PASS: 255 ordered positions/images, no keys leaked, source/legacy unchanged, old draft/readback unchanged, scoped TAXI release, rights, stale refusal, immutable history, replay')
  finally: p.stop()
if __name__=='__main__': unittest.main()
