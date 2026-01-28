# ChoreSpace Chores MVP - Quick Testing Guide

## 🚀 Quick Start Testing

## ✅ Smoke Test: Auth Rehydration (Login → Dashboard → Profile → Tab Switch)

Use this quick flow to verify core auth + profile loading behavior without a full E2E setup.

1. Log in with a valid account.
2. Confirm the dashboard loads and shows profile data (email, display name, role, family name).
3. Open the Profile page (`/app/profile`) and confirm the same profile data loads.
4. Switch to another browser tab for 10+ seconds, then return to the app tab.
5. ✅ Expect the dashboard/profile data to remain visible without redirects, errors, or infinite loading.

### 1. Database Setup
```sql
-- Run this in your Supabase SQL editor:
-- Copy the entire contents of supabase_schema_chores.sql
```

### 2. Test Admin Workflow

**Test 1: Create Multi-Assignee Chore**
1. Log in as admin
2. Go to `/app/chores` → "Create Chore" button
3. Create chore:
   - Title: "Take out the trash"
   - Points: 5
   - Assign to: Kid A and Kid B
   - Due date: Tomorrow
4. ✅ Verify chore appears in "All Family Chores"
5. ✅ Verify it's assigned to both kids

**Test 2: Admin Can Complete (if assigned)**
1. If the admin is also assigned to the chore
2. Click "Complete" in "My Chores" section
3. ✅ Verify points increase in dashboard
4. ✅ Check completion appears in history

### 3. Test Child/Member Workflow

**Test 3: Kid A Completes Chore**
1. Log in as Kid A
2. Go to `/app/chores`
3. ✅ Verify "Take out the trash" appears in "My Chores"
4. Click "Complete" button
5. ✅ Verify success feedback
6. ✅ Check points updated in dashboard (should show +5 points)

**Test 4: Kid B Also Completes Same Chore**
1. Log in as Kid B
2. Go to `/app/chores`
3. ✅ Verify same chore appears (independent assignment)
4. Click "Complete" 
5. ✅ Verify Kid B also gets 5 points
6. ✅ Both kids can complete the same chore separately

### 4. Test Admin Oversight

**Test 5: Admin Sees Completion History**
1. Log back in as admin
2. Go to chore details: `/app/chores/[id]`
3. ✅ Verify completion history shows both completions
4. ✅ See who completed when, with timestamps

**Test 6: Family Leaderboard**
1. Go to `/app` (dashboard)
2. ✅ Verify family leaderboard shows both kids with 5 points each
3. ✅ Admin can see overall family progress

### 5. Test Role Security

**Test 7: Non-Admin Access Control**
1. Log in as child/member
2. Try to go to `/app/chores/new`
3. ✅ Should redirect to `/app/chores` with error
4. ✅ No "Create Chore" button visible
5. ✅ Can't edit or archive existing chores

### 6. Test Error Handling

**Test 8: Form Validation**
1. Try to create chore without title → ✅ Should show error
2. Try negative points → ✅ Should prevent submission
3. Try to submit without assignees → ✅ Should require selection

**Test 9: Network Resilience**
1. Complete a chore with poor connection
2. ✅ Should show loading state
3. ✅ Should handle errors gracefully
4. ✅ Should prevent double completion

## 🎯 Success Criteria Checklist

### ✅ Core Functionality
- [ ] Admin can create chores with multiple assignees
- [ ] Each assignee sees the chore in "My Chores"
- [ ] Completing chores awards points
- [ ] Points accumulate correctly per user
- [ ] Admin sees completion history
- [ ] Family leaderboard works

### ✅ Security & Access
- [ ] Non-admins can't create/edit chores
- [ ] Users only see their family's data
- [ ] Role-based UI different for admin vs member/child
- [ ] Proper error handling and validation

### ✅ User Experience
- [ ] Mobile responsive design
- [ ] Clear loading states
- [ ] Intuitive chore completion flow
- [ ] Helpful empty states
- [ ] Fast, smooth interactions

### ✅ Data Integrity
- [ ] Multi-assignee support works correctly
- [ ] Completion history is accurate
- [ ] Points calculations are correct
- [ ] No data leakage between families

## 🏆 Expected Results

After testing, you should have:
- A working chore management system
- Kids earning points for completed chores
- Admin oversight and family progress tracking
- Secure, role-based access control
- Production-ready application

**Ready for real families to use!** 🎉
