"""Disposable PostgreSQL contract for docs/sql-revue/2026-11-13-presence-lot-operationnel.sql.
Mirrors a real evening case with fictitious IDs only: 17/09 soir_1 signed, soir_2 blank image; 18/09 both blank."""
import unittest,subprocess,tempfile,os,shutil,uuid,json,threading
from pathlib import Path
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
A='11111111-1111-1111-1111-111111111111'; U='22222222-2222-2222-2222-222222222222'; ADMIN='33333333-3333-3333-3333-333333333333'
V18='44444444-4444-4444-4444-444444444444'; V17='55555555-5555-5555-5555-555555555555'; INS='66666666-6666-6666-6666-666666666666'; S='77777777-7777-7777-7777-777777777777'; F='88888888-8888-8888-8888-888888888888'
BLANK='data:image/png;base64,'+'A'*(4642-22-48)+'/6n6jacAAAAGSURBVAMAsfYBgSFBzwQAAAAASUVORK5CYII='
REAL='data:image/png;base64,iVBORw0KGgoREALSIGNATURE'
class Lot(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  assert len(BLANK)==4642
  c.d=tempfile.mkdtemp(prefix='presence-lot-',dir='/tmp');os.chown(c.d,1000,1000);c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')};c.addClassCleanup(c.cleanup)
  subprocess.run(AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],env=c.env,check=True,capture_output=True)
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55491 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
  c.sql(f"""CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA storage;
  CREATE PUBLICATION supabase_realtime;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  GRANT USAGE ON SCHEMA auth,storage,public TO authenticated,anon;
  CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql AS $$SELECT u='{ADMIN}'::uuid AND r='admin'$$;
  CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb);
  CREATE FUNCTION storage.extension(n text) RETURNS text LANGUAGE sql AS $$SELECT reverse(split_part(reverse(n),'.',1))$$;
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT ON storage.objects TO authenticated;
  CREATE TABLE presentiel_heures_validees(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),apprenant_id uuid NOT NULL,heures numeric NOT NULL,motif text,created_by uuid,created_at timestamptz NOT NULL DEFAULT now(),date_presence date,categorie text);
  GRANT SELECT ON presentiel_heures_validees TO authenticated;
  CREATE TABLE edof_fin_formation(apprenant_id uuid);CREATE TABLE releve_jalons_fin_acces(apprenant_id uuid);CREATE TABLE releve_jalons_gels(apprenant_id uuid);
  CREATE TABLE formateurs(id uuid PRIMARY KEY); INSERT INTO formateurs VALUES('{F}');
  CREATE TABLE session_apprenants(id uuid,apprenant_id uuid,session_id uuid,liste_attente boolean,emargements_exclus boolean,statut_suivi text);
  INSERT INTO session_apprenants VALUES('{INS}','{A}','{S}',false,false,'inscription_validee');
  CREATE TABLE plan(apprenant uuid,session uuid,date_cours date,creneau text,debut time,fin time);
  INSERT INTO plan VALUES('{A}','{S}','2026-09-17','soir_1','17:00','18:30'),('{A}','{S}','2026-09-17','soir_2','18:30','21:00'),('{A}','{S}','2026-09-18','soir_1','17:00','18:30'),('{A}','{S}','2026-09-18','soir_2','18:30','21:00');
  CREATE FUNCTION emargement_theorie_inscrite(p uuid,s uuid) RETURNS TABLE(date_cours date,creneau text,debut time,fin time,pratique boolean) LANGUAGE sql AS $$SELECT date_cours,creneau,debut,fin,false FROM plan WHERE apprenant=p AND (s IS NULL OR session=s)$$;
  REVOKE ALL ON FUNCTION emargement_theorie_inscrite(uuid,uuid) FROM PUBLIC;
  CREATE TABLE emargements_fc(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,date_emargement date,demi_journee text,signature_data_url text,absent boolean DEFAULT false,masque boolean DEFAULT false);
  INSERT INTO emargements_fc(apprenant_id,date_emargement,demi_journee,signature_data_url) VALUES('{A}','2026-09-17','soir_1','{REAL}'),('{A}','2026-09-17','soir_2','{BLANK}'),('{A}','2026-09-18','soir_1','{BLANK}'),('{A}','2026-09-18','soir_2','{BLANK}');
  CREATE TABLE fc_signatures_papier(apprenant_id uuid,date_presence date,creneau text);
  CREATE FUNCTION releve_sources_apprenant(_id uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('heures_validees', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'heures', heures)) FROM public.presentiel_heures_validees WHERE apprenant_id = _id), '[]'::jsonb)) $$;
  INSERT INTO presentiel_heures_validees(id,apprenant_id,heures,motif,date_presence,categorie) VALUES('{V18}','{A}',4.00,'cours','2026-09-18','theorie'),('{V17}','{A}',1.50,'cours','2026-09-17','theorie');
  CREATE TABLE notes(id uuid,note numeric); INSERT INTO notes VALUES('{V18}',12);""")
  c.sql(Path('docs/sql-revue/2026-11-13-presence-lot-operationnel.sql').read_text())
 @classmethod
 def sql(c,q,check=True):
  r=subprocess.run(['psql','-X','-At','-h',c.d,'-p','55491','-U','postgres','-v','ON_ERROR_STOP=1'],input=q,env=c.env,text=True,capture_output=True)
  if check and r.returncode:raise RuntimeError(r.stderr)
  return r
 @classmethod
 def cleanup(c):
  if hasattr(c,'d'):
   subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True);shutil.rmtree(c.d,ignore_errors=True)
 def as_(self,q,uid=ADMIN,check=False):
  return self.sql(f"SET ROLE authenticated;SET request.jwt.claim.sub='{uid}';{q}",check)
 def upload(self,op,uid=ADMIN,size=1000,mime='application/pdf'):
  return self.as_(f"INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES('presentiel-justificatifs','{A}/{op}.pdf','{uid}','{{\"size\":{size},\"mimetype\":\"{mime}\"}}')",uid)
 def valider(self,op,date='2026-09-17',creneau='soir_2',debut='18:30',fin='21:00',remplace='{}',uid=ADMIN):
  return self.as_(f"SELECT presentiel_valider_creneau('{op}','{A}','{INS}','{S}','{date}','{creneau}','{debut}','{fin}','{F}',NULL,'feuille',NULL,'{A}/{op}.pdf','{remplace}',true)",uid)
 def total(self,date):
  return self.as_(f"SELECT coalesce(sum(heures),0) FROM presentiel_validations_effectives('{A}') WHERE date_presence='{date}'",check=True).stdout.splitlines()[-1]
 def decider(self,op,vid,version,action,motif='Restauration demandée'):
  return self.as_(f"SELECT row_to_json(r) FROM presentiel_decider_validation('{op}','{A}','{vid}',{version},'{action}','{motif}') r")
 def test_parcours(self):
  originals=self.sql(f"SELECT md5(string_agg(v::text,'|' order by id)) FROM presentiel_heures_validees v").stdout
  autres=self.sql("SELECT md5(string_agg(e::text,'|' order by id)) FROM emargements_fc e;SELECT row_to_json(n) FROM notes n").stdout
  op=str(uuid.uuid4())
  # Upload policy: admin PDF only.
  self.assertNotEqual(self.upload(op,uid=U).returncode,0)
  self.assertNotEqual(self.as_(f"INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('presentiel-justificatifs','{A}/{op}.exe','{ADMIN}')").returncode,0)
  self.assertNotEqual(self.valider(op).returncode,0,'no PDF -> refused')
  self.assertEqual(self.upload(op).returncode,0)
  self.assertNotEqual(self.valider(op,uid=U).returncode,0,'non admin refused')
  r=self.valider(op); self.assertNotEqual(r.returncode,0); self.assertIn('plus que les 240 min',r.stderr)
  self.assertIn('90 min signées + 90 min déjà validées + 150 min',r.stderr)
  self.assertNotEqual(self.valider(op,creneau='soir_1',debut='17:00',fin='18:30').returncode,0,'signed slot refused')
  self.assertNotEqual(self.valider(op,remplace='{'+V18+'}').returncode,0,'other day replacement refused')
  ok=self.valider(op,remplace='{'+V17+'}'); self.assertEqual(ok.returncode,0,ok.stderr)
  res=json.loads(ok.stdout.splitlines()[-1]); self.assertEqual(res['minutes'],150); self.assertFalse(res['rejoue'])
  again=json.loads(self.valider(op,remplace='{'+V17+'}').stdout.splitlines()[-1]); self.assertTrue(again['rejoue']); self.assertEqual(again['validation_id'],res['validation_id'])
  self.assertEqual(self.total('2026-09-17'),'2.50'); self.assertEqual(self.total('2026-09-18'),'4.00')
  # Same slot again with another operation: refused (overlap).
  op2=str(uuid.uuid4()); self.upload(op2); self.assertNotEqual(self.valider(op2).returncode,0)
  # Restoring the replaced 1h30 would exceed the evening: refused.
  r=self.decider(str(uuid.uuid4()),V17,1,'restaurer'); self.assertNotEqual(r.returncode,0); self.assertIn('Restauration refusée',r.stderr)
  # 18/09 already fully validated (4h over two blank signatures): extra slot refused.
  op3=str(uuid.uuid4()); self.upload(op3); self.assertNotEqual(self.valider(op3,date='2026-09-18').returncode,0)
  # Simple confirmation revocation of the 4h, no motif needed.
  rv=self.decider(str(uuid.uuid4()),V18,0,'annuler',motif=''); self.assertEqual(rv.returncode,0,rv.stderr)
  self.assertEqual(json.loads(rv.stdout.splitlines()[-1])['original']['heures'],4.00)
  self.assertEqual(self.total('2026-09-18'),'0')
  src=self.sql(f"SELECT releve_sources_apprenant('{A}')").stdout; self.assertNotIn(V18,src); self.assertNotIn(V17,src); self.assertIn(res['validation_id'],src)
  # Restore 4h: back to 4h.
  self.assertEqual(self.decider(str(uuid.uuid4()),V18,1,'restaurer').returncode,0); self.assertEqual(self.total('2026-09-18'),'4.00')
  # Append-only everywhere.
  for t in ['presentiel_validation_decisions','presentiel_presence_creneaux']:
   self.assertNotEqual(self.sql(f'DELETE FROM {t}',False).returncode,0); self.assertNotEqual(self.sql(f"UPDATE {t} SET created_at=now()",False).returncode,0)
  self.assertEqual(self.as_('SELECT count(*) FROM presentiel_presence_creneaux',uid=U,check=True).stdout.splitlines()[-1],'0')
  # Originals untouched (only one new row), signatures and notes untouched.
  self.assertEqual(self.sql(f"SELECT md5(string_agg(v::text,'|' order by id)) FROM presentiel_heures_validees v WHERE id IN ('{V17}','{V18}')").stdout,originals)
  self.assertEqual(self.sql("SELECT md5(string_agg(e::text,'|' order by id)) FROM emargements_fc e;SELECT row_to_json(n) FROM notes n").stdout,autres)
  # Protected file refused.
  self.sql(f"INSERT INTO edof_fin_formation VALUES('{A}')")
  self.assertNotEqual(self.decider(str(uuid.uuid4()),V18,2,'annuler',motif='').returncode,0)
  self.sql(f"DELETE FROM edof_fin_formation")
 def test_concurrence(self):
  # Two different operations for the same free slot: exactly one validation.
  self.sql(f"INSERT INTO plan VALUES('{A}','{S}','2026-09-16','soir_2','18:30','21:00')")
  ops=[str(uuid.uuid4()) for _ in range(2)]
  for o in ops: self.upload(o)
  out=[]
  th=[threading.Thread(target=lambda o=o: out.append(self.valider(o,date='2026-09-16').returncode)) for o in ops]
  [t.start() for t in th];[t.join() for t in th]
  self.assertEqual(sorted(out)[0],0); self.assertEqual(out.count(0),1)
  self.assertEqual(self.total('2026-09-16'),'2.50')
if __name__=='__main__':unittest.main()
