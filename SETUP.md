# Setup Guide

## Environment Configuration

To run this application, you need to configure your Supabase environment variables.

### 1. Create Environment File

Create a `.env.local` file in the root directory with the following content:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Get Supabase Credentials

1. Go to [Supabase](https://supabase.com) and create a new project
2. In your project dashboard, go to Settings > API
3. Copy the "Project URL" and "anon public" key
4. Replace the placeholder values in your `.env.local` file

### 3. Database Setup

Run the SQL commands from `supabase/schema.sql` in your Supabase SQL editor to create the required tables.

### 4. Start Development Server

```bash
npm run dev
```

The application will now work with your Supabase backend!

## Features

- **RSVP System**: Guests can confirm attendance using invitation codes
- **QR Code Generation**: Automatic QR code generation for confirmed guests
- **Guest Check-in**: QR code scanning for event check-in
- **Admin Dashboard**: Complete guest and seating management
- **Responsive Design**: Beautiful, elegant wedding-themed UI 