

# Fix: Storage Upload RLS for Brand Ambassador Photos

## Root Cause
The `originals` storage bucket has no RLS policy allowing authenticated users to upload files. The upload to `originals/models/{userId}/...` returns 403 "new row violates row-level security policy".

The error shown in the toast ("Failed to create model / new row violates row-level security policy") is actually from the storage upload step (line 302 in Models.tsx), not the `custom_models` table insert.

## Fix — Database Migration

Add storage policies on the `storage.objects` table for the `originals` bucket:

```sql
-- Allow authenticated users to upload to their own folder in originals
CREATE POLICY "Users can upload to originals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'originals' AND (storage.foldername(name))[1] = 'models' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Allow authenticated users to read their own uploads
CREATE POLICY "Users can read own originals"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'originals' AND (storage.foldername(name))[1] = 'models' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Allow public read since bucket is public
CREATE POLICY "Public read originals"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'originals');
```

## Files Modified
- Database migration only — no code changes needed

