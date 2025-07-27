-- Function to assign seats for a group (main guest + additional guests)
CREATE OR REPLACE FUNCTION assign_group_seats(
  p_guest_id UUID,
  p_party_size INT
) RETURNS TABLE(table_id INT, seat_numbers INT[]) AS $$
DECLARE
  v_table_id INT;
  v_seats INT[];
  v_seat INT;
  i INT;
BEGIN
  -- Find a table with enough consecutive seats
  SELECT t.id INTO v_table_id
  FROM tables t
  WHERE t.capacity - (
    SELECT COUNT(*)
    FROM seating_assignments sa
    JOIN guests g ON sa.guest_id = g.id
    WHERE sa.table_id = t.id 
    AND sa.seat_number IS NOT NULL
    AND g.rsvp_status = 'confirmed'
  ) >= p_party_size
  ORDER BY t.table_number
  LIMIT 1;
  
  IF v_table_id IS NULL THEN
    -- No single table has enough seats, split the group
    -- This would require more complex logic
    RETURN;
  END IF;
  
  -- Find available seats on the table
  v_seats := ARRAY[]::INT[];
  FOR i IN 1..p_party_size LOOP
    SELECT find_next_available_seat(v_table_id) INTO v_seat;
    IF v_seat IS NOT NULL THEN
      v_seats := array_append(v_seats, v_seat);
      -- Temporarily mark the seat as taken by creating a placeholder
      -- This prevents race conditions
      INSERT INTO seating_assignments (guest_id, table_id, seat_number, qr_code)
      VALUES (
        p_guest_id, 
        v_table_id, 
        v_seat,
        CASE WHEN i = 1 THEN NULL ELSE 'COMPANION-' || p_guest_id || '-' || i END
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_table_id, v_seats;
END;
$$ LANGUAGE plpgsql;

-- Updated function to handle finding tables for groups
CREATE OR REPLACE FUNCTION find_available_table_for_group(p_party_size INT DEFAULT 1)
RETURNS INT AS $$
DECLARE
  available_table_id INT;
BEGIN
  -- Find a table that can accommodate the entire group
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
  WHERE t.capacity - COALESCE(occupancy.occupied, 0) >= p_party_size
  ORDER BY 
    -- Prefer tables that fit the group exactly or with minimal empty seats
    ABS((t.capacity - COALESCE(occupancy.occupied, 0)) - p_party_size),
    t.table_number
  LIMIT 1;
  
  RETURN available_table_id;
END;
$$ LANGUAGE plpgsql;

-- Create a table to track companion relationships
CREATE TABLE IF NOT EXISTS guest_companions (
  id SERIAL PRIMARY KEY,
  main_guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  companion_number INT NOT NULL,
  seat_assignment_id INT REFERENCES seating_assignments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(main_guest_id, companion_number)
);