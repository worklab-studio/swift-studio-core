

# Fix: Storage Upload RLS Policy Mismatch

## Problem
The storage RLS policy for the `originals` bucket requires the first folder in the file path to be `auth.uid()`. But the upload code uses `{projectId}` as the first folder. Since the project ID is not the user ID, the policy rejects the upload.

## Solution
Update the storage RLS policies to allow uploads where the first folder matches either the user's ID or a project ID that belongs to the user. This is needed because:
- The frontend uploads product images using `{projectId}/...` paths
- The edge functions (generate-shots, edit-shot) also upload using `{projectId}/...` paths via the service role client

### Database Migration
Drop the existing three policies on `storage.objects` for the `originals` bucket and replace them with policies that check project ownership:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can upload originals" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own originals" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own originals" ON storage.objects;

-- Allow upload if the folder name matches a project owned by the user
CREATE POLICY "Users can upload to their project folders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'originals' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  )
);

-- Public read (bucket is already public)
CREATE POLICY "Public read originals"
ON storage.objects FOR SELECT
USING (bucket_id = 'originals');

-- Allow delete if user owns the project folder
CREATE POLICY "Users can delete from their project folders"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'originals' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  )
);
```

### Files to Modify
- **Database migration only** -- no code changes needed. The upload path `{projectId}/...` is correct; only the RLS policy was wrong.

