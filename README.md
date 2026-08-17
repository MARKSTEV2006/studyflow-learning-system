# StudyFlow Learning System

A minimalist student learning system built with React, Vite, and Supabase.

## Features

- Email/password authentication
- Protected student dashboard
- Study planner
- Personal task progress
- Focus timer
- Study guide
- About the system page
- Responsive minimalist interface
- Supabase Row Level Security (RLS)

## Requirements

- Node.js 24 LTS recommended
- npm
- Supabase account

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

Create a project in Supabase.

Open the SQL Editor and run:

```text
supabase/schema.sql
```

## 3. Add environment variables

Copy `.env.example` to `.env.local`.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Find these values in your Supabase project's API settings.

## 4. Start the application

```bash
npm run dev
```

Open the local URL shown by Vite.

## 5. Build for production

```bash
npm run build
```

## Suggested next upgrades

- Subjects module
- Flashcards
- Quiz creator
- Notes
- Study streaks stored in Supabase
- Calendar
- File uploads
- AI study assistant
