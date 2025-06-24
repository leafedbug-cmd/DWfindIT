/*
  # Create scan_items table

  1. New Tables
    - `scan_items`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `barcode` (text)
      - `list_id` (uuid, foreign key to lists)
      - `part_number` (text, foreign key to parts)
      - `bin_location` (text)
      - `quantity` (integer)
      - `notes` (text)

  2. Security
    - Enable RLS on `scan_items` table
    - Add policy for authenticated users to manage their own scan items

  3. Indexes
    - Create indexes on list_id and part_number for better performance
*/

CREATE TABLE IF NOT EXISTS scan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  barcode text,
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE,
  part_number text REFERENCES parts(part_number) ON DELETE CASCADE,
  bin_location text,
  quantity integer DEFAULT 1,
  notes text
);

-- Enable Row Level Security
ALTER TABLE scan_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own scan items
-- Users can only access scan items that belong to lists they own
CREATE POLICY "Users can manage their own scan items"
  ON scan_items
  FOR ALL
  TO authenticated
  USING (
    list_id IN (
      SELECT id 
      FROM lists 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    list_id IN (
      SELECT id 
      FROM lists 
      WHERE user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX scan_items_list_id_idx ON scan_items(list_id);
CREATE INDEX scan_items_part_number_idx ON scan_items(part_number);