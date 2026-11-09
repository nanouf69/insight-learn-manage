import os, subprocess, tempfile, pathlib, shutil
D=tempfile.mkdtemp(dir='/tmp'); os.chown(D,1000,1000)
env={k:v for k,v in os.environ.items() if not k.startswith('PG')}; AS=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
def sql(q,ok=True):
 r=subprocess.run(['psql','-X','-At','-h',D,'-p','55473','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True,env=env)
 if ok and r.returncode: raise Exception(r.stderr)
 return r
subprocess.run(AS+['initdb','-D',D+'/db','-U','postgres','-A','trust','--no-locale'],check=True,capture_output=True,env=env)
subprocess.run(AS+['pg_ctl','-D',D+'/db','-l',D+'/log','-o',f'-k {D} -p 55473 -h ""','-w','start'],check=True,capture_output=True,env=env)
try:
 sql('''CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE TABLE apprenants(id uuid PRIMARY KEY,auth_user_id uuid);
 CREATE TABLE sessions(id uuid PRIMARY KEY,nom text,date_debut date,date_fin date,heure_debut text,heure_fin text);
 CREATE TABLE session_apprenants(id uuid PRIMARY KEY,apprenant_id uuid,session_id uuid,liste_attente boolean,emargements_exclus boolean,date_debut date,date_fin date,date_fin_personnalisee date,heure_debut_personnalisee text,heure_fin_personnalisee text);
 CREATE TABLE documents_inscription(id uuid PRIMARY KEY,apprenant_id uuid,url text,statut text,type_document text);
 CREATE TABLE emargements_fc(id uuid,apprenant_id uuid,date_emargement date,demi_journee text,masque boolean,absent boolean,signed_at timestamptz,signature_data_url text);
 CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(u='11111111-1111-1111-1111-111111111111'::uuid,false) $$;''')
 sql(pathlib.Path('drizzle/migrations/0252_fc_signatures_papier_documentees.sql').read_text())
 A='22222222-2222-2222-2222-222222222222'; S='33333333-3333-3333-3333-333333333333'; I='44444444-4444-4444-4444-444444444444'; F='55555555-5555-5555-5555-555555555555'
 sql(f"INSERT INTO apprenants VALUES('{A}','66666666-6666-6666-6666-666666666666'); INSERT INTO sessions VALUES('{S}','Formation Continue VTC','2026-09-29','2026-09-30','09:00','17:00'); INSERT INTO session_apprenants(id,apprenant_id,session_id) VALUES('{I}','{A}','{S}'); INSERT INTO documents_inscription VALUES('{F}','{A}','private-file','valide','emargement');")
 def insert(day,slot,h,uid='11111111-1111-1111-1111-111111111111'):
  return sql(f"SET test.uid='{uid}'; SET ROLE authenticated; INSERT INTO fc_signatures_papier(inscription_id,apprenant_id,session_id,document_id,date_presence,creneau,heures,created_by) VALUES('{I}','{A}','{S}','{F}','{day}','{slot}',{h},'{uid}');",False)
 assert insert('2026-09-29','matin',4).returncode!=0
 assert insert('2026-09-28','matin',3).returncode!=0
 assert insert('2026-09-29','matin',3,'66666666-6666-6666-6666-666666666666').returncode!=0
 for d,c,h in [('2026-09-29','matin',3),('2026-09-29','apres_midi',4),('2026-09-30','matin',3),('2026-09-30','apres_midi',4)]:
  r=insert(d,c,h); assert r.returncode==0,r.stderr
 assert insert('2026-09-29','matin',3).returncode!=0
 import json
 r=json.loads(sql(f"SELECT attestation_fc_controle('{A}')").stdout); assert r['autorise'] and r['signes']==4,r
 assert sql("SET ROLE authenticated; UPDATE fc_signatures_papier SET heures=1",False).returncode!=0
 assert sql(f"SET test.uid='77777777-7777-7777-7777-777777777777'; SET ROLE authenticated; SELECT * FROM fc_papier_creneaux('{A}')",False).returncode!=0
 sql(f"SET test.uid='66666666-6666-6666-6666-666666666666'; SET ROLE authenticated; SELECT * FROM fc_papier_creneaux('{A}')")
 assert sql("SELECT count(*) FROM emargements_fc").stdout.strip()=='0'
 print('PASS SQL privé : 4/4 papier, heures/dates/élève refusés, doublon refusé, immutabilité, lecture propriétaire, autre refusé, numériques inchangés')
finally:
 subprocess.run(AS+['pg_ctl','-D',D+'/db','-m','immediate','stop'],capture_output=True,env=env);shutil.rmtree(D)
