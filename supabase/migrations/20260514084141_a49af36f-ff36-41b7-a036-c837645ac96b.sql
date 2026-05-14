CREATE OR REPLACE FUNCTION public.protect_manually_edited_questions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_data    jsonb := COALESCE(OLD.module_data, '{}'::jsonb);
  new_data    jsonb := COALESCE(NEW.module_data, '{}'::jsonb);
  old_mats    jsonb := COALESCE(old_data->'matieres', '[]'::jsonb);
  new_mats    jsonb := COALESCE(new_data->'matieres', '[]'::jsonb);
  out_mats    jsonb := '[]'::jsonb;
  new_mat     jsonb;
  old_mat     jsonb;
  old_exs     jsonb;
  new_exs     jsonb;
  out_exs     jsonb;
  new_ex      jsonb;
  old_ex      jsonb;
  old_qs      jsonb;
  new_qs      jsonb;
  out_qs      jsonb;
  new_q       jsonb;
  old_q       jsonb;
  q_id        text;
  ex_id       text;
  mat_id      text;
BEGIN
  -- Bypass : admin et service_role peuvent toujours modifier/supprimer (y compris questions manually_edited).
  -- La protection ne sert qu'à bloquer les écrasements automatiques par la propagation,
  -- jamais les actions manuelles d'un admin.
  IF COALESCE(auth.role(), '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF old_data = new_data THEN
    RETURN NEW;
  END IF;

  FOR new_mat IN SELECT jsonb_array_elements(new_mats) LOOP
    mat_id := new_mat->>'id';
    SELECT m INTO old_mat FROM jsonb_array_elements(old_mats) m WHERE m->>'id' = mat_id LIMIT 1;
    IF old_mat IS NULL THEN
      out_mats := out_mats || jsonb_build_array(new_mat);
      CONTINUE;
    END IF;

    new_exs := COALESCE(new_mat->'exercices', '[]'::jsonb);
    old_exs := COALESCE(old_mat->'exercices', '[]'::jsonb);
    out_exs := '[]'::jsonb;

    FOR new_ex IN SELECT jsonb_array_elements(new_exs) LOOP
      ex_id := new_ex->>'id';
      SELECT e INTO old_ex FROM jsonb_array_elements(old_exs) e WHERE e->>'id' = ex_id LIMIT 1;
      IF old_ex IS NULL THEN
        out_exs := out_exs || jsonb_build_array(new_ex);
        CONTINUE;
      END IF;

      new_qs := COALESCE(new_ex->'questions', '[]'::jsonb);
      old_qs := COALESCE(old_ex->'questions', '[]'::jsonb);
      out_qs := '[]'::jsonb;

      FOR new_q IN SELECT jsonb_array_elements(new_qs) LOOP
        q_id := new_q->>'id';
        SELECT q INTO old_q FROM jsonb_array_elements(old_qs) q WHERE q->>'id' = q_id LIMIT 1;
        IF old_q IS NOT NULL AND COALESCE((old_q->>'manually_edited')::boolean, false) = true THEN
          out_qs := out_qs || jsonb_build_array(old_q);
        ELSE
          out_qs := out_qs || jsonb_build_array(new_q);
        END IF;
      END LOOP;

      out_exs := out_exs || jsonb_build_array(jsonb_set(new_ex, '{questions}', out_qs));
    END LOOP;

    out_mats := out_mats || jsonb_build_array(jsonb_set(new_mat, '{exercices}', out_exs));
  END LOOP;

  NEW.module_data := jsonb_set(new_data, '{matieres}', out_mats);
  RETURN NEW;
END;
$function$;