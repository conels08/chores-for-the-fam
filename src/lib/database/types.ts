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

// =====================================================
// CHORE MANAGEMENT TYPES
// =====================================================

export interface DatabaseChore {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  points: number;
  due_date: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseChoreAssignment {
  id: string;
  chore_id: string;
  assignee_profile_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface DatabaseChoreCompletion {
  id: string;
  assignment_id: string;
  completed_by: string;
  completed_at: string;
  notes: string | null;
}

export interface ChoreWithAssignments extends DatabaseChore {
  assignments: (DatabaseChoreAssignment & {
    assignee: DatabaseProfile;
    completions: DatabaseChoreCompletion[];
  })[];
}

export interface AssignmentWithDetails extends DatabaseChoreAssignment {
  chore: DatabaseChore;
  assignee: DatabaseProfile;
  completions: DatabaseChoreCompletion[];
}

export interface ChoreCompletionWithDetails extends DatabaseChoreCompletion {
  assignment: DatabaseChoreAssignment & {
    chore: DatabaseChore;
    assignee: DatabaseProfile;
  };
}

export interface UserPointsSummary {
  profile_id: string;
  display_name: string | null;
  role: UserRole;
  family_id: string;
  total_points: number;
  completed_chores: number;
}

export interface CreateChoreInput {
  title: string;
  description?: string;
  points: number;
  due_date?: string | null;
  assignee_profile_ids: string[];
}

export interface UpdateChoreInput {
  title?: string;
  description?: string;
  points?: number;
  due_date?: string | null;
  assignee_profile_ids?: string[];
  is_active?: boolean;
}
