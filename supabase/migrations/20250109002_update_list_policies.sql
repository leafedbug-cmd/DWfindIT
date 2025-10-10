/*
  Update RLS policies to support list sharing
  - Allow shared users to read lists
  - Allow shared viewers to read list items
  - Allow shared editors to modify list items
*/

SET search_path = public;

-- ============================================================================
-- Lists table policies
-- ============================================================================

DROP POLICY IF EXISTS "Enable access to own lists only" ON public.lists;
DROP POLICY IF EXISTS "Owners manage lists" ON public.lists;
DROP POLICY IF EXISTS "Shared users read lists" ON public.lists;

-- Owners retain full control
CREATE POLICY "Owners manage lists"
  ON public.lists
  FOR ALL
  TO authenticated
  USING (user_id = public.current_auth_uid())
  WITH CHECK (user_id = public.current_auth_uid());

-- Shared users can read list metadata
CREATE POLICY "Shared users read lists"
  ON public.lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.list_shares
      WHERE public.list_shares.list_id = public.lists.id
        AND public.list_shares.shared_with = public.current_auth_uid()
    )
  );

-- ============================================================================
-- List items policies
-- ============================================================================

ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "List owners manage items" ON public.list_items;
DROP POLICY IF EXISTS "Shared users read items" ON public.list_items;
DROP POLICY IF EXISTS "Shared editors insert items" ON public.list_items;
DROP POLICY IF EXISTS "Shared editors update items" ON public.list_items;
DROP POLICY IF EXISTS "Shared editors delete items" ON public.list_items;

-- Helper ownership expression: list owner or editor
CREATE POLICY "List owners manage items"
  ON public.list_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = public.list_items.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = public.list_items.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
  );

-- Shared viewers can read list items
CREATE POLICY "Shared users read items"
  ON public.list_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.list_shares
      WHERE public.list_shares.list_id = public.list_items.list_id
        AND public.list_shares.shared_with = public.current_auth_uid()
    )
  );

-- Shared editors may insert new items
CREATE POLICY "Shared editors insert items"
  ON public.list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = public.list_items.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.list_shares
      WHERE public.list_shares.list_id = public.list_items.list_id
        AND public.list_shares.shared_with = public.current_auth_uid()
        AND public.list_shares.role = 'editor'
    )
  );

-- Shared editors may update items
CREATE POLICY "Shared editors update items"
  ON public.list_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = public.list_items.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.list_shares
      WHERE public.list_shares.list_id = public.list_items.list_id
        AND public.list_shares.shared_with = public.current_auth_uid()
        AND public.list_shares.role = 'editor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = public.list_items.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.list_shares
      WHERE public.list_shares.list_id = public.list_items.list_id
        AND public.list_shares.shared_with = public.current_auth_uid()
        AND public.list_shares.role = 'editor'
    )
  );

-- Shared editors may delete items
CREATE POLICY "Shared editors delete items"
  ON public.list_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = public.list_items.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.list_shares
      WHERE public.list_shares.list_id = public.list_items.list_id
        AND public.list_shares.shared_with = public.current_auth_uid()
        AND public.list_shares.role = 'editor'
    )
  );
