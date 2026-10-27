CREATE TABLE public.documents_completes_brouillons_refuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  apprenant_id uuid,
  type_document text,
  donnees_refusees jsonb,
  role_auteur text DEFAULT current_user,
  auth_uid uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.documents_completes_brouillons_refuses TO authenticated;
GRANT ALL ON public.documents_completes_brouillons_refuses TO service_role;
ALTER TABLE public.documents_completes_brouillons_refuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les brouillons refuses" ON public.documents_completes_brouillons_refuses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.garde_brouillon_apres_validation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(OLD.donnees->>'_status','') = 'completed'
     AND COALESCE(NEW.donnees->>'_status','') <> 'completed'
     AND NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
    INSERT INTO public.documents_completes_brouillons_refuses(document_id, apprenant_id, type_document, donnees_refusees)
    VALUES (OLD.id, OLD.apprenant_id, OLD.type_document, NEW.donnees);
    RETURN OLD; -- écriture ignorée sans erreur : la version validée reste intacte
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_00_garde_brouillon_apres_validation
BEFORE UPDATE ON public.apprenant_documents_completes
FOR EACH ROW EXECUTE FUNCTION public.garde_brouillon_apres_validation();