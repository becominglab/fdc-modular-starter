export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_items: {
        Row: {
          action_map_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          parent_item_id: string | null
          priority: string | null
          sort_order: number | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          action_map_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          parent_item_id?: string | null
          priority?: string | null
          sort_order?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          action_map_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          parent_item_id?: string | null
          priority?: string | null
          sort_order?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "action_items_action_map_id_fkey"
            columns: ["action_map_id"]
            isOneToOne: false
            referencedRelation: "action_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      action_maps: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          key_result_id: string | null
          target_period_end: string | null
          target_period_start: string | null
          title: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          key_result_id?: string | null
          target_period_end?: string | null
          target_period_start?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          key_result_id?: string | null
          target_period_end?: string | null
          target_period_start?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "action_maps_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      approach_goals: {
        Row: {
          created_at: string | null
          id: string
          period: string
          target_count: number
          updated_at: string | null
          user_id: string
          week_or_month: number
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          period: string
          target_count: number
          updated_at?: string | null
          user_id: string
          week_or_month: number
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          period?: string
          target_count?: number
          updated_at?: string | null
          user_id?: string
          week_or_month?: number
          year?: number
        }
        Relationships: []
      }
      approaches: {
        Row: {
          approached_at: string
          content: string
          created_at: string | null
          id: string
          prospect_id: string
          result: string | null
          result_status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approached_at?: string
          content: string
          created_at?: string | null
          id?: string
          prospect_id: string
          result?: string | null
          result_status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approached_at?: string
          content?: string
          created_at?: string | null
          id?: string
          prospect_id?: string
          result?: string | null
          result_status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approaches_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_points: {
        Row: {
          brand_id: string
          content: string
          created_at: string | null
          id: string
          point_type: string
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          content?: string
          created_at?: string | null
          id?: string
          point_type: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          content?: string
          created_at?: string | null
          id?: string
          point_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_points_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          story: string | null
          tagline: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          story?: string | null
          tagline?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          story?: string | null
          tagline?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          company: string
          contract_date: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          prospect_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company: string
          contract_date?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          prospect_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string
          contract_date?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          prospect_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by: string
          email: string
          expires_at: string
          id: string
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by: string
          email: string
          expires_at: string
          id?: string
          role?: string
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          created_at: string | null
          current_value: number
          id: string
          objective_id: string
          sort_order: number | null
          target_value: number
          title: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number
          id?: string
          objective_id: string
          sort_order?: number | null
          target_value?: number
          title: string
          unit?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number
          id?: string
          objective_id?: string
          sort_order?: number | null
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      lean_canvas: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lean_canvas_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      lean_canvas_blocks: {
        Row: {
          block_type: string
          canvas_id: string
          content: Json
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          block_type: string
          canvas_id: string
          content?: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          block_type?: string
          canvas_id?: string
          content?: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lean_canvas_blocks_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "lean_canvas"
            referencedColumns: ["id"]
          },
        ]
      }
      mvv: {
        Row: {
          brand_id: string
          created_at: string | null
          id: string
          mission: string | null
          updated_at: string | null
          user_id: string
          values: Json | null
          vision: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          id?: string
          mission?: string | null
          updated_at?: string | null
          user_id: string
          values?: Json | null
          vision?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          id?: string
          mission?: string | null
          updated_at?: string | null
          user_id?: string
          values?: Json | null
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mvv_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          period: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          period: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          period?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_sections: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          conversion_goal: string | null
          created_at: string | null
          delivery_type: string
          description: string | null
          duration: string | null
          features: Json
          id: string
          is_flagship: boolean
          name: string
          price_label: string | null
          price_max: number | null
          price_min: number | null
          price_type: string
          section_id: string
          sort_order: number
          target_audience: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          conversion_goal?: string | null
          created_at?: string | null
          delivery_type?: string
          description?: string | null
          duration?: string | null
          features?: Json
          id?: string
          is_flagship?: boolean
          name: string
          price_label?: string | null
          price_max?: number | null
          price_min?: number | null
          price_type?: string
          section_id: string
          sort_order?: number
          target_audience?: string | null
          tier: string
          updated_at?: string | null
        }
        Update: {
          conversion_goal?: string | null
          created_at?: string | null
          delivery_type?: string
          description?: string | null
          duration?: string | null
          features?: Json
          id?: string
          is_flagship?: boolean
          name?: string
          price_label?: string | null
          price_max?: number | null
          price_min?: number | null
          price_type?: string
          section_id?: string
          sort_order?: number
          target_audience?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "product_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          company: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["prospect_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          action_item_id: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          google_event_id: string | null
          id: string
          scheduled_date: string | null
          status: string | null
          suit: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_item_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          google_event_id?: string | null
          id?: string
          scheduled_date?: string | null
          status?: string | null
          suit?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_item_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          google_event_id?: string | null
          id?: string
          scheduled_date?: string | null
          status?: string | null
          suit?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          google_access_token: string | null
          google_api_enabled: boolean | null
          google_refresh_token: string | null
          google_scopes: string[] | null
          google_token_expires_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          google_access_token?: string | null
          google_api_enabled?: boolean | null
          google_refresh_token?: string | null
          google_scopes?: string[] | null
          google_token_expires_at?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          google_access_token?: string | null
          google_api_enabled?: boolean | null
          google_refresh_token?: string | null
          google_scopes?: string[] | null
          google_token_expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      prospect_status:
        | "new"
        | "approaching"
        | "negotiating"
        | "proposing"
        | "won"
        | "lost"
      workspace_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      prospect_status: [
        "new",
        "approaching",
        "negotiating",
        "proposing",
        "won",
        "lost",
      ],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const
