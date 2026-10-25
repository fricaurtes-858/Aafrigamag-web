/*
# Extend site_settings with full Contact section configuration

Makes the entire "Construyamos juntos" section (contact info, social links,
WhatsApp, and form labels/placeholders) editable from the admin panel
instead of being hardcoded in App.tsx.

## Changes to existing table `public.site_settings`
Adds nullable text columns (all backward-compatible — existing rows keep
working because defaults fill the values):

Contact presentation:
- contact_eyebrow         small heading above the title
- contact_title           main title of the section
- contact_intro           descriptive paragraph
- contact_municipality    municipality name (default 'Plato')
- contact_department      department name (default 'Magdalena')
- contact_country         country name (default 'Colombia')
- contact_phone           public phone number (optional)
- contact_whatsapp        WhatsApp number in international format, digits only (optional)
- contact_facebook        Facebook profile URL (optional)
- contact_instagram       Instagram profile URL (optional)
- contact_youtube         YouTube channel URL (optional)

Contact form labels and placeholders:
- form_label_name / form_placeholder_name
- form_label_email / form_placeholder_email
- form_label_phone / form_placeholder_phone
- form_label_subject / form_placeholder_subject
- form_label_message / form_placeholder_message
- form_label_attachments
- form_consent_text       data-treatment acceptance text
- form_submit_text        send button label
- form_success_title      confirmation heading after sending
- form_success_text       confirmation body after sending

## Security
- No new tables. RLS already enabled on site_settings.
- Existing policies remain: public SELECT (anon, authenticated),
  admin-only INSERT/UPDATE/DELETE (is_admin()).
- No changes to grants (UPDATE already covers all columns for authenticated).

## Notes
- All columns are added with `IF NOT EXISTS` via a DO block so re-running
  is safe.
- A seed UPDATE sets sensible defaults on the existing singleton row,
  including the required "Plato, Magdalena · Colombia" location.
*/

DO $$
BEGIN
  -- Contact presentation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_eyebrow') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_eyebrow text NOT NULL DEFAULT 'Estamos para escucharte';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_title') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_title text NOT NULL DEFAULT 'Construyamos juntos.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_intro') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_intro text NOT NULL DEFAULT '¿Tienes una idea, una propuesta de alianza o quieres conocer más sobre nuestro trabajo? Escríbenos.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_municipality') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_municipality text NOT NULL DEFAULT 'Plato';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_department') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_department text NOT NULL DEFAULT 'Magdalena';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_country') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_country text NOT NULL DEFAULT 'Colombia';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_phone') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_phone text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_whatsapp') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_whatsapp text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_facebook') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_facebook text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_instagram') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_instagram text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='contact_youtube') THEN
    ALTER TABLE public.site_settings ADD COLUMN contact_youtube text NOT NULL DEFAULT '';
  END IF;

  -- Form labels and placeholders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_label_name') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_label_name text NOT NULL DEFAULT 'Nombre completo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_placeholder_name') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_placeholder_name text NOT NULL DEFAULT 'Tu nombre completo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_label_email') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_label_email text NOT NULL DEFAULT 'Correo electrónico';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_placeholder_email') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_placeholder_email text NOT NULL DEFAULT 'Tu correo electrónico';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_label_phone') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_label_phone text NOT NULL DEFAULT 'Teléfono (opcional)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_placeholder_phone') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_placeholder_phone text NOT NULL DEFAULT 'Tu número de teléfono';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_label_subject') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_label_subject text NOT NULL DEFAULT 'Asunto';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_placeholder_subject') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_placeholder_subject text NOT NULL DEFAULT '¿Sobre qué nos escribes?';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_label_message') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_label_message text NOT NULL DEFAULT 'Mensaje';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_placeholder_message') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_placeholder_message text NOT NULL DEFAULT 'Cuéntanos cómo podemos ayudarte';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_label_attachments') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_label_attachments text NOT NULL DEFAULT 'Documentos adjuntos (opcional)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_consent_text') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_consent_text text NOT NULL DEFAULT 'Acepto el tratamiento de mis datos personales.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_submit_text') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_submit_text text NOT NULL DEFAULT 'Enviar mensaje';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_success_title') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_success_title text NOT NULL DEFAULT 'Mensaje recibido';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_settings' AND column_name='form_success_text') THEN
    ALTER TABLE public.site_settings ADD COLUMN form_success_text text NOT NULL DEFAULT 'Gracias por escribirnos. Te contactaremos pronto.';
  END IF;
END $$;

-- Ensure the singleton row exists with all defaults, including the
-- required "Plato, Magdalena · Colombia" location.
INSERT INTO public.site_settings (institutional_email)
SELECT '' WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);
