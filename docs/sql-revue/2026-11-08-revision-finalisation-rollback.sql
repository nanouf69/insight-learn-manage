-- Disable only the new finalizer. Keep receipts and duplicate protection intact.
-- Revert the frontend ONLY to an error-closed finalization, never the old INSERT retry.
SET LOCAL lock_timeout = '3s';
REVOKE EXECUTE ON FUNCTION public.finaliser_revision_fausses(uuid,text,text) FROM authenticated;