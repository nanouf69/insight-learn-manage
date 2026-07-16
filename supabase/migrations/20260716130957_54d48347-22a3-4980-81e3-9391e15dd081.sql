
CREATE TABLE public.apprenant_appels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  date_appel TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sujet TEXT NOT NULL,
  notes TEXT,
  direction TEXT NOT NULL DEFAULT 'sortant',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_apprenant_appels_apprenant_id ON public.apprenant_appels(apprenant_id);
CREATE INDEX idx_apprenant_appels_date ON public.apprenant_appels(date_appel DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apprenant_appels TO authenticated;
GRANT ALL ON public.apprenant_appels TO service_role;

ALTER TABLE public.apprenant_appels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select appels" ON public.apprenant_appels FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert appels" ON public.apprenant_appels FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update appels" ON public.apprenant_appels FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete appels" ON public.apprenant_appels FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_apprenant_appels_updated_at
  BEFORE UPDATE ON public.apprenant_appels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
