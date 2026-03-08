
Root cause identified: the storage RLS policy is still wrong after migration.

What’s happening:
- Upload path is correct: `originals/{projectId}/...`
- User is authenticated and owns the project (`projects.user_id` matches auth user)
- But the policy expression got rewritten to this inside `EXISTS`:
  - `storage.foldername(projects.name))[1]`
- That means it checks folder name against the project **name** column instead of the uploaded object path, so `INSERT` fails with: `new row violates row-level security policy`.

Implementation plan to fix it:

1) Create a new migration to replace only the broken storage policies
- Drop:
  - `Users can upload to their project folders`
  - `Users can delete from their project folders`
- Recreate both policies using an explicit outer-column reference so no name-shadowing occurs:
  - Use `storage.foldername(storage.objects.name))[1]` (or `split_part(storage.objects.name, '/', 1)`) inside the `EXISTS` clause.
  - Keep ownership check:
    - project id from path must match `projects.id`
    - `projects.user_id = auth.uid()`
- Keep `Public read originals` unchanged.

2) Keep security tight
- Do not make write access public.
- Only authenticated users can insert/delete, and only in folders for projects they own.
- No schema changes, no bucket changes, no frontend workaround needed.

3) Verify policy actually compiled correctly
- Read back `pg_policies.with_check` and `qual` for `storage.objects`.
- Confirm there is no `projects.name` reference anymore.
- Confirm expression references object path (`storage.objects.name`).

4) End-to-end validation
- Re-test Step 1 upload on the same project route.
- Expect successful upload and no red “row-level security policy” toast.
- Validate multiple files and retry behavior.
- Optional: quick delete test for uploaded image to verify DELETE policy is also correct.

Why this is the right fix:
- The backend logic and upload path are already correct.
- The failure is purely policy SQL scoping/name-resolution.
- Fixing policy references resolves upload without changing UI behavior.
