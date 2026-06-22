
CREATE TABLE public.apprenant_paiements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id uuid NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  montant numeric NOT NULL DEFAULT 0,
  moyen_paiement text,
  date_paiement date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_apprenant_paiements_apprenant ON public.apprenant_paiements(apprenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apprenant_paiements TO authenticated;
GRANT ALL ON public.apprenant_paiements TO service_role;

ALTER TABLE public.apprenant_paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage apprenant_paiements"
ON public.apprenant_paiements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.recalc_apprenant_paiements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apprenant uuid;
  v_total numeric;
  v_last_date date;
  v_last_moyen text;
BEGIN
  v_apprenant := COALESCE(NEW.apprenant_id, OLD.apprenant_id);

  SELECT COALESCE(SUM(montant), 0)
  INTO v_total
  FROM public.apprenant_paiements
  WHERE apprenant_id = v_apprenant;

  SELECT date_paiement, moyen_paiement
  INTO v_last_date, v_last_moyen
  FROM public.apprenant_paiements
  WHERE apprenant_id = v_apprenant
  ORDER BY date_paiement DESC NULLS LAST, created_at DESC
  LIMIT 1;

  UPDATE public.apprenants
  SET montant_paye = v_total,
      date_paiement = v_last_date,
      moyen_paiement = v_last_moyen
  WHERE id = v_apprenant;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_apprenant_paiements_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.apprenant_paiements
FOR EACH ROW EXECUTE FUNCTION public.recalc_apprenant_paiements();
