-- Additif uniquement : aucune donnée apprenant lue en écriture, aucune fiche existante modifiée.
CREATE TABLE IF NOT EXISTS public.module_regles_validation (
  module_id integer PRIMARY KEY,
  nom text NOT NULL,
  type_activite text NOT NULL,
  contient_questions boolean,
  source_questions text NOT NULL DEFAULT 'inconnue',
  regle_fin text NOT NULL,
  protection_serveur boolean NOT NULL DEFAULT false,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.module_regles_validation TO authenticated;
GRANT ALL ON public.module_regles_validation TO service_role;
ALTER TABLE public.module_regles_validation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture règles modules" ON public.module_regles_validation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gère règles modules" ON public.module_regles_validation FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.module_regles_validation (module_id, nom, type_activite, contient_questions, source_questions, regle_fin, protection_serveur, note) VALUES
 (1,'1.INTRODUCTION PRÉSENTIEL','cours+test','true','serveur','au moins 1 réponse enregistrée',true,'questions connues du serveur'),
 (26,'1.INTRODUCTION E-LEARNING','cours+test','true','code','au moins 1 réponse enregistrée',true,'49/50 terminés historiques ont des réponses'),
 (31,'1.INTRODUCTION TA','cours+test','true','code','à décider',false,'8/11 terminés avec réponses : test peut-être facultatif'),
 (33,'1.INTRODUCTION VA','cours+test','true','code','au moins 1 réponse enregistrée',true,'2/2 avec réponses'),
 (3,'3.FORMULES','fiches+exercices','true','code','à décider',false,'44/71 terminés avec réponses : exercices peut-être facultatifs (libre accès TAXI)'),
 (13,'CONTRÔLE DE CONNAISSANCES TAXI','quiz','true','serveur','au moins 1 réponse enregistrée',true,'questions connues du serveur'),
 (50,'FIN DE FORMATION VTC','pages','false','aucune','fin des pages',false,'aucune réponse jamais enregistrée : contenu seul'),
 (51,'FIN DE FORMATION TAXI','pages','false','aucune','fin des pages',false,'contenu seul'),
 (52,'FIN DE FORMATION TA','pages','false','aucune','fin des pages',false,'contenu seul'),
 (53,'FIN DE FORMATION VA','pages','false','aucune','fin des pages',false,'contenu seul'),
 (60,'SOURCES JURIDIQUES VTC','pages+exercices','true','code','à décider',false,'4/7 terminés avec réponses'),
 (61,'SOURCES JURIDIQUES TAXI','pages','false','aucune','fin des pages',false,'aucune réponse enregistrée'),
 (62,'SOURCES JURIDIQUES TA','pages+exercices','true','code','à décider',false,'2/2 avec réponses, échantillon trop petit'),
 (63,'SOURCES JURIDIQUES VA','pages+exercices','true','code','à décider',false,'2/2 avec réponses, échantillon trop petit'),
 (64,'ÉQUIPEMENTS TAXI','cours+exercices','true','code','à décider',false,'10/20 terminés avec réponses'),
 (70,'FICHES RÉVISIONS VTC','pages','false','aucune','fin des pages',false,'contenu seul'),
 (71,'FICHES RÉVISIONS TAXI','pages','false','aucune','fin des pages',false,'contenu seul'),
 (72,'FICHES RÉVISIONS TA','pages','false','aucune','fin des pages',false,'contenu seul'),
 (73,'FICHES RÉVISIONS VA','pages','false','aucune','fin des pages',false,'contenu seul'),
 (81,'BILAN EXERCICES FC VTC','quiz','true','code','au moins 1 réponse enregistrée',true,'33/33 avec réponses'),
 (82,'BILAN EXERCICES FC TAXI','quiz','true','code','au moins 1 réponse enregistrée',true,'3/3 avec réponses'),
 (95,'QCM 100 QUESTIONS FC TAXI','quiz','true','code','au moins 1 réponse enregistrée',true,'3/3 avec réponses'),
 (96,'QUIZZ VILLE DE LYON','quiz','true','code','au moins 1 réponse enregistrée',true,'3/3 avec réponses'),
 (90,'COURS MOBILITÉ TAXI','cours+exercices','true','code','à décider',false,'aucun historique'),
 (35,'EXAMENS BLANCS VTC','examens blancs','false','moteur examens','règles du moteur examens blancs',false,'hors validation module'),
 (36,'EXAMENS BLANCS TAXI','examens blancs','false','moteur examens','règles du moteur examens blancs',false,'hors validation module'),
 (83,'REMBOURSEMENT / ÉMARGEMENTS VTC','documents','false','aucune','formulaire/document',false,'contenu seul'),
 (84,'FEUILLES D''ÉMARGEMENT TAXI','documents','false','aucune','formulaire/document',false,'contenu seul'),
 (85,'INFORMATIONS FINANCEUR VTC','documents','false','aucune','formulaire/document',false,'contenu seul'),
 (86,'INFORMATIONS FINANCEUR TAXI','documents','false','aucune','formulaire/document',false,'contenu seul'),
 (94,'REMBOURSEMENT FC TAXI','documents','false','aucune','formulaire/document',false,'contenu seul')
ON CONFLICT (module_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.comptes_test_techniques (
  apprenant_id uuid PRIMARY KEY,
  libelle text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comptes_test_techniques TO authenticated;
GRANT ALL ON public.comptes_test_techniques TO service_role;
ALTER TABLE public.comptes_test_techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lit comptes test" ON public.comptes_test_techniques FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gère comptes test" ON public.comptes_test_techniques FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Signalements administratifs calculés à la volée (lecture seule, aucune écriture).
CREATE OR REPLACE FUNCTION public.admin_signalements_validation_modules()
RETURNS TABLE (apprenant_id uuid, nom text, prenom text, module_id integer, completed_at timestamptz, type_signalement text, est_compte_test boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'réservé aux administrateurs';
  END IF;
  RETURN QUERY
  WITH q AS (
    SELECT m.module_id FROM public.module_editor_state m,
      jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices')='array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) e
    WHERE jsonb_typeof(e->'questions')='array' AND jsonb_array_length(e->'questions')>0
    UNION SELECT r.module_id FROM public.module_regles_validation r WHERE r.contient_questions IS TRUE
  ), c AS (
    SELECT amc.apprenant_id, amc.module_id, amc.completed_at, amc.details,
      EXISTS (SELECT 1 FROM public.reponses_apprenants ra WHERE ra.apprenant_id=amc.apprenant_id
              AND ra.exercice_id LIKE 'module\_'||amc.module_id||'\_%') AS a_fiche,
      EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(amc.details)='array' THEN amc.details ELSE '[]'::jsonb END) d
              WHERE d->'reponseEleve' IS NOT NULL AND (d->'reponseEleve')::text NOT IN ('null','""','[]','{}')) AS a_prog
    FROM public.apprenant_module_completion amc
    WHERE amc.status='completed' AND amc.module_id IN (SELECT DISTINCT module_id FROM q)
  )
  SELECT c.apprenant_id, a.nom, a.prenom, c.module_id, c.completed_at,
    CASE WHEN NOT c.a_fiche AND NOT c.a_prog THEN 'validation_sans_reponse'
         ELSE 'reponses_dans_progression_seulement' END,
    EXISTS (SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=c.apprenant_id)
      OR a.nom ILIKE 'TEST%' OR a.nom ILIKE 'DEMO%' OR a.nom ILIKE 'DEBUG%'
  FROM c JOIN public.apprenants a ON a.id=c.apprenant_id
  WHERE NOT c.a_fiche
  ORDER BY 6, c.completed_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_signalements_validation_modules() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_signalements_validation_modules() TO authenticated;

-- Validation « Terminé » : ajoute la source de vérité serveur des modules définis dans le code.
CREATE OR REPLACE FUNCTION public.save_module_completion(_apprenant_id uuid, _module_id integer, _completed boolean DEFAULT false, _progress integer DEFAULT 0, _score_obtenu integer DEFAULT NULL::integer, _score_max integer DEFAULT NULL::integer, _details jsonb DEFAULT NULL::jsonb)
 RETURNS apprenant_module_completion
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed BOOLEAN;
  result public.apprenant_module_completion;
  v_deja_termine boolean;
  v_nb_questions bigint := 0;
  v_preuve boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
    OR current_setting('role', true) = 'service_role'
  INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'not authorized for this apprenant';
  END IF;

  IF _completed THEN
    SELECT EXISTS (SELECT 1 FROM public.apprenant_module_completion
                    WHERE apprenant_id = _apprenant_id AND module_id = _module_id AND status = 'completed')
      INTO v_deja_termine;
    IF NOT v_deja_termine THEN
      SELECT COALESCE(SUM(CASE WHEN jsonb_typeof(e->'questions') = 'array' THEN jsonb_array_length(e->'questions') ELSE 0 END), 0)
        INTO v_nb_questions
        FROM public.module_editor_state m,
             jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices') = 'array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) e
       WHERE m.module_id = _module_id;
      IF v_nb_questions = 0 AND EXISTS (SELECT 1 FROM public.module_regles_validation r
                                         WHERE r.module_id = _module_id AND r.protection_serveur AND r.contient_questions IS TRUE) THEN
        v_nb_questions := 1;
      END IF;
      IF v_nb_questions > 0 THEN
        v_preuve := EXISTS (
            SELECT 1 FROM public.reponses_apprenants r, jsonb_each(r.reponses) x
             WHERE r.apprenant_id = _apprenant_id
               AND r.exercice_id LIKE 'module\_' || _module_id || '\_%'
               AND x.value::text NOT IN ('null', '""', '[]', '{}'))
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_details) = 'array' THEN _details ELSE '[]'::jsonb END) d
             WHERE d->'reponseEleve' IS NOT NULL
               AND (d->'reponseEleve')::text NOT IN ('null', '""', '[]', '{}'));
        IF NOT v_preuve THEN
          RAISE EXCEPTION 'MODULE_INCOMPLET: aucune réponse enregistrée pour ce module' USING ERRCODE = 'P0501';
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.apprenant_module_completion AS amc
    (apprenant_id, module_id, status, progress, completed_at, score_obtenu, score_max, details)
  VALUES (
    _apprenant_id, _module_id,
    CASE WHEN _completed THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN _completed THEN 100 ELSE GREATEST(COALESCE(_progress, 0), 0) END,
    now(), _score_obtenu, _score_max, COALESCE(_details, '[]'::jsonb)
  )
  ON CONFLICT (apprenant_id, module_id) DO UPDATE
  SET status = CASE WHEN amc.status = 'completed' OR _completed THEN 'completed' ELSE 'in_progress' END,
      progress = GREATEST(COALESCE(amc.progress, 0), COALESCE(_progress, 0), CASE WHEN _completed THEN 100 ELSE 0 END),
      completed_at = CASE WHEN amc.status = 'completed' THEN amc.completed_at
                          WHEN _completed THEN now() ELSE amc.completed_at END,
      score_obtenu = COALESCE(_score_obtenu, amc.score_obtenu),
      score_max = COALESCE(_score_max, amc.score_max),
      details = CASE
                  WHEN _details IS NULL THEN amc.details
                  WHEN amc.status = 'completed' AND jsonb_array_length(COALESCE(_details, '[]'::jsonb)) = 0 THEN amc.details
                  ELSE _details
                END
  RETURNING * INTO result;

  RETURN result;
END;
$function$;