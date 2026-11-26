"""Détail de validation figé : PostgreSQL JETABLE uniquement, aucune écriture réelle."""
import os, subprocess, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
CAND = ROOT / 'docs/sql-revue/2026-11-26-detail-validation-fige.sql'
A, U, ADMIN = 'aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b', 'cccccccc-0000-4000-8000-00000000000c'
def main():
    env = {k: v for k, v in os.environ.items() if not k.startswith(('PG', 'SUPABASE', 'LOVABLE_', 'VITE_'))}
    tmp = tempfile.mkdtemp(prefix='detail-fige-', dir='/tmp'); os.chown(tmp, 1000, 1000)
    run_as = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']; port = '55473'
    def sql(q):
        r = subprocess.run(['psql', '-X', '-q', '-h', tmp, '-p', port, '-U', 'lovable', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], input=q, env=env, text=True, capture_output=True)
        if r.returncode: raise SystemExit(r.stderr[-1500:])
        return r.stdout.strip()
    subprocess.run(run_as + ['initdb', '-D', tmp + '/data', '-A', 'trust', '--no-locale', '-E', 'UTF8', '-U', 'lovable'], env=env, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(run_as + ['pg_ctl', '-D', tmp + '/data', '-l', tmp + '/pg.log', '-o', f'-k {tmp} -p {port} -h ""', '-w', 'start'], env=env, check=True, stdout=subprocess.DEVNULL)
    try:
        sql('''CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE ROLE service_role;
        GRANT USAGE ON SCHEMA auth,public TO authenticated,service_role;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        CREATE TYPE public.app_role AS ENUM ('admin','user');
        CREATE TABLE public.user_roles(user_id uuid,role public.app_role);
        CREATE FUNCTION public.has_role(_u uuid,_r public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_u AND role=_r)$$;
        CREATE TABLE public.apprenant_module_completion(apprenant_id uuid,module_id int,status text,completed_at timestamptz,progress numeric,score_obtenu int,score_max int,details jsonb,updated_at timestamptz);
        GRANT SELECT,UPDATE ON public.apprenant_module_completion TO authenticated,service_role;''')
        sql(CAND.read_text())
        sql("CREATE TRIGGER t BEFORE UPDATE ON public.apprenant_module_completion FOR EACH ROW EXECUTE FUNCTION public.protect_module_completion_terminal();")
        sql(f"""INSERT INTO public.user_roles VALUES('{ADMIN}','admin');
        INSERT INTO public.apprenant_module_completion VALUES('{A}',4,'completed','2026-09-15 20:42Z',100,10,716,'[{{"exerciceId":"101","questionId":"1","reponseEleve":"A"}}]',now()),
          ('{A}',5,'completed','2026-09-15 20:42Z',100,0,0,'[]',now()),('{A}',6,'in_progress',NULL,40,NULL,NULL,'[{{"exerciceId":"1","questionId":"1"}}]',now());""")
        cur = '[{"exerciceId":"101","questionId":"60001","reponseEleve":null}]'
        for who in (f"SET ROLE authenticated; SET request.jwt.claim.sub='{U}';", "SET ROLE service_role;", f"SET ROLE authenticated; SET request.jwt.claim.sub='{ADMIN}';"):
            sql(who + f" UPDATE public.apprenant_module_completion SET details='{cur}' WHERE module_id=4;")
            assert sql("SELECT details->0->>'questionId'||status||completed_at::date FROM public.apprenant_module_completion WHERE module_id=4") == '1completed2026-09-15', who
        sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{U}'; UPDATE public.apprenant_module_completion SET details='{cur}' WHERE module_id IN (5,6);")
        assert sql("SELECT string_agg(details->0->>'questionId', ',' ORDER BY module_id) FROM public.apprenant_module_completion WHERE module_id IN (5,6)") == '60001,60001'
        sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ADMIN}'; UPDATE public.apprenant_module_completion SET status='in_progress', details='[]' WHERE module_id=4;")
        assert sql("SELECT status||jsonb_array_length(details) FROM public.apprenant_module_completion WHERE module_id=4") == 'in_progress0'
        print('PASS : détail de validation figé pour élève/service/admin, détail vide complétable, module non terminé inchangé, remise à zéro admin délibérée toujours possible.')
    finally:
        subprocess.run(run_as + ['pg_ctl', '-D', tmp + '/data', '-m', 'immediate', 'stop'], env=env, check=False, stdout=subprocess.DEVNULL)
main()
