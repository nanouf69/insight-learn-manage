CREATE TABLE public.qualiopi_liens_cpf (id text PRIMARY KEY, intitule text NOT NULL, url text NOT NULL CHECK (url ~ '^https://[^[:space:]]+$'), revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.qualiopi_liens_cpf TO authenticated;
GRANT ALL ON public.qualiopi_liens_cpf TO service_role;
ALTER TABLE public.qualiopi_liens_cpf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_liens_cpf" ON public.qualiopi_liens_cpf FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.qualiopi_lien_cpf_garde() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF TG_OP='UPDATE' THEN IF NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Modification périmée, rechargez le lien.' USING ERRCODE='P0001'; END IF; NEW.updated_at:=now(); END IF; IF length(trim(NEW.intitule))=0 THEN RAISE EXCEPTION 'Intitulé obligatoire'; END IF; RETURN NEW; END $$;
CREATE TRIGGER qualiopi_lien_cpf_revision BEFORE INSERT OR UPDATE ON public.qualiopi_liens_cpf FOR EACH ROW EXECUTE FUNCTION public.qualiopi_lien_cpf_garde();