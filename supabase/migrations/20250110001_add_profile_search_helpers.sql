/*
  Enable searching teammates by name or signup email for list sharing.
  - Expose a SECURITY DEFINER helper that joins profiles to auth.users and
    searches across employee_name and email.
  - Provide a helper to fetch profile details (including email) by ID list so
    the client can hydrate existing shares.
*/

SET search_path = public;

CREATE OR REPLACE FUNCTION public.search_profiles_for_sharing(
  search_term text,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  employee_name text,
  email text,
  store_location text,
  role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.id,
    p.employee_name,
    u.email,
    p.store_location,
    p.role
  FROM public.profiles AS p
  JOIN auth.users AS u
    ON u.id = p.id
  WHERE (
    search_term IS NULL
    OR search_term = ''
    OR p.employee_name ILIKE '%' || search_term || '%'
    OR u.email ILIKE '%' || search_term || '%'
  )
    AND COALESCE(p.role, 'employee') IN ('employee', 'manager', 'user')
  ORDER BY
    CASE
      WHEN search_term IS NULL OR search_term = '' THEN 1
      WHEN u.email ILIKE search_term || '%' THEN 0
      WHEN p.employee_name ILIKE search_term || '%' THEN 0
      ELSE 2
    END,
    COALESCE(p.employee_name, u.email),
    u.email
  LIMIT GREATEST(limit_count, 1);
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles_for_sharing(text, integer)
TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(
  profile_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  employee_name text,
  email text,
  store_location text,
  role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.id,
    p.employee_name,
    u.email,
    p.store_location,
    p.role
  FROM public.profiles AS p
  JOIN auth.users AS u
    ON u.id = p.id
  WHERE profile_ids IS NULL
    OR array_length(profile_ids, 1) IS NULL
    OR p.id = ANY(profile_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_by_ids(uuid[]) TO authenticated;
