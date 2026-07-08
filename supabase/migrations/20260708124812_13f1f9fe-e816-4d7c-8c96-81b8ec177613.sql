ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_path text;

CREATE POLICY "Users upload own signed docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'signed-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own or admin signed docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'signed-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users delete own or admin signed docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'signed-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'::app_role)));