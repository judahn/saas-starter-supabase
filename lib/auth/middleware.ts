import { z } from 'zod';
import type { User } from '@supabase/supabase-js';
import { TeamDataWithMembers } from '@/lib/db/types';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export type ActionState = {
  error?: string;
  success?: string;
  email?: string;
  password?: string;
  [key: string]: unknown;
};

type ValidatedActionFunction<S extends z.ZodType<unknown, z.ZodTypeDef>> = (
  data: z.infer<S>,
  formData: FormData
) => Promise<ActionState | void>;

export function validatedAction<S extends z.ZodType<unknown, z.ZodTypeDef>>(
  schema: S,
  action: ValidatedActionFunction<S>
) {
  return async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    const actionResult = await action(result.data, formData);
    // If action returns void (e.g., redirect was called), return empty state
    return actionResult ?? {};
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<unknown, z.ZodTypeDef>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<unknown, z.ZodTypeDef>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData) => {
    const user = await getUser();
    if (!user) {
      throw new Error('User is not authenticated');
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    return action(result.data, formData, user);
  };
}

type ActionWithTeamFunction<T> = (
  formData: FormData,
  team: TeamDataWithMembers
) => Promise<T>;

export function withTeam<T>(action: ActionWithTeamFunction<T>) {
  return async (formData: FormData): Promise<T> => {
    const user = await getUser();
    if (!user) {
      redirect('/sign-in');
    }

    const team = await getTeamForUser(user.id);
    if (!team) {
      throw new Error('Team not found');
    }

    return action(formData, team);
  };
}
