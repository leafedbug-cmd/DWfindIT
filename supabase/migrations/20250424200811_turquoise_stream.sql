
-- Create lists table
CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create list_items table
CREATE TABLE IF NOT EXISTS list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE,
  part_number text REFERENCES parts(part_number) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  bin_location text,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow public access to lists"
  ON lists
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to list_items"
  ON list_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Add trigger to ensure only one current list
CREATE OR REPLACE FUNCTION public.update_current_list()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE lists SET is_current = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_current_list
  BEFORE INSERT OR UPDATE OF is_current ON lists
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION public.update_current_list();
;
