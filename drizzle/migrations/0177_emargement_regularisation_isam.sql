CREATE TABLE public.emargement_regularisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  apprenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  creneaux jsonb NOT NULL,
  motif text NOT NULL,
  autorise_par text NOT NULL,
  expire_le timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.emargement_regularisations TO authenticated;
GRANT ALL ON public.emargement_regularisations TO service_role;
ALTER TABLE public.emargement_regularisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Propre autorisation ou admin" ON public.emargement_regularisations FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.emargement_regularisations_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='P0540', MESSAGE='Autorisation de régularisation immuable (append-only)'; END $$;
CREATE TRIGGER trg_emargement_regularisations_append_only BEFORE UPDATE OR DELETE ON public.emargement_regularisations
  FOR EACH ROW EXECUTE FUNCTION public.emargement_regularisations_append_only();

ALTER TABLE public.emargements_fc ADD COLUMN IF NOT EXISTS regularisation_id uuid NULL;
ALTER TABLE public.emargements_fc ADD COLUMN IF NOT EXISTS confirme_presence_creneau boolean NOT NULL DEFAULT false;

INSERT INTO public.emargement_regularisations(id, auth_user_id, apprenant_id, session_id, creneaux, motif, autorise_par, expire_le)
SELECT 'c3a1e0d2-5b7f-4e2a-9d41-0b6f2e8a1c19','4b25b662-2c6a-4370-bd3b-8ffaee5db2a4','83e01f35-519a-45a0-8496-600ec9cb65f2','20a69b8e-fdf6-4fad-a1e6-666a0997a6c1',
 (SELECT jsonb_agg(jsonb_build_object('date',d::text,'creneau',c) ORDER BY d,c)
    FROM unnest(ARRAY['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25']::date[]) d,
         unnest(ARRAY['soir_1','soir_2']) c),
 'Régularisation émargements théorie soir 14–27/09/2026 : signature uniquement si présence réelle confirmée créneau par créneau ; aucune signature pré-remplie',
 'admin naoufal guenichi (demande 19/10/2026 15h57 Paris)', '2026-11-30T23:59:59+01:00';

-- Rattachement du dossier présentiel à la session (ajout, ancien rattachement e-learning conservé)
INSERT INTO public.session_apprenants(session_id, apprenant_id, mode_financement, date_debut, date_fin, notes)
SELECT '20a69b8e-fdf6-4fad-a1e6-666a0997a6c1','83e01f35-519a-45a0-8496-600ec9cb65f2','personnel','2026-09-14','2026-09-27',
 'Rattachement présentiel ajouté 19/10/2026 (demande admin) ; ancienne inscription e-learning f58c2d45 conservée'
WHERE NOT EXISTS (SELECT 1 FROM public.session_apprenants WHERE session_id='20a69b8e-fdf6-4fad-a1e6-666a0997a6c1' AND apprenant_id='83e01f35-519a-45a0-8496-600ec9cb65f2');
-- Même élève déjà compté dans la session via l'autre dossier : pas de liste d'attente
UPDATE public.session_apprenants SET liste_attente=false
 WHERE session_id='20a69b8e-fdf6-4fad-a1e6-666a0997a6c1' AND apprenant_id='83e01f35-519a-45a0-8496-600ec9cb65f2';
-- Évite le double compte : l'ancien rattachement e-learning reste mais n'attend plus de signatures
UPDATE public.session_apprenants SET emargements_exclus=true,
 notes=coalesce(notes||' | ','')||'19/10/2026 : émargements portés par le dossier présentiel 83e01f35 (inscription conservée)'
 WHERE id='f58c2d45-4d73-429b-bf09-3c01f02c94e8';