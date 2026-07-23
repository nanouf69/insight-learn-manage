WITH restored AS (
  SELECT jsonb_agg(
    q.value
    || jsonb_build_object('manually_edited', true)
    || jsonb_build_object('_editedAt', to_jsonb(now()))
    || jsonb_build_object('_repairedAt', to_jsonb(now()))
    || jsonb_build_object('_repairReason', 'full_restore_from_bilan_questions_securite_static_source')
    ORDER BY (q.value->>'id')::int
  ) AS questions
  FROM jsonb_array_elements('[{"id":1,"type":"QCM","enonce":"Ce panneau m''annonce :","image":"/cours/exercices/securite/image1.png","choix":[{"lettre":"A","texte":"Stop","correct":true},{"lettre":"B","texte":"Cédez le passage"},{"lettre":"C","texte":"Interdiction de stationner"}]},{"id":2,"type":"QCM","enonce":"Ce panneau m''annonce :","image":"/cours/exercices/securite/image2.png","choix":[{"lettre":"A","texte":"Sortie de zone à stationnement interdit"},{"lettre":"B","texte":"Passage pour piétons"},{"lettre":"C","texte":"Priorité ponctuelle à la prochaine intersection","correct":true}]},{"id":3,"type":"QCM","enonce":"Ce panneau m''annonce :","image":"/cours/exercices/securite/image3.png","choix":[{"lettre":"A","texte":"Virage à droite"},{"lettre":"B","texte":"Priorité à droite à la prochaine intersection","correct":true},{"lettre":"C","texte":"Virage à gauche"}]},{"id":4,"type":"QCM","enonce":"Ce panneau m''annonce :","image":"/cours/exercices/securite/image4.png","choix":[{"lettre":"A","texte":"Cédez le passage","correct":true},{"lettre":"B","texte":"Priorité ponctuelle à la prochaine intersection"},{"lettre":"C","texte":"Succession de virages dont le 1er est à droite"}]},{"id":5,"type":"QCM","enonce":"Ce panneau m''annonce :","image":"/cours/exercices/securite/image5.png","choix":[{"lettre":"A","texte":"Sortie de zone à stationnement interdit"},{"lettre":"B","texte":"Fin de voie réservée aux véhicules de TC"},{"lettre":"C","texte":"Route à caractère prioritaire","correct":true}]},{"id":6,"type":"QCM","enonce":"Ce panneau m''annonce :","image":"/cours/exercices/securite/image6.png","choix":[{"lettre":"A","texte":"Stationnement interdit","correct":true},{"lettre":"B","texte":"Sens unique"},{"lettre":"C","texte":"Arrêt d''autobus"}]},{"id":7,"type":"QCM","enonce":"Ce panneau m''annonce :","image":"/cours/exercices/securite/image7.png","choix":[{"lettre":"A","texte":"Fin de route à accès réglementé"},{"lettre":"B","texte":"Arrêt et stationnement interdit","correct":true},{"lettre":"C","texte":"Impasse"}]},{"id":8,"type":"QCM","enonce":"Ce panneau signifie que le :","image":"/cours/exercices/securite/image8.png","choix":[{"lettre":"A","texte":"Stationnement est interdit du 1er au 15 du mois du côté du panneau","correct":true},{"lettre":"B","texte":"Stationnement est interdit du 16 au 31 du mois"},{"lettre":"C","texte":"Stationnement interdit"}]},{"id":9,"type":"QCM","enonce":"Ce panneau signifie que le :","image":"/cours/exercices/securite/image9.png","choix":[{"lettre":"A","texte":"Stationnement interdit"},{"lettre":"B","texte":"Stationnement interdit du 1er au 15 du mois"},{"lettre":"C","texte":"Stationnement est interdit du 16 au 31 du mois du côté du panneau","correct":true}]},{"id":10,"type":"QCM","enonce":"Ce panneau signifie :","image":"/cours/exercices/securite/image10.png","choix":[{"lettre":"A","texte":"Sortie de zone à stationnement interdit"},{"lettre":"B","texte":"Arrêt et stationnement interdit","correct":true},{"lettre":"C","texte":"Proximité d''une chaussée rétrécie"}]},{"id":11,"type":"QCM","enonce":"Ce panneau signifie :","image":"/cours/exercices/securite/image11.png","choix":[{"lettre":"A","texte":"Passage d''animaux sauvages"},{"lettre":"B","texte":"Endroit fréquenté par les enfants","correct":true},{"lettre":"C","texte":"Chemin obligatoire pour cavaliers"}]},{"id":12,"type":"QCM","enonce":"Ce panneau signifie :","image":"/cours/exercices/securite/image12.png","choix":[{"lettre":"A","texte":"Passage pour piétons","correct":true},{"lettre":"B","texte":"Endroit fréquenté par les enfants"},{"lettre":"C","texte":"Chemin obligatoire pour piétons"}]},{"id":13,"type":"QCM","enonce":"Ce panneau signifie :","image":"/cours/exercices/securite/image13.png","choix":[{"lettre":"A","texte":"Voie réservée aux véhicules de transport en commun","correct":true},{"lettre":"B","texte":"Fin de voie réservée aux véhicules de TC"},{"lettre":"C","texte":"Arrêt d''autobus"}]},{"id":14,"type":"QCM","enonce":"Ce panneau signifie :","image":"/cours/exercices/securite/image14.png","choix":[{"lettre":"A","texte":"Vitesse maximum obligatoire"},{"lettre":"B","texte":"Vitesse minimum obligatoire","correct":true},{"lettre":"C","texte":"Fin de route à accès réglementé"}]},{"id":15,"type":"QCM","enonce":"Ce panneau signifie :","image":"/cours/exercices/securite/image15.png","choix":[{"lettre":"A","texte":"Passage pour piétons"},{"lettre":"B","texte":"Fin de piste cyclable"},{"lettre":"C","texte":"Débouchés de cyclistes","correct":true}]}]'::jsonb) q(value)
), target_rows AS (
  SELECT mes.module_id, exercise_ordinality - 1 AS exercise_index
  FROM public.module_editor_state mes
  CROSS JOIN LATERAL jsonb_array_elements((mes.module_data::jsonb)->'exercices') WITH ORDINALITY AS exercise(exercise_json, exercise_ordinality)
  WHERE mes.module_id IN (4, 9)
    AND (exercise.exercise_json->>'id')::int = 102
)
UPDATE public.module_editor_state mes
SET module_data = jsonb_set(
      mes.module_data::jsonb,
      ARRAY['exercices', target_rows.exercise_index::text, 'questions'],
      restored.questions,
      true
    ),
    updated_at = now()
FROM target_rows, restored
WHERE mes.module_id = target_rows.module_id
  AND restored.questions IS NOT NULL;

INSERT INTO public.alertes_systeme (type, titre, message, details)
VALUES (
  'bilan_repair',
  'Restauration complète Bilan Sécurité Routière',
  'Restauration des réponses Sécurité Routière depuis la source statique propre pour modules 4 et 9 ; les modules FC 81/82 héritent du parent corrigé.',
  jsonb_build_object(
    'modules_corriges', jsonb_build_array(4, 9),
    'modules_fc_impactes', jsonb_build_array(81, 82),
    'exercice', 102,
    'cause', 'resynchronisation depuis module cours source corrompu / merge de réponses dupliquées',
    'repaired_at', now()
  )::text
);