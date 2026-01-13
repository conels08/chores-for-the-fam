# ChoreSpace

A family chore management web app built with **Next.js (App Router)**, **Tailwind CSS**, and **Supabase**.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

To run this application, you'll need to set up Supabase and configure the following environment variables:

### Required Variables

Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Setting up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to Settings → API
3. Copy your project URL and anon (public) key
4. Add them to your `.env.local` file

## Project structure

- `src/app` – Next.js App Router routes, layouts, and pages
- `src/components` – shared UI + site components
- `src/lib` – utilities and integrations (Supabase scaffolding lives here)

## Features Implemented

### ✅ Authentication System
- Email/password signup and login
- Session management with Supabase Auth
- Protected routes using client-side guards
- Automatic redirects for unauthenticated users
- Clean logout functionality

### ✅ UI Components
- Responsive design for mobile and desktop
- Clean, modern UI with Tailwind CSS
- Custom UI components (Button, Input, Label, Card)
- Consistent styling and spacing
- Loading states and error handling

### ✅ Route Structure
- **Public routes**: `/` (landing), `/login`, `/signup`
- **Protected routes**: `/app/*` (requires authentication)
- **Auto-redirect**: Unauthenticated users → `/login`
- **Auto-redirect**: Authenticated users → `/app`

### ✅ App Dashboard
- User account information display
- Quick action buttons (placeholder for future features)
- Sign out functionality
- Next steps roadmap

## Technical Implementation

### Authentication Flow
1. User signs up/logs in through Supabase Auth
2. Session is managed client-side via React Context
3. Protected routes check authentication status
4. Automatic redirects based on auth state

### Key Components
- `AuthProvider` - Context for managing auth state
- `ProtectedRoute` - Component for guarding authenticated routes
- `SiteHeader` - Responsive navigation with auth state
- Custom UI components for consistent styling

## Development Notes

### Build Configuration
- Uses dynamic rendering for auth-dependent pages
- Clean separation of client/server components
- Optimized for production deployment

### State Management
- React Context for global auth state
- Local state for form handling
- Real-time session updates

## Next Steps (Coming Soon)

- [ ] Family management and roles (Admin, Member, Child)
- [ ] Chore assignment and tracking system
- [ ] Points and rewards system
- [ ] Family calendar integration
- [ ] To-do lists
- [ ] Meal planning
- [ ] Email invitations for family members
- [ ] Real-time updates and notifications

## Deployment

This app is ready for deployment to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Self-hosted**

Make sure to configure environment variables in your deployment platform.