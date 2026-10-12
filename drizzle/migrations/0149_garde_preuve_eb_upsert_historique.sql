CREATE OR REPLACE FUNCTION public.garde_preuve_examens_blancs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.module_id NOT IN (35,36,37,38) OR NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status='completed' THEN RETURN NEW; END IF;
  -- INSERT ... ON CONFLICT : le BEFORE INSERT s'exécute avant la résolution du conflit ;
  -- une ligne déjà « completed » (historique) laisse passer, la ligne n'est pas modifiée ici.
  IF TG_OP='INSERT' AND EXISTS (SELECT 1 FROM public.apprenant_module_completion c
       WHERE c.apprenant_id=NEW.apprenant_id AND c.module_id=NEW.module_id AND c.status='completed') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF public.examens_blancs_preuve_soumission(NEW.apprenant_id, NEW.module_id) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'MODULE_INCOMPLET: examens blancs 6/6 non soumis (module %)', NEW.module_id USING ERRCODE='P0501';
END;
$$;