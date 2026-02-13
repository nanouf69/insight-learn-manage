
-- Create a table for system alerts/notifications (email failures, etc.)
CREATE TABLE public.alertes_systeme (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'email_error',
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  lu BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alertes_systeme ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can select alertes_systeme" ON public.alertes_systeme FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert alertes_systeme" ON public.alertes_systeme FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update alertes_systeme" ON public.alertes_systeme FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete alertes_systeme" ON public.alertes_systeme FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow service role (edge functions) to insert
CREATE POLICY "Service role can insert alertes" ON public.alertes_systeme FOR INSERT WITH CHECK (true);
