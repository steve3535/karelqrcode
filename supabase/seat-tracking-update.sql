-- Ensure we can track individual seats
-- Re-add the unique constraint on table_id + seat_number for proper seat tracking
ALTER TABLE seating_assignments 
ADD CONSTRAINT seating_assignments_table_seat_unique 
UNIQUE (table_id, seat_number) 
DEFERRABLE INITIALLY DEFERRED;

-- Update the find_available_table function to consider actual seat assignments
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
    AND sa.seat_number IS NOT NULL
    GROUP BY table_id
  ) occupancy ON t.id = occupancy.table_id
  WHERE t.capacity - COALESCE(occupancy.occupied, 0) >= required_seats
  ORDER BY t.table_number
  LIMIT 1;
  
  RETURN available_table_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find next available seat in a table
CREATE OR REPLACE FUNCTION find_next_available_seat(table_id_param INT)
RETURNS INT AS $$
DECLARE
  next_seat INT;
  table_capacity INT;
BEGIN
  -- Get table capacity
  SELECT capacity INTO table_capacity
  FROM tables
  WHERE id = table_id_param;
  
  -- Find the first available seat
  SELECT MIN(seat_num) INTO next_seat
  FROM generate_series(1, table_capacity) AS seat_num
  WHERE NOT EXISTS (
    SELECT 1 
    FROM seating_assignments sa
    JOIN guests g ON sa.guest_id = g.id
    WHERE sa.table_id = table_id_param 
    AND sa.seat_number = seat_num
    AND g.rsvp_status = 'confirmed'
  );
  
  RETURN next_seat;
END;
$$ LANGUAGE plpgsql;