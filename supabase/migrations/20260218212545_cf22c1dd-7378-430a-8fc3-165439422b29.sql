-- Ajout d'un mode "factures uniquement" pour certains fournisseurs
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS factures_only boolean DEFAULT false;

-- Ajout du mois/année concerné sur les factures fournisseurs
ALTER TABLE public.fournisseur_factures ADD COLUMN IF NOT EXISTS mois_annee text;
