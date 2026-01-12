# ChoreSpace

A family chore management web app built with **Next.js (App Router)**, **Tailwind CSS**, and **Supabase**.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project structure

- `src/app` – Next.js App Router routes, layouts, and pages
- `src/components` – shared UI + site components
- `src/lib` – utilities and integrations (Supabase scaffolding lives here)

## Supabase (future)

This repo includes lightweight client/server helpers under `src/lib/supabase/*`.

When you add Supabase later, you’ll typically configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(Env vars are intentionally not included yet.)
