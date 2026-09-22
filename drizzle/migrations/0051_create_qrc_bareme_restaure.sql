CREATE TABLE public.qrc_bareme_restaure (
  qrc_instance_id UUID PRIMARY KEY REFERENCES public.qrc_instances_v2(qrc_instance_id),
  bareme NUMERIC NOT NULL CHECK (bareme > 0),
  mention TEXT NOT NULL DEFAULT 'Barème historique restauré à partir d''une preuve concordante',
  nb_preuves INTEGER NOT NULL,
  preuves JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.qrc_bareme_restaure IS 'Barème historique retrouvé par preuve concordante (meme examen + matiere + identifiant de question + enonce strictement identique). N''altere jamais le snapshot, la reponse de l''eleve ni les corrections historiques.';

GRANT SELECT ON public.qrc_bareme_restaure TO authenticated;
GRANT ALL ON public.qrc_bareme_restaure TO service_role;

ALTER TABLE public.qrc_bareme_restaure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des baremes restaures par admin"
ON public.qrc_bareme_restaure FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Lecture des baremes restaures par proprietaire"
ON public.qrc_bareme_restaure FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.qrc_instances_v2 q
  WHERE q.qrc_instance_id = qrc_bareme_restaure.qrc_instance_id
    AND public.core_est_proprietaire(q.apprenant_id)
));

CREATE OR REPLACE FUNCTION public.qrc_bareme_restaure_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Barème restauré immuable (append-only)';
END;
$$;

CREATE TRIGGER trg_qrc_bareme_restaure_append_only
BEFORE UPDATE OR DELETE ON public.qrc_bareme_restaure
FOR EACH ROW EXECUTE FUNCTION public.qrc_bareme_restaure_append_only();