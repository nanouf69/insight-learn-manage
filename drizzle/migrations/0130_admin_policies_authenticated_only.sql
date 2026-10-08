-- Politiques réservées aux admins évaluées aussi pour les visiteurs non connectés :
-- has_role() refusé (42501) au lieu d'un résultat vide. Même restriction admin, rôle limité aux connectés.
ALTER POLICY "Admins can manage transactions_bancaires" ON public.transactions_bancaires TO authenticated;
ALTER POLICY "Admins can manage justificatifs" ON public.justificatifs TO authenticated;
ALTER POLICY "Admins can manage notes_frais" ON public.notes_frais TO authenticated;
ALTER POLICY "Admins can select alertes_systeme" ON public.alertes_systeme TO authenticated;
ALTER POLICY "Admins can insert alertes_systeme" ON public.alertes_systeme TO authenticated;
ALTER POLICY "Admins can update alertes_systeme" ON public.alertes_systeme TO authenticated;
ALTER POLICY "Admins can delete alertes_systeme" ON public.alertes_systeme TO authenticated;