/*
# Create secure form administration system

1. New tables
- `profiles`: administrator role linked to Supabase Auth users.
- `forms`: form title, description, public slug, publication status and dates.
- `form_fields`: editable questions with type, help text, required state, order and upload rules.
- `form_field_options`: selectable answers for choice-based questions.
- `form_submissions`: public submissions linked to a form and review status.
- `form_answers`: one answer per submitted question.
- `submission_files`: private uploaded document metadata.

2. Security
- RLS is enabled on every table.
- Public visitors can only read published form definitions and create submissions for currently available forms.
- Authenticated administrators can manage forms, fields, options and submissions.
- Submission answers and files are not readable by visitors.
- A private `form-submissions` storage bucket is created for uploaded documents.
- Administrator access is checked by a database function; frontend visibility is not used as authorization.

3. Authentication
- New Supabase Auth users receive a profile with the `editor` role.
- The first authenticated user may call `bootstrap_first_admin` once to become the initial administrator.
- No password or credential is stored in application code.

4. Important notes
- Form slugs are public URLs and are unique.
- Status and date availability are checked in public read/insert policies.
- File objects are stored under the submission id and remain private.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'inactive')),
  open_at timestamptz,
  close_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_type text NOT NULL CHECK (field_type IN ('short_text', 'long_text', 'name', 'identification', 'email', 'phone', 'address', 'municipality', 'department', 'date', 'number', 'boolean', 'single_choice', 'multi_choice', 'select', 'checkboxes', 'file', 'multiple_files', 'data_consent')),
  label text NOT NULL,
  help_text text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  accepted_file_types text[] NOT NULL DEFAULT '{}',
  max_file_size_mb integer NOT NULL DEFAULT 10,
  max_files integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_review', 'approved', 'rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.form_fields(id) ON DELETE RESTRICT,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  UNIQUE (submission_id, field_id)
);

CREATE TABLE IF NOT EXISTS public.submission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.form_fields(id) ON DELETE RESTRICT,
  storage_path text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_fields_form_order_idx ON public.form_fields(form_id, sort_order);
CREATE INDEX IF NOT EXISTS form_submissions_form_date_idx ON public.form_submissions(form_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS form_answers_submission_idx ON public.form_answers(submission_id);
CREATE INDEX IF NOT EXISTS submission_files_submission_idx ON public.submission_files(submission_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, COALESCE(new.email, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_forms ON auth.users;
CREATE TRIGGER on_auth_user_created_forms
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_field_options TO authenticated;
GRANT SELECT, UPDATE ON public.form_submissions TO authenticated;
GRANT SELECT, INSERT ON public.form_submissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_answers TO authenticated;
GRANT INSERT ON public.form_answers TO anon;
GRANT SELECT, INSERT, DELETE ON public.submission_files TO authenticated;
GRANT INSERT ON public.submission_files TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM anon;

DROP POLICY IF EXISTS "profiles_read_self" ON public.profiles;
CREATE POLICY "profiles_read_self" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "forms_public_read_published" ON public.forms;
CREATE POLICY "forms_public_read_published" ON public.forms FOR SELECT TO anon, authenticated USING (status = 'published' AND (open_at IS NULL OR open_at <= now()) AND (close_at IS NULL OR close_at >= now()));
DROP POLICY IF EXISTS "forms_admin_read" ON public.forms;
CREATE POLICY "forms_admin_read" ON public.forms FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "forms_admin_insert" ON public.forms;
CREATE POLICY "forms_admin_insert" ON public.forms FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND created_by = auth.uid());
DROP POLICY IF EXISTS "forms_admin_update" ON public.forms;
CREATE POLICY "forms_admin_update" ON public.forms FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "forms_admin_delete" ON public.forms;
CREATE POLICY "forms_admin_delete" ON public.forms FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "fields_public_read_active" ON public.form_fields;
CREATE POLICY "fields_public_read_active" ON public.form_fields FOR SELECT TO anon, authenticated USING (is_active AND EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND f.status = 'published' AND (f.open_at IS NULL OR f.open_at <= now()) AND (f.close_at IS NULL OR f.close_at >= now())));
DROP POLICY IF EXISTS "fields_admin_read" ON public.form_fields;
CREATE POLICY "fields_admin_read" ON public.form_fields FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "fields_admin_insert" ON public.form_fields;
CREATE POLICY "fields_admin_insert" ON public.form_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "fields_admin_update" ON public.form_fields;
CREATE POLICY "fields_admin_update" ON public.form_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "fields_admin_delete" ON public.form_fields;
CREATE POLICY "fields_admin_delete" ON public.form_fields FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "options_public_read" ON public.form_field_options;
CREATE POLICY "options_public_read" ON public.form_field_options FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.form_fields ff JOIN public.forms f ON f.id = ff.form_id WHERE ff.id = field_id AND ff.is_active AND f.status = 'published'));
DROP POLICY IF EXISTS "options_admin_read" ON public.form_field_options;
CREATE POLICY "options_admin_read" ON public.form_field_options FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "options_admin_insert" ON public.form_field_options;
CREATE POLICY "options_admin_insert" ON public.form_field_options FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "options_admin_update" ON public.form_field_options;
CREATE POLICY "options_admin_update" ON public.form_field_options FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "options_admin_delete" ON public.form_field_options;
CREATE POLICY "options_admin_delete" ON public.form_field_options FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "submissions_public_insert" ON public.form_submissions;
CREATE POLICY "submissions_public_insert" ON public.form_submissions FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND f.status = 'published' AND (f.open_at IS NULL OR f.open_at <= now()) AND (f.close_at IS NULL OR f.close_at >= now())));
DROP POLICY IF EXISTS "submissions_admin_read" ON public.form_submissions;
CREATE POLICY "submissions_admin_read" ON public.form_submissions FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "submissions_admin_update" ON public.form_submissions;
CREATE POLICY "submissions_admin_update" ON public.form_submissions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "answers_public_insert" ON public.form_answers;
CREATE POLICY "answers_public_insert" ON public.form_answers FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.form_submissions s JOIN public.forms f ON f.id = s.form_id WHERE s.id = submission_id AND f.status = 'published'));
DROP POLICY IF EXISTS "answers_admin_read" ON public.form_answers;
CREATE POLICY "answers_admin_read" ON public.form_answers FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "answers_admin_delete" ON public.form_answers;
CREATE POLICY "answers_admin_delete" ON public.form_answers FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "files_public_insert" ON public.submission_files;
CREATE POLICY "files_public_insert" ON public.submission_files FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.form_submissions WHERE id = submission_id));
DROP POLICY IF EXISTS "files_admin_read" ON public.submission_files;
CREATE POLICY "files_admin_read" ON public.submission_files FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "files_admin_delete" ON public.submission_files;
CREATE POLICY "files_admin_delete" ON public.submission_files FOR DELETE TO authenticated USING (public.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('form-submissions', 'form-submissions', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "submission_files_upload" ON storage.objects;
CREATE POLICY "submission_files_upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'form-submissions');
DROP POLICY IF EXISTS "submission_files_admin_read" ON storage.objects;
CREATE POLICY "submission_files_admin_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'form-submissions' AND public.is_admin());
DROP POLICY IF EXISTS "submission_files_admin_delete" ON storage.objects;
CREATE POLICY "submission_files_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'form-submissions' AND public.is_admin());
