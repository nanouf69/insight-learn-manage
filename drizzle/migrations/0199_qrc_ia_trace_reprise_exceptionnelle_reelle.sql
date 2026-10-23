-- 0199 (23/10/2026) : traçabilité des appels IA QRC + reprise exceptionnelle bornée de 6 QRC.
-- (0198 était un marqueur vide appliqué par erreur, sans effet.)
-- Additif uniquement : aucune ligne existante modifiée, aucune note, réponse ou question touchée.
ALTER TABLE public.qrc_ia_reprises ADD COLUMN IF NOT EXISTS trace jsonb;
ALTER TABLE public.qrc_ia_reprises ADD COLUMN IF NOT EXISTS exceptionnelle boolean NOT NULL DEFAULT false;
ALTER TABLE public.qrc_ia_corrections ADD COLUMN IF NOT EXISTS trace jsonb;
ALTER TABLE public.qrc_ia_corrections ADD COLUMN IF NOT EXISTS run_id text;
COMMENT ON COLUMN public.qrc_ia_reprises.trace IS 'Étapes horodatées de l''appel IA (requête, en-têtes, premier événement, fin, abandon local), code passerelle réel et code local distincts. Jamais de contenu ni de secret.';
COMMENT ON COLUMN public.qrc_ia_corrections.trace IS 'Même trace que qrc_ia_reprises.trace, pour l''appel initial.';

CREATE TABLE IF NOT EXISTS public.qrc_ia_reprise_exceptionnelle_constats (
  qrc_instance_id uuid PRIMARY KEY REFERENCES public.qrc_instances_v2(qrc_instance_id),
  attempt_id uuid NOT NULL,
  correction_id uuid NOT NULL,
  reponse_hash text NOT NULL,
  passerelle_log_id text NOT NULL UNIQUE,
  passerelle_run_id text NOT NULL UNIQUE,
  passerelle_statut integer NOT NULL CHECK (passerelle_statut = 499),
  passerelle_jetons_sortie integer NOT NULL CHECK (passerelle_jetons_sortie = 0),
  passerelle_duree_ms integer NOT NULL,
  passerelle_fin_at timestamptz NOT NULL,
  autorisation text NOT NULL,
  constate_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.qrc_ia_reprise_exceptionnelle_constats TO authenticated;
GRANT ALL ON public.qrc_ia_reprise_exceptionnelle_constats TO service_role;
ALTER TABLE public.qrc_ia_reprise_exceptionnelle_constats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS constats_admin_lecture ON public.qrc_ia_reprise_exceptionnelle_constats;
CREATE POLICY constats_admin_lecture ON public.qrc_ia_reprise_exceptionnelle_constats FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.qrc_ia_constat_immuable() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Constat de reprise immuable' USING ERRCODE='P0498'; END $$;
DROP TRIGGER IF EXISTS trg_qrc_ia_constat_immuable ON public.qrc_ia_reprise_exceptionnelle_constats;
CREATE TRIGGER trg_qrc_ia_constat_immuable BEFORE UPDATE OR DELETE ON public.qrc_ia_reprise_exceptionnelle_constats
  FOR EACH ROW EXECUTE FUNCTION public.qrc_ia_constat_immuable();

INSERT INTO public.qrc_ia_reprise_exceptionnelle_constats
 (qrc_instance_id, attempt_id, correction_id, reponse_hash, passerelle_log_id, passerelle_run_id, passerelle_statut, passerelle_jetons_sortie, passerelle_duree_ms, passerelle_fin_at, autorisation)
VALUES
 ('4814bf89-d0e3-484f-9a94-143eaa113ec9','f129b372-951f-42a8-95b0-d6421ace164b','fb39976a-d884-477a-b556-b13a97476ef9','3a3468fa89b2ab7cbfe5400858a8ec0066e9e8defa9a64c993b5f24210244df8','01a16437-3a60-744e-9f46-fdacd27d48fb','01a16437-3a60-7454-a915-ef7deb18bfbc',499,0,59963,'2026-10-22 15:26:03+00','Naoufal 23/10/2026 « Des correctifs » : reprise unique'),
 ('6f0e5f81-98c9-4ec7-aee6-97004edabb78','f129b372-951f-42a8-95b0-d6421ace164b','26f22532-1dcf-4c2f-a327-f7c02276fcc0','3a3468fa89b2ab7cbfe5400858a8ec0066e9e8defa9a64c993b5f24210244df8','01a16441-47e4-775f-beef-acfe4d01641d','01a16441-47e4-7764-be09-907dee7b51b2',499,0,59972,'2026-10-22 15:37:02+00','Naoufal 23/10/2026 « Des correctifs » : reprise unique'),
 ('972083aa-6b40-4523-baf0-e823c6afc3cb','0ffd1d8e-90ee-4a4b-b551-039850013ec5','bd9a428e-43f0-413d-82b9-2c2ba2693122','3a3468fa89b2ab7cbfe5400858a8ec0066e9e8defa9a64c993b5f24210244df8','01a16445-d9e2-7a8d-852c-4e294534bf1d','01a16445-d9e2-7a91-af98-0df8d0efe4a2',499,0,59930,'2026-10-22 15:42:01+00','Naoufal 23/10/2026 « Des correctifs » : reprise unique'),
 ('8161a9b6-6fab-48c5-af94-c7cfce9e9965','7bb05127-90a6-4ec4-b95a-2e36a19f4dfc','43e410b5-cde9-499d-a1eb-c48ba22cdd54','3a3468fa89b2ab7cbfe5400858a8ec0066e9e8defa9a64c993b5f24210244df8','01a16447-aed9-70df-82e4-d54c854812a5','01a16447-aed9-70e5-ac89-ba59ebfae0a4',499,0,59974,'2026-10-22 15:44:01+00','Naoufal 23/10/2026 « Des correctifs » : reprise unique'),
 ('b64b7b6f-f739-4a67-9411-18d6f7df1166','5c329b15-7981-420d-9b2b-e9cfaf8c3d05','ec26c05a-f77a-4c5f-a301-f585a78c09d4','3a3468fa89b2ab7cbfe5400858a8ec0066e9e8defa9a64c993b5f24210244df8','01a16449-8349-7477-bcf5-8f6986b86c73','01a16449-8349-747c-92cd-05bbce4d7d24',499,0,59901,'2026-10-22 15:46:01+00','Naoufal 23/10/2026 « Des correctifs » : reprise unique'),
 ('58229778-73a7-4db6-bb7d-6babdf103ae2','5c329b15-7981-420d-9b2b-e9cfaf8c3d05','0043314e-693a-4fd7-83cf-ce6c7d1faeb3','3a3468fa89b2ab7cbfe5400858a8ec0066e9e8defa9a64c993b5f24210244df8','01a16450-d5e6-7659-a0de-c35149d450d9','01a16450-d5e6-765e-a478-700b9b305126',499,0,59970,'2026-10-22 15:54:01+00','Naoufal 23/10/2026 « Des correctifs » : reprise unique')
ON CONFLICT (qrc_instance_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.qrc_ia_reserver_reprise_exceptionnelle(p_qrc uuid, p_base jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE k public.qrc_ia_reprise_exceptionnelle_constats; q public.qrc_instances_v2; a public.qrc_ia_corrections; nouveau uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO k FROM public.qrc_ia_reprise_exceptionnelle_constats WHERE qrc_instance_id=p_qrc;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=p_qrc FOR UPDATE;
 IF NOT FOUND OR q.etat<>'en_attente' OR q.attempt_id<>k.attempt_id OR q.apprenant_id='c0844007-b999-4385-9665-918e5077c3b5' THEN RETURN NULL; END IF;
 IF p_base->>'attempt_id' IS DISTINCT FROM q.attempt_id::text OR p_base->>'apprenant_id' IS DISTINCT FROM q.apprenant_id::text OR p_base->>'question_id' IS DISTINCT FROM q.question_id THEN RAISE EXCEPTION 'Identite incoherente'; END IF;
 IF p_base->>'reponse_hash' IS DISTINCT FROM k.reponse_hash THEN RAISE EXCEPTION 'Version reponse incoherente'; END IF;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND pause_depuis IS NOT NULL) THEN RETURN NULL; END IF;
 SELECT * INTO a FROM public.qrc_ia_corrections WHERE id=k.correction_id AND qrc_instance_id=p_qrc;
 IF NOT FOUND OR a.statut<>'a_verifier' OR a.http_status<>504 OR a.motif NOT LIKE 'timeout_local_issue_inconnue%' OR a.note IS NOT NULL OR a.termine_at IS NULL OR a.reponse_hash IS DISTINCT FROM k.reponse_hash THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_corrections WHERE qrc_instance_id=p_qrc AND statut='appliquee') THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_reprises WHERE qrc_instance_id=p_qrc) THEN RETURN NULL; END IF;
 INSERT INTO public.qrc_ia_reprises(qrc_instance_id,base,numero,exceptionnelle)
 VALUES(p_qrc, p_base || jsonb_build_object('constat_passerelle', k.passerelle_log_id), 1, true)
 ON CONFLICT (qrc_instance_id, numero) DO NOTHING RETURNING id INTO nouveau;
 RETURN nouveau;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_reserver_reprise_exceptionnelle(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_reserver_reprise_exceptionnelle(uuid,jsonb) TO service_role;