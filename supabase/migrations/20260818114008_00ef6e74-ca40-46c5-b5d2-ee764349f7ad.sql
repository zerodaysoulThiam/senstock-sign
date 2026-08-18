ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS original_owner_email text;

CREATE INDEX IF NOT EXISTS documents_deleted_at_idx ON public.documents (deleted_at);

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_owner_id_fkey;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT;