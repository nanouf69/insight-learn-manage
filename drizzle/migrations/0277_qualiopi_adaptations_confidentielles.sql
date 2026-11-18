CREATE TABLE public.qualiopi_adaptations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 stagiaire_reference text NOT NULL,
 session_reference text NOT NULL,
 date_decision date NOT NULL,
 besoin text NOT NULL,
 adaptation text NOT NULL,
 responsable text NOT NULL,
 date_mise_en_place date NOT NULL,
 preuve_application text NOT NULL,
 verification_efficacite text NOT NULL,
 suite text NOT NULL,
 validation text NOT NULL,
 mise_en_oeuvre_confirmee boolean NOT NULL DEFAULT false,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.qualiopi_adaptations TO authenticated;
GRANT ALL ON public.qualiopi_adaptations TO service_role;
ALTER TABLE public.qualiopi_adaptations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read confidential adaptations" ON public.qualiopi_adaptations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins record actual adaptations" ON public.qualiopi_adaptations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND created_by=auth.uid());
CREATE FUNCTION public.qualiopi_adaptation_valide() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Fiche conservée : aucune modification ni suppression autorisée' USING ERRCODE='42501'; END IF;
 IF NOT NEW.mise_en_oeuvre_confirmee OR NEW.date_mise_en_place < NEW.date_decision OR NEW.date_mise_en_place > (now() AT TIME ZONE 'Europe/Paris')::date OR NEW.date_decision > (now() AT TIME ZONE 'Europe/Paris')::date THEN
 RAISE EXCEPTION 'Une adaptation réellement appliquée et des dates cohérentes sont requises' USING ERRCODE='22023'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(ARRAY[NEW.stagiaire_reference,NEW.session_reference,NEW.besoin,NEW.adaptation,NEW.responsable,NEW.preuve_application,NEW.verification_efficacite,NEW.suite,NEW.validation]) v WHERE length(btrim(v))=0) THEN RAISE EXCEPTION 'Tous les champs de traçabilité sont requis' USING ERRCODE='22023'; END IF;
 NEW.created_at := now(); NEW.created_by := auth.uid();
 IF NEW.created_by IS NULL THEN RAISE EXCEPTION 'Administrateur connecté requis' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER garde_qualiopi_adaptation BEFORE INSERT OR UPDATE OR DELETE ON public.qualiopi_adaptations FOR EACH ROW EXECUTE FUNCTION public.qualiopi_adaptation_valide();