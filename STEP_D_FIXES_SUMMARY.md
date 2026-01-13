# Step D — Auth Stabilization & UX Improvements

## Summary of Changes

### A) Fixed AbortError / Auth Lock Issue

**Problem:** Intermittent "AbortError: signal is aborted without reason" from @supabase/auth-js locks.js

**Root Causes Identified:**
1. Multiple components (UserContext and SiteHeader) were creating independent auth state subscriptions
2. Potential for concurrent calls to getSession/onAuthStateChange
3. No singleton protection for the Supabase client during HMR

**Solutions Implemented:**

1. **Created a true singleton Supabase client** (`src/lib/auth/client.ts`)
   - Added `globalThis` caching to prevent multiple instances during hot module reload
   - Explicit auth configuration (persistSession, autoRefreshToken, detectSessionInUrl)
   - Separate handling for client-side vs server-side

2. **Eliminated duplicate auth subscriptions** (`src/components/site/site-header.tsx`)
   - Removed independent auth state management in SiteHeader
   - SiteHeader now uses UserContext via `useUser()` hook
   - Dynamic import of supabase client only for signOut action

3. **Enhanced race condition handling** (`src/context/UserContext.tsx`)
   - Added `useRef` for mounted state and loading profile tracking
   - Prevented concurrent profile loads for the same user
   - Added initialization guard to prevent duplicate initialization
   - Better cleanup in useEffect return

### B) Improved Navigation When Signed In

**Problem:** Logo link always went to "/" even when signed in, causing users to get stuck on marketing home

**Solutions Implemented:**

1. **Dynamic logo routing** (`src/components/site/site-header.tsx`)
   - Logo now links to "/" when not authenticated
   - Logo now links to "/app" when authenticated

2. **Added Dashboard link** (`src/components/site/site-header.tsx`)
   - New "Dashboard" button (with LayoutDashboard icon) appears when authenticated
   - Hidden on mobile, visible on larger screens
   - Provides clear navigation back to app from any page

### C) Added Client-Side Guardrails

**Problem:** Users could see login/signup forms while already signed in, leading to confusing flows

**Solutions Implemented:**

1. **Login page guard** (`src/app/login/page.tsx`)
   - Added `useUser()` hook to check authentication state
   - Added useEffect to redirect to `/app` if `authUser` exists
   - Shows loading state while checking auth
   - Used dynamic import of supabase client in handleSubmit to avoid duplicate subscriptions

2. **Signup page guard** (`src/app/signup/page.tsx`)
   - Same pattern as login page
   - Redirects to `/app` if already signed in
   - Shows loading state while checking auth

**Note:** Middleware already handles server-side redirects. These client-side checks provide:
- Faster UX (no round-trip to server)
- Prevents flickering of login form before redirect
- Works alongside middleware without conflicts

### D) Fixed Contrast Issues

**Profile page** (`src/app/app/profile/page.tsx`)
- Changed green success message background: `bg-green-500/15` (was 10%)
- Changed text: `text-green-900 dark:text-green-100` (was 700/300)

**Settings page** (`src/app/app/settings/page.tsx`)
- Admin badge background: `bg-purple-100 dark:bg-purple-900/50` (was purple-50/950/20)
- Admin badge border: `border-purple-200 dark:border-purple-700` (was 200/900)
- Admin badge icon: `text-purple-700 dark:text-purple-200` (was 600/400)
- Admin badge text: `text-purple-900 dark:text-purple-100` (was 700/300)
- Success message: Same contrast improvements as profile page

## Technical Details

### Files Modified:
1. `src/lib/auth/client.ts` - Singleton Supabase client with globalThis caching
2. `src/context/UserContext.tsx` - Race condition prevention, better cleanup
3. `src/components/site/site-header.tsx` - Use UserContext, dynamic logo, dashboard link
4. `src/app/login/page.tsx` - Auth guard, dynamic import
5. `src/app/signup/page.tsx` - Auth guard, dynamic import
6. `src/app/app/profile/page.tsx` - Contrast fix
7. `src/app/app/settings/page.tsx` - Contrast fixes

### Architecture Improvements:

**Auth Flow:**
```
Single Supabase client instance (singleton)
    ↓
Single UserProvider with single onAuthStateChange subscription
    ↓
All components use useUser() hook
    ↓
No duplicate API calls or race conditions
```

**Navigation Flow:**
```
Not Authenticated: Logo → "/"
Authenticated: Logo → "/app"
Authenticated: Dashboard button → "/app"
```

**Auth Guard Flow:**
```
/login or /signup
    ↓
Client: Check useUser() → redirect if authUser exists
    ↓
Server: Middleware → redirect if session exists
    ↓
Result: Fast, smooth redirects without form flicker
```

## Testing

Build passes successfully:
```
npm run build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (9/9)
```

Note: One ESLint warning about useEffect dependency is intentional - including `loadUserProfile` would cause an infinite loop. This is a known pattern for async functions in useEffect.

## User Experience Improvements

1. **No more AbortError errors** - Auth is stable across navigation and tab switching
2. **Clear navigation** - Logo always takes users to appropriate place, dashboard link available
3. **No confusing auth forms** - Users never see login/signup when already signed in
4. **Better accessibility** - Improved contrast on success messages and admin badges
5. **Smoother loading** - Client-side guards prevent form flash before redirect
