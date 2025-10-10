\n\nCREATE TABLE IF NOT EXISTS scan_items (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  created_at timestamptz DEFAULT now(),\n  barcode text,\n  list_id uuid REFERENCES lists(id) ON DELETE CASCADE,\n  part_number text REFERENCES parts(part_number) ON DELETE CASCADE,\n  bin_location text,\n  quantity integer DEFAULT 1,\n  notes text\n);
\n\n-- Enable Row Level Security\nALTER TABLE scan_items ENABLE ROW LEVEL SECURITY;
\n\n-- Create policy to allow users to manage their own scan items\n-- Users can only access scan items that belong to lists they own\nCREATE POLICY "Users can manage their own scan items"\n  ON scan_items\n  FOR ALL\n  TO authenticated\n  USING (\n    list_id IN (\n      SELECT id \n      FROM lists \n      WHERE user_id = auth.uid()\n    )\n  )\n  WITH CHECK (\n    list_id IN (\n      SELECT id \n      FROM lists \n      WHERE user_id = auth.uid()\n    )\n  );
\n\n-- Create index for faster lookups\nCREATE INDEX scan_items_list_id_idx ON scan_items(list_id);
\nCREATE INDEX scan_items_part_number_idx ON scan_items(part_number);
;
