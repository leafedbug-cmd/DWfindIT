
-- Create equipment table if it doesn't exist
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS equipment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_number text UNIQUE NOT NULL,
    serial_number text UNIQUE NOT NULL,
    customer_number text,
    customer text,
    model text,
    make text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS equipment_customer_number_idx ON equipment(customer_number);
CREATE INDEX IF NOT EXISTS equipment_model_idx ON equipment(model);
CREATE INDEX IF NOT EXISTS equipment_make_idx ON equipment(make);

-- Enable Row Level Security if not already enabled
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to equipment" ON equipment;
  CREATE POLICY "Allow public read access to equipment"
    ON equipment
    FOR SELECT
    TO public
    USING (true);
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create or replace function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
;
