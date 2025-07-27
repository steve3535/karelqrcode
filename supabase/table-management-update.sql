-- Remove the unique constraint on table_id + seat_number
ALTER TABLE seating_assignments DROP CONSTRAINT IF EXISTS seating_assignments_table_id_seat_number_key;

-- Add a nullable seat_number (guests can be assigned to table without specific seat)
ALTER TABLE seating_assignments ALTER COLUMN seat_number DROP NOT NULL;

-- Add actual capacity tracking to tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS occupied_seats INT DEFAULT 0;

-- Create a view to get table occupancy
CREATE OR REPLACE VIEW table_occupancy AS
SELECT 
  t.id,
  t.table_number,
  t.table_name,
  t.capacity,
  COUNT(sa.id) as occupied_seats,
  t.capacity - COUNT(sa.id) as available_seats
FROM tables t
LEFT JOIN seating_assignments sa ON t.id = sa.table_id
LEFT JOIN guests g ON sa.guest_id = g.id
WHERE g.rsvp_status = 'confirmed' OR g.rsvp_status IS NULL
GROUP BY t.id, t.table_number, t.table_name, t.capacity
ORDER BY t.table_number;

-- Function to find next available table
CREATE OR REPLACE FUNCTION find_available_table(required_seats INT DEFAULT 1)
RETURNS INT AS $$
DECLARE
  available_table_id INT;
BEGIN
  SELECT t.id INTO available_table_id
  FROM tables t
  LEFT JOIN (
    SELECT table_id, COUNT(*) as occupied
    FROM seating_assignments sa
    JOIN guests g ON sa.guest_id = g.id
    WHERE g.rsvp_status = 'confirmed'
    GROUP BY table_id
  ) occupancy ON t.id = occupancy.table_id
  WHERE t.capacity - COALESCE(occupancy.occupied, 0) >= required_seats
  ORDER BY t.table_number
  LIMIT 1;
  
  RETURN available_table_id;
END;
$$ LANGUAGE plpgsql;