
-- Create storage bucket for exam results PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('exam-results', 'exam-results', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for exam-results bucket
CREATE POLICY "Admins can upload exam results"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exam-results' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view exam results"
ON storage.objects FOR SELECT
USING (bucket_id = 'exam-results' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete exam results"
ON storage.objects FOR DELETE
USING (bucket_id = 'exam-results' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
