-- Create a new storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN ('orders', 'signatures')
  );

-- Set up storage policy to allow public reads
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'documents'); 