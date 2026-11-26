"""Exécute les règles de facture commune dans PostgreSQL jetable, sans réseau externe."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TMP = tempfile.mkdtemp(prefix='facture-commune-', dir='/tmp')
os.chown(TMP, 1000, 1000)
AS_USER = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
ENV = {k: v for k, v in os.environ.items() if not k.startswith(('PG', 'SUPABASE', 'VITE_', 'LOVABLE_'))}
PORT = '55461'
ADMIN = '00000000-0000-0000-0000-000000000001'
A = '00000000-0000-0000-0000-000000000011'
B = '00000000-0000-0000-0000-000000000012'
C = '00000000-0000-0000-0000-000000000013'
S = '00000000-0000-0000-0000-000000000021'
F = '00000000-0000-0000-0000-000000000031'

def sql(q):
    return subprocess.check_output(['psql', '-X', '-q', '-h', TMP, '-p', PORT, '-U', 'lovable', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', q], env=ENV, text=True, stderr=subprocess.STDOUT).strip()

def appel(lignes=None, fid=F, confirmer=False, user=ADMIN):
    lignes = lignes if lignes is not None else [{'apprenant_id': A, 'montant_ht': 200}, {'apprenant_id': B, 'montant_ht': 200}]
    payload = json.dumps(lignes).replace("'", "''")
    return f"SET ROLE authenticated; SET request.jwt.claim.sub='{user}'; SELECT (public.creer_facture_commune_fc('{fid}','{S}','{A}','{payload}'::jsonb,{str(confirmer).lower()})).id;"

def refuse(q, texte):
    try:
        sql(q)
    except subprocess.CalledProcessError as e:
        assert texte in e.output, e.output
        return
    raise AssertionError('Une opération interdite a réussi')

def main():
    subprocess.run(AS_USER + ['initdb', '-D', TMP + '/data', '-A', 'trust', '--no-locale', '-U', 'lovable'], env=ENV, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(AS_USER + ['pg_ctl', '-D', TMP + '/data', '-l', TMP + '/pg.log', '-o', f'-k {TMP} -p {PORT} -h ""', '-w', 'start'], env=ENV, check=True, stdout=subprocess.DEVNULL)
    try:
        sql('''CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
          GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
          CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
          CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
          CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
          CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)$$;
          CREATE TABLE public.formations(id uuid PRIMARY KEY,nom text);
          CREATE TABLE public.sessions(id uuid PRIMARY KEY,nom text,formation_id uuid);
          CREATE TABLE public.apprenants(id uuid PRIMARY KEY,auth_user_id uuid,nom text,prenom text,type_apprenant text,formation_choisie text,adresse text,code_postal text,ville text);
          CREATE TABLE public.financeurs_fc(apprenant_id uuid,type_financeur text,raison_sociale text,siret text,siren text,adresse text,code_postal text,ville text,created_at timestamptz DEFAULT now());
          CREATE TABLE public.session_apprenants(session_id uuid,apprenant_id uuid);
          CREATE TABLE public.factures(id uuid PRIMARY KEY,numero text NOT NULL,date_emission date,date_echeance date,session_id uuid,apprenant_id uuid,type_financement text,client_nom text,client_adresse text,client_siret text,montant_ht numeric,tva_taux numeric,montant_tva numeric,montant_ttc numeric,statut text);
          GRANT SELECT ON public.formations,public.sessions,public.apprenants,public.financeurs_fc,public.session_apprenants TO authenticated;
          GRANT SELECT,INSERT,UPDATE ON public.factures TO authenticated;
          ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
          CREATE POLICY admin_factures ON public.factures TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
          CREATE POLICY own_facture ON public.factures FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.apprenants a WHERE a.id=factures.apprenant_id AND a.auth_user_id=auth.uid()));''')
        for migration in ['0292_facture_commune_apprenants.sql', '0293_facture_commune_contexte_fc.sql']:
            sql((ROOT / 'drizzle/migrations' / migration).read_text())
        sql(f"INSERT INTO public.user_roles VALUES('{ADMIN}','admin'); INSERT INTO public.sessions VALUES('{S}','Formation continue TAXI',NULL); INSERT INTO public.apprenants VALUES('{A}','{A}','TEST','Alice','continue-taxi','',NULL,NULL,NULL),('{B}','{B}','TEST','Bob','continue-taxi','',NULL,NULL,NULL),('{C}','{C}','TEST','Chris','continue-taxi','',NULL,NULL,NULL); INSERT INTO public.session_apprenants VALUES('{S}','{A}'),('{S}','{B}'); INSERT INTO public.financeurs_fc(apprenant_id,type_financeur,raison_sociale) VALUES('{A}','professionnel','Entreprise TEST');")
        refuse(appel([{'apprenant_id': A, 'montant_ht': 200}]), 'Au moins deux')
        refuse(appel([{'apprenant_id': A, 'montant_ht': 200}, {'apprenant_id': A, 'montant_ht': 200}]), 'Apprenants distincts')
        refuse(appel([{'apprenant_id': A, 'montant_ht': 200}, {'apprenant_id': B, 'montant_ht': 0}]), 'montants positifs')
        refuse(appel([{'apprenant_id': A, 'montant_ht': 200}, {'apprenant_id': C, 'montant_ht': 200}]), 'ne fait pas partie')
        refuse(appel(user=A), 'Accès administrateur')
        sql(appel())
        assert sql(f"SELECT montant_ttc=400 AND montant_ht=400 AND statut='brouillon' AND apprenant_id IS NULL AND client_nom='Entreprise TEST' AND jsonb_array_length(lignes_apprenants)=2 AND lignes_apprenants->0->>'stagiaire'='Alice TEST' FROM public.factures WHERE id='{F}'") == 't'
        sql(appel())
        assert sql('SELECT count(*) FROM public.factures') == '1'
        original = sql('SELECT row_to_json(f)::text FROM public.factures f')
        refuse(appel(fid='00000000-0000-0000-0000-000000000032'), 'Des factures existent')
        assert sql('SELECT row_to_json(f)::text FROM public.factures f') == original
        refuse(f"UPDATE public.factures SET lignes_apprenants='[]' WHERE id='{F}'", 'lignes de la facture commune sont figées')
        refuse(f"UPDATE public.factures SET montant_ht=300,montant_ttc=300 WHERE id='{F}'", 'total exact')
        assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{A}'; SELECT count(*) FROM public.factures") == '0'
        sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ADMIN}'; UPDATE public.factures SET statut='en_attente' WHERE id='{F}'")
        assert sql(f"SELECT statut='en_attente' AND montant_ttc=400 FROM public.factures WHERE id='{F}'") == 't'
        sql(appel(fid='00000000-0000-0000-0000-000000000032', confirmer=True))
        assert sql('SELECT count(*) FROM public.factures') == '2'
        sql(f"UPDATE public.sessions SET nom='Formation initiale TAXI' WHERE id='{S}'")
        refuse(appel(fid='00000000-0000-0000-0000-000000000033', confirmer=True), 'réservée à une session de formation continue')
        assert sql('SELECT count(*) FROM public.factures') == '2'
        print('14 scénarios PostgreSQL jetables PASS : montants, identités, atomicité, réessai, accès et conservation. Aucune écriture externe.')
    finally:
        subprocess.run(AS_USER + ['pg_ctl', '-D', TMP + '/data', '-m', 'immediate', 'stop'], env=ENV, check=True, stdout=subprocess.DEVNULL)

if __name__ == '__main__':
    main()