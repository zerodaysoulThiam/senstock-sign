CREATE POLICY "Users manage their own signature files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);