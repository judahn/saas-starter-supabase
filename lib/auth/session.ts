import { createServerSupabaseClient } from '@/lib/db/server';
import type { User } from '@supabase/supabase-js';

export async function getSession(): Promise<{ user: User } | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;
  return { user };
}

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}
