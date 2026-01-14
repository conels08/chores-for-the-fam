/**
 * Database operations for chore management
 */

import { supabase } from '@/lib/auth/client';
import type {
  DatabaseChore,
  DatabaseChoreAssignment,
  DatabaseChoreCompletion,
  DatabaseProfile,
  ChoreWithAssignments,
  AssignmentWithDetails,
  ChoreCompletionWithDetails,
  UserPointsSummary,
  CreateChoreInput,
  UpdateChoreInput,
  AppUser
} from './types';

/**
 * Get chores assigned to the current user
 */
export async function listMyAssignedChores(profileId: string, familyId: string) {
  try {
    const { data, error } = await supabase
      .from('chore_assignments')
      .select(`
        *,
        chore:chore_id (
          *,
          assignments:chore_assignments (
            *,
            assignee:assignee_profile_id (
              id,
              display_name,
              role
            ),
            completions:chore_completions (
              id,
              completed_by,
              completed_at
            )
          )
        )
      `)
      .eq('assignee_profile_id', profileId)
      .eq('chore.is_active', true)
      .order('chore.due_date', { ascending: true, nullsFirst: false })
      .order('chore.created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data to match the expected structure
    const choresWithAssignments: ChoreWithAssignments[] = [];
    
    if (data) {
      // Group assignments by chore
      const choreMap = new Map<string, ChoreWithAssignments>();
      
      data.forEach((assignment: any) => {
        const chore = assignment.chore;
        
        if (!choreMap.has(chore.id)) {
          choreMap.set(chore.id, {
            ...chore,
            assignments: []
          });
        }
        
        const choreWithAssignments = choreMap.get(chore.id)!;
        
        // Transform assignment
        const transformedAssignment = {
          ...assignment,
          assignee: assignment.assignee,
          completions: assignment.completions || []
        };
        
        choreWithAssignments.assignments.push(transformedAssignment);
      });
      
      choresWithAssignments.push(...choreMap.values());
    }

    return choresWithAssignments;
  } catch (error) {
    console.error('Error fetching my assigned chores:', error);
    throw error;
  }
}

/**
 * Get all active chores for a family (admin only)
 */
export async function listFamilyChores(familyId: string) {
  try {
    const { data, error } = await supabase
      .from('chores')
      .select(`
        *,
        assignments:chore_assignments (
          *,
          assignee:assignee_profile_id (
            id,
            display_name,
            role
          ),
          completions:chore_completions (
            id,
            completed_by,
            completed_at
          )
        )
      `)
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data
    const choresWithAssignments: ChoreWithAssignments[] = [];
    
    if (data) {
      data.forEach((chore: any) => {
        const transformedAssignments = (chore.assignments || []).map((assignment: any) => ({
          ...assignment,
          assignee: assignment.assignee,
          completions: assignment.completions || []
        }));
        
        choresWithAssignments.push({
          ...chore,
          assignments: transformedAssignments
        });
      });
    }

    return choresWithAssignments;
  } catch (error) {
    console.error('Error fetching family chores:', error);
    throw error;
  }
}

/**
 * Get a specific chore with assignments and completions
 */
export async function getChoreWithDetails(choreId: string, familyId: string) {
  try {
    const { data, error } = await supabase
      .from('chores')
      .select(`
        *,
        assignments:chore_assignments (
          *,
          assignee:assignee_profile_id (
            id,
            display_name,
            role
          ),
          completions:chore_completions (
            id,
            completed_by,
            completed_at,
            notes
          )
        )
      `)
      .eq('id', choreId)
      .eq('family_id', familyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    // Transform the assignments
    const transformedAssignments = (data.assignments || []).map((assignment: any) => ({
      ...assignment,
      assignee: assignment.assignee,
      completions: assignment.completions || []
    }));

    return {
      ...data,
      assignments: transformedAssignments
    } as ChoreWithAssignments;
  } catch (error) {
    console.error('Error fetching chore details:', error);
    throw error;
  }
}

/**
 * Create a new chore with assignments
 */
export async function createChore(
  input: CreateChoreInput,
  familyId: string,
  createdBy: string
) {
  try {
    // First create the chore
    const { data: chore, error: choreError } = await supabase
      .from('chores')
      .insert({
        family_id: familyId,
        title: input.title,
        description: input.description || null,
        points: input.points,
        due_date: input.due_date || null,
        created_by: createdBy
      })
      .select()
      .single();

    if (choreError) {
      throw choreError;
    }

    // Then create the assignments
    if (input.assignee_profile_ids.length > 0) {
      const assignments = input.assignee_profile_ids.map(profileId => ({
        chore_id: chore.id,
        assignee_profile_id: profileId,
        assigned_by: createdBy
      }));

      const { error: assignmentError } = await supabase
        .from('chore_assignments')
        .insert(assignments);

      if (assignmentError) {
        // If assignment creation fails, clean up the chore
        await supabase.from('chores').delete().eq('id', chore.id);
        throw assignmentError;
      }
    }

    return chore as DatabaseChore;
  } catch (error) {
    console.error('Error creating chore:', error);
    throw error;
  }
}

/**
 * Update a chore and manage assignments
 */
export async function updateChore(
  choreId: string,
  familyId: string,
  patch: UpdateChoreInput
) {
  try {
    const updates: any = {};

    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.description !== undefined) updates.description = patch.description || null;
    if (patch.points !== undefined) updates.points = patch.points;
    if (patch.due_date !== undefined) updates.due_date = patch.due_date || null;
    if (patch.is_active !== undefined) updates.is_active = patch.is_active;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('chores')
        .update(updates)
        .eq('id', choreId)
        .eq('family_id', familyId);

      if (updateError) {
        throw updateError;
      }
    }

    // Update assignments if provided
    if (patch.assignee_profile_ids !== undefined) {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('chore_assignments')
        .delete()
        .eq('chore_id', choreId);

      if (deleteError) {
        throw deleteError;
      }

      // Insert new assignments
      if (patch.assignee_profile_ids.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const assignments = patch.assignee_profile_ids.map(profileId => ({
          chore_id: choreId,
          assignee_profile_id: profileId,
          assigned_by: user?.id || ''
        }));

        const { error: assignmentError } = await supabase
          .from('chore_assignments')
          .insert(assignments);

        if (assignmentError) {
          throw assignmentError;
        }
      }
    }

    return await getChoreWithDetails(choreId, familyId);
  } catch (error) {
    console.error('Error updating chore:', error);
    throw error;
  }
}

/**
 * Archive/unarchive a chore
 */
export async function setChoreActive(
  choreId: string,
  familyId: string,
  isActive: boolean
) {
  try {
    const { error } = await supabase
      .from('chores')
      .update({ is_active: isActive })
      .eq('id', choreId)
      .eq('family_id', familyId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error setting chore active status:', error);
    throw error;
  }
}

/**
 * Complete a chore assignment
 */
export async function completeAssignment(
  assignmentId: string,
  completedBy: string,
  notes?: string
) {
  try {
    const { error } = await supabase
      .from('chore_completions')
      .insert({
        assignment_id: assignmentId,
        completed_by: completedBy,
        notes: notes || null
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error completing assignment:', error);
    throw error;
  }
}

/**
 * Get chore completion history
 */
export async function listChoreCompletions(
  choreId: string,
  familyId: string,
  limit: number = 10
) {
  try {
    const { data, error } = await supabase
      .from('chore_completions')
      .select(`
        *,
        assignment:assignment_id (
          *,
          assignee:assignee_profile_id (
            id,
            display_name,
            role
          ),
          chore:chore_id (
            id,
            title,
            points,
            due_date,
            family_id
          )
        )
      `)
      .eq('assignment.chore_id', choreId)
      .eq('assignment.chore.family_id', familyId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Transform the data
    const completionsWithDetails: ChoreCompletionWithDetails[] = [];
    
    if (data) {
      data.forEach((completion: any) => {
        completionsWithDetails.push({
          ...completion,
          assignment: {
            ...completion.assignment,
            chore: completion.assignment.chore,
            assignee: completion.assignment.assignee
          }
        });
      });
    }

    return completionsWithDetails;
  } catch (error) {
    console.error('Error fetching chore completions:', error);
    throw error;
  }
}

/**
 * Get points totals for all family members
 */
export async function getPointsTotals(familyId: string) {
  try {
    const { data, error } = await supabase
      .from('user_points_summary')
      .select('*')
      .eq('family_id', familyId)
      .order('total_points', { ascending: false });

    if (error) {
      throw error;
    }

    return data as UserPointsSummary[];
  } catch (error) {
    console.error('Error fetching points totals:', error);
    throw error;
  }
}

/**
 * Get points for current user
 */
export async function getMyPoints(profileId: string, familyId: string) {
  try {
    const { data, error } = await supabase
      .from('user_points_summary')
      .select('*')
      .eq('profile_id', profileId)
      .eq('family_id', familyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          profile_id: profileId,
          display_name: null,
          role: 'member' as const,
          family_id: familyId,
          total_points: 0,
          completed_chores: 0
        };
      }
      throw error;
    }

    return data as UserPointsSummary;
  } catch (error) {
    console.error('Error fetching my points:', error);
    throw error;
  }
}

/**
 * Get family members for assignment selection
 */
export async function getFamilyMembers(familyId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, email')
      .eq('family_id', familyId)
      .order('display_name');

    if (error) {
      throw error;
    }

    return data as DatabaseProfile[];
  } catch (error) {
    console.error('Error fetching family members:', error);
    throw error;
  }
}

/**
 * Check if user is admin of the family
 */
export async function isUserAdmin(userId: string, familyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .eq('family_id', familyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return data.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}