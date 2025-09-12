# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wedding guest management system built with Next.js 14, TypeScript, Tailwind CSS, and Supabase. The system handles RSVP collection, automatic seat assignment, QR code generation for check-in, and real-time guest tracking.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev         # Start development server (http://localhost:3000)
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run Next.js linting
```

## Architecture

### Application Routes
- `/` - Guest RSVP page where guests enter invitation codes and confirm attendance
- `/scan` - QR code scanner for hostess to check in guests at the venue
- `/admin` - Admin dashboard for managing guests and viewing statistics
- `/admin/tables` - Table management interface with visual seat map
- `/camera-test` - Camera testing page for QR scanner functionality

### Database Schema (PostgreSQL via Supabase)

Main tables:
- **guests**: Stores guest information, RSVP status, and preferences
  - Optional email field (guests can register without email)
  - Unique guest_code for guests without email
  - Supports plus_ones and dietary restrictions
- **tables**: Pre-populated with 25 tables (default 10 seats each)
  - Head table (id: 1) has 8 seats
- **seating_assignments**: Links guests to specific table/seat with QR codes
  - Enforces unique constraint on (table_id, seat_number)
  - Tracks check-in status and timestamp
- **access_codes**: Controls access to RSVP page
  - Default code: 'KRL2025'

### Key Technical Flows

1. **RSVP Flow**: Guest enters access code → Enters invitation code → Updates RSVP status → Auto-assigns next available seat → Generates unique QR code
2. **Check-in Flow**: Hostess scans QR → Displays guest info and table/seat → Marks as checked in with timestamp
3. **Seat Assignment**: Automatic assignment to next available seat (iterates through tables 1-25, seats 1-10)
4. **Table Management**: Visual seat map showing occupied/available seats with guest details

## Environment Configuration

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

Run SQL files in Supabase SQL editor in this order:
1. `supabase/schema.sql` - Core schema
2. `supabase/schema-update.sql` - Makes email optional, adds guest_code
3. Additional update files as needed

## Important Implementation Details

- QR codes format: `WEDDING-${guestId}-${timestamp}`
- Invitation codes are stored and compared in uppercase
- Guest codes (for email-less guests) format: `G${randomString}`
- Admin panel has no authentication layer
- Uses client-side Supabase connections (`@/lib/supabase.ts`)
- QR scanner uses `jsqr` library for decoding
- Components in `/components` folder (navigation, footer, table-seat-map)