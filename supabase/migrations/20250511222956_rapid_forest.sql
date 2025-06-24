/*
  # Add user_id column to lists table

  1. Changes
    - Add `user_id` column to `lists` table
    - Add foreign key constraint to link with auth.users
    - Update RLS policy to restrict access to user's own lists
  
  2. Security
    - Modify RLS policy to ensure users can only access their own lists
*/

-- Add user_id column
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lists' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE lists ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update RLS policy to restrict access to user's own lists
DROP POLICY IF EXISTS "Allow public access to lists" ON lists;

CREATE POLICY "Enable access to own lists only"
ON lists
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);