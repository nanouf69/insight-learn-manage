
-- 1. Recreate updated_at trigger
DROP TRIGGER IF EXISTS trg_rdv_slots_updated ON public.rdv_carte_vtc_slots;
CREATE TRIGGER trg_rdv_slots_updated
BEFORE UPDATE ON public.rdv_carte_vtc_slots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_rdv_slots();

-- 2. Audit table
CREATE TABLE IF NOT EXISTS public.rdv_carte_vtc_slots_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  action text NOT NULL,
  actor_user_id uuid,
  actor_role text,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rdv_carte_vtc_slots_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit" ON public.rdv_carte_vtc_slots_audit;
CREATE POLICY "Admins read audit" ON public.rdv_carte_vtc_slots_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.audit_rdv_carte_vtc_slots()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.rdv_carte_vtc_slots_audit(slot_id, action, actor_user_id, actor_role, old_data, new_data)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    COALESCE(auth.role(), 'unknown'),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_rdv_slots_audit ON public.rdv_carte_vtc_slots;
CREATE TRIGGER trg_rdv_slots_audit
AFTER INSERT OR UPDATE OR DELETE ON public.rdv_carte_vtc_slots
FOR EACH ROW EXECUTE FUNCTION public.audit_rdv_carte_vtc_slots();

-- 3. Protect: forbid wiping a reserved slot to libre without explicit force flag
CREATE OR REPLACE FUNCTION public.protect_reserved_rdv_slot()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.statut = 'reserve'
     AND NEW.statut = 'libre'
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    -- Allow only admins, and require nom/prenom/email/telephone all cleared explicitly with notes containing FORCE_RESET
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Suppression d''un créneau réservé interdite';
    END IF;
    IF COALESCE(NEW.notes, '') NOT LIKE '%FORCE_RESET%' THEN
      RAISE EXCEPTION 'Pour libérer un créneau réservé, ajouter "FORCE_RESET" dans les notes';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_reserved_rdv_slot ON public.rdv_carte_vtc_slots;
CREATE TRIGGER trg_protect_reserved_rdv_slot
BEFORE UPDATE ON public.rdv_carte_vtc_slots
FOR EACH ROW EXECUTE FUNCTION public.protect_reserved_rdv_slot();
