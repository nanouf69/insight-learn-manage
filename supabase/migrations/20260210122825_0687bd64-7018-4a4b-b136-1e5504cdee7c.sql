
-- 1. Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. RLS on user_roles: users can see own role, admins can manage
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Auto-assign admin role to new users via trigger (since this is an admin-only app)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 5. Drop all permissive policies and replace with admin-only policies

-- apprenants
DROP POLICY IF EXISTS "Allow public read apprenants" ON public.apprenants;
DROP POLICY IF EXISTS "Allow public insert apprenants" ON public.apprenants;
DROP POLICY IF EXISTS "Allow public update apprenants" ON public.apprenants;
DROP POLICY IF EXISTS "Allow public delete apprenants" ON public.apprenants;

CREATE POLICY "Admins can select apprenants" ON public.apprenants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert apprenants" ON public.apprenants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update apprenants" ON public.apprenants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete apprenants" ON public.apprenants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- formateurs
DROP POLICY IF EXISTS "Allow public read formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Allow public insert formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Allow public update formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Allow public delete formateurs" ON public.formateurs;

CREATE POLICY "Admins can select formateurs" ON public.formateurs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert formateurs" ON public.formateurs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update formateurs" ON public.formateurs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete formateurs" ON public.formateurs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contacts
DROP POLICY IF EXISTS "Allow public read contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public delete contacts" ON public.contacts;

CREATE POLICY "Admins can select contacts" ON public.contacts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- documents
DROP POLICY IF EXISTS "Allow public read documents" ON public.documents;
DROP POLICY IF EXISTS "Allow public insert documents" ON public.documents;
DROP POLICY IF EXISTS "Allow public update documents" ON public.documents;
DROP POLICY IF EXISTS "Allow public delete documents" ON public.documents;

CREATE POLICY "Admins can select documents" ON public.documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update documents" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete documents" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- documents_inscription
DROP POLICY IF EXISTS "Allow public read documents_inscription" ON public.documents_inscription;
DROP POLICY IF EXISTS "Allow public insert documents_inscription" ON public.documents_inscription;
DROP POLICY IF EXISTS "Allow public update documents_inscription" ON public.documents_inscription;
DROP POLICY IF EXISTS "Allow public delete documents_inscription" ON public.documents_inscription;

CREATE POLICY "Admins can select documents_inscription" ON public.documents_inscription FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert documents_inscription" ON public.documents_inscription FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update documents_inscription" ON public.documents_inscription FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete documents_inscription" ON public.documents_inscription FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- emails
DROP POLICY IF EXISTS "Allow authenticated read emails" ON public.emails;
DROP POLICY IF EXISTS "Allow authenticated insert emails" ON public.emails;
DROP POLICY IF EXISTS "Allow authenticated update emails" ON public.emails;
DROP POLICY IF EXISTS "Allow authenticated delete emails" ON public.emails;

CREATE POLICY "Admins can select emails" ON public.emails FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert emails" ON public.emails FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update emails" ON public.emails FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete emails" ON public.emails FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- factures
DROP POLICY IF EXISTS "Allow public read factures" ON public.factures;
DROP POLICY IF EXISTS "Allow public insert factures" ON public.factures;
DROP POLICY IF EXISTS "Allow public update factures" ON public.factures;
DROP POLICY IF EXISTS "Allow public delete factures" ON public.factures;

CREATE POLICY "Admins can select factures" ON public.factures FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert factures" ON public.factures FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update factures" ON public.factures FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete factures" ON public.factures FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- formations
DROP POLICY IF EXISTS "Allow public read formations" ON public.formations;
DROP POLICY IF EXISTS "Allow public insert formations" ON public.formations;
DROP POLICY IF EXISTS "Allow public update formations" ON public.formations;
DROP POLICY IF EXISTS "Allow public delete formations" ON public.formations;

CREATE POLICY "Admins can select formations" ON public.formations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert formations" ON public.formations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update formations" ON public.formations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete formations" ON public.formations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- sessions
DROP POLICY IF EXISTS "Allow public read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public delete sessions" ON public.sessions;

CREATE POLICY "Admins can select sessions" ON public.sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sessions" ON public.sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- session_apprenants
DROP POLICY IF EXISTS "Allow public read session_apprenants" ON public.session_apprenants;
DROP POLICY IF EXISTS "Allow public insert session_apprenants" ON public.session_apprenants;
DROP POLICY IF EXISTS "Allow public update session_apprenants" ON public.session_apprenants;
DROP POLICY IF EXISTS "Allow public delete session_apprenants" ON public.session_apprenants;

CREATE POLICY "Admins can select session_apprenants" ON public.session_apprenants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert session_apprenants" ON public.session_apprenants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update session_apprenants" ON public.session_apprenants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete session_apprenants" ON public.session_apprenants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- session_formateurs
DROP POLICY IF EXISTS "Allow public read session_formateurs" ON public.session_formateurs;
DROP POLICY IF EXISTS "Allow public insert session_formateurs" ON public.session_formateurs;
DROP POLICY IF EXISTS "Allow public update session_formateurs" ON public.session_formateurs;
DROP POLICY IF EXISTS "Allow public delete session_formateurs" ON public.session_formateurs;

CREATE POLICY "Admins can select session_formateurs" ON public.session_formateurs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert session_formateurs" ON public.session_formateurs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update session_formateurs" ON public.session_formateurs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete session_formateurs" ON public.session_formateurs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- agenda_blocs
DROP POLICY IF EXISTS "Allow public read agenda_blocs" ON public.agenda_blocs;
DROP POLICY IF EXISTS "Allow public insert agenda_blocs" ON public.agenda_blocs;
DROP POLICY IF EXISTS "Allow public update agenda_blocs" ON public.agenda_blocs;
DROP POLICY IF EXISTS "Allow public delete agenda_blocs" ON public.agenda_blocs;

CREATE POLICY "Admins can select agenda_blocs" ON public.agenda_blocs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert agenda_blocs" ON public.agenda_blocs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update agenda_blocs" ON public.agenda_blocs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete agenda_blocs" ON public.agenda_blocs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- bpf
DROP POLICY IF EXISTS "Allow public read bpf" ON public.bpf;
DROP POLICY IF EXISTS "Allow public insert bpf" ON public.bpf;
DROP POLICY IF EXISTS "Allow public update bpf" ON public.bpf;
DROP POLICY IF EXISTS "Allow public delete bpf" ON public.bpf;

CREATE POLICY "Admins can select bpf" ON public.bpf FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert bpf" ON public.bpf FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bpf" ON public.bpf FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete bpf" ON public.bpf FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- organismes
DROP POLICY IF EXISTS "Allow public read organismes" ON public.organismes;
DROP POLICY IF EXISTS "Allow public insert organismes" ON public.organismes;
DROP POLICY IF EXISTS "Allow public update organismes" ON public.organismes;
DROP POLICY IF EXISTS "Allow public delete organismes" ON public.organismes;

CREATE POLICY "Admins can select organismes" ON public.organismes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert organismes" ON public.organismes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update organismes" ON public.organismes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete organismes" ON public.organismes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles: add admin view policy
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Make storage bucket private and update policies
UPDATE storage.buckets SET public = false WHERE id = 'documents-inscription';

DROP POLICY IF EXISTS "Anyone can view inscription documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload inscription documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update inscription documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete inscription documents" ON storage.objects;

CREATE POLICY "Admins can manage inscription documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'documents-inscription' AND
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'documents-inscription' AND
  public.has_role(auth.uid(), 'admin')
);

-- 7. Assign admin role to existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
