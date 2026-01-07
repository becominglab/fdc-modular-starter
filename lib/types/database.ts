export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prospects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          company: string;
          email: string | null;
          phone: string | null;
          status: 'new' | 'approaching' | 'negotiating' | 'proposing' | 'won' | 'lost';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          company: string;
          email?: string | null;
          phone?: string | null;
          status?: 'new' | 'approaching' | 'negotiating' | 'proposing' | 'won' | 'lost';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          company?: string;
          email?: string | null;
          phone?: string | null;
          status?: 'new' | 'approaching' | 'negotiating' | 'proposing' | 'won' | 'lost';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          company: string;
          email: string | null;
          phone: string | null;
          contract_date: string;
          notes: string | null;
          prospect_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          company: string;
          email?: string | null;
          phone?: string | null;
          contract_date?: string;
          notes?: string | null;
          prospect_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          company?: string;
          email?: string | null;
          phone?: string | null;
          contract_date?: string;
          notes?: string | null;
          prospect_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_prospect_id_fkey';
            columns: ['prospect_id'];
            referencedRelation: 'prospects';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      workspace_role: 'owner' | 'admin' | 'member';
      prospect_status: 'new' | 'approaching' | 'negotiating' | 'proposing' | 'won' | 'lost';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type DbTask = Database['public']['Tables']['tasks']['Row'];
export type DbTaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type DbTaskUpdate = Database['public']['Tables']['tasks']['Update'];

// Workspace types
export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface DbWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at: string;
}

export type DbWorkspaceInsert = Omit<DbWorkspace, 'id' | 'created_at' | 'updated_at'>;
export type DbWorkspaceUpdate = Partial<Pick<DbWorkspace, 'name' | 'description'>>;

export type DbWorkspaceMemberInsert = Omit<DbWorkspaceMember, 'id' | 'created_at' | 'updated_at'>;
export type DbWorkspaceMemberUpdate = Pick<DbWorkspaceMember, 'role'>;

// Prospect types
export type ProspectStatus = 'new' | 'approaching' | 'negotiating' | 'proposing' | 'won' | 'lost';

export interface DbProspect {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  status: ProspectStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DbProspectInsert = Omit<DbProspect, 'id' | 'created_at' | 'updated_at'>;
export type DbProspectUpdate = Partial<Omit<DbProspect, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// Client types
export interface DbClient {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  contract_date: string;
  notes: string | null;
  prospect_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DbClientInsert = Omit<DbClient, 'id' | 'created_at' | 'updated_at'>;
export type DbClientUpdate = Partial<Omit<DbClient, 'id' | 'user_id' | 'prospect_id' | 'created_at' | 'updated_at'>>;
