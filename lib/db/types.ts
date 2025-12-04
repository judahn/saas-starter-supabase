// Re-export everything from generated types
export * from './database.types';

// Import what we need for custom types
import type { Tables } from './database.types';

// Convenience type aliases (use Tables<'name'> helper from generated file)
export type Team = Tables<'teams'>;
export type TeamMember = Tables<'team_members'>;
export type ActivityLog = Tables<'activity_logs'>;
export type Invitation = Tables<'invitations'>;

// User type for Supabase Auth (stored in auth.users, not our tables)
export type User = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

// Combined types for queries with joins
export type TeamDataWithMembers = Team & {
  team_members: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

// Activity types enum
export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
