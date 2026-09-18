-- Sauvegarde exacte (retour arrière possible) des lignes techniques « 0 »
-- créées par l'ancien filet de sécurité, avant toute opération de réparation.
CREATE TABLE IF NOT EXISTS public.backup_resultats_0_technique (
  backup_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL,
  apprenant_id uuid,
  user_id uuid,
  quiz_type text,
  quiz_id text,
  quiz_titre text,
  matiere_id text,
  matiere_nom text,
  score_obtenu numeric,
  score_max numeric,
  note_sur_20 numeric,
  reussi boolean,
  details jsonb,
  duree_secondes integer,
  completed_at timestamptz,
  created_at timestamptz,
  tentative integer
);

GRANT SELECT ON public.backup_resultats_0_technique TO authenticated;
GRANT ALL ON public.backup_resultats_0_technique TO service_role;

ALTER TABLE public.backup_resultats_0_technique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins peuvent lire la sauvegarde"
ON public.backup_resultats_0_technique
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));