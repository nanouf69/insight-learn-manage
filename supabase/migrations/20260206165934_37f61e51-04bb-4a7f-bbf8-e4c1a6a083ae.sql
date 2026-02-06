-- Create table to store synchronized emails from Outlook
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID REFERENCES public.apprenants(id) ON DELETE CASCADE,
  outlook_message_id TEXT UNIQUE,
  subject TEXT NOT NULL,
  body_preview TEXT,
  body_html TEXT,
  sender_email TEXT,
  sender_name TEXT,
  recipients TEXT[],
  type TEXT NOT NULL CHECK (type IN ('sent', 'received')),
  is_read BOOLEAN DEFAULT false,
  has_attachments BOOLEAN DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_emails_apprenant_id ON public.emails(apprenant_id);
CREATE INDEX idx_emails_outlook_message_id ON public.emails(outlook_message_id);
CREATE INDEX idx_emails_type ON public.emails(type);
CREATE INDEX idx_emails_received_at ON public.emails(received_at DESC);

-- Enable RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read emails" 
ON public.emails 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated insert emails" 
ON public.emails 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated update emails" 
ON public.emails 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow authenticated delete emails" 
ON public.emails 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_emails_updated_at
BEFORE UPDATE ON public.emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();