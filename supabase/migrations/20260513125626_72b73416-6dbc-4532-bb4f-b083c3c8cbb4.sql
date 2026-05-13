CREATE TABLE public.rdv_carte_vtc_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  heure TIME NOT NULL,
  statut TEXT NOT NULL DEFAULT 'libre',
  nom TEXT,
  prenom TEXT,
  email TEXT,
  telephone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rdv_carte_vtc_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_rdv" ON public.rdv_carte_vtc_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_rdv" ON public.rdv_carte_vtc_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_rdv" ON public.rdv_carte_vtc_slots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_rdv" ON public.rdv_carte_vtc_slots FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_rdv_slots_date ON public.rdv_carte_vtc_slots(date, heure);

CREATE OR REPLACE FUNCTION public.set_updated_at_rdv_slots()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_rdv_slots_updated
  BEFORE UPDATE ON public.rdv_carte_vtc_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_rdv_slots();