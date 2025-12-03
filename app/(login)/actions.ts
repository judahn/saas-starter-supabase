'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { createAdminClient } from '@/lib/db/supabase';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import {
  ActivityType,
  type Team,
  type TeamMember,
  type Invitation,
} from '@/lib/db/types';

async function logActivity(
  teamId: number | null | undefined,
  userId: string,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('activity_logs') as any).insert({
    team_id: teamId,
    user_id: userId,
    action: type,
    ip_address: ipAddress || '',
  });
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const supabase = await createServerSupabaseClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.user) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  // Get user's team for activity logging
  const adminSupabase = createAdminClient();
  const { data: teamMember } = await adminSupabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', authData.user.id)
    .single();

  if (teamMember) {
    await logActivity((teamMember as TeamMember).team_id, authData.user.id, ActivityType.SIGN_IN);
  }

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    // Get team for checkout
    const { data: team } = await adminSupabase
      .from('teams')
      .select('*')
      .eq('id', (teamMember as TeamMember)?.team_id)
      .single();
    return createCheckoutSession({ team: team as Team | null, priceId });
  }

  redirect('/dashboard');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional()
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;

  const supabase = await createServerSupabaseClient();
  const adminSupabase = createAdminClient();

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: null, // Can be updated later
      }
    }
  });

  if (authError || !authData.user) {
    return {
      error: authError?.message || 'Failed to create user. Please try again.',
      email,
      password
    };
  }

  const userId = authData.user.id;
  let teamId: number;
  let userRole: string;
  let createdTeam: Team | null = null;

  if (inviteId) {
    // Check if there's a valid invitation
    const { data: invitation } = await adminSupabase
      .from('invitations')
      .select('*')
      .eq('id', parseInt(inviteId))
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (invitation) {
      const inv = invitation as Invitation;
      teamId = inv.team_id;
      userRole = inv.role;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupabase.from('invitations') as any)
        .update({ status: 'accepted' })
        .eq('id', inv.id);

      await logActivity(teamId, userId, ActivityType.ACCEPT_INVITATION);

      const { data: team } = await adminSupabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      createdTeam = team as Team;
    } else {
      // Delete the auth user since invitation is invalid
      await adminSupabase.auth.admin.deleteUser(userId);
      return { error: 'Invalid or expired invitation.', email, password };
    }
  } else {
    // Create a new team if there's no invitation
    const { data: newTeam, error: teamError } = await adminSupabase
      .from('teams')
      .insert({ name: `${email}'s Team` })
      .select()
      .single();

    if (teamError || !newTeam) {
      // Delete the auth user since team creation failed
      await adminSupabase.auth.admin.deleteUser(userId);
      return {
        error: 'Failed to create team. Please try again.',
        email,
        password
      };
    }

    createdTeam = newTeam as Team;
    teamId = createdTeam.id;
    userRole = 'owner';

    await logActivity(teamId, userId, ActivityType.CREATE_TEAM);
  }

  // Create team membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = await (adminSupabase.from('team_members') as any).insert({
    user_id: userId,
    team_id: teamId,
    role: userRole,
  });

  if (memberError) {
    console.error('Failed to create team member:', memberError);
  }

  await logActivity(teamId, userId, ActivityType.SIGN_UP);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: createdTeam, priceId });
  }

  redirect('/dashboard');
});

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const user = await getUser();

  if (user) {
    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  }

  await supabase.auth.signOut();
  redirect('/sign-in');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    // Verify current password by trying to sign in
    const supabase = await createServerSupabaseClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (verifyError) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Current password is incorrect.'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Failed to update password. Please try again.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD);

    return {
      success: 'Password updated successfully.'
    };
  }
);

const setInitialPasswordSchema = z.object({
  password: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const setInitialPassword = validatedActionWithUser(
  setInitialPasswordSchema,
  async (data, _, user) => {
    const { password, confirmPassword } = data;

    if (password !== confirmPassword) {
      return {
        error: 'Passwords do not match.'
      };
    }

    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password
    });

    if (updateError) {
      return {
        error: 'Failed to set password. Please try again.'
      };
    }

    return {
      success: 'Password set successfully.'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    // Verify password
    const supabase = await createServerSupabaseClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (verifyError) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.DELETE_ACCOUNT);

    const adminSupabase = createAdminClient();

    // Remove from team
    if (userWithTeam?.teamId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupabase.from('team_members') as any)
        .delete()
        .eq('user_id', user.id)
        .eq('team_id', userWithTeam.teamId);
    }

    // Delete the auth user (this is a hard delete in Supabase)
    await adminSupabase.auth.admin.deleteUser(user.id);

    await supabase.auth.signOut();
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;

    const supabase = await createServerSupabaseClient();

    const updates: { email?: string; data?: { name: string } } = {
      data: { name }
    };

    if (email !== user.email) {
      updates.email = email;
    }

    const { error } = await supabase.auth.updateUser(updates);

    if (error) {
      return { name, error: 'Failed to update account. Please try again.' };
    }

    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT);

    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const adminSupabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from('team_members') as any)
      .delete()
      .eq('id', memberId)
      .eq('team_id', userWithTeam.teamId);

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const adminSupabase = createAdminClient();

    // Check if user with this email already exists and is a team member
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      const { data: existingMember } = await adminSupabase
        .from('team_members')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('team_id', userWithTeam.teamId)
        .single();

      if (existingMember) {
        return { error: 'User is already a member of this team' };
      }
    }

    // Check if there's an existing invitation
    const { data: existingInvitation } = await adminSupabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('team_id', userWithTeam.teamId)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invitation } = await (adminSupabase.from('invitations') as any)
      .insert({
        team_id: userWithTeam.teamId,
        email,
        role,
        invited_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    // Send invite email via Supabase Auth
    // The user metadata will be used to link them to the team when they accept
    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.BASE_URL}/auth/callback`,
      data: {
        invited_team_id: userWithTeam.teamId,
        invited_role: role,
        invitation_id: invitation?.id,
      }
    });

    if (inviteError) {
      // Clean up the invitation record if email failed
      if (invitation?.id) {
        await (adminSupabase.from('invitations') as any)
          .delete()
          .eq('id', invitation.id);
      }
      return { error: `Failed to send invitation: ${inviteError.message}` };
    }

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    return { success: 'Invitation sent successfully' };
  }
);
