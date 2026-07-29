-- =========================================================================
-- 1) devis_envois : signature publique protégée par jeton + colonnes verrouillées
-- =========================================================================

DROP POLICY IF EXISTS "Public can update devis signe" ON public.devis_envois;

CREATE OR REPLACE FUNCTION public.protect_devis_envois_public_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Admins et service_role gardent tous les droits
  IF COALESCE(auth.role(), '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Toute autre origine (anon / authenticated non-admin) ne peut modifier
  -- que les colonnes strictement nécessaires à la signature.
  IF NEW.id              IS DISTINCT FROM OLD.id
     OR NEW.token           IS DISTINCT FROM OLD.token
     OR NEW.apprenant_id    IS DISTINCT FROM OLD.apprenant_id
     OR NEW.modele          IS DISTINCT FROM OLD.modele
     OR NEW.montant         IS DISTINCT FROM OLD.montant
     OR NEW.formation       IS DISTINCT FROM OLD.formation
     OR NEW.fichier_url     IS DISTINCT FROM OLD.fichier_url
     OR NEW.dates_formation IS DISTINCT FROM OLD.dates_formation
     OR NEW.date_devis      IS DISTINCT FROM OLD.date_devis
     OR NEW.date_validite   IS DISTINCT FROM OLD.date_validite
     OR NEW.created_at      IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'devis_envois: seules les colonnes de signature peuvent être modifiées publiquement';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_devis_envois_public_columns ON public.devis_envois;
CREATE TRIGGER protect_devis_envois_public_columns
  BEFORE UPDATE ON public.devis_envois
  FOR EACH ROW EXECUTE FUNCTION public.protect_devis_envois_public_columns();

-- Politique UPDATE : jeton présent et non trivial + devis encore non signé (USING),
-- et l'update doit poser une URL de devis signé (WITH CHECK). Le trigger ci-dessus
-- verrouille les autres colonnes.
CREATE POLICY "Public can sign devis with valid token"
  ON public.devis_envois
  FOR UPDATE
  TO anon, authenticated
  USING (
    token IS NOT NULL
    AND length(token) >= 20
    AND devis_signe_url IS NULL
  )
  WITH CHECK (
    token IS NOT NULL
    AND length(token) >= 20
    AND devis_signe_url IS NOT NULL
  );

-- =========================================================================
-- 2) quiz_questions_overrides : suppression des policies publiques trop larges
-- =========================================================================

DROP POLICY IF EXISTS "Fournisseurs can insert quiz_overrides" ON public.quiz_questions_overrides;
DROP POLICY IF EXISTS "Fournisseurs can update quiz_overrides" ON public.quiz_questions_overrides;
DROP POLICY IF EXISTS "Fournisseurs can delete quiz_overrides" ON public.quiz_questions_overrides;
-- Les policies "Admins can manage quiz_overrides" et "Authenticated can read quiz_overrides"
-- sont volontairement conservées.
