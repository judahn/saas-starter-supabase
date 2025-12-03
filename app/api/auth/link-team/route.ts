import { createAdminClient } from '@/lib/db/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { userId, teamId, role, invitationId } = await request.json();

  if (!userId || !teamId || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Check if user is already a member of this team
  const { data: existingMember } = await adminSupabase
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single();

  if (existingMember) {
    return NextResponse.json({ message: 'Already a member' });
  }

  // Add user to the team
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (adminSupabase.from('team_members') as any).insert({
    user_id: userId,
    team_id: teamId,
    role: role,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update invitation status
  if (invitationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from('invitations') as any)
      .update({ status: 'accepted' })
      .eq('id', invitationId);
  }

  // Clear the invitation metadata from user
  await adminSupabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      invited_team_id: null,
      invited_role: null,
      invitation_id: null,
    }
  });

  return NextResponse.json({ success: true });
}
