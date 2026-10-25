/*
# Create contact_messages table for public contact form

## Purpose
Stores messages submitted by visitors through the public "Construyamos juntos"
contact form. These messages appear in the admin panel under "Mensajes" where
the administrator can read, mark as read/unread, and delete them.

## New table: contact_messages
- id (uuid, primary key)
- name (text, sender's name)
- email (text, sender's email)
- message (text, the message body)
- is_read (boolean, defaults false — tracks read/unread state)
- created_at (timestamptz, defaults now — submission timestamp)

## Security
- RLS enabled on contact_messages.
- Public visitors (anon + authenticated) can INSERT only — they cannot read,
  update, or delete any messages.
- Only authenticated administrators (checked via is_admin()) can SELECT, UPDATE,
  and DELETE contact messages.
- No service_role grant needed (no edge functions use this table).

## Important notes
1. This migration does NOT modify, reset, or replace any existing tables,
   policies, or data. It only adds a new table.
2. The existing is_admin() function is reused for admin-only policies.
3. Architecture is ready for future email notifications: a trigger or edge
   function can be added later to send an email when a new row is inserted,
   without modifying the table schema.
*/

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;

DROP POLICY IF EXISTS "contact_messages_public_insert" ON public.contact_messages;
CREATE POLICY "contact_messages_public_insert"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contact_messages_admin_select" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_select"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "contact_messages_admin_update" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_update"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "contact_messages_admin_delete" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_delete"
  ON public.contact_messages FOR DELETE
  TO authenticated
  USING (public.is_admin());
