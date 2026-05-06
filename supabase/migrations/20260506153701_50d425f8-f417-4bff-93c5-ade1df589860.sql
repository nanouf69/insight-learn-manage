
CREATE TABLE public.module_change_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id INTEGER NOT NULL,
  module_nom TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcn_module_changed ON public.module_change_notifications(module_id, changed_at DESC);
CREATE INDEX idx_mcn_changed_at ON public.module_change_notifications(changed_at DESC);

ALTER TABLE public.module_change_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage module_change_notifications"
ON public.module_change_notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated can view module_change_notifications"
ON public.module_change_notifications FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE TABLE public.module_notification_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.module_change_notifications(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, notification_id)
);

CREATE INDEX idx_mnd_apprenant ON public.module_notification_dismissals(apprenant_id);

ALTER TABLE public.module_notification_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage module_notification_dismissals"
ON public.module_notification_dismissals FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Apprenant view own dismissals"
ON public.module_notification_dismissals FOR SELECT
USING (EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = apprenant_id AND a.auth_user_id = auth.uid()));

CREATE POLICY "Apprenant insert own dismissals"
ON public.module_notification_dismissals FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = apprenant_id AND a.auth_user_id = auth.uid()));

CREATE POLICY "Apprenant delete own dismissals"
ON public.module_notification_dismissals FOR DELETE
USING (EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = apprenant_id AND a.auth_user_id = auth.uid()));
