-- ChoreSpace Chores Management Schema
-- Run this script in your Supabase SQL editor to create the chore management system

-- =====================================================
-- CHORES TABLES
-- =====================================================

-- Chores table - core chore definitions
CREATE TABLE IF NOT EXISTS public.chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  points int NOT NULL DEFAULT 1 CHECK (points >= 0),
  due_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chore assignments table - supports multi-assignee (one chore to many people)
CREATE TABLE IF NOT EXISTS public.chore_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id uuid NOT NULL REFERENCES public.chores(id) ON DELETE CASCADE,
  assignee_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chore_id, assignee_profile_id)
);

-- Chore completions table - history ledger for tracking who completed what when
CREATE TABLE IF NOT EXISTS public.chore_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.chore_assignments(id) ON DELETE CASCADE,
  completed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Chores table indexes
CREATE INDEX IF NOT EXISTS idx_chores_family_active ON public.chores (family_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chores_due_date ON public.chores (family_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chores_created_by ON public.chores (created_by);

-- Chore assignments indexes
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id ON public.chore_assignments (chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_assignee ON public.chore_assignments (assignee_profile_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_assigned_by ON public.chore_assignments (assigned_by);

-- Chore completions indexes
CREATE INDEX IF NOT EXISTS idx_chore_completions_assignment ON public.chore_completions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_chore_completions_completed_by ON public.chore_completions (completed_by);
CREATE INDEX IF NOT EXISTS idx_chore_completions_date_desc ON public.chore_completions (completed_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for chores table
DROP TRIGGER IF EXISTS update_chores_updated_at ON public.chores;
CREATE TRIGGER update_chores_updated_at
  BEFORE UPDATE ON public.chores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CHORES RLS POLICIES
-- =====================================================

-- Admins can do everything on chores within their family
CREATE POLICY "chores_select_admin" ON public.chores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = chores.family_id
        AND p.role = 'admin'
    )
  );

CREATE POLICY "chores_insert_admin" ON public.chores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = chores.family_id
        AND p.role = 'admin'
    )
  );

CREATE POLICY "chores_update_admin" ON public.chores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = chores.family_id
        AND p.role = 'admin'
    )
  );

CREATE POLICY "chores_delete_admin" ON public.chores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = chores.family_id
        AND p.role = 'admin'
    )
  );

-- Members and children can read chores assigned to them
CREATE POLICY "chores_select_assigned" ON public.chores
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.chore_assignments ca
      JOIN public.profiles p ON p.id = ca.assignee_profile_id
      WHERE ca.chore_id = chores.id
        AND p.id = auth.uid()
        AND p.family_id = chores.family_id
    )
  );

-- =====================================================
-- CHORE ASSIGNMENTS RLS POLICIES
-- =====================================================

-- Admins can do everything on assignments within their family
CREATE POLICY "assignments_select_admin" ON public.chore_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.chores c ON c.family_id = p.family_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND c.id = chore_assignments.chore_id
    )
  );

CREATE POLICY "assignments_insert_admin" ON public.chore_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.chores c ON c.family_id = p.family_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND c.id = chore_assignments.chore_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p2
          WHERE p2.id = chore_assignments.assignee_profile_id
            AND p2.family_id = c.family_id
        )
    )
  );

CREATE POLICY "assignments_update_admin" ON public.chore_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.chores c ON c.family_id = p.family_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND c.id = chore_assignments.chore_id
    )
  );

CREATE POLICY "assignments_delete_admin" ON public.chore_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.chores c ON c.family_id = p.family_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND c.id = chore_assignments.chore_id
    )
  );

-- Members and children can read their own assignments
CREATE POLICY "assignments_select_own" ON public.chore_assignments
  FOR SELECT USING (
    assignee_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chores c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = chore_assignments.chore_id
        AND c.family_id = p.family_id
    )
  );

-- Members and children can read assignments for chores they're assigned to (for completion)
CREATE POLICY "assignments_select_for_completion" ON public.chore_assignments
  FOR SELECT USING (
    (
      assignee_profile_id = auth.uid()
      OR auth.uid() IN (
        SELECT c.created_by FROM public.chores c WHERE c.id = chore_assignments.chore_id
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.chores c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = chore_assignments.chore_id
        AND c.family_id = p.family_id
    )
  );

-- =====================================================
-- CHORE COMPLETIONS RLS POLICIES
-- =====================================================

-- Admins can read all completions within their family
CREATE POLICY "completions_select_admin" ON public.chore_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.chore_assignments ca ON ca.id = chore_completions.assignment_id
      JOIN public.chores c ON c.id = ca.chore_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.family_id = c.family_id
    )
  );

-- Admins can delete completions for corrections
CREATE POLICY "completions_delete_admin" ON public.chore_completions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.chore_assignments ca ON ca.id = chore_completions.assignment_id
      JOIN public.chores c ON c.id = ca.chore_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.family_id = c.family_id
    )
  );

-- Members and children can read their own completions
CREATE POLICY "completions_select_own" ON public.chore_completions
  FOR SELECT USING (
    completed_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chore_assignments ca
      JOIN public.chores c ON c.id = ca.chore_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ca.id = chore_completions.assignment_id
        AND c.family_id = p.family_id
    )
  );

-- Members and children can insert completions only for their own assignments
CREATE POLICY "completions_insert_own" ON public.chore_completions
  FOR INSERT WITH CHECK (
    completed_by = auth.uid()
    AND assignment_id IN (
      SELECT ca.id
      FROM public.chore_assignments ca
      JOIN public.chores c ON c.id = ca.chore_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ca.assignee_profile_id = auth.uid()
        AND c.family_id = p.family_id
    )
  );

-- =====================================================
-- FAMILIES RLS POLICIES
-- =====================================================

-- Family members can read their family
CREATE POLICY "families_select_member" ON public.families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = families.id
    )
  );

-- Admins can update their family record
CREATE POLICY "families_update_admin" ON public.families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.family_id = families.id
    )
  );

-- =====================================================
-- PROFILES RLS POLICIES
-- =====================================================

-- Family members can read profiles within their family
CREATE POLICY "profiles_select_family" ON public.profiles
  FOR SELECT USING (
    family_id = (
      SELECT p.family_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Users can update their own profile without changing role or family
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
    AND family_id = (
      SELECT p.family_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND role = (
      SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- =====================================================
-- HELPFUL VIEWS FOR POINTS TRACKING
-- =====================================================

-- View for points totals per user
CREATE OR REPLACE VIEW public.user_points_summary AS
SELECT 
  p.id as profile_id,
  p.display_name,
  p.role,
  p.family_id,
  COALESCE(SUM(c.points), 0) as total_points,
  COUNT(cc.id) as completed_chores
FROM public.profiles p
LEFT JOIN public.chore_assignments ca ON ca.assignee_profile_id = p.id
LEFT JOIN public.chore_completions cc ON cc.assignment_id = ca.id
LEFT JOIN public.chores c ON c.id = ca.chore_id
WHERE p.id = auth.uid() -- Always filter to current user for RLS
  OR EXISTS (
    -- Include family members if user is admin of that family
    SELECT 1 FROM public.profiles admin_p 
    WHERE admin_p.id = auth.uid() 
      AND admin_p.role = 'admin' 
      AND admin_p.family_id = p.family_id
  )
GROUP BY p.id, p.display_name, p.role, p.family_id;

-- View for chore completion history
CREATE OR REPLACE VIEW public.chore_completion_history AS
SELECT 
  cc.id as completion_id,
  c.id as chore_id,
  c.title as chore_title,
  c.points,
  c.due_date,
  p_assigned.display_name as assigned_to,
  p_completed.display_name as completed_by,
  cc.completed_at,
  cc.notes,
  f.name as family_name
FROM public.chore_completions cc
JOIN public.chore_assignments ca ON ca.id = cc.assignment_id
JOIN public.chores c ON c.id = ca.chore_id
JOIN public.profiles p_assigned ON p_assigned.id = ca.assignee_profile_id
JOIN public.profiles p_completed ON p_completed.id = cc.completed_by
JOIN public.families f ON f.id = c.family_id
WHERE c.family_id IN (
  -- Only show completions from user's family
  SELECT p.family_id FROM public.profiles p WHERE p.id = auth.uid()
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL VIEWS IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.chores IS 'Core chore definitions that can be assigned to family members';
COMMENT ON TABLE public.chore_assignments IS 'Junction table linking chores to assigned users (supports multi-assignee)';
COMMENT ON TABLE public.chore_completions IS 'History ledger tracking chore completions with timestamps and notes';
COMMENT ON VIEW public.user_points_summary IS 'Aggregated points summary per user for leaderboards and progress tracking';
COMMENT ON VIEW public.chore_completion_history IS 'Detailed completion history with chore and user information for admin oversight';
