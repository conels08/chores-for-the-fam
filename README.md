# ChoreSpace

A family chore management web app built with **Next.js (App Router)**, **Tailwind CSS**, and **Supabase**.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project structure

- `src/app` – Next.js App Router routes, layouts, middleware, and top-level pages
- `src/app/app` – authenticated app area (chores, profile, settings)
- `src/components` – shared UI + site components
- `src/context` – React context providers (user/session state)
- `src/lib/auth` – auth helpers and Supabase client setup
- `src/lib/database` – data access for chores, assignments, points, etc.
- `src/lib/supabase` – Supabase helpers and types
- `src/lib/utils.ts` – shared utilities
- `supabase_schema_chores.sql` – database schema + RLS for ChoreSpace
- `PROJECT_INTENT.md` – product goals and constraints
- `IMPLEMENTATION_SUMMARY.md` – build notes and feature summary

## Supabase

This repo uses Supabase for auth and data. Helpers live under `src/lib/auth/*` and `src/lib/supabase/*`.

You'll typically configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(Env vars are intentionally not included.)
