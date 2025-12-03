import { createServerSupabaseClient } from './server';
import { createAdminClient } from './supabase';
import type { Team, TeamMember, ActivityLog, TeamDataWithMembers } from './types';
import type { User } from '@supabase/supabase-js';

export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getTeamByStripeCustomerId(customerId: string): Promise<Team | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !data) return null;
  return data as Team;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('teams') as any)
    .update({
      stripe_subscription_id: subscriptionData.stripeSubscriptionId,
      stripe_product_id: subscriptionData.stripeProductId,
      plan_name: subscriptionData.planName,
      subscription_status: subscriptionData.subscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', teamId);

  if (error) {
    throw new Error(`Failed to update team subscription: ${error.message}`);
  }
}

export async function getUserWithTeam(userId: string) {
  const supabase = createAdminClient();

  const { data: teamMember, error } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .single();

  if (error || !teamMember) {
    return { user: null, teamId: null };
  }

  const { data: { user } } = await supabase.auth.admin.getUserById(userId);

  return {
    user,
    teamId: (teamMember as TeamMember).team_id,
  };
}

export async function getActivityLogs(userId: string) {
  const supabase = createAdminClient();

  // Get user's team first
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .single();

  if (!teamMember) return [];

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, timestamp, ip_address, user_id')
    .eq('team_id', (teamMember as TeamMember).team_id)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error || !data) {
    console.error('Error fetching activity logs:', error);
    return [];
  }

  const logs = data as Pick<ActivityLog, 'id' | 'action' | 'timestamp' | 'ip_address' | 'user_id'>[];

  // Get user names for the activity logs
  const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))] as string[];
  const userNames: Record<string, string> = {};

  for (const uid of userIds) {
    const { data: { user } } = await supabase.auth.admin.getUserById(uid);
    if (user) {
      userNames[uid] = user.user_metadata?.name || user.email || 'Unknown';
    }
  }

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    timestamp: log.timestamp,
    ipAddress: log.ip_address,
    userName: log.user_id ? userNames[log.user_id] || null : null,
  }));
}

export async function getTeamForUser(userId: string): Promise<TeamDataWithMembers | null> {
  const supabase = createAdminClient();

  // Get the user's team membership
  const { data: teamMemberData, error: tmError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .single();

  if (tmError || !teamMemberData) return null;

  const teamMemberResult = teamMemberData as Pick<TeamMember, 'team_id' | 'role'>;

  // Get the team
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamMemberResult.team_id)
    .single();

  if (teamError || !teamData) return null;

  const team = teamData as Team;

  // Get all team members
  const { data: membersData, error: membersError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', team.id);

  if (membersError || !membersData) return null;

  const members = membersData as TeamMember[];

  // Get user info for each member
  const teamMembersWithUsers = await Promise.all(
    members.map(async (member) => {
      const { data: { user } } = await supabase.auth.admin.getUserById(member.user_id);
      return {
        ...member,
        user: {
          id: member.user_id,
          name: user?.user_metadata?.name || null,
          email: user?.email || '',
        },
      };
    })
  );

  return {
    ...team,
    team_members: teamMembersWithUsers,
  };
}
