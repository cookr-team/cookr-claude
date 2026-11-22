-- ==============================================================================
-- COOKR TRANSACTIONAL EMAIL EVENTS SCHEMA & IDEMPOTENCY MIGRATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance, idempotency verification, and auditing
CREATE INDEX IF NOT EXISTS idx_email_events_idempotency ON public.email_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_email_events_booking_id ON public.email_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON public.email_events(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON public.email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON public.email_events(email_type);

-- Row Level Security (RLS)
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- 1. Administrators can view all email logs
CREATE POLICY "Admins can view all email events" 
  ON public.email_events 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 2. Users can view their own email events logs
CREATE POLICY "Users can view their own email events" 
  ON public.email_events 
  FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    OR recipient_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- 3. Only Service Role / Backend functions can insert or update email events
CREATE POLICY "Service role can manage email events" 
  ON public.email_events 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);
