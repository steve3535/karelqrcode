-- ====================================================
-- FONCTIONS UTILITAIRES
-- ====================================================
-- Fonctions pour gérer les assignations et les check-ins
-- Date: 2025-01-14

-- ====================================================
-- 1. FONCTION: ASSIGNER UN INVITÉ À UNE PLACE
-- ====================================================
CREATE OR REPLACE FUNCTION assign_guest_to_seat(
    p_guest_id INTEGER,
    p_table_number INTEGER,
    p_seat_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_existing_assignment INTEGER;
BEGIN
    -- Vérifier si l'invité est déjà assigné
    SELECT id INTO v_existing_assignment
    FROM seating_assignments
    WHERE guest_id = p_guest_id;

    IF v_existing_assignment IS NOT NULL THEN
        RAISE EXCEPTION 'Guest already assigned to a seat';
    END IF;

    -- Vérifier si la place est disponible
    SELECT id INTO v_existing_assignment
    FROM seating_assignments
    WHERE table_id = p_table_number AND seat_number = p_seat_number;

    IF v_existing_assignment IS NOT NULL THEN
        RAISE EXCEPTION 'Seat already occupied';
    END IF;

    -- Créer l'assignation
    INSERT INTO seating_assignments (guest_id, table_id, seat_number)
    VALUES (p_guest_id, p_table_number, p_seat_number);

    -- Générer un QR code si l'invité n'en a pas
    UPDATE guests
    SET qr_code = 'WEDDING-' || p_guest_id || '-' || EXTRACT(EPOCH FROM NOW())::TEXT
    WHERE id = p_guest_id AND qr_code IS NULL;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- 2. FONCTION: ASSIGNER AUTOMATIQUEMENT UN INVITÉ
-- ====================================================
CREATE OR REPLACE FUNCTION auto_assign_guest(p_guest_id INTEGER)
RETURNS TABLE(table_number INTEGER, seat_number INTEGER) AS $$
DECLARE
    v_table_number INTEGER;
    v_seat_number INTEGER;
    v_table_capacity INTEGER;
BEGIN
    -- Trouver la première place disponible (tables adultes: 1-26, 28-29)
    -- Exclure la table 27 (MYOSOTIS - table enfants)
    FOR v_table_number IN 1..29 LOOP
        -- Sauter la table 27 (enfants)
        IF v_table_number = 27 THEN
            CONTINUE;
        END IF;

        -- Récupérer la capacité de cette table
        SELECT capacity INTO v_table_capacity
        FROM tables
        WHERE table_number = v_table_number;

        -- Parcourir les sièges selon la capacité réelle de la table
        FOR v_seat_number IN 1..COALESCE(v_table_capacity, 10) LOOP
            -- Vérifier si la place est libre
            IF NOT EXISTS (
                SELECT 1 FROM seating_assignments
                WHERE table_id = v_table_number AND seat_number = v_seat_number
            ) THEN
                -- Vérifier que la table existe
                IF EXISTS (
                    SELECT 1 FROM tables t
                    WHERE t.table_number = v_table_number
                ) THEN
                    -- Assigner la place
                    INSERT INTO seating_assignments (guest_id, table_id, seat_number)
                    VALUES (p_guest_id, v_table_number, v_seat_number);

                    -- Générer un QR code
                    UPDATE guests
                    SET qr_code = 'WEDDING-' || p_guest_id || '-' || EXTRACT(EPOCH FROM NOW())::TEXT
                    WHERE id = p_guest_id AND qr_code IS NULL;

                    RETURN QUERY SELECT v_table_number, v_seat_number;
                    RETURN;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- Aucune place disponible
    RAISE EXCEPTION 'No available seats';
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- 3. FONCTION: CHECK-IN D'UN INVITÉ PAR QR CODE
-- ====================================================
CREATE OR REPLACE FUNCTION check_in_guest_by_qr(p_qr_code VARCHAR)
RETURNS TABLE(
    guest_id INTEGER,
    guest_name VARCHAR,
    table_number INTEGER,
    table_name VARCHAR,
    seat_number INTEGER,
    already_checked_in BOOLEAN
) AS $$
DECLARE
    v_guest_id INTEGER;
    v_already_checked BOOLEAN;
BEGIN
    -- Trouver l'invité par QR code
    SELECT g.id, g.checked_in
    INTO v_guest_id, v_already_checked
    FROM guests g
    WHERE g.qr_code = p_qr_code;

    IF v_guest_id IS NULL THEN
        RAISE EXCEPTION 'Invalid QR code';
    END IF;

    -- Mettre à jour le statut check-in si pas déjà fait
    IF NOT v_already_checked THEN
        UPDATE guests
        SET checked_in = true,
            checked_in_at = CURRENT_TIMESTAMP
        WHERE id = v_guest_id;

        UPDATE seating_assignments
        SET checked_in = true,
            checked_in_at = CURRENT_TIMESTAMP
        WHERE guest_id = v_guest_id;
    END IF;

    -- Retourner les informations
    RETURN QUERY
    SELECT
        g.id,
        (g.first_name || ' ' || g.last_name)::VARCHAR,
        sa.table_id,
        t.table_name::VARCHAR,
        sa.seat_number,
        v_already_checked
    FROM guests g
    LEFT JOIN seating_assignments sa ON g.id = sa.guest_id
    LEFT JOIN tables t ON sa.table_id = t.table_number
    WHERE g.id = v_guest_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- 4. FONCTION: OBTENIR LES PLACES LIBRES D'UNE TABLE
-- ====================================================
CREATE OR REPLACE FUNCTION get_available_seats(p_table_number INTEGER)
RETURNS TABLE(seat_number INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT s.seat_num
    FROM generate_series(1, (SELECT capacity FROM tables WHERE table_number = p_table_number)) s(seat_num)
    WHERE NOT EXISTS (
        SELECT 1 FROM seating_assignments sa
        WHERE sa.table_id = p_table_number
        AND sa.seat_number = s.seat_num
    )
    ORDER BY s.seat_num;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- 5. FONCTION: DÉPLACER UN INVITÉ
-- ====================================================
CREATE OR REPLACE FUNCTION move_guest_to_seat(
    p_guest_id INTEGER,
    p_new_table_number INTEGER,
    p_new_seat_number INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que la nouvelle place est libre
    IF EXISTS (
        SELECT 1 FROM seating_assignments
        WHERE table_id = p_new_table_number
        AND seat_number = p_new_seat_number
        AND guest_id != p_guest_id
    ) THEN
        RAISE EXCEPTION 'Target seat is occupied';
    END IF;

    -- Mettre à jour l'assignation
    UPDATE seating_assignments
    SET table_id = p_new_table_number,
        seat_number = p_new_seat_number
    WHERE guest_id = p_guest_id;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;