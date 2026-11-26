"""Versions factures : PostgreSQL jetable, sans compte/email/écriture externe."""
import json
import subprocess
import sys
sys.dont_write_bytecode = True
from facture_commune_sql_contract import TMP, ENV, AS_USER, PORT, ROOT, ADMIN, A, F, sql, refuse

OP='00000000-0000-0000-0000-000000000071'
DATE='2026-11-26T10:00:00+00:00'
def appel(patch, operation=OP, expected=DATE, user=ADMIN, email='client@example.test'):
    value=json.dumps(patch,ensure_ascii=False).replace("'","''")
    return f"SET ROLE authenticated; SET request.jwt.claim.sub='{user}'; SELECT (public.facture_modifier_version('{F}','{operation}','{expected}','{value}'::jsonb,'{email}')).id;"

def main():
    subprocess.run(AS_USER+['initdb','-D',TMP+'/data','-A','trust','--no-locale','-E','UTF8','-U','lovable'],env=ENV,check=True,stdout=subprocess.DEVNULL)
    subprocess.run(AS_USER+['pg_ctl','-D',TMP+'/data','-l',TMP+'/pg.log','-o',f'-k {TMP} -p {PORT} -h ""','-w','start'],env=ENV,check=True,stdout=subprocess.DEVNULL)
    try:
        sql('''CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
        GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
        CREATE TABLE storage.objects(bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        CREATE TYPE public.app_role AS ENUM ('admin','user','moderator');
        CREATE TABLE public.user_roles(user_id uuid,role public.app_role);
        CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)$$;
        CREATE TABLE public.factures(id uuid PRIMARY KEY,numero text,client_nom text,type_financement text,montant_ht numeric,tva_taux numeric,montant_tva numeric,montant_ttc numeric,statut text,date_emission date,date_echeance date,date_paiement date,numero_engagement text,numero_convention text,apprenant_id uuid,lignes_apprenants jsonb DEFAULT '[]',updated_at timestamptz);
        CREATE TABLE public.facture_paiements(facture_id uuid,montant numeric);
        CREATE TABLE public.facture_apprenants_rattachements(facture_id uuid,apprenant_id uuid);''')
        sql((ROOT/'docs/sql-revue/2026-11-26-facture-revisions.sql').read_text())
        sql(f"INSERT INTO public.user_roles VALUES('{ADMIN}','admin'); INSERT INTO public.factures VALUES('{F}','20260724001','Client','professionnel',200,0,0,200,'payee','2026-07-24',NULL,'2026-07-23',NULL,NULL,'{A}','[]','{DATE}',NULL,NULL); INSERT INTO public.facture_paiements VALUES('{F}',200); INSERT INTO public.facture_apprenants_rattachements VALUES('{F}','{A}');")
        before=sql('SELECT row_to_json(f) FROM public.factures f')
        patch={'type_prestation':'Formation continue TAXI','montant_ht':600,'tva_taux':0,'montant_tva':0,'montant_ttc':600}
        refuse(appel(patch,user=A),'administrateurs')
        refuse(appel(patch,email='invalide'),'adresse email')
        refuse(appel({'type_prestation':'inventée'}),'prestation')
        refuse(appel({'apprenant_id':None}),'initial')
        refuse(appel({'lignes_apprenants':[]}),'non autorisés')
        refuse(appel(patch,expected='2026-11-25T10:00:00Z'),'facture a changé')
        assert sql(appel(patch))==OP
        assert sql(appel(patch))==OP
        assert sql('SELECT count(*) FROM public.facture_revisions')=='1'
        snapshot=json.loads(sql('SELECT avant FROM public.facture_revisions'))
        assert snapshot==json.loads(before)
        assert sql('SELECT montant_ht||\'|\'||montant_ttc||\'|\'||type_prestation FROM public.factures')=='600|600.00|Formation continue TAXI'
        assert sql('SELECT montant FROM public.facture_paiements')=='200'
        assert sql('SELECT count(*) FROM public.facture_apprenants_rattachements')=='1'
        assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{A}'; SELECT count(*) FROM public.facture_revisions")=='0'
        refuse("SET ROLE anon; SELECT * FROM public.facture_revisions",'permission denied')
        refuse(f"UPDATE public.facture_revisions SET avant='{{}}' WHERE id='{OP}'",'conservées')
        refuse(f"DELETE FROM public.facture_revisions WHERE id='{OP}'",'conservées')
        assert sql(f"UPDATE public.facture_revisions SET statut_envoi='en_cours' WHERE id='{OP}' AND statut_envoi='a_envoyer' RETURNING id")==OP
        assert sql(f"UPDATE public.facture_revisions SET statut_envoi='en_cours' WHERE id='{OP}' AND statut_envoi='a_envoyer' RETURNING id")==''
        sql(f"UPDATE public.facture_revisions SET statut_envoi='envoye' WHERE id='{OP}'")
        refuse(f"UPDATE public.facture_revisions SET statut_envoi='a_envoyer' WHERE id='{OP}'",'ne pas renvoyer')
        now=sql('SELECT updated_at FROM public.factures')
        op2='00000000-0000-0000-0000-000000000072'
        assert sql(appel({'statut':'annulee'},operation=op2,expected=now))==op2
        assert sql(f"SELECT apres->>'statut' FROM public.facture_revisions WHERE id='{op2}'")=='annulee'
        assert sql('SELECT count(*) FROM public.factures')=='1'
        assert sql('SELECT montant FROM public.facture_paiements')=='200'
        print('PASS : admin/RLS, CAS, réessai identique, original et paiements/rattachements conservés, prestation/montants, annulation sans suppression, un seul claim et résultat terminal immuable.')
    finally:
        subprocess.run(AS_USER+['pg_ctl','-D',TMP+'/data','-m','immediate','stop'],env=ENV,check=False,stdout=subprocess.DEVNULL)
if __name__=='__main__': main()