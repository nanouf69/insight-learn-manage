-- Relecture uniquement. Aucune fonction métier appelée ; aucun envoi ni gel.
SELECT n AS indicateur,count(l.id) AS liens,
       count(p.id) FILTER (WHERE NOT p.archivee) AS preuves_actives
FROM generate_series(12,16) n
LEFT JOIN public.qualiopi_preuve_liens l ON l.indicateur=n
LEFT JOIN public.qualiopi_preuves p ON p.id=l.preuve_id
GROUP BY n ORDER BY n;

SELECT p.source_table,count(*) AS references
FROM public.qualiopi_preuves p
JOIN public.qualiopi_preuve_liens l ON l.preuve_id=p.id
WHERE l.indicateur=12 GROUP BY p.source_table;

SELECT count(*) AS doublons_liens FROM (
 SELECT preuve_id,indicateur FROM public.qualiopi_preuve_liens
 GROUP BY preuve_id,indicateur HAVING count(*)>1
) d;
SELECT count(*) AS orphelins FROM public.qualiopi_preuve_liens l
LEFT JOIN public.qualiopi_preuves p ON p.id=l.preuve_id WHERE p.id IS NULL;

SELECT count(*) AS pieces_referencees,
 sum(jsonb_array_length(p.fichiers)) AS fichiers_joints
FROM public.qualiopi_preuves p JOIN public.qualiopi_preuve_liens l ON l.preuve_id=p.id
WHERE l.indicateur=12;

SELECT indicateur,statut,applicable FROM public.qualiopi_indicateurs_etat
WHERE indicateur BETWEEN 12 AND 16 ORDER BY indicateur;

-- Vérification des sources sans exposer nom, téléphone, réponse ou certificat médical.
SELECT 'emails' AS source,md5(string_agg(md5(to_jsonb(x)::text),'' ORDER BY id)) AS empreinte FROM public.emails x
UNION ALL SELECT 'appels',md5(string_agg(md5(to_jsonb(x)::text),'' ORDER BY id)) FROM public.apprenant_appels x
UNION ALL SELECT 'emargements',md5(string_agg(md5(to_jsonb(x)::text),'' ORDER BY id)) FROM public.emargements_fc x
UNION ALL SELECT 'dossiers',md5(string_agg(md5(to_jsonb(x)::text),'' ORDER BY id)) FROM public.apprenant_documents_completes x
UNION ALL SELECT 'inscriptions',md5(string_agg(md5(to_jsonb(x)::text),'' ORDER BY id)) FROM public.session_apprenants x
UNION ALL SELECT 'notes',md5(string_agg(md5(to_jsonb(x)::text),'' ORDER BY id)) FROM public.apprenant_quiz_results x
UNION ALL SELECT 'etats',md5(string_agg(md5(to_jsonb(x)::text),'' ORDER BY id)) FROM public.qualiopi_indicateurs_etat x;