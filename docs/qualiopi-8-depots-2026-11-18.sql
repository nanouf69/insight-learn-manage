-- Add documentary annotations only. No decision date or source document is changed.
WITH dossiers AS (
 SELECT apprenant_id,count(*) nombre,min(id::text) document_id,
 min(donnees->>'date_completion') depot,
 bool_and(coalesce(donnees->>'signature' LIKE 'data:image/%',false)) signe
 FROM public.apprenant_documents_completes
 WHERE type_document='dossier-bienvenue'
 GROUP BY apprenant_id
), candidats AS (
 SELECT p.id,p.remarque_interne ancienne_remarque,p.description ancienne_description,
 d.document_id,
 CASE WHEN d.nombre=1 AND d.signe AND d.depot ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
 AND d.depot::timestamptz<=now() THEN d.depot ELSE NULL END depot,
 CASE WHEN d.nombre IS NULL THEN 'dossier absent'
 WHEN d.nombre<>1 THEN 'plusieurs dossiers : rapprochement nécessaire'
 WHEN NOT d.signe THEN 'signature non prouvée'
 ELSE 'date de finalisation signée' END depot_statut
 FROM public.qualiopi_preuves p
 JOIN public.session_apprenants sa ON p.source_table='session_apprenants' AND p.source_id=sa.id::text
 LEFT JOIN dossiers d ON d.apprenant_id=sa.apprenant_id
 WHERE p.ref_key LIKE 'i8-admission-formation-20261118-%'
 AND p.remarque_interne::jsonb->>'decision_le' IS NULL
 AND NOT (p.remarque_interne::jsonb ? 'controle_depot_20261118')
), maj AS (
 UPDATE public.qualiopi_preuves p SET
 remarque_interne=(c.ancienne_remarque::jsonb || jsonb_build_object(
 'controle_depot_20261118',jsonb_build_object('source_table','apprenant_documents_completes',
 'source_id',c.document_id,'source_champ','donnees.date_completion','depot_le',c.depot,
 'statut',CASE WHEN c.depot IS NULL AND c.depot_statut='date de finalisation signée' THEN 'date non vérifiable' ELSE c.depot_statut END,
 'decision_le',NULL,'decision_statut','date de décision non documentée',
 'portee','Dépôt du dossier de cet apprenant uniquement ; ne prouve pas son admission à cette session.',
 'controle_le',now())))::text,
 description=coalesce(c.ancienne_description,'')||E'\nDate de dépôt du dossier signé : '||
 CASE WHEN c.depot IS NULL THEN 'non documentée ('||c.depot_statut||')'
 ELSE to_char(c.depot::timestamptz AT TIME ZONE 'Europe/Paris','DD/MM/YYYY HH24:MI')||' (heure de Paris, finalisation enregistrée dans le dossier)' END||
 '. Date de décision : non documentée ; aucune admission datée déduite du dépôt. Ce dépôt concerne le dossier de l’apprenant, sans preuve de rattachement à cette session.',
 updated_at=now()
 FROM candidats c WHERE p.id=c.id
 AND p.remarque_interne IS NOT DISTINCT FROM c.ancienne_remarque
 AND p.description IS NOT DISTINCT FROM c.ancienne_description
 RETURNING p.id,(p.remarque_interne::jsonb->'controle_depot_20261118'->>'depot_le') depot
)
SELECT count(*) preuves_annotees,count(*) FILTER(WHERE depot IS NOT NULL) dates_depot,
count(*) FILTER(WHERE depot IS NULL) exceptions FROM maj;