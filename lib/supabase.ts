import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      guests: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          invitation_code: string
          rsvp_status: string
          plus_ones: number
          dietary_restrictions: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          invitation_code: string
          rsvp_status?: string
          plus_ones?: number
          dietary_restrictions?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          invitation_code?: string
          rsvp_status?: string
          plus_ones?: number
          dietary_restrictions?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tables: {
        Row: {
          id: number
          table_number: number
          table_name: string | null
          capacity: number
          created_at: string
        }
        Insert: {
          id?: number
          table_number: number
          table_name?: string | null
          capacity?: number
          created_at?: string
        }
        Update: {
          id?: number
          table_number?: number
          table_name?: string | null
          capacity?: number
          created_at?: string
        }
      }
      seating_assignments: {
        Row: {
          id: number
          guest_id: string
          table_id: number
          seat_number: number
          qr_code: string | null
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          guest_id: string
          table_id: number
          seat_number: number
          qr_code?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          guest_id?: string
          table_id?: number
          seat_number?: number
          qr_code?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
        }
      }
    }
  }
}