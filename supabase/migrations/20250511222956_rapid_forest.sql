\n\n-- Add user_id column\nDO $$ \nBEGIN \n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns \n    WHERE table_name = 'lists' AND column_name = 'user_id'\n  ) THEN\n    ALTER TABLE lists ADD COLUMN user_id uuid REFERENCES auth.users(id);
\n  END IF;
\nEND $$;
\n\n-- Update RLS policy to restrict access to user's own lists\nDROP POLICY IF EXISTS "Allow public access to lists" ON lists;
\n\nCREATE POLICY "Enable access to own lists only"\nON lists\nFOR ALL\nTO authenticated\nUSING (auth.uid() = user_id)\nWITH CHECK (auth.uid() = user_id);
;
