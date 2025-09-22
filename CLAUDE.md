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
npm run test:e2e    # Run Playwright E2E tests
npm run test:e2e:ui # Run Playwright tests with UI
```

## Architecture

### Application Routes
- `/` - Home page with access code authentication and real-time statistics
- `/admin/seating` - Desktop admin interface with drag & drop seat management
- `/admin/seating-mobile-v2` - Enhanced mobile seat management interface
- `/admin/qrcodes` - QR code generation and download interface
- `/scan-v2` - Enhanced QR scanner for guest check-in
- `/camera-test` - Camera testing page for QR scanner functionality

### Database Schema (PostgreSQL via Supabase)

Main tables:
- **guests**: Stores guest information, RSVP status, and preferences
  - Optional email field (guests can register without email)
  - Unique guest_code for guests without email (format: `G${randomString}`)
  - Supports plus_ones and dietary restrictions
  - QR code format: `WEDDING-${guestId}-${timestamp}`

- **tables**: 28 tables total
  - Table 1: ORCHIDÉE - VIP/head table with 8 seats
  - Tables 2-25: Various flower names - 10 seats each
  - Table 26: PENSÉE - 15 seats
  - Table 27: MYOSOTIS - Children's table with 15 seats
  - Table 28: IRIS BLANCHE - 10 seats
  - All color-coded with hex values and readable names

- **seating_assignments**: Links guests to specific table/seat
  - Enforces unique constraint on (table_id, seat_number)
  - References table_number (not table.id)
  - Tracks check-in status and timestamp

- **access_codes**: Controls access to RSVP page
  - Default code: 'KRL2025'

### Database Views & Functions

Views:
- `table_status` - Consolidated table occupancy with guest details
- `all_guests_status` - Complete guest status with table assignments
- `event_statistics` - Global event statistics
- `unassigned_guests` - Guests without seat assignments

Key Functions:
- `auto_assign_guest()` - Automatic seat assignment (iterates tables 1-26 and 28, skips 27)
- `assign_guest_to_seat()` - Manual seat assignment with validation
- `check_in_guest_by_qr()` - QR code-based check-in
- `move_guest_to_seat()` - Move guest between seats

### Key Technical Flows

1. **RSVP Flow**: Guest enters access code → Updates RSVP status → Auto-assigns next available seat → Generates unique QR code
2. **Check-in Flow**: Hostess scans QR → Displays guest info and table/seat → Marks as checked in with timestamp
3. **Seat Assignment**: Automatic assignment iterates through tables 1-26, seats 1-10
4. **Table Management**: Visual seat map showing occupied/available seats with guest details
5. **Mobile Detection**: Routes to mobile interface when `window.innerWidth <= 768`

## Environment Configuration

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

Run SQL files in Supabase SQL editor in this order:
1. `supabase/01-main-schema.sql` - Core tables and indexes
2. `supabase/02-views.sql` - Database views
3. `supabase/03-functions.sql` - PostgreSQL functions

## Important Implementation Details

- QR codes format: `WEDDING-${guestId}-${timestamp}`
- Invitation codes are stored and compared in uppercase
- Guest codes (for email-less guests) format: `G${randomString}`
- Admin panel has no authentication layer (uses access code only)
- Session storage key: `wedding_auth` for client-side auth state
- Uses client-side Supabase connections (`@/lib/supabase.ts`)
- QR scanner uses `jsqr` library for decoding, `qrcode` for generation
- Drag & drop uses `react-dnd` with automatic touch/desktop backend detection
- No real-time subscriptions - uses direct database queries
- Components in `/components` folder (navigation, footer, table-seat-map)