WITH signed_fc_devis AS (
  SELECT DISTINCT ON (d.apprenant_id)
    d.apprenant_id,
    d.modele,
    d.formation,
    d.montant,
    d.devis_signe_url,
    COALESCE(d.signed_at, d.created_at, now()) AS signed_at,
    a.auth_user_id,
    a.formation_choisie,
    a.date_debut_formation,
    a.date_fin_formation
  FROM public.devis_envois d
  JOIN public.apprenants a ON a.id = d.apprenant_id
  WHERE d.devis_signe_url IS NOT NULL
    AND (
      lower(coalesce(d.formation, '') || ' ' || coalesce(d.modele, '') || ' ' || coalesce(a.formation_choisie, '')) LIKE '%continue%'
      OR lower(coalesce(d.modele, '')) IN ('fc_vtc', 'fc_taxi')
    )
  ORDER BY d.apprenant_id, COALESCE(d.signed_at, d.created_at, now()) DESC
), updated_existing AS (
  UPDATE public.apprenant_documents_completes doc
  SET
    titre = 'Devis signé — ' || COALESCE(s.formation, s.formation_choisie, s.modele, 'Formation continue'),
    donnees = COALESCE(doc.donnees, '{}'::jsonb) || jsonb_build_object(
      'formation', COALESCE(s.formation, s.formation_choisie, s.modele, 'Formation continue'),
      'modele', s.modele,
      'montant', s.montant,
      'date_debut_formation', s.date_debut_formation,
      'date_fin_formation', s.date_fin_formation,
      'devis_signe_url', s.devis_signe_url,
      'fichier_url', s.devis_signe_url,
      'statut', 'signé',
      'signed_at', s.signed_at
    ),
    completed_at = s.signed_at,
    updated_at = now()
  FROM signed_fc_devis s
  WHERE doc.apprenant_id = s.apprenant_id
    AND doc.type_document = 'devis-formation-continue'
  RETURNING doc.apprenant_id
)
INSERT INTO public.apprenant_documents_completes (
  apprenant_id,
  user_id,
  type_document,
  titre,
  donnees,
  completed_at
)
SELECT
  s.apprenant_id,
  COALESCE(s.auth_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  'devis-formation-continue',
  'Devis signé — ' || COALESCE(s.formation, s.formation_choisie, s.modele, 'Formation continue'),
  jsonb_build_object(
    'formation', COALESCE(s.formation, s.formation_choisie, s.modele, 'Formation continue'),
    'modele', s.modele,
    'montant', s.montant,
    'date_debut_formation', s.date_debut_formation,
    'date_fin_formation', s.date_fin_formation,
    'devis_signe_url', s.devis_signe_url,
    'fichier_url', s.devis_signe_url,
    'statut', 'signé',
    'signed_at', s.signed_at
  ),
  s.signed_at
FROM signed_fc_devis s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.apprenant_documents_completes doc
  WHERE doc.apprenant_id = s.apprenant_id
    AND doc.type_document = 'devis-formation-continue'
);