/**
 * TypeScript types matching the Supabase database schema
 */

export type UserRole = 'admin' | 'member' | 'child';

export interface DatabaseFamily {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  family_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithFamily extends DatabaseProfile {
  family: DatabaseFamily;
}

/**
 * Combined user type for the app
 */
export interface AppUser {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  family_id: string;
  family_name: string;
}
