/*
  Add list sharing support
  - Create list_shares table for delegating access to lists
  - Enable RLS with policies for owners and recipients
*/

SET search_path = public;

-- Create the list_shares table if it doesn't already exist.
CREATE TABLE IF NOT EXISTS public.list_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id),
  shared_with uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'viewer',
  CONSTRAINT list_shares_role_check CHECK (role IN ('viewer', 'editor')),
  CONSTRAINT list_shares_unique UNIQUE (list_id, shared_with)
);

-- Ensure shared_by defaults to the current authenticated user when inserting.
ALTER TABLE public.list_shares
  ALTER COLUMN shared_by SET DEFAULT public.current_auth_uid();

-- Enable Row Level Security on the table.
ALTER TABLE public.list_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if the migration is re-run.
DROP POLICY IF EXISTS "List owners manage shares" ON public.list_shares;
DROP POLICY IF EXISTS "Share recipients can read" ON public.list_shares;

-- Allow list owners to manage (select/insert/update/delete) shares for their lists.
CREATE POLICY "List owners manage shares"
  ON public.list_shares
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = list_shares.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = list_shares.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
  );

-- Allow recipients to view share records that target them.
CREATE POLICY "Share recipients can read"
  ON public.list_shares
  FOR SELECT
  TO authenticated
  USING (list_shares.shared_with = public.current_auth_uid());

-- Helpful indexes for common lookups.
CREATE INDEX IF NOT EXISTS list_shares_list_id_idx ON public.list_shares(list_id);
CREATE INDEX IF NOT EXISTS list_shares_shared_with_idx ON public.list_shares(shared_with);
