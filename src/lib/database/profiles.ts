/**
 * Database operations for profiles and families
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { DatabaseProfile, DatabaseFamily, ProfileWithFamily, AppUser } from './types';

const supabase = createSupabaseBrowserClient();

/**
 * Fetch a profile by user ID (auth.uid())
 */
export async function getProfileById(userId: string): Promise<DatabaseProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

/**
 * Fetch a profile with family information
 */
export async function getProfileWithFamily(userId: string): Promise<ProfileWithFamily | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        family:family_id (*)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as ProfileWithFamily;
  } catch (error) {
    console.error('Error fetching profile with family:', error);
    throw error;
  }
}

/**
 * Fetch a family by ID
 */
export async function getFamilyById(familyId: string): Promise<DatabaseFamily | null> {
  try {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching family:', error);
    throw error;
  }
}

/**
 * Update a user's display name
 */
export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating display name:', error);
    throw error;
  }
}

/**
 * Update a family name
 */
export async function updateFamilyName(familyId: string, name: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('families')
      .update({ name })
      .eq('id', familyId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating family name:', error);
    throw error;
  }
}

/**
 * Convert ProfileWithFamily to AppUser
 */
export function toAppUser(profileWithFamily: ProfileWithFamily): AppUser {
  return {
    id: profileWithFamily.id,
    email: profileWithFamily.email,
    display_name: profileWithFamily.display_name,
    role: profileWithFamily.role,
    family_id: profileWithFamily.family_id,
    family_name: profileWithFamily.family.name,
  };
}
