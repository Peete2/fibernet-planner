
-- Create storage bucket for FWA document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('fwa-documents', 'fwa-documents', false);

-- Allow authenticated users to upload to fwa-documents
CREATE POLICY "Users can upload fwa documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fwa-documents');

-- Allow authenticated users to read their own uploads
CREATE POLICY "Users can read own fwa documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fwa-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow admins to read all fwa documents
CREATE POLICY "Admins can read all fwa documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fwa-documents' AND public.has_role(auth.uid(), 'admin'));

-- Add document_url column to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS document_url text;
-- Add applicant_role column (student/teacher) for FWA
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS applicant_role text;
