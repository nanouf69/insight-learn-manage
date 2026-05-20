ALTER TABLE public.fournisseur_shared_docs
ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sent_to text;