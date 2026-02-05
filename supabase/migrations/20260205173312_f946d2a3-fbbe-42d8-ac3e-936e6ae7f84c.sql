-- Ajouter les champs notes et paiement à session_apprenants
ALTER TABLE public.session_apprenants 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS montant_paye NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS moyen_paiement TEXT,
ADD COLUMN IF NOT EXISTS montant_total NUMERIC DEFAULT 0;

-- Ajouter la policy UPDATE manquante
CREATE POLICY "Allow public update session_apprenants" 
ON public.session_apprenants 
FOR UPDATE 
USING (true);