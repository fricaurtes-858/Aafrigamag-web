/*
# CMS content tables for AAFRIGAMAG

Adds dynamic, admin-managed content sections: institutional history, documents
library, news posts, and central site settings (institutional email).

## New tables (all RLS-enabled)
- site_settings (singleton row, key/value-like site configuration)
- our_story (one editable story record: title, subtitle, paragraphs, photos, docs, status)
- our_story_photos (ordered photos attached to the story)
- our_story_documents (ordered documents attached to the story)
- documents (public documents library: title, description, category, date, file, status)
- news_posts (news articles: title, slug, summary, body, cover image, status, published_at)
- news_photos (additional photos for a news post)

## Storage
- New public bucket `site-media` for news images, story photos and document files.
  Public read; admin-only upload/update/delete (checked via is_admin()).

## Security
- Public (anon, authenticated): SELECT only published content.
- Authenticated admin: full CRUD on all CMS tables (checked via is_admin()).
- No service_role use from the frontend.
- The existing is_admin() function is reused.

## Non-destructive
- Does NOT modify, drop, reset or replace any existing table, policy, bucket or data.
- Only adds new tables, policies and one new bucket.
*/

-- ---------------------------------------------------------------------------
-- site_settings: central configuration (institutional email, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institutional_email text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Ensure at most one row.
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_singleton_idx ON public.site_settings ((id IS NOT NULL));

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;

DROP POLICY IF EXISTS "settings_public_read" ON public.site_settings;
CREATE POLICY "settings_public_read"
  ON public.site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin_insert" ON public.site_settings;
CREATE POLICY "settings_admin_insert"
  ON public.site_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings_admin_update" ON public.site_settings;
CREATE POLICY "settings_admin_update"
  ON public.site_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings_admin_delete" ON public.site_settings;
CREATE POLICY "settings_admin_delete"
  ON public.site_settings FOR DELETE
  TO authenticated USING (public.is_admin());

-- Seed an empty singleton row if none exists.
INSERT INTO public.site_settings (institutional_email)
SELECT '' WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

-- ---------------------------------------------------------------------------
-- our_story + photos + documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.our_story (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.our_story_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.our_story(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.our_story_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.our_story(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_name text NOT NULL,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.our_story ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.our_story_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.our_story_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.our_story, public.our_story_photos, public.our_story_documents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.our_story TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.our_story_photos, public.our_story_documents TO authenticated;

DROP POLICY IF EXISTS "story_public_read" ON public.our_story;
CREATE POLICY "story_public_read"
  ON public.our_story FOR SELECT
  TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "story_admin_read" ON public.our_story;
CREATE POLICY "story_admin_read"
  ON public.our_story FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "story_admin_insert" ON public.our_story;
CREATE POLICY "story_admin_insert"
  ON public.our_story FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "story_admin_update" ON public.our_story;
CREATE POLICY "story_admin_update"
  ON public.our_story FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "story_admin_delete" ON public.our_story;
CREATE POLICY "story_admin_delete"
  ON public.our_story FOR DELETE
  TO authenticated USING (public.is_admin());

-- story photos: public read published story's photos; admin full
DROP POLICY IF EXISTS "story_photos_public_read" ON public.our_story_photos;
CREATE POLICY "story_photos_public_read"
  ON public.our_story_photos FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.our_story s WHERE s.id = our_story_photos.story_id AND s.status = 'published')
  );

DROP POLICY IF EXISTS "story_photos_admin_all" ON public.our_story_photos;
CREATE POLICY "story_photos_admin_all"
  ON public.our_story_photos FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- story documents
DROP POLICY IF EXISTS "story_docs_public_read" ON public.our_story_documents;
CREATE POLICY "story_docs_public_read"
  ON public.our_story_documents FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.our_story s WHERE s.id = our_story_documents.story_id AND s.status = 'published')
  );

DROP POLICY IF EXISTS "story_docs_admin_all" ON public.our_story_documents;
CREATE POLICY "story_docs_admin_all"
  ON public.our_story_documents FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- documents library
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Otros' CHECK (category IN ('Institucionales','Estatutos','Informes','Proyectos','Convocatorias','Resoluciones','Otros')),
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  storage_path text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_status_date_idx ON public.documents (status, doc_date DESC);
CREATE INDEX IF NOT EXISTS documents_category_idx ON public.documents (category);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.documents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.documents TO authenticated;

DROP POLICY IF EXISTS "documents_public_read" ON public.documents;
CREATE POLICY "documents_public_read"
  ON public.documents FOR SELECT
  TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "documents_admin_read" ON public.documents;
CREATE POLICY "documents_admin_read"
  ON public.documents FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "documents_admin_insert" ON public.documents;
CREATE POLICY "documents_admin_insert"
  ON public.documents FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "documents_admin_update" ON public.documents;
CREATE POLICY "documents_admin_update"
  ON public.documents FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "documents_admin_delete" ON public.documents;
CREATE POLICY "documents_admin_delete"
  ON public.documents FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- news_posts + news_photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  cover_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.news_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS news_posts_status_published_idx ON public.news_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS news_posts_slug_idx ON public.news_posts (slug);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_photos ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.news_posts, public.news_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.news_photos TO authenticated;

DROP POLICY IF EXISTS "news_public_read" ON public.news_posts;
CREATE POLICY "news_public_read"
  ON public.news_posts FOR SELECT
  TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "news_admin_read" ON public.news_posts;
CREATE POLICY "news_admin_read"
  ON public.news_posts FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "news_admin_insert" ON public.news_posts;
CREATE POLICY "news_admin_insert"
  ON public.news_posts FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "news_admin_update" ON public.news_posts;
CREATE POLICY "news_admin_update"
  ON public.news_posts FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "news_admin_delete" ON public.news_posts;
CREATE POLICY "news_admin_delete"
  ON public.news_posts FOR DELETE
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "news_photos_public_read" ON public.news_photos;
CREATE POLICY "news_photos_public_read"
  ON public.news_photos FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.news_posts p WHERE p.id = news_photos.post_id AND p.status = 'published')
  );

DROP POLICY IF EXISTS "news_photos_admin_all" ON public.news_photos;
CREATE POLICY "news_photos_admin_all"
  ON public.news_photos FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket: site-media (public read, admin write)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-media', 'site-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "site_media_public_read" ON storage.objects;
CREATE POLICY "site_media_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'site-media');

DROP POLICY IF EXISTS "site_media_admin_insert" ON storage.objects;
CREATE POLICY "site_media_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "site_media_admin_update" ON storage.objects;
CREATE POLICY "site_media_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'site-media' AND public.is_admin()) WITH CHECK (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "site_media_admin_delete" ON storage.objects;
CREATE POLICY "site_media_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'site-media' AND public.is_admin());
