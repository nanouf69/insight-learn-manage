-- Dedicated optional practice only; no official answers, grades or module writes.
CREATE TABLE public.qrc_practice_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, quiz text NOT NULL CHECK(quiz IN ('complet','specialites')),
 version text NOT NULL, manifest jsonb NOT NULL DEFAULT '[]', revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), saved_at timestamptz, submitted_at timestamptz,
 submitted_answers jsonb, submit_operation uuid, opening_operation uuid NOT NULL UNIQUE
);
GRANT SELECT ON public.qrc_practice_attempts TO authenticated;
GRANT ALL ON public.qrc_practice_attempts TO service_role;
ALTER TABLE public.qrc_practice_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_practice_owner ON public.qrc_practice_attempts FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE UNIQUE INDEX qrc_practice_one_draft ON public.qrc_practice_attempts(owner_id,quiz) WHERE submitted_at IS NULL;
CREATE TABLE public.qrc_practice_answer_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL REFERENCES public.qrc_practice_attempts(id),
 question_key text NOT NULL, revision integer NOT NULL, answer jsonb NOT NULL, operation_id uuid NOT NULL UNIQUE,
 saved_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(attempt_id,revision)
);
GRANT SELECT ON public.qrc_practice_answer_events TO authenticated;
GRANT ALL ON public.qrc_practice_answer_events TO service_role;
ALTER TABLE public.qrc_practice_answer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_practice_events_owner ON public.qrc_practice_answer_events FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.qrc_practice_attempts a WHERE a.id=attempt_id AND a.owner_id=auth.uid()));
CREATE INDEX qrc_practice_events_latest ON public.qrc_practice_answer_events(attempt_id,question_key,revision DESC);

CREATE FUNCTION public.qrc_practice_access(p_quiz text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND p_quiz IN ('complet','specialites') AND (
  coalesce(public.has_role(auth.uid(),'admin'),false) OR EXISTS(
   SELECT 1 FROM public.apprenants a WHERE a.auth_user_id=auth.uid() AND a.deleted_at IS NULL AND a.compte_cours_archive_at IS NULL
   AND NOT coalesce(a.abandonnee,false) AND (11=ANY(a.modules_autorises) OR (p_quiz='specialites' AND 28=ANY(a.modules_autorises)))
   AND ((timezone('Europe/Paris',now())::date BETWEEN a.date_debut_cours_en_ligne AND a.date_fin_cours_en_ligne)
        OR coalesce((public.crm_lire_extension_acces(a.id)->>'autorise')::boolean,false))
  )
 );
$$;
CREATE FUNCTION public.qrc_practice_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='qrc_practice_answer_events' OR TG_OP='DELETE' THEN RAISE EXCEPTION 'Historique conservé' USING ERRCODE='42501'; END IF;
 IF OLD.submitted_at IS NOT NULL OR NEW.owner_id<>OLD.owner_id OR NEW.quiz<>OLD.quiz OR NEW.version<>OLD.version OR NEW.manifest<>OLD.manifest
 OR NEW.opening_operation<>OLD.opening_operation THEN RAISE EXCEPTION 'Tentative figée' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER qrc_practice_attempt_guard BEFORE UPDATE OR DELETE ON public.qrc_practice_attempts FOR EACH ROW EXECUTE FUNCTION public.qrc_practice_immutable();
CREATE TRIGGER qrc_practice_event_guard BEFORE UPDATE OR DELETE ON public.qrc_practice_answer_events FOR EACH ROW EXECUTE FUNCTION public.qrc_practice_immutable();

CREATE FUNCTION public.qrc_practice_answer_valid(p_rule jsonb,p_answer jsonb,p_complete boolean DEFAULT true) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE kind text:=p_rule->>'kind'; v text; n integer;
BEGIN
 IF p_answer IS NULL THEN RETURN false; END IF;
 IF kind='choice' THEN RETURN jsonb_typeof(p_answer)='string' AND ((NOT p_complete AND p_answer='""') OR (p_rule->'options') @> jsonb_build_array(p_answer)); END IF;
 IF kind='choices' THEN
  IF jsonb_typeof(p_answer)<>'array' THEN RETURN false; END IF;
  RETURN (NOT p_complete OR jsonb_array_length(p_answer)>0)
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_answer) x WHERE jsonb_typeof(x)<>'string' OR NOT (p_rule->'options') @> jsonb_build_array(x))
    AND (SELECT count(DISTINCT x) FROM jsonb_array_elements(p_answer) x)=jsonb_array_length(p_answer);
 END IF;
 IF jsonb_typeof(p_answer)<>'string' THEN RETURN false; END IF;
 v:=p_answer#>>'{}';
 IF length(v)>CASE WHEN kind='text' THEN 4000 ELSE 8000 END THEN RETURN false; END IF;
 IF NOT p_complete THEN RETURN true; END IF;
 IF v !~ '[^[:space:]]' THEN RETURN false; END IF;
 IF kind='list' THEN
  SELECT count(DISTINCT lower(btrim(x))) INTO n FROM regexp_split_to_table(v,E'[\\n,;/•]+') x WHERE x ~ '[^[:space:]]';
  RETURN n>=coalesce((p_rule->>'min')::int,1);
 END IF;
 RETURN kind='text';
END $$;

-- Replaced before deployment with a server-owned constant generated from untouched source data.
CREATE FUNCTION public.qrc_practice_manifest(p_quiz text) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT $manifest${"complet":[{"key":"mcq:1","label":"Question 1 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"mcq:2","label":"Question 2 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:2","label":"Question 2 — QRC","kind":"text"},{"key":"mcq:3","label":"Question 3 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:3","label":"Question 3 — QRC","kind":"text"},{"key":"mcq:4","label":"Question 4 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:4","label":"Question 4 — QRC","kind":"text"},{"key":"mcq:5","label":"Question 5 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:5","label":"Question 5 — QRC","kind":"text"},{"key":"mcq:6","label":"Question 6 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:6","label":"Question 6 — QRC","kind":"text"},{"key":"mcq:10","label":"Question 7 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:10","label":"Question 7 — QRC","kind":"text"},{"key":"mcq:11","label":"Question 8 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:11","label":"Question 8 — QRC","kind":"text"},{"key":"mcq:12","label":"Question 9 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:12","label":"Question 9 — QRC","kind":"text"},{"key":"mcq:13","label":"Question 10 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:13","label":"Question 10 — QRC","kind":"text"},{"key":"mcq:14","label":"Question 11 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:14","label":"Question 11 — QRC","kind":"text"},{"key":"mcq:15","label":"Question 12 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:15","label":"Question 12 — QRC","kind":"text"},{"key":"mcq:16","label":"Question 13 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:16","label":"Question 13 — QRC","kind":"text"},{"key":"mcq:17","label":"Question 14 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"mcq:18","label":"Question 15 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:18","label":"Question 15 — QRC","kind":"text"},{"key":"mcq:19","label":"Question 16 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:19","label":"Question 16 — QRC","kind":"text"},{"key":"mcq:20","label":"Question 17 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:20","label":"Question 17 — QRC","kind":"text"},{"key":"mcq:21","label":"Question 18 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:21","label":"Question 18 — QRC","kind":"text"},{"key":"mcq:22","label":"Question 19 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:22","label":"Question 19 — QRC","kind":"text"},{"key":"mcq:23","label":"Question 20 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:23","label":"Question 20 — QRC","kind":"text"},{"key":"mcq:24","label":"Question 21 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:24","label":"Question 21 — QRC","kind":"text"},{"key":"mcq:25","label":"Question 22 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:25","label":"Question 22 — QRC","kind":"text"},{"key":"mcq:26","label":"Question 23 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:26","label":"Question 23 — QRC","kind":"text"},{"key":"mcq:27","label":"Question 24 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:27","label":"Question 24 — QRC","kind":"text"},{"key":"mcq:28","label":"Question 25 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:28","label":"Question 25 — QRC","kind":"text"},{"key":"mcq:29","label":"Question 26 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:29","label":"Question 26 — QRC","kind":"text"},{"key":"mcq:30","label":"Question 27 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:30","label":"Question 27 — QRC","kind":"text"},{"key":"mcq:31","label":"Question 28 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:31","label":"Question 28 — QRC","kind":"text"},{"key":"mcq:32","label":"Question 29 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:32","label":"Question 29 — QRC","kind":"text"},{"key":"mcq:33","label":"Question 30 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:33","label":"Question 30 — QRC","kind":"text"},{"key":"mcq:34","label":"Question 31 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:34","label":"Question 31 — QRC","kind":"text"},{"key":"mcq:35","label":"Question 32 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:35","label":"Question 32 — QRC","kind":"text"},{"key":"mcq:36","label":"Question 33 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:36","label":"Question 33 — QRC","kind":"text"},{"key":"mcq:37","label":"Question 34 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:37","label":"Question 34 — QRC","kind":"text"},{"key":"mcq:38","label":"Question 35 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:38","label":"Question 35 — QRC","kind":"text"},{"key":"mcq:39","label":"Question 36 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:39","label":"Question 36 — QRC","kind":"text"},{"key":"mcq:40","label":"Question 37 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:40","label":"Question 37 — QRC","kind":"text"},{"key":"mcq:41","label":"Question 38 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:41","label":"Question 38 — QRC","kind":"text"},{"key":"mcq:42","label":"Question 39 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:42","label":"Question 39 — QRC","kind":"text"},{"key":"cases:metropole","label":"Métropole — cases","kind":"choices","options":["Albigny-sur-Saône","Bron","Cailloux-sur-Fontaines","Caluire-et-Cuire","Champagne-au-Mont-d'Or","Charbonnières-les-Bains","Charly","Chassieu","Collonges-au-Mont-d'Or","Corbas","Couzon-au-Mont-d'Or","Craponne","Curis-au-Mont-d'Or","Dardilly","Décines-Charpieu","Écully","Feyzin","Fleurieu-sur-Saône","Fontaines-Saint-Martin","Fontaines-sur-Saône","Francheville","Genay","Givors","Grigny-sur-Rhône","Irigny","Jonage","La Mulatière","La Tour-de-Salvagny","Limonest","Lissieu","Lyon","Marcy-l'Étoile","Meyzieu","Mions","Montanay","Neuville-sur-Saône","Oullins-Pierre-Bénite","Poleymieux-au-Mont-d'Or","Quincieux","Rillieux-la-Pape","Rochetaillée-sur-Saône","Saint-Cyr-au-Mont-d'Or","Saint-Didier-au-Mont-d'Or","Saint-Fons","Saint-Genis-Laval","Saint-Genis-les-Ollières","Saint-Germain-au-Mont-d'Or","Saint-Priest","Saint-Romain-au-Mont-d'Or","Sainte-Foy-lès-Lyon","Sathonay-Camp","Sathonay-Village","Solaize","Tassin-la-Demi-Lune","Vaulx-en-Velin","Vénissieux","Vernaison","Villeurbanne","Anse","Brignais","Chaponost","Villefranche-sur-Saône","Communay","L'Arbresle","Tarare","Ternay","Colombier-Saugnieu","Mornant","Pusignan","Saint-Symphorien-d'Ozon","Grézieu-la-Varenne","Millery","Sainte-Consorce","Vourles","Genas","Saint-Bonnet-de-Mure","Saint-Laurent-de-Mure","Vienne","Marennes","Chasselay","Dommartin","Brindas","Messimy","Montluel","Miribel"]},{"key":"list:metropole","label":"Métropole — liste écrite (58 éléments)","kind":"list","min":58}],"specialites":[{"key":"mcq:21","label":"Question 1 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:21","label":"Question 1 — QRC","kind":"text"},{"key":"mcq:22","label":"Question 2 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:22","label":"Question 2 — QRC","kind":"text"},{"key":"mcq:23","label":"Question 3 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:23","label":"Question 3 — QRC","kind":"text"},{"key":"mcq:24","label":"Question 4 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:24","label":"Question 4 — QRC","kind":"text"},{"key":"mcq:25","label":"Question 5 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:25","label":"Question 5 — QRC","kind":"text"},{"key":"mcq:26","label":"Question 6 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:26","label":"Question 6 — QRC","kind":"text"},{"key":"mcq:27","label":"Question 7 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:27","label":"Question 7 — QRC","kind":"text"},{"key":"mcq:28","label":"Question 8 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:28","label":"Question 8 — QRC","kind":"text"},{"key":"mcq:29","label":"Question 9 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:29","label":"Question 9 — QRC","kind":"text"},{"key":"mcq:30","label":"Question 10 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:30","label":"Question 10 — QRC","kind":"text"},{"key":"mcq:31","label":"Question 11 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:31","label":"Question 11 — QRC","kind":"text"},{"key":"mcq:32","label":"Question 12 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:32","label":"Question 12 — QRC","kind":"text"},{"key":"mcq:33","label":"Question 13 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:33","label":"Question 13 — QRC","kind":"text"},{"key":"mcq:34","label":"Question 14 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:34","label":"Question 14 — QRC","kind":"text"},{"key":"mcq:35","label":"Question 15 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:35","label":"Question 15 — QRC","kind":"text"},{"key":"mcq:36","label":"Question 16 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:36","label":"Question 16 — QRC","kind":"text"},{"key":"mcq:37","label":"Question 17 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:37","label":"Question 17 — QRC","kind":"text"},{"key":"mcq:38","label":"Question 18 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:38","label":"Question 18 — QRC","kind":"text"},{"key":"mcq:41","label":"Question 19 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:41","label":"Question 19 — QRC","kind":"text"},{"key":"mcq:42","label":"Question 20 — QCM","kind":"choice","options":["A","B","C","D"]},{"key":"qrc:42","label":"Question 20 — QRC","kind":"text"},{"key":"local:1","label":"QCM local 1","kind":"choices","options":["A","B","C"]},{"key":"local:2","label":"QCM local 2","kind":"choices","options":["A","B"]},{"key":"local:3","label":"QCM local 3","kind":"choices","options":["A","B","C"]},{"key":"local:4","label":"QCM local 4","kind":"choices","options":["A","B","C","D"]},{"key":"local:5","label":"QCM local 5","kind":"choices","options":["A","B","C","D"]},{"key":"local:6","label":"QCM local 6","kind":"choices","options":["A","B","C","D"]},{"key":"local:7","label":"QCM local 7","kind":"choices","options":["A","B","C","D"]},{"key":"local:8","label":"QCM local 8","kind":"choices","options":["A","B","C","D"]},{"key":"local:9","label":"QCM local 9","kind":"choices","options":["A","B","C","D"]},{"key":"local:10","label":"QCM local 10","kind":"choices","options":["A","B"]},{"key":"local:11","label":"QCM local 11","kind":"choices","options":["A","B","C","D"]},{"key":"local:12","label":"QCM local 12","kind":"choices","options":["A","B","C","D"]},{"key":"local:13","label":"QCM local 13","kind":"choices","options":["A","B","C","D"]},{"key":"local:14","label":"QCM local 14","kind":"choices","options":["A","B","C","D"]},{"key":"local:15","label":"QCM local 15","kind":"choices","options":["A","B","C","D"]},{"key":"local:16","label":"QCM local 16","kind":"choices","options":["A","B","C","D"]},{"key":"local:17","label":"QCM local 17","kind":"choices","options":["A","B","C","D"]},{"key":"local:18","label":"QCM local 18","kind":"choices","options":["A","B","C"]},{"key":"local:19","label":"QCM local 19","kind":"choices","options":["A","B","C"]},{"key":"local:20","label":"QCM local 20","kind":"choices","options":["A","B","C","D"]},{"key":"local:21","label":"QCM local 21","kind":"choices","options":["A","B","C","D"]},{"key":"local:22","label":"QCM local 22","kind":"choices","options":["A","B","C","D"]},{"key":"local:23","label":"QCM local 23","kind":"choices","options":["A","B","C","D"]},{"key":"local:24","label":"QCM local 24","kind":"choices","options":["A","B","C","D"]},{"key":"local:25","label":"QCM local 25","kind":"choices","options":["A","B"]},{"key":"local:26","label":"QCM local 26","kind":"choices","options":["A","B","C","D"]},{"key":"local:27","label":"QCM local 27","kind":"choices","options":["A","B"]},{"key":"local:28","label":"QCM local 28","kind":"choices","options":["A","B"]},{"key":"local:29","label":"QCM local 29","kind":"choices","options":["A","B","C","D"]},{"key":"local:30","label":"QCM local 30","kind":"choices","options":["A","B","C","D"]},{"key":"local:31","label":"QCM local 31","kind":"choices","options":["A","B","C","D"]},{"key":"local:32","label":"QCM local 32","kind":"choices","options":["A","B","C","D"]},{"key":"local:33","label":"QCM local 33","kind":"choices","options":["A","B","C"]},{"key":"local:34","label":"QCM local 34","kind":"choices","options":["A","B","C","D"]},{"key":"local:35","label":"QCM local 35","kind":"choices","options":["A","B","C","D"]},{"key":"local:36","label":"QCM local 36","kind":"choices","options":["A","B","C","D"]},{"key":"local:37","label":"QCM local 37","kind":"choices","options":["A","B","C","D"]},{"key":"local:38","label":"QCM local 38","kind":"choices","options":["A","B","C","D"]},{"key":"local:39","label":"QCM local 39","kind":"choices","options":["A","B","C"]},{"key":"local:40","label":"QCM local 40","kind":"choices","options":["A","B","C","D"]},{"key":"cases:zupc","label":"ZUPC — cases","kind":"choices","options":["Aéroport de Lyon-Saint-Exupéry","Bron","Caluire-et-Cuire","Champagne-au-Mont-d'Or","Chassieu","Collonges-au-Mont-d'Or","Décines-Charpieu","Écully","Francheville","Genas","La Mulatière","Lyon","Meyzieu","Oullins-Pierre-Bénite","Rillieux-la-Pape","Saint-Cyr-au-Mont-d'Or","Saint-Didier-au-Mont-d'Or","Saint-Fons","Saint-Priest","Sainte-Foy-lès-Lyon","Tassin-la-Demi-Lune","Vaulx-en-Velin","Vénissieux","Villeurbanne","Albigny-sur-Saône","Cailloux-sur-Fontaines","Charbonnières-les-Bains","Charly","Corbas","Couzon-au-Mont-d'Or","Craponne","Curis-au-Mont-d'Or","Dardilly","Feyzin","Fleurieu-sur-Saône","Fontaines-Saint-Martin","Fontaines-sur-Saône","Genay","Givors","Grigny-sur-Rhône","Irigny","Jonage","La Tour-de-Salvagny","Limonest","Lissieu","Marcy-l'Étoile","Mions","Montanay","Neuville-sur-Saône","Poleymieux-au-Mont-d'Or","Quincieux","Rochetaillée-sur-Saône","Saint-Genis-Laval","Saint-Genis-les-Ollières","Saint-Germain-au-Mont-d'Or","Saint-Romain-au-Mont-d'Or","Sathonay-Camp","Sathonay-Village","Solaize","Vernaison","Anse","Brignais","Chaponost","Villefranche-sur-Saône","Communay","L'Arbresle","Tarare","Ternay","Colombier-Saugnieu","Mornant","Pusignan","Saint-Symphorien-d'Ozon","Grézieu-la-Varenne","Millery","Sainte-Consorce","Vourles","Saint-Bonnet-de-Mure","Saint-Laurent-de-Mure","Vienne","Marennes","Chasselay","Dommartin","Brindas","Messimy","Montluel","Miribel"]},{"key":"list:zupc","label":"ZUPC — liste écrite (24 éléments)","kind":"list","min":24},{"key":"cases:metropole","label":"Métropole — cases","kind":"choices","options":["Albigny-sur-Saône","Bron","Cailloux-sur-Fontaines","Caluire-et-Cuire","Champagne-au-Mont-d'Or","Charbonnières-les-Bains","Charly","Chassieu","Collonges-au-Mont-d'Or","Corbas","Couzon-au-Mont-d'Or","Craponne","Curis-au-Mont-d'Or","Dardilly","Décines-Charpieu","Écully","Feyzin","Fleurieu-sur-Saône","Fontaines-Saint-Martin","Fontaines-sur-Saône","Francheville","Genay","Givors","Grigny-sur-Rhône","Irigny","Jonage","La Mulatière","La Tour-de-Salvagny","Limonest","Lissieu","Lyon","Marcy-l'Étoile","Meyzieu","Mions","Montanay","Neuville-sur-Saône","Oullins-Pierre-Bénite","Poleymieux-au-Mont-d'Or","Quincieux","Rillieux-la-Pape","Rochetaillée-sur-Saône","Saint-Cyr-au-Mont-d'Or","Saint-Didier-au-Mont-d'Or","Saint-Fons","Saint-Genis-Laval","Saint-Genis-les-Ollières","Saint-Germain-au-Mont-d'Or","Saint-Priest","Saint-Romain-au-Mont-d'Or","Sainte-Foy-lès-Lyon","Sathonay-Camp","Sathonay-Village","Solaize","Tassin-la-Demi-Lune","Vaulx-en-Velin","Vénissieux","Vernaison","Villeurbanne","Anse","Brignais","Chaponost","Villefranche-sur-Saône","Communay","L'Arbresle","Tarare","Ternay","Colombier-Saugnieu","Mornant","Pusignan","Saint-Symphorien-d'Ozon","Grézieu-la-Varenne","Millery","Sainte-Consorce","Vourles","Genas","Saint-Bonnet-de-Mure","Saint-Laurent-de-Mure","Vienne","Marennes","Chasselay","Dommartin","Brindas","Messimy","Montluel","Miribel"]},{"key":"list:metropole","label":"Métropole — liste écrite (58 éléments)","kind":"list","min":58}]}$manifest$::jsonb -> p_quiz; $$;

CREATE FUNCTION public.qrc_practice_read(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.qrc_practice_attempts; ans jsonb; meta jsonb;
BEGIN
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE id=p_attempt AND owner_id=auth.uid();
 IF a.id IS NULL THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_object_agg(question_key,answer),'{}'),coalesce(jsonb_object_agg(question_key,jsonb_build_object('saved_at',saved_at,'revision',revision)),'{}') INTO ans,meta
 FROM (SELECT DISTINCT ON(question_key) * FROM public.qrc_practice_answer_events WHERE attempt_id=a.id ORDER BY question_key,revision DESC) e;
 RETURN jsonb_build_object('id',a.id,'owner',a.owner_id,'quiz',a.quiz,'version',a.version,'manifest',a.manifest,'revision',a.revision,
 'answers',coalesce(a.submitted_answers,ans),'answer_meta',meta,'saved_at',a.saved_at,'submitted_at',a.submitted_at,'submit_operation',a.submit_operation);
END $$;

CREATE FUNCTION public.qrc_practice_open(p_quiz text,p_operation uuid,p_new boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.qrc_practice_attempts; m jsonb;
BEGIN
 IF NOT public.qrc_practice_access(p_quiz) THEN RAISE EXCEPTION 'Entraînement non accessible' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL THEN RAISE EXCEPTION 'Identité requise' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('qrc-practice:'||auth.uid()||':'||p_quiz,0));
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE opening_operation=p_operation;
 IF a.id IS NOT NULL THEN
  IF a.owner_id<>auth.uid() OR a.quiz<>p_quiz THEN RAISE EXCEPTION 'Identité différente' USING ERRCODE='42501'; END IF;
  RETURN public.qrc_practice_read(a.id);
 END IF;
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE owner_id=auth.uid() AND quiz=p_quiz AND (NOT p_new OR submitted_at IS NULL) ORDER BY created_at DESC LIMIT 1;
 IF a.id IS NOT NULL THEN RETURN public.qrc_practice_read(a.id); END IF;
 m:=public.qrc_practice_manifest(p_quiz);
 IF jsonb_array_length(m)=0 THEN RAISE EXCEPTION 'Références indisponibles' USING ERRCODE='22023'; END IF;
 INSERT INTO public.qrc_practice_attempts(owner_id,quiz,version,manifest,opening_operation) VALUES(auth.uid(),p_quiz,'taxi-optional-durable-v1',m,p_operation) RETURNING * INTO a;
 RETURN public.qrc_practice_read(a.id);
END $$;

CREATE FUNCTION public.qrc_practice_save(p_attempt uuid,p_expected integer,p_key text,p_answer jsonb,p_operation uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.qrc_practice_attempts; e public.qrc_practice_answer_events; rule jsonb;
BEGIN
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE id=p_attempt AND owner_id=auth.uid() FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
 SELECT * INTO e FROM public.qrc_practice_answer_events WHERE operation_id=p_operation;
 IF e.id IS NOT NULL THEN
  IF e.attempt_id<>a.id OR e.question_key<>p_key OR e.answer<>p_answer THEN RAISE EXCEPTION 'Opération différente' USING ERRCODE='22023'; END IF;
  RETURN public.qrc_practice_read(a.id);
 END IF;
 IF NOT public.qrc_practice_access(a.quiz) THEN RAISE EXCEPTION 'Accès expiré ou refusé' USING ERRCODE='42501'; END IF;
 IF a.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'Tentative déjà soumise' USING ERRCODE='42501'; END IF;
 IF a.revision<>p_expected THEN RAISE EXCEPTION 'Une autre sauvegarde existe : relire avant de choisir' USING ERRCODE='40001'; END IF;
 SELECT x INTO rule FROM jsonb_array_elements(a.manifest) x WHERE x->>'key'=p_key;
 IF rule IS NULL OR p_operation IS NULL OR NOT public.qrc_practice_answer_valid(rule,p_answer,false) THEN RAISE EXCEPTION 'Réponse invalide ou inconnue' USING ERRCODE='22023'; END IF;
 INSERT INTO public.qrc_practice_answer_events(attempt_id,question_key,revision,answer,operation_id) VALUES(a.id,p_key,a.revision+1,p_answer,p_operation);
 UPDATE public.qrc_practice_attempts SET revision=revision+1,saved_at=clock_timestamp() WHERE id=a.id;
 RETURN public.qrc_practice_read(a.id);
END $$;

CREATE FUNCTION public.qrc_practice_submit(p_attempt uuid,p_expected integer,p_operation uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.qrc_practice_attempts; r jsonb; missing jsonb;
BEGIN
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE id=p_attempt AND owner_id=auth.uid() FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
 IF a.submitted_at IS NOT NULL THEN
  IF a.submit_operation IS DISTINCT FROM p_operation THEN RAISE EXCEPTION 'Tentative déjà soumise' USING ERRCODE='42501'; END IF;
  RETURN public.qrc_practice_read(a.id);
 END IF;
 IF NOT public.qrc_practice_access(a.quiz) THEN RAISE EXCEPTION 'Accès expiré ou refusé' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL OR a.revision<>p_expected THEN RAISE EXCEPTION 'Sauvegardes modifiées : relire avant soumission' USING ERRCODE='40001'; END IF;
 r:=public.qrc_practice_read(a.id);
 SELECT coalesce(jsonb_agg(x),'[]') INTO missing FROM jsonb_array_elements(a.manifest) x WHERE NOT public.qrc_practice_answer_valid(x,r->'answers'->(x->>'key'));
 IF jsonb_array_length(missing)>0 THEN RETURN r||jsonb_build_object('missing',missing); END IF;
 UPDATE public.qrc_practice_attempts SET submitted_at=clock_timestamp(),submitted_answers=r->'answers',submit_operation=p_operation WHERE id=a.id;
 RETURN public.qrc_practice_read(a.id);
END $$;

REVOKE ALL ON FUNCTION public.qrc_practice_access(text),public.qrc_practice_immutable(),public.qrc_practice_answer_valid(jsonb,jsonb,boolean),public.qrc_practice_manifest(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.qrc_practice_open(text,uuid,boolean),public.qrc_practice_read(uuid),public.qrc_practice_save(uuid,integer,text,jsonb,uuid),public.qrc_practice_submit(uuid,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qrc_practice_open(text,uuid,boolean),public.qrc_practice_read(uuid),public.qrc_practice_save(uuid,integer,text,jsonb,uuid),public.qrc_practice_submit(uuid,integer,uuid) TO authenticated;
COMMENT ON TABLE public.qrc_practice_attempts IS 'Optional QRC TAXI practice only; no official completion, grade or milestone bridge.';