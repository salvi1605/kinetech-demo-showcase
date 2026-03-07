
-- Table for public contact form submissions
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  clinic TEXT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public contact form, no auth required)
CREATE POLICY "contact_messages_anon_insert"
  ON public.contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated inserts too
CREATE POLICY "contact_messages_auth_insert"
  ON public.contact_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only super_admin and admin_clinic can read messages
CREATE POLICY "contact_messages_admin_read"
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Only super_admin can update (mark as read)
CREATE POLICY "contact_messages_admin_update"
  ON public.contact_messages
  FOR UPDATE
  TO authenticated
  USING (is_super_admin());
