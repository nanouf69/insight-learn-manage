-- Targeted proof rows for the five EB2 tentative-3 copies of one learner, named in the 10/11 report.
-- Every criterion is recomputed from server rows; the statement inserts nothing it cannot prove,
-- and the assertion below aborts the whole migration unless all five are proven.
INSERT INTO public.qrc_historique_liaisons_remise (result_id, remise_id, apprenant_id, quiz_id, matiere_id, exercice_id,
  tentative_resultat, tentative_remise, empreinte_reponses_resultat, empreinte_reponses_remise, empreinte_snapshot,
  evenements_journal, motif)
SELECT r.id, a.id, r.apprenant_id, r.quiz_id, r.matiere_id, a.exercice_id, r.tentative, coalesce(a.tentative, 1),
  md5((r.details->'reponses')::text), md5(a.reponses::text), md5((r.details->'snapshot')::text),
  (SELECT count(*) FROM public.reponses_apprenants_journal j
    WHERE j.apprenant_id = r.apprenant_id AND j.exercice_id = a.exercice_id AND j.tentative = r.tentative),
  'Remise suffixée __t' || r.tentative || ' (colonne tentative laissée à sa valeur par défaut 1), seule remise de cet exercice, '
   || 'réponses identiques (permutation QCM figée seule admise), journal de réponses exclusivement en tentative ' || r.tentative
FROM public.apprenant_quiz_results r
JOIN public.reponses_apprenants a
  ON a.apprenant_id = r.apprenant_id AND a.exercice_id = r.quiz_id || '__' || r.matiere_id || '__t' || r.tentative
WHERE r.id IN ('eb1e925b-53ee-4995-8cf2-df3cebdcc478','7e9d1b67-f6de-4ab0-a8e0-b43ecfd7cf22','2fa844d9-1e7d-4b66-b2fd-3c38c6088bce',
               'd1dc3592-95eb-4a95-aed6-0e04b0a8b9e5','65ff5584-95cc-4e12-a926-543d809c186c')
  AND r.quiz_type = 'examen_blanc' AND r.quiz_id = 'EB2' AND r.completed_at IS NOT NULL AND r.tentative > 1
  AND coalesce(a.tentative, 1) = 1
  AND a.completed IS TRUE AND a.status = 'submitted' AND a.submitted_at IS NOT NULL
  AND public.qrc_historique_reponses_identiques(r.details, a.reponses)
  AND (SELECT count(*) FROM public.reponses_apprenants b WHERE b.apprenant_id = r.apprenant_id AND b.exercice_id = a.exercice_id) = 1
  AND (SELECT count(*) FROM public.apprenant_quiz_results x WHERE x.apprenant_id = r.apprenant_id AND x.quiz_id = r.quiz_id
        AND x.matiere_id = r.matiere_id AND x.tentative = r.tentative) = 1
  AND EXISTS (SELECT 1 FROM public.reponses_apprenants_journal j
        WHERE j.apprenant_id = r.apprenant_id AND j.exercice_id = a.exercice_id AND j.tentative = r.tentative)
  AND NOT EXISTS (SELECT 1 FROM public.reponses_apprenants_journal j
        WHERE j.apprenant_id = r.apprenant_id AND j.exercice_id = a.exercice_id AND j.tentative IS DISTINCT FROM r.tentative)
  AND NOT EXISTS (SELECT 1 FROM public.exam_attempts_v2 v WHERE v.apprenant_id = r.apprenant_id
        AND (v.snapshot->'source_historique'->>'result_id' = r.id::text OR v.snapshot->>'result_id' = r.id::text))
ON CONFLICT (result_id) DO NOTHING;

DO $assert$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM unnest(ARRAY['eb1e925b-53ee-4995-8cf2-df3cebdcc478','7e9d1b67-f6de-4ab0-a8e0-b43ecfd7cf22',
    '2fa844d9-1e7d-4b66-b2fd-3c38c6088bce','d1dc3592-95eb-4a95-aed6-0e04b0a8b9e5','65ff5584-95cc-4e12-a926-543d809c186c']::uuid[]) id
  WHERE public.qrc_historique_liaison_prouvee(id);
  IF n <> 5 THEN RAISE EXCEPTION 'Liaison non prouvée pour % copie(s) sur 5 : migration annulée', 5 - n; END IF;
END $assert$;
