-- PREPARED ONLY: no data change, backfill or production application.
-- Preserve the existing immutable-proof checks and ordinary slot authorization.
CREATE OR REPLACE FUNCTION public.emargement_date_non_passee(p_date date,p_maintenant timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT coalesce(p_date >= (p_maintenant AT TIME ZONE 'Europe/Paris')::date,false)
$$;
REVOKE ALL ON FUNCTION public.emargement_date_non_passee(date,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emargement_date_non_passee(date,timestamptz) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.garde_emargement_fenetre()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; BEGIN
IF TG_OP='UPDATE' AND (nullif(trim(coalesce(OLD.signature_data_url,'')),'') IS NOT NULL OR coalesce(OLD.absent,false)) AND (
NEW.signature_data_url IS DISTINCT FROM OLD.signature_data_url OR NEW.absent IS DISTINCT FROM OLD.absent OR NEW.date_emargement IS DISTINCT FROM OLD.date_emargement OR NEW.demi_journee IS DISTINCT FROM OLD.demi_journee OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.signed_at IS DISTINCT FROM OLD.signed_at OR NEW.regularisation_id IS DISTINCT FROM OLD.regularisation_id
) THEN RAISE EXCEPTION 'Signature enregistrée conservée : remplacement refusé' USING ERRCODE='P0541'; END IF;
IF nullif(trim(coalesce(NEW.signature_data_url,'')),'') IS NULL AND NOT coalesce(NEW.absent,false) THEN RETURN NEW; END IF;
IF TG_OP='UPDATE' AND NEW.signature_data_url IS NOT DISTINCT FROM OLD.signature_data_url AND NEW.absent IS NOT DISTINCT FROM OLD.absent AND NEW.date_emargement IS NOT DISTINCT FROM OLD.date_emargement AND NEW.demi_journee IS NOT DISTINCT FROM OLD.demi_journee THEN RETURN NEW; END IF;
IF TG_OP='UPDATE' AND(nullif(trim(coalesce(OLD.signature_data_url,'')),'') IS NOT NULL OR coalesce(OLD.absent,false)) THEN RAISE EXCEPTION 'Signature enregistrée conservée : remplacement refusé' USING ERRCODE='P0541'; END IF;
-- No admin, service-role, personal link or regularisation exception.
IF NOT public.emargement_date_non_passee(NEW.date_emargement,clock_timestamp()) THEN
 RAISE EXCEPTION 'Signature apprenant passée interdite : gestion administrative distincte requise' USING ERRCODE='P0541';
END IF;
r:=public.emargement_controle_creneau(NEW.apprenant_id,NEW.date_emargement,NEW.demi_journee);
IF coalesce((r->>'autorise')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Signature refusée : créneau non prévu ou ouverture trente minutes avant le début réel non atteinte' USING ERRCODE='P0541'; END IF;
NEW.signed_at:=clock_timestamp(); RETURN NEW; END $$;