CREATE INDEX IF NOT EXISTS idx_alertes_systeme_lu_created_at_desc
ON public.alertes_systeme (lu, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_bancaires_date_operation_desc
ON public.transactions_bancaires (date_operation DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_bancaires_montant_date_operation_desc
ON public.transactions_bancaires (montant, date_operation DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_date_debut_asc
ON public.sessions (date_debut ASC);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id
ON public.profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_apprenants_auth_user_id
ON public.apprenants (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_apprenants_deleted_created_at_desc
ON public.apprenants (deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_editor_state_updated_at_asc
ON public.module_editor_state (updated_at ASC);