# Wedding Seating System - Deployment Guide

## Setup Instructions

### 1. Supabase Setup (Free Tier)
1. Create account at https://supabase.com
2. Create new project
3. Go to SQL Editor and run the schema from `supabase/schema.sql`
4. Get your project URL and anon key from Settings > API

### 2. Local Development
```bash
# Install dependencies
npm install

# Create .env.local file
cp .env.local.example .env.local

# Add your Supabase credentials to .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Run development server
npm run dev
```

### 3. Deploy to Vercel (Free)
1. Push code to GitHub
2. Connect repo to Vercel (https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

## System URLs
- Guest RSVP: `/` (your-domain.vercel.app)
- QR Scanner: `/scan` 
- Admin Panel: `/admin`

## Adding Guests
1. Go to `/admin`
2. Add guests with unique invitation codes
3. Share invitation codes with guests

## Guest Flow
1. Guest enters invitation code
2. Confirms attendance
3. Receives QR code (auto-assigned seat)
4. Shows QR at entrance

## Cost: $0
- Supabase free tier: 500MB database, 2GB bandwidth
- Vercel free tier: unlimited deployments
- Supports 250 guests easily