"""Production has_role/app_role/user_roles (definition relue en lecture seule le 15/11), for disposable DBs only."""
ROLES_PRELUDE = """DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role public.app_role NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(user_id,role));
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;"""
ACTIVER = "UPDATE public.bilan_505_remise_activation SET actif=true, motif='test jetable' WHERE id=1;"
def autoriser(rid, app, mode='remise', tentative=1):
    return f"INSERT INTO public.bilan_505_remise_copies(row_id,apprenant_id,tentative,mode,motif) VALUES('{rid}','{app}',{tentative},'{mode}','test jetable') ON CONFLICT DO NOTHING;"
