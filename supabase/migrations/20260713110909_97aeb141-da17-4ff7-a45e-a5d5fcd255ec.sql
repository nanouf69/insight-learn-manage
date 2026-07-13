
-- Dedupe apprenant_documents_completes on (apprenant_id, type_document, titre), keep most recent
DELETE FROM public.apprenant_documents_completes a
USING public.apprenant_documents_completes b
WHERE a.apprenant_id = b.apprenant_id
  AND a.type_document = b.type_document
  AND a.titre = b.titre
  AND (a.created_at, a.id) < (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS apprenant_documents_completes_apprenant_type_titre_key
  ON public.apprenant_documents_completes (apprenant_id, type_document, titre);
