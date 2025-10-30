/*
  =============================================================================
  -- Part 1: Correctly set up the 'lists' table with user ownership
  =============================================================================
  -- Changes:
  -- 1. Create a reusable function for getting the current user's ID.
  --    This fixes the performance issue flagged by the linter.
  -- 2. Add the 'user_id' column to the 'lists' table.
  -- 3. Set a DEFAULT value for 'user_id' so new lists are automatically
  --    assigned to the creator as a safety net.
  -- 4. Create a performant RLS policy to secure lists.
*/

-- Create a helper function to get the current user's ID efficiently.
CREATE OR REPLACE FUNCTION public.current_auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- Add user_id column to the lists table if it doesn't exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'user_id'
  ) THEN
    -- Add the column and link it to auth.users
    ALTER TABLE public.lists ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Set the default value for the user_id column for new lists.
-- This is a crucial safety net for your app's code.
ALTER TABLE public.lists ALTER COLUMN user_id SET DEFAULT public.current_auth_uid();


-- Drop old, insecure, or non-performant policies.
DROP POLICY IF EXISTS "Allow public access to lists" ON public.lists;
DROP POLICY IF EXISTS "Enable access to own lists only" ON public.lists; -- Drop to recreate with performant function

-- Create a new, performant policy that ensures users can only access their own lists.
CREATE POLICY "Enable access to own lists only"
ON public.lists
FOR ALL
TO authenticated
USING (user_id = public.current_auth_uid())
WITH CHECK (user_id = public.current_auth_uid());


/*
  =============================================================================
  -- Part 2: Correctly set up the 'scan_items' table and its security
  =============================================================================
  -- Changes:
  -- 1. Create the 'scan_items' table.
  -- 2. Enable Row Level Security.
  -- 3. Create a performant RLS policy that checks for ownership through
  --    the 'lists' table.
*/

-- Create the scan_items table if it doesn't exist.
CREATE TABLE IF NOT EXISTS public.scan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  barcode text,
  list_id uuid REFERENCES public.lists(id) ON DELETE CASCADE,
  part_number text REFERENCES public.parts(part_number) ON DELETE CASCADE,
  bin_location text,
  quantity integer DEFAULT 1,
  notes text
);

-- Enable Row Level Security on the new table.
ALTER TABLE public.scan_items ENABLE ROW LEVEL SECURITY;

-- Drop old policies to ensure we have the correct, performant version.
DROP POLICY IF EXISTS "Users can manage their own scan items" ON public.scan_items;

-- Create policy allowing users to manage items on lists they own.
-- This version uses the performant helper function for the check.
CREATE POLICY "Users can manage their own scan items"
  ON public.scan_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = scan_items.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lists
      WHERE public.lists.id = scan_items.list_id
        AND public.lists.user_id = public.current_auth_uid()
    )
  );

-- Create indexes for faster lookups.
CREATE INDEX IF NOT EXISTS scan_items_list_id_idx ON public.scan_items(list_id);
CREATE INDEX IF NOT EXISTS scan_items_part_number_idx ON public.scan_items(part_number);
