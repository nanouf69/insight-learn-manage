"""Rattachements : base PostgreSQL jetable, aucune écriture externe."""
import subprocess
import sys
sys.dont_write_bytecode = True
from facture_commune_sql_contract import TMP, ENV, AS_USER, PORT, ROOT, ADMIN, A, B, C, F, sql, refuse


def appel(ids, facture=F, user=ADMIN):
    array = "ARRAY[" + ",".join("'" + i + "'::uuid" for i in ids) + "]::uuid[]"
    return f"SET ROLE authenticated; SET request.jwt.claim.sub='{user}'; SELECT count(*) FROM public.facture_rattacher_apprenants('{facture}',{array});"


def main():
    subprocess.run(AS_USER + ['initdb', '-D', TMP + '/data', '-A', 'trust', '--no-locale', '-U', 'lovable'], env=ENV, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(AS_USER + ['pg_ctl', '-D', TMP + '/data', '-l', TMP + '/pg.log', '-o', f'-k {TMP} -p {PORT} -h ""', '-w', 'start'], env=ENV, check=True, stdout=subprocess.DEVNULL)
    try:
        sql('''CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
        GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
        CREATE TABLE public.user_roles(user_id uuid,role public.app_role);
        CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)$$;
        CREATE TABLE public.apprenants(id uuid PRIMARY KEY,nom text,prenom text,deleted_at timestamptz);
        CREATE TABLE public.factures(id uuid PRIMARY KEY,apprenant_id uuid,montant_ht numeric,montant_ttc numeric,statut text,lignes_apprenants jsonb DEFAULT '[]');''')
        sql((ROOT / 'drizzle/migrations/0294_facture_rattachements_apprenants.sql').read_text())
        sql(f"INSERT INTO public.user_roles VALUES('{ADMIN}','admin'); INSERT INTO public.apprenants VALUES('{A}','Initial','A',NULL),('{B}','Second','B',NULL),('{C}','Troisieme','C',NULL); INSERT INTO public.factures(id,apprenant_id,montant_ht,montant_ttc,statut) VALUES('{F}','{A}',200,200,'payee');")
        avant = sql(f"SELECT row_to_json(f) FROM public.factures f WHERE id='{F}'")
        assert sql(appel([B, C])) == '2'  # Deux ajouts, pas un remplacement.
        assert sql(f"SELECT row_to_json(f) FROM public.factures f WHERE id='{F}'") == avant  # Montant 200, statut payé, identité inchangés.
        assert sql(appel([B, C, A, B])) == '2'  # Réessai/doublon/initial ignorés.
        assert sql(f"SELECT count(*) FROM public.facture_apprenants_rattachements WHERE created_by='{ADMIN}' AND created_at IS NOT NULL AND nom_apprenant IN ('B Second','C Troisieme')") == '2'
        refuse(appel([B], user=A), 'administrateur')
        assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{A}'; SELECT count(*) FROM public.facture_apprenants_rattachements") == '0'
        refuse("SET ROLE anon; SELECT * FROM public.facture_apprenants_rattachements", 'permission denied')
        refuse("SET ROLE authenticated; INSERT INTO public.facture_apprenants_rattachements(facture_id,apprenant_id,nom_apprenant,created_by) VALUES(gen_random_uuid(),gen_random_uuid(),'fake',gen_random_uuid())", 'permission denied')
        refuse(f"UPDATE public.facture_apprenants_rattachements SET nom_apprenant='fake' WHERE facture_id='{F}'", 'conservés')
        refuse(f"DELETE FROM public.facture_apprenants_rattachements WHERE facture_id='{F}'", 'conservés')
        refuse(appel([]), 'Sélectionnez')
        refuse(appel([B], facture='00000000-0000-0000-0000-000000000099'), 'introuvable')
        refuse(appel([B, '00000000-0000-0000-0000-000000000098']), 'archivé')
        assert sql('SELECT count(*) FROM public.facture_apprenants_rattachements') == '2'
        assert sql(f"SELECT row_to_json(f) FROM public.factures f WHERE id='{F}'") == avant
        print('PASS : rattachements multiples, relecture, réessai, auteur/date, droits, conservation et atomicité dans PostgreSQL jetable.')
    finally:
        subprocess.run(AS_USER + ['pg_ctl', '-D', TMP + '/data', '-m', 'immediate', 'stop'], env=ENV, check=False, stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    main()