'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/db/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createBrowserSupabaseClient();

      // Get the hash fragment from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && refreshToken) {
        // Set the session from the tokens
        const { data: { user }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error || !user) {
          router.push('/sign-in?error=auth_failed');
          return;
        }

        // Check if user has invitation metadata
        const invitedTeamId = user.user_metadata?.invited_team_id;
        const invitedRole = user.user_metadata?.invited_role;
        const invitationId = user.user_metadata?.invitation_id;

        if (invitedTeamId && invitedRole) {
          // Call server endpoint to link user to team
          await fetch('/api/auth/link-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              teamId: invitedTeamId,
              role: invitedRole,
              invitationId,
            }),
          });

          // Invited users need to set a password
          router.push('/set-password');
          return;
        }

        router.push('/dashboard');
      } else {
        // No tokens in hash, redirect to sign in
        router.push('/sign-in');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
