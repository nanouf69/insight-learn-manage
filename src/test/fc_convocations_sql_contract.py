"""Prepared FC outbox contract on disposable PostgreSQL; fake inputs only, zero Cloud writes."""
import os,pathlib,shutil,subprocess,tempfile,unittest,concurrent.futures,json
ROOT=pathlib.Path(__file__).resolve().parents[2]
AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
A='aaaaaaaa-0000-0000-0000-000000000001'
S='bbbbbbbb-0000-0000-0000-000000000001'
I='cccccccc-0000-0000-0000-000000000001'
T='dddddddd-0000-0000-0000-000000000001'
U='eeeeeeee-0000-0000-0000-000000000001'
class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(c):
  c.d=tempfile.mkdtemp(dir='/tmp');os.chown(c.d,1000,1000)
  c.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  subprocess.run(AS+['initdb','-D',c.d+'/db','-U','postgres','-A','trust','--no-locale'],env=c.env,check=True,capture_output=True)
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-l',c.d+'/log','-o',f'-k {c.d} -p 55494 -h ""','-w','start'],env=c.env,check=True,capture_output=True)
  c.sql('''CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
  CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
  CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce($1::text='ffffffff-0000-0000-0000-000000000001',false) $$;
  CREATE TABLE sessions(id uuid PRIMARY KEY,nom text,date_debut date,date_fin date,heure_debut text,heure_fin text,lieu text,statut text);
  CREATE TABLE apprenants(id uuid PRIMARY KEY,nom text,prenom text,email text,civilite text,adresse text,code_postal text,ville text,emails_bloques boolean DEFAULT false,deleted_at timestamptz,abandonnee boolean DEFAULT false);
  CREATE TABLE session_apprenants(id uuid PRIMARY KEY,apprenant_id uuid,session_id uuid,liste_attente boolean DEFAULT false,montant_total numeric,date_debut date,date_fin date,date_fin_personnalisee date,heure_debut_personnalisee text,heure_fin_personnalisee text);
  CREATE TABLE transactions_bancaires(id uuid PRIMARY KEY,banque text,reference text,montant numeric,date_operation date,statut text,categorie text,libelle text,created_at timestamptz DEFAULT now());
  CREATE TABLE email_templates(id text PRIMARY KEY,subject_template text,body_template text);
  CREATE TABLE emails(id uuid DEFAULT gen_random_uuid(),apprenant_id uuid,type text,recipients text[],subject text,body_html text,sent_at timestamptz);
  CREATE TABLE alertes_systeme(type text,titre text,message text,details text,lu boolean);''')
  c.sql((ROOT/'docs/convocations-fc-preparees.sql').read_text())
 @classmethod
 def tearDownClass(c):
  subprocess.run(AS+['pg_ctl','-D',c.d+'/db','-m','immediate','stop'],env=c.env,capture_output=True);shutil.rmtree(c.d)
 @classmethod
 def sql(c,q):
  p=subprocess.run(['psql','-X','-q','-At','-h',c.d,'-p','55494','-U','postgres','-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True,env=c.env)
  if p.returncode:raise RuntimeError(p.stderr)
  return p.stdout.strip()
 def setUp(self):
  # Destructive resets are exclusively inside this disposable synthetic database.
  self.sql('TRUNCATE fc_convocation_journal,fc_convocation_envois,fc_convocation_exigibles,fc_convocation_rapprochements,session_apprenants,transactions_bancaires,sessions,apprenants,emails,email_templates,alertes_systeme CASCADE; UPDATE fc_convocation_config SET actif=false,actif_depuis=NULL,autorise_par=NULL;')
  self.sql(f"""INSERT INTO sessions VALUES('{S}','Formation Continue VTC',current_date+12,current_date+13,'09:00','17:00','Lieu fictif','planifiee');
  INSERT INTO apprenants(id,nom,prenom,email) VALUES('{A}','Fictif','Karim','karim@example.invalid');
  INSERT INTO session_apprenants(id,apprenant_id,session_id,montant_total) VALUES('{I}','{A}','{S}',200);
  INSERT INTO transactions_bancaires(id,banque,reference,montant,date_operation,statut,categorie,libelle) VALUES('{T}','Revolut','ref-1',200,current_date,'justifie','recette_formation','Fictif Karim');
  INSERT INTO email_templates VALUES('confirmation-formation-continue','FC','Horaires : {{{{horaires}}}}<br>Adresse : {{{{lieu}}}}<br>');""")
 def activate(self): self.sql(f"UPDATE fc_convocation_config SET actif=true,actif_depuis=now()-interval '1 day',autorise_par='{U}'")
 def evidence(self,m=200):self.sql(f"INSERT INTO fc_convocation_exigibles(inscription_id,montant,reference_contrat,confirme_par) VALUES('{I}',{m},'contrat-fictif','{U}'); INSERT INTO fc_convocation_rapprochements(transaction_id,inscription_id,confirme_par,piece_reference) VALUES('{T}','{I}','{U}','preuve-fictive')")
 def claim(self):
  raw=self.sql('SELECT fc_convocation_claim()');return json.loads(raw) if raw else None
 def test_disabled_no_queue_no_send(self):
  self.evidence();self.assertEqual(self.sql('SELECT count(*) FROM fc_convocation_envois'),'0');self.assertIsNone(self.claim())
 def test_after_reconciliation_only_and_readback(self):
  self.activate();self.sql(f"UPDATE transactions_bancaires SET statut='non_justifie' WHERE id='{T}'");self.evidence()
  self.assertEqual(self.sql('SELECT count(*) FROM fc_convocation_envois'),'0')
  self.sql(f"UPDATE transactions_bancaires SET statut='justifie' WHERE id='{T}'")
  self.assertEqual(self.sql('SELECT count(*) FROM fc_convocation_envois'),'1');self.assertEqual(self.sql('SELECT count(*) FROM emails'),'0')
  self.assertEqual(self.sql('SELECT count(*) FROM fc_convocation_envois'),'1')
 def test_amounts_and_duplicate_import(self):
  self.activate();self.sql(f"UPDATE transactions_bancaires SET montant=50 WHERE id='{T}'");self.evidence()
  self.assertEqual(self.sql('SELECT count(*) FROM fc_convocation_envois'),'0')
  self.sql(f"INSERT INTO transactions_bancaires SELECT '{U}',banque,reference,montant,date_operation,statut,categorie,libelle,created_at FROM transactions_bancaires WHERE id='{T}'; INSERT INTO fc_convocation_rapprochements VALUES('{U}','{I}','{A}','duplicate',now())")
  self.assertEqual(self.sql('SELECT count(*) FROM fc_convocation_envois'),'0')
  self.sql(f"UPDATE transactions_bancaires SET reference='ref-2',montant=150 WHERE id='{U}'")
  self.sql(f"SELECT fc_convocation_preparer('{I}')");self.assertEqual(self.sql('SELECT count(*) FROM fc_convocation_envois'),'1')
 def test_concurrent_double_claim_one_only(self):
  self.activate();self.evidence()
  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(lambda _:self.sql('SELECT fc_convocation_claim()'),range(8)))
  self.assertEqual(sum(bool(x) for x in results),1);self.assertEqual(self.sql('SELECT tentatives FROM fc_convocation_envois'),'1')
 def test_success_single_receipt_and_immutable_journal(self):
  self.activate();self.evidence();p=self.claim()
  q=f"SELECT fc_convocation_finir('{p['envoi_id']}','{p['claim_id']}','envoye','provider-1',NULL,'{{\"subject\":\"FC\",\"html\":\"Fictif\"}}')"
  self.assertEqual(self.sql(q),'t');self.assertEqual(self.sql(q),'f');self.assertEqual(self.sql('SELECT count(*) FROM emails'),'1')
  self.sql(f"SELECT fc_convocation_preparer('{I}')");self.assertIsNone(self.claim())
  for table in ['fc_convocation_journal','fc_convocation_rapprochements','fc_convocation_exigibles']:
   with self.assertRaisesRegex(RuntimeError,'Historique convocation'):self.sql(f'DELETE FROM {table}')
 def test_unknown_delivery_never_retries(self):
  self.activate();self.evidence();p=self.claim()
  self.sql(f"SELECT fc_convocation_finir('{p['envoi_id']}','{p['claim_id']}','indetermine',NULL,'offline')")
  self.assertIsNone(self.claim());self.assertEqual(self.sql('SELECT count(*) FROM alertes_systeme'),'1');self.assertEqual(self.sql('SELECT count(*) FROM emails'),'0')
 def test_bounded_retry_and_stale_claim(self):
  self.activate();self.evidence()
  for n in range(3):
   p=self.claim();self.assertIsNotNone(p)
   self.assertEqual(self.sql(f"SELECT fc_convocation_finir('{p['envoi_id']}','{U}','echec',NULL,'429')"),'f')
   self.sql(f"SELECT fc_convocation_finir('{p['envoi_id']}','{p['claim_id']}','echec',NULL,'429')")
   self.sql("UPDATE fc_convocation_envois SET prochain_essai=now()-interval '1 second'")
  self.assertIsNone(self.claim());self.assertEqual(self.sql('SELECT tentatives FROM fc_convocation_envois'),'3')
 def test_crashed_request_quarantined(self):
  self.activate();self.evidence();self.claim();self.sql("UPDATE fc_convocation_envois SET claim_at=now()-interval '11 minutes'")
  self.assertIsNone(self.claim());self.assertEqual(self.sql('SELECT statut FROM fc_convocation_envois'),'indetermine')
 def test_refund_after_preparation_and_blocked_email(self):
  self.activate();self.evidence();self.sql(f"UPDATE transactions_bancaires SET montant=-200 WHERE id='{T}'")
  self.assertIsNone(self.claim());self.assertEqual(self.sql('SELECT statut FROM fc_convocation_envois'),'a_revoir')
 def test_old_payment_no_retroactivity(self):
  self.activate();self.sql("UPDATE transactions_bancaires SET date_operation=current_date-10");self.evidence();self.assertIsNone(self.claim())
 def test_rls_and_no_public_execute(self):
  self.activate();self.evidence()
  self.assertEqual(self.sql('SET ROLE authenticated; SELECT count(*) FROM fc_convocation_envois'),'0')
  for role in ['anon','authenticated']:
   with self.assertRaisesRegex(RuntimeError,'permission denied'):self.sql(f'SET ROLE {role}; SELECT fc_convocation_claim()')
 def test_no_financial_or_learner_changes_by_workflow(self):
  self.activate();before=self.sql("SELECT md5(string_agg(x,'|' ORDER BY x)) FROM (SELECT to_jsonb(t)::text x FROM transactions_bancaires t UNION ALL SELECT to_jsonb(t)::text FROM apprenants t UNION ALL SELECT to_jsonb(t)::text FROM session_apprenants t UNION ALL SELECT to_jsonb(t)::text FROM sessions t) q")
  self.evidence();self.claim()
  after=self.sql("SELECT md5(string_agg(x,'|' ORDER BY x)) FROM (SELECT to_jsonb(t)::text x FROM transactions_bancaires t UNION ALL SELECT to_jsonb(t)::text FROM apprenants t UNION ALL SELECT to_jsonb(t)::text FROM session_apprenants t UNION ALL SELECT to_jsonb(t)::text FROM sessions t) q")
  self.assertEqual(before,after)
 def test_admin_confirmation_idempotent_and_owner_guarded(self):
  q=f"SELECT fc_convocation_confirmer('{T}','{I}','proof',50,'contract')"
  with self.assertRaisesRegex(RuntimeError,'Admin requis'):self.sql(q)
  prefix="SET test.uid='ffffffff-0000-0000-0000-000000000001'; "
  self.assertEqual(self.sql(prefix+q),'t');self.assertEqual(self.sql(prefix+q),'t')
  self.assertEqual(self.sql('SELECT count(*) FROM fc_convocation_rapprochements'),'1')
  with self.assertRaisesRegex(RuntimeError,'Contrat existant conservé'):self.sql(prefix+q.replace("50,'contract'","150,'contract'"))
 def test_email_block_after_queue_is_rechecked(self):
  self.activate();self.evidence();self.sql('UPDATE apprenants SET emails_bloques=true')
  self.assertIsNone(self.claim());self.assertEqual(self.sql('SELECT statut FROM fc_convocation_envois'),'a_revoir')
if __name__=='__main__':unittest.main(verbosity=2)