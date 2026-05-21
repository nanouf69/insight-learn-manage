
CREATE TABLE IF NOT EXISTS public.creneaux_rdv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL UNIQUE,
  apprenant_id uuid REFERENCES public.apprenants(id) ON DELETE CASCADE UNIQUE,
  nom text NOT NULL,
  telephone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creneaux_rdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creneaux_rdv REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'creneaux_rdv'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.creneaux_rdv';
  END IF;
END $$;

-- Public read (needed for realtime on /booking)
CREATE POLICY "creneaux_rdv public read"
ON public.creneaux_rdv FOR SELECT
USING (true);

-- Public insert validated by trigger
CREATE POLICY "creneaux_rdv public insert"
ON public.creneaux_rdv FOR INSERT
WITH CHECK (true);

-- Admin can update / delete
CREATE POLICY "creneaux_rdv admin update"
ON public.creneaux_rdv FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "creneaux_rdv admin delete"
ON public.creneaux_rdv FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Validation trigger: only apprenants with exam on 26 mai can book; only valid slots
CREATE OR REPLACE FUNCTION public.validate_creneau_rdv()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date text;
  v_valid_slots text[] := ARRAY[
    '11:00','11:15','11:30','11:45',
    '12:00','12:15','12:30','12:45',
    '13:00','13:15','13:30','13:45'
  ];
BEGIN
  IF NEW.slot IS NULL OR NOT (NEW.slot = ANY(v_valid_slots)) THEN
    RAISE EXCEPTION 'Créneau invalide';
  END IF;

  IF NEW.apprenant_id IS NULL THEN
    RAISE EXCEPTION 'apprenant_id requis';
  END IF;

  SELECT lower(coalesce(date_examen_theorique, ''))
    INTO v_date
  FROM public.apprenants
  WHERE id = NEW.apprenant_id;

  IF v_date IS NULL THEN
    RAISE EXCEPTION 'Apprenant introuvable';
  END IF;

  IF v_date NOT LIKE '%26 mai%'
     AND v_date NOT LIKE '%2025-05-26%'
     AND v_date NOT LIKE '%2026-05-26%'
     AND v_date NOT LIKE '%26/05/2025%'
     AND v_date NOT LIKE '%26/05/2026%' THEN
    RAISE EXCEPTION 'Cet apprenant n''a pas d''examen le 26 mai';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_creneau_rdv ON public.creneaux_rdv;
CREATE TRIGGER trg_validate_creneau_rdv
BEFORE INSERT ON public.creneaux_rdv
FOR EACH ROW EXECUTE FUNCTION public.validate_creneau_rdv();
