# ChoreSpace Roadmap

This document tracks production readiness work. Check items off as they are completed.

## Stability and auth
- [x] Confirm auth rehydration is stable on tab switch and refresh
- [ ] Remove or gate dev-only auth logs before release
- [ ] Ensure no infinite loading states across all routes

## Data integrity and security
- [x] Review Supabase RLS policies for core tables
- [x] Verify role-based permissions for admin/member/child flows
- [ ] Add server-side validation for writes (Supabase policies/RPCs)

## UX and flow polish
- [ ] Add empty states for new families and new users
- [ ] Improve retry flows and offline/slow network handling
- [ ] Confirm consistent loading and error UI across routes

## Testing and observability
- [ ] Add smoke tests for login -> dashboard -> chores -> profile
- [ ] Add policy tests for data access per role
- [ ] Add error reporting (Sentry or similar) with minimal client logging

## Performance and scalability
- [ ] Reduce redundant profile/points fetches
- [ ] Audit and optimize database queries in `src/lib/database`
- [ ] Add caching or revalidation strategy where appropriate
