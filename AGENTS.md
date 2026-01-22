# AGENTS.md — ChoreSpace AI Workflow Contract (chores-for-the-fam)

This file defines how humans + AI agents collaborate on this repo to ship clean, reviewable PRs.

## Project

**ChoreSpace** — Next.js (App Router) + Supabase (Auth + Postgres + RLS) family chore app.

Core entities:

- `chores`
- `chore_assignments`
- `chore_completions`
- `families`
- `profiles`
  Views:
- `user_points_summary`
- `chore_completion_history`

## AI Agent Roles

We use multiple AI tools intentionally:

### ChatGPT (strategy + prompting)

- Clarifies goals, constraints, and expected behavior.
- Produces “Codex-ready” task prompts.
- Reviews diffs conceptually and flags loop-risk/regressions.

### Codex Web (repo-aware implementer)

- Reads the full repo.
- Searches codebase and traces flows across files.
- Creates focused branches + PRs.
- Produces small diffs with strong explanations.

### VS Code Codex Extension (tactical implementer)

- Best for small, local edits in known files.
- Used to apply ChatGPT’s precise edits quickly.

### cto.new (optional “agentic” generator)

- Used for larger one-shot tasks.
- Must still follow the repo rules below and ship changes via PR.

## Golden Rules (Non-Negotiable)

1. **Small PRs**: Prefer PRs that solve ONE problem well.
2. **No mystery changes**: Only change what’s needed for the issue.
3. **No infinite loops**: Avoid render loops, retry storms, redirect loops, or `router.refresh()` loops.
4. **Auth stability**: Never treat a transient null session as final during bootstrap/rehydration.
5. **Avoid hidden state**: Do not rely on clearing storage as a normal “fix”.
6. **Prefer guardrails** over hacks: e.g., `authReady` gating, in-flight guards, request-id guards.
7. **Add logs temporarily**: Use `devOnlyAuthLog` (or similar) for diagnosis, and remove/disable before merging unless explicitly requested.

## Repo Conventions

### Git workflow

- Always work in a branch (never directly on `main`).
- Branch naming:
  - `fix/<short-description>`
  - `feat/<short-description>`
  - `chore/<short-description>`
- Commit style:
  - `fix: ...`
  - `feat: ...`
  - `chore: ...`
- PR title mirrors commit style.

### PR requirements

Each PR must include:

- What changed (1–6 bullets)
- Why it changed (root cause)
- How to test (repro steps)
- Risk/rollback notes

### File hygiene

- Keep changes localized.
- Avoid formatting unrelated files.
- If you must touch shared context/providers:
  - Add a short explanation in-code.
  - Ensure no duplicate listeners or duplicate Supabase clients are introduced.

## Common “Gotchas” in This Repo

### Supabase Auth

- Browser client is a singleton.
- Avoid multiple `onAuthStateChange` subscriptions doing overlapping work.
- Use an `authReady` (or bootstrap-complete) flag to prevent premature “logged out” UI on tab restore.
- Guard profile loads with:
  - tab visibility (`document.visibilityState === "visible"`)
  - in-flight/request-id guards
  - bounded timeouts with safe error states (manual retry)

### Next.js App Router

- Avoid calling `router.refresh()` repeatedly on focus/visibility.
- Avoid redirect loops between `/login` and `/app/*`.
- Prefer stable, deterministic loading states.

## Definition of Done (DoD)

An issue is “done” only when:

- It is reproducible before the fix and not reproducible after the fix.
- There are no loops (network, navigation, or re-render).
- The change is well-explained in the PR.
- Testing steps are included and verified.

## How Agents Should Work (Step-by-Step)

1. **Read the issue** (expected behavior + repro steps + constraints).
2. **Search the repo** for:
   - the exact UI strings involved
   - relevant contexts/providers
   - route guards/layouts/middleware checks
3. **Add minimal diagnostic logging** if needed.
4. **Implement the smallest correct fix**.
5. **Run checks**:
   - `npm run lint` (or `pnpm lint` if applicable)
   - `npm run build` (when feasible)
6. **Verify repro steps** and add new steps if needed.
7. **Open PR** with clear explanation and testing steps.

## Tooling Notes

- Prefer GitHub PR merges (source-of-truth).
- cto.new tasks must target a branch and merge via PR.
- Codex Web should generate PRs that are reviewable without needing the UI to understand.
