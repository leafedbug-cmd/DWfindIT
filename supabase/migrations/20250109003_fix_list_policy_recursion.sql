/*
  Resolve recursive RLS by using helper functions
  - Introduce has_list_access() SECURITY DEFINER helper
  - Recreate list and list_item policies using helper
  - Update list_shares policy to leverage helper
*/

SET search_path = public;

-- Helper function to check list access without triggering recursive RLS
CREATE OR REPLACE FUNCTION public.has_list_access(target_list_id uuid, required_role text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH access AS (
    SELECT user_id, 'owner'::text AS role
    FROM public.lists
    WHERE id = target_list_id

    UNION ALL

    SELECT shared_with, role
    FROM public.list_shares
    WHERE list_id = target_list_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM access
    WHERE user_id = auth.uid()
      AND (
        required_role IS NULL
        OR required_role = 'viewer'
        OR (required_role = 'editor' AND role IN ('owner', 'editor'))
        OR (required_role = 'owner' AND role = 'owner')
      )
  );
$$;

-- ============================================================================
-- Lists policies
-- ============================================================================

DROP POLICY IF EXISTS "Owners manage lists" ON public.lists;
DROP POLICY IF EXISTS "Shared users read lists" ON public.lists;

-- Allow anyone with access (owner/editor/viewer) to read list metadata
CREATE POLICY "Lists readable by access"
  ON public.lists
  FOR SELECT
  TO authenticated
  USING (public.has_list_access(id));

-- Owners can update/delete their lists
CREATE POLICY "Owners update lists"
  ON public.lists
  FOR UPDATE
  TO authenticated
  USING (public.has_list_access(id, 'owner'))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners delete lists"
  ON public.lists
  FOR DELETE
  TO authenticated
  USING (public.has_list_access(id, 'owner'));

-- Owners can insert new lists
CREATE POLICY "Owners insert lists"
  ON public.lists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- list_shares policies
-- ============================================================================

DROP POLICY IF EXISTS "List owners manage shares" ON public.list_shares;
DROP POLICY IF EXISTS "Share recipients can read" ON public.list_shares;

CREATE POLICY "Owners manage shares"
  ON public.list_shares
  FOR ALL
  TO authenticated
  USING (public.has_list_access(list_id, 'owner'))
  WITH CHECK (public.has_list_access(list_id, 'owner'));

CREATE POLICY "Recipients read shares"
  ON public.list_shares
  FOR SELECT
  TO authenticated
  USING (shared_with = auth.uid());

-- ============================================================================
-- list_items policies
-- ============================================================================

DROP POLICY IF EXISTS "List owners manage items" ON public.list_items;
DROP POLICY IF EXISTS "Shared users read items" ON public.list_items;
DROP POLICY IF EXISTS "Shared editors insert items" ON public.list_items;
DROP POLICY IF EXISTS "Shared editors update items" ON public.list_items;
DROP POLICY IF EXISTS "Shared editors delete items" ON public.list_items;

-- Owners have full control
CREATE POLICY "Owners manage items"
  ON public.list_items
  FOR ALL
  TO authenticated
  USING (public.has_list_access(list_id, 'owner'))
  WITH CHECK (public.has_list_access(list_id, 'owner'));

-- Shared users (viewer/editor) can read items
CREATE POLICY "Shared users read items"
  ON public.list_items
  FOR SELECT
  TO authenticated
  USING (public.has_list_access(list_id));

-- Editors (and owners) may insert items
CREATE POLICY "Editors insert items"
  ON public.list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_list_access(list_id, 'editor'));

-- Editors (and owners) may update items
CREATE POLICY "Editors update items"
  ON public.list_items
  FOR UPDATE
  TO authenticated
  USING (public.has_list_access(list_id, 'editor'))
  WITH CHECK (public.has_list_access(list_id, 'editor'));

-- Editors (and owners) may delete items
CREATE POLICY "Editors delete items"
  ON public.list_items
  FOR DELETE
  TO authenticated
  USING (public.has_list_access(list_id, 'editor'));
