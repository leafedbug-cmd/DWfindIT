
-- Enable Row Level Security
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'parts' AND policyname = 'Allow public read access to parts'
  ) THEN
    CREATE POLICY "Allow public read access to parts"
      ON parts
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lists' AND policyname = 'Allow public access to lists'
  ) THEN
    CREATE POLICY "Allow public access to lists"
      ON lists
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'list_items' AND policyname = 'Allow public access to list_items'
  ) THEN
    CREATE POLICY "Allow public access to list_items"
      ON list_items
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'equipment' AND policyname = 'Allow public read access to equipment'
  ) THEN
    CREATE POLICY "Allow public read access to equipment"
      ON equipment
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create function to handle current list updates
CREATE OR REPLACE FUNCTION public.update_current_list()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE lists
    SET is_current = false
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

