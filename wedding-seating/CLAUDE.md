# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based wedding guest management system with QR code functionality for RSVPs and check-ins. The system uses Supabase for the backend and is designed to handle 250 guests on free tier hosting.

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

### Database Schema (PostgreSQL via Supabase)

The system uses three main tables:
- **guests**: Stores guest information, RSVP status, and preferences
- **tables**: Pre-populated with 25 tables (10 seats each)
- **seating_assignments**: Links guests to specific table/seat with QR codes

### Key Technical Flows

1. **RSVP Flow**: Guest enters invitation code → Updates RSVP status → Auto-assigns next available seat → Generates unique QR code
2. **Check-in Flow**: Hostess scans QR → Displays guest info and table/seat → Marks as checked in
3. **Seat Assignment**: Automatic assignment to next available seat (iterates through tables 1-25, seats 1-10)

## Environment Configuration

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment

- **Database**: Run `supabase/schema.sql` in Supabase SQL editor
- **Hosting**: Deploy to Vercel (free tier) with environment variables
- **Capacity**: Handles 250 guests on free infrastructure

## Important Implementation Details

- QR codes include guest ID and timestamp: `WEDDING-${guestId}-${timestamp}`
- Invitation codes are stored and compared in uppercase
- Admin panel has no authentication (consider adding for production)
- Seating assignments enforce unique constraint on table/seat combination
- Guest check-in updates are real-time through Supabase

## Testing Considerations

When testing locally:
- You'll need a Supabase project with the schema installed
- QR scanner requires HTTPS in production (camera permissions)
- Sample invitation codes can be added via the admin panel