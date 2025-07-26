import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Tables = {
  guests: {
    id: string
    name: string
    email: string
    phone?: string
    invitation_code: string
    rsvp_status: 'pending' | 'confirmed' | 'declined'
    plus_ones: number
    dietary_restrictions?: string
    notes?: string
    created_at: string
    updated_at: string
  }
  tables: {
    id: number
    table_number: number
    table_name?: string
    capacity: number
    created_at: string
  }
  seating_assignments: {
    id: number
    guest_id: string
    table_id: number
    seat_number: number
    qr_code?: string
    checked_in: boolean
    checked_in_at?: string
    created_at: string
  }
}