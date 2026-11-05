-- P1 05/11 : même résultat (980/980 cas réels identiques en base isolée), passage linéaire au lieu de quadratique.
CREATE OR REPLACE FUNCTION public.fusion_details_progression(_ancien jsonb, _nouveau jsonb)
 RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE m jsonb;
BEGIN
  IF jsonb_typeof(_nouveau) IS DISTINCT FROM 'array' OR jsonb_typeof(_ancien) IS DISTINCT FROM 'array' THEN RETURN _nouveau; END IF;
  -- Première réponse enregistrée par (exerciceId, questionId) : agrégat en ordre décroissant, la première du tableau l'emporte.
  SELECT jsonb_object_agg(jsonb_build_array(a->>'exerciceId', a->>'questionId')::text, a->'reponseEleve' ORDER BY i DESC)
    INTO m
    FROM jsonb_array_elements(_ancien) WITH ORDINALITY t(a, i)
   WHERE jsonb_typeof(a) = 'object' AND a->>'exerciceId' IS NOT NULL AND a->>'questionId' IS NOT NULL
     AND public.reponse_enregistree(a->'reponseEleve');
  IF m IS NULL THEN
    RETURN COALESCE((SELECT jsonb_agg(n.v ORDER BY n.i) FROM jsonb_array_elements(_nouveau) WITH ORDINALITY n(v, i)), '[]'::jsonb);
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(
      CASE WHEN jsonb_typeof(n.v) = 'object' AND n.v->>'exerciceId' IS NOT NULL AND n.v->>'questionId' IS NOT NULL
                AND m ? jsonb_build_array(n.v->>'exerciceId', n.v->>'questionId')::text
                AND NOT public.reponse_enregistree(n.v->'reponseEleve')
           THEN jsonb_set(n.v, '{reponseEleve}', m -> jsonb_build_array(n.v->>'exerciceId', n.v->>'questionId')::text)
           ELSE n.v END ORDER BY n.i)
      FROM jsonb_array_elements(_nouveau) WITH ORDINALITY n(v, i)), '[]'::jsonb);
END
$function$;