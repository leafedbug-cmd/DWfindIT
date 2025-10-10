\n\nCREATE TABLE IF NOT EXISTS parts (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  part_number text UNIQUE NOT NULL,\n  bin_location text,\n  created_at timestamptz DEFAULT now(),\n  updated_at timestamptz DEFAULT now()\n);
\n\nALTER TABLE parts ENABLE ROW LEVEL SECURITY;
\n\nCREATE POLICY "Allow public read access to parts"\n  ON parts\n  FOR SELECT\n  TO public\n  USING (true);
;
