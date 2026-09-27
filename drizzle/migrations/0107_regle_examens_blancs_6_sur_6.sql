-- Règle serveur modules Examens blancs 35/36/37/38 : 6/6 examens terminés.
-- Mode rapport seulement : aucune écriture, aucun déclenchement automatique.
CREATE TABLE IF NOT EXISTS public.examens_blancs_parcours (
  module_id integer NOT NULL,
  exam_id text NOT NULL,
  PRIMARY KEY (module_id, exam_id)
);
GRANT SELECT ON public.examens_blancs_parcours TO authenticated;
GRANT ALL ON public.examens_blancs_parcours TO service_role;
ALTER TABLE public.examens_blancs_parcours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture parcours examens blancs" ON public.examens_blancs_parcours
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.examens_blancs_parcours (module_id, exam_id) VALUES
 (35,'EB1'),(35,'EB2'),(35,'EB3'),(35,'EB4'),(35,'EB5'),(35,'EB6'),
 (36,'EB1-TAXI'),(36,'EB2-TAXI'),(36,'EB3-TAXI'),(36,'EB4-TAXI'),(36,'EB5-TAXI'),(36,'EB6-TAXI'),
 (37,'eb1-ta'),(37,'eb2-ta'),(37,'eb3-ta'),(37,'eb4-ta'),(37,'eb5-ta'),(37,'eb6-ta'),
 (38,'eb1-va'),(38,'eb2-va'),(38,'eb3-va'),(38,'eb4-va'),(38,'eb5-va'),(38,'eb6-va')
ON CONFLICT DO NOTHING;

-- Contrôle lecture seule : un examen est terminé si passage V2 'terminee'
-- OU (ancien circuit) chaque matière de l'examen remise au moins une fois
-- (tentatives __tN regroupées sur la matière de base).
CREATE OR REPLACE FUNCTION public.examens_blancs_controle(_apprenant_id uuid, _module_id integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ex AS (
    SELECT exam_id FROM public.examens_blancs_parcours WHERE module_id = _module_id
  ),
  req AS (
    SELECT q.quiz_id, count(DISTINCT split_part(q.matiere_id, '__', 1)) AS rq
      FROM public.apprenant_quiz_results q
     WHERE q.quiz_type = 'examen_blanc' AND q.quiz_id IN (SELECT exam_id FROM ex)
     GROUP BY q.quiz_id
  ),
  per AS (
    SELECT ex.exam_id,
      EXISTS (SELECT 1 FROM public.exam_attempts_v2 a
               WHERE a.apprenant_id = _apprenant_id AND a.exam_id = ex.exam_id
                 AND a.etat = 'terminee' AND NOT coalesce(a.is_test, false)) AS v2,
      (SELECT count(DISTINCT split_part(q.matiere_id, '__', 1)) FROM public.apprenant_quiz_results q
        WHERE q.apprenant_id = _apprenant_id AND q.quiz_type = 'examen_blanc' AND q.quiz_id = ex.exam_id) AS nm,
      coalesce((SELECT rq FROM req WHERE req.quiz_id = ex.exam_id), 0) AS rq
    FROM ex
  )
  SELECT jsonb_build_object(
    'module_id', _module_id,
    'total', (SELECT count(*) FROM per),
    'termines', (SELECT count(*) FROM per WHERE v2 OR (rq > 0 AND nm >= rq)),
    'complet', (SELECT count(*) FROM per) = 6
               AND (SELECT count(*) FROM per WHERE v2 OR (rq > 0 AND nm >= rq)) = 6,
    'detail', (SELECT jsonb_agg(jsonb_build_object('exam', exam_id, 'v2', v2, 'matieres', nm, 'requises', rq) ORDER BY exam_id) FROM per)
  );
$$;
REVOKE ALL ON FUNCTION public.examens_blancs_controle(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.examens_blancs_controle(uuid, integer) TO service_role;
