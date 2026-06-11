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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          target_id: string | null
          target_label: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string
        }
        Relationships: []
      }
      application_stage_actions: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          application_id: string
          comment: string | null
          created_at: string
          from_stage: string
          id: string
          to_stage: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          application_id: string
          comment?: string | null
          created_at?: string
          from_stage: string
          id?: string
          to_stage: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          application_id?: string
          comment?: string | null
          created_at?: string
          from_stage?: string
          id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_stage_actions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          account_type: string
          address: string | null
          advisory_note: string | null
          affirmation_letter_url: string | null
          applicant_role: string | null
          assigned_equipment: Json | null
          assigned_port: string | null
          assigned_sim: string | null
          building_type: string | null
          created_at: string
          customer_name: string
          distributor_id: string | null
          district: string
          document_url: string | null
          email: string | null
          floors: number | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          national_id: string | null
          nearest_landmark: string | null
          notes: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_receipt_url: string | null
          payment_reference: string | null
          phone: string | null
          preferred_date: string | null
          ref_code: string
          rejection_reason: string | null
          scheduled_date: string | null
          service: string
          stage: string
          status: string
          technician: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_type?: string
          address?: string | null
          advisory_note?: string | null
          affirmation_letter_url?: string | null
          applicant_role?: string | null
          assigned_equipment?: Json | null
          assigned_port?: string | null
          assigned_sim?: string | null
          building_type?: string | null
          created_at?: string
          customer_name: string
          distributor_id?: string | null
          district: string
          document_url?: string | null
          email?: string | null
          floors?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          national_id?: string | null
          nearest_landmark?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          phone?: string | null
          preferred_date?: string | null
          ref_code?: string
          rejection_reason?: string | null
          scheduled_date?: string | null
          service: string
          stage?: string
          status?: string
          technician?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_type?: string
          address?: string | null
          advisory_note?: string | null
          affirmation_letter_url?: string | null
          applicant_role?: string | null
          assigned_equipment?: Json | null
          assigned_port?: string | null
          assigned_sim?: string | null
          building_type?: string | null
          created_at?: string
          customer_name?: string
          distributor_id?: string | null
          district?: string
          document_url?: string | null
          email?: string | null
          floors?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          national_id?: string | null
          nearest_landmark?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          phone?: string | null
          preferred_date?: string | null
          ref_code?: string
          rejection_reason?: string | null
          scheduled_date?: string | null
          service?: string
          stage?: string
          status?: string
          technician?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_connections: {
        Row: {
          application_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          fiber_node_id: string
          id: string
          latitude: number
          longitude: number
          source: string
          user_id: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          fiber_node_id: string
          id?: string
          latitude: number
          longitude: number
          source?: string
          user_id?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          fiber_node_id?: string
          id?: string
          latitude?: number
          longitude?: number
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_connections_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_connections_fiber_node_id_fkey"
            columns: ["fiber_node_id"]
            isOneToOne: false
            referencedRelation: "fiber_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_commissions: {
        Row: {
          application_id: string
          commission_amount: number
          created_at: string
          distributor_id: string
          due_date: string | null
          id: string
          month_index: number
          paid: boolean
          paid_at: string | null
          paid_by: string | null
          paid_note: string | null
          plan_price: number
          updated_at: string
        }
        Insert: {
          application_id: string
          commission_amount?: number
          created_at?: string
          distributor_id: string
          due_date?: string | null
          id?: string
          month_index: number
          paid?: boolean
          paid_at?: string | null
          paid_by?: string | null
          paid_note?: string | null
          plan_price?: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          commission_amount?: number
          created_at?: string
          distributor_id?: string
          due_date?: string | null
          id?: string
          month_index?: number
          paid?: boolean
          paid_at?: string | null
          paid_by?: string | null
          paid_note?: string | null
          plan_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_commissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_commissions_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributors: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_name: string
          code: string
          commission_months: number
          commission_rate: number
          contact_name: string
          created_at: string
          district: string | null
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_name: string
          code: string
          commission_months?: number
          commission_rate?: number
          contact_name: string
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string
          code?: string
          commission_months?: number
          commission_rate?: number
          contact_name?: string
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fiber_nodes: {
        Row: {
          capacity: number
          connected_customers: number
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          radius_km: number
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          connected_customers?: number
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          radius_km?: number
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          connected_customers?: number
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          radius_km?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      fiber_routes: {
        Row: {
          coordinates: Json
          created_at: string
          id: string
          route_name: string
        }
        Insert: {
          coordinates?: Json
          created_at?: string
          id?: string
          route_name: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          id?: string
          route_name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string
          district: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_plans: {
        Row: {
          category_id: string
          created_at: string
          details: Json
          id: string
          is_active: boolean
          name: string
          price: string
          sort_order: number
          speed: string | null
          updated_at: string
          visible_to: string[]
        }
        Insert: {
          category_id: string
          created_at?: string
          details?: Json
          id?: string
          is_active?: boolean
          name: string
          price: string
          sort_order?: number
          speed?: string | null
          updated_at?: string
          visible_to?: string[]
        }
        Update: {
          category_id?: string
          created_at?: string
          details?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: string
          sort_order?: number
          speed?: string | null
          updated_at?: string
          visible_to?: string[]
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          resolved: boolean
          source: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message: string
          resolved?: boolean
          source?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          resolved?: boolean
          source?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_application_stage: {
        Args: {
          _action: string
          _app_id: string
          _comment?: string
          _patch?: Json
        }
        Returns: {
          account_type: string
          address: string | null
          advisory_note: string | null
          affirmation_letter_url: string | null
          applicant_role: string | null
          assigned_equipment: Json | null
          assigned_port: string | null
          assigned_sim: string | null
          building_type: string | null
          created_at: string
          customer_name: string
          distributor_id: string | null
          district: string
          document_url: string | null
          email: string | null
          floors: number | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          national_id: string | null
          nearest_landmark: string | null
          notes: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_receipt_url: string | null
          payment_reference: string | null
          phone: string | null
          preferred_date: string | null
          ref_code: string
          rejection_reason: string | null
          scheduled_date: string | null
          service: string
          stage: string
          status: string
          technician: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_application_by_ref_code: {
        Args: { _code: string }
        Returns: {
          created_at: string
          customer_name: string
          district: string
          id: string
          location: string
          ref_code: string
          rejection_reason: string
          scheduled_date: string
          service: string
          stage: string
          status: string
          technician: string
        }[]
      }
      lookup_application_history_by_ref_code: {
        Args: { _code: string }
        Returns: {
          changed_by_name: string
          created_at: string
          note: string
          status: string
        }[]
      }
      lookup_distributor_by_code: {
        Args: { _code: string }
        Returns: {
          business_name: string
          code: string
          id: string
          status: string
        }[]
      }
      parse_plan_price: { Args: { _text: string }; Returns: number }
      role_for_stage: {
        Args: { _stage: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "customer"
        | "technician"
        | "main_admin"
        | "moderator"
        | "service_delivery"
        | "technical"
        | "billing"
        | "distributor"
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
      app_role: [
        "admin",
        "customer",
        "technician",
        "main_admin",
        "moderator",
        "service_delivery",
        "technical",
        "billing",
        "distributor",
      ],
    },
  },
} as const
