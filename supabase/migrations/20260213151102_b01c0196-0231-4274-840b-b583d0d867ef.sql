
-- Table pour stocker les réservations de formation pratique
CREATE TABLE public.reservations_pratique (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  date_choisie DATE NOT NULL,
  type_formation TEXT NOT NULL, -- 'vtc' ou 'taxi'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Un apprenant ne peut réserver qu'une seule fois
  CONSTRAINT unique_reservation_apprenant UNIQUE (apprenant_id)
);

-- Enable RLS
ALTER TABLE public.reservations_pratique ENABLE ROW LEVEL SECURITY;

-- Policies publiques (les apprenants accèdent via lien sans auth)
CREATE POLICY "Allow public select reservations_pratique"
ON public.reservations_pratique FOR SELECT
USING (true);

CREATE POLICY "Allow public insert reservations_pratique"
ON public.reservations_pratique FOR INSERT
WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admins can manage reservations_pratique"
ON public.reservations_pratique FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
