/*
  Harden function search_path settings and relocate extensions out of public.
  - Ensure commonly used helper functions run with an explicit search_path.
  - Move the citext extension into the shared extensions schema when needed.
*/

DO $$
DECLARE
  func record;
  target_functions text[] := ARRAY[
    'handle_new_user',
    'get_user_ids_in_my_store',
    'is_manager',
    'touch_employee_directory_updated_at',
    'update_updated_at_column',
    'user_id',
    'current_auth_uid',
    'update_current_list'
  ];
BEGIN
  FOR func IN
    SELECT
      n.nspname AS schema_name,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (target_functions)
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = %L',
      func.schema_name,
      func.proname,
      func.identity_args,
      'public'
    );
  END LOOP;
END $$;

-- Move citext into the shared extensions schema when it still resides in public.
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'citext'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER EXTENSION citext SET SCHEMA extensions';
  END IF;
END $$;
