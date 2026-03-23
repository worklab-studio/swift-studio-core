

# Fix: Storage Upload RLS Policy Name Ambiguity

## Root Cause
The migration `20260323111116` dropped and recreated the INSERT/DELETE policies using `split_part(name, '/', 1)` instead of `split_part(storage.objects.name, '/', 1)`. The previous working migration (`20260308140153`) explicitly qualified the reference as `storage.objects.name` to avoid ambiguity with `projects.name` in the EXISTS subquery. The unqualified `name` resolves to the wrong column, breaking project-based uploads.

## Fix — Database Migration

Re-create both policies with fully qualified `storage.objects.name`:

```sql
DROP POLICY IF EXISTS "Users can upload to their project folders" ON storage.objects;

CREATE POLICY "Users can upload to their project folders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'originals' AND (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(storage.objects.name, '/', 1)
      AND p.user_id = auth.uid()
    )
    OR (split_part(storage.objects.name, '/', 1) = 'models' AND split_part(storage.objects.name, '/', 2) = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "Users can delete from their project folders" ON storage.objects;

CREATE POLICY "Users can delete from their project folders"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'originals' AND (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(storage.objects.name, '/', 1)
      AND p.user_id = auth.uid()
    )
    OR (split_part(storage.objects.name, '/', 1) = 'models' AND split_part(storage.objects.name, '/', 2) = auth.uid()::text)
  )
);
```

## Files Modified
- Database migration only — no code changes needed

