ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS signature_id text,
  ADD COLUMN IF NOT EXISTS auth_method text,
  ADD COLUMN IF NOT EXISTS signer_ip text,
  ADD COLUMN IF NOT EXISTS cert_serial text,
  ADD COLUMN IF NOT EXISTS cert_subject text,
  ADD COLUMN IF NOT EXISTS crypto_signed boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS documents_signature_id_key ON public.documents (signature_id) WHERE signature_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_sha256_idx ON public.documents (sha256);