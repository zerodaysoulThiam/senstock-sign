CREATE TABLE public.login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  ip text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.login_attempts TO service_role;

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX login_attempts_email_created_at_idx ON public.login_attempts (lower(email), created_at DESC);
CREATE INDEX login_attempts_ip_created_at_idx ON public.login_attempts (ip, created_at DESC);