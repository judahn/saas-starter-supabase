export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: number;
          name: string;
          created_at: string;
          updated_at: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_product_id: string | null;
          plan_name: string | null;
          subscription_status: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
          updated_at?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_product_id?: string | null;
          plan_name?: string | null;
          subscription_status?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string;
          updated_at?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_product_id?: string | null;
          plan_name?: string | null;
          subscription_status?: string | null;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: number;
          user_id: string;
          team_id: number;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          team_id: number;
          role: string;
          joined_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          team_id?: number;
          role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: number;
          team_id: number;
          user_id: string | null;
          action: string;
          timestamp: string;
          ip_address: string | null;
        };
        Insert: {
          id?: number;
          team_id: number;
          user_id?: string | null;
          action: string;
          timestamp?: string;
          ip_address?: string | null;
        };
        Update: {
          id?: number;
          team_id?: number;
          user_id?: string | null;
          action?: string;
          timestamp?: string;
          ip_address?: string | null;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: number;
          team_id: number;
          email: string;
          role: string;
          invited_by: string;
          invited_at: string;
          status: string;
        };
        Insert: {
          id?: number;
          team_id: number;
          email: string;
          role: string;
          invited_by: string;
          invited_at?: string;
          status?: string;
        };
        Update: {
          id?: number;
          team_id?: number;
          email?: string;
          role?: string;
          invited_by?: string;
          invited_at?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience types
export type Team = Database['public']['Tables']['teams']['Row'];
export type NewTeam = Database['public']['Tables']['teams']['Insert'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type NewTeamMember = Database['public']['Tables']['team_members']['Insert'];
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type NewActivityLog = Database['public']['Tables']['activity_logs']['Insert'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];
export type NewInvitation = Database['public']['Tables']['invitations']['Insert'];

// User type from Supabase Auth (with metadata)
export type User = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

// Combined types for queries
export type TeamDataWithMembers = Team & {
  team_members: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

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
