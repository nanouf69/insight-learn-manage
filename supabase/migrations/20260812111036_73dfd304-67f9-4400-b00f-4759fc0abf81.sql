CREATE TABLE public.factures_supprimees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id uuid,
  numero text NOT NULL,
  client_nom text,
  type_financement text,
  montant_ttc numeric,
  date_emission date,
  statut text,
  motif text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_by uuid,
  deleted_by_email text,
  deleted_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.factures_supprimees TO authenticated;
GRANT ALL ON public.factures_supprimees TO service_role;

ALTER TABLE public.factures_supprimees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deleted invoices trace"
ON public.factures_supprimees FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can log deleted invoices"
ON public.factures_supprimees FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND deleted_by = auth.uid());

CREATE INDEX idx_factures_supprimees_deleted_at ON public.factures_supprimees (deleted_at DESC);