# Tably (Next.js + Supabase)

This project is configured for Vercel + Supabase (Postgres + Storage).

## Install

```bash
bun install
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Recommended for Vercel (Supabase Pooler URL, port 6543)
SUPABASE_DB_POOLER_URL=

# Optional fallback (direct/non-pooler URL)
SUPABASE_DB_URL=
SUPABASE_STORAGE_BUCKET=uploads

LINE_LOGIN_CHANNEL_ID=
LINE_LOGIN_CHANNEL_SECRET=
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=

NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_SITE_URL=

OPENSLIPVERIFY_TOKEN=
PROMPTPAY_ACCOUNT=
```

## Important (Vercel)

Do not use direct DB host (`db.<project-ref>.supabase.co:5432`) in Vercel.
Use Supabase **Pooler** connection string instead (`...pooler.supabase.com:6543?...`).

## Database Setup

Run `project_booking-table.sql` in Supabase SQL Editor.

## Run

```bash
bun run dev
```

## Deploy

Set all required env vars in Vercel (Production + Preview), then redeploy.
