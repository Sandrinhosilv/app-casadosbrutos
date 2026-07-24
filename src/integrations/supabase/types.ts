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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          meta: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          meta?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          meta?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      downloads: {
        Row: {
          downloaded_at: string
          id: string
          ip: string | null
          manual_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          ip?: string | null
          manual_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          ip?: string | null
          manual_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          manual_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manual_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manual_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      manuals: {
        Row: {
          created_at: string
          description: string | null
          drive_file_id: string | null
          file_size_bytes: number | null
          format: string | null
          id: string
          language: string | null
          last_updated: string
          manual_type: Database["public"]["Enums"]["manual_type"]
          model_id: string
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          drive_file_id?: string | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          language?: string | null
          last_updated?: string
          manual_type?: Database["public"]["Enums"]["manual_type"]
          model_id: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          drive_file_id?: string | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          language?: string | null
          last_updated?: string
          manual_type?: Database["public"]["Enums"]["manual_type"]
          model_id?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manuals_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          admin_note: string | null
          brand: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          material_type: string | null
          model: string
          status: Database["public"]["Enums"]["material_request_status"]
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          admin_note?: string | null
          brand: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          material_type?: string | null
          model: string
          status?: Database["public"]["Enums"]["material_request_status"]
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          admin_note?: string | null
          brand?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          material_type?: string | null
          model?: string
          status?: Database["public"]["Enums"]["material_request_status"]
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          brand_id: string
          category_id: string | null
          created_at: string
          description: string | null
          displacement_cc: number | null
          drive_folder_id: string | null
          ecu_code: string | null
          engine: string | null
          fuel: string | null
          fuel_system: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          updated_at: string
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          brand_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          displacement_cc?: number | null
          drive_folder_id?: string | null
          ecu_code?: string | null
          engine?: string | null
          fuel?: string | null
          fuel_system?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          brand_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          displacement_cc?: number | null
          drive_folder_id?: string | null
          ecu_code?: string | null
          engine?: string | null
          fuel?: string | null
          fuel_system?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          target_role: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          target_role?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          target_role?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string | null
          gateway: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          subscription_id: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          gateway?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          subscription_id?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          gateway?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          subscription_id?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: string
          checkout_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle: string
          checkout_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          checkout_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_blocked: boolean
          last_access_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          last_access_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          last_access_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          expires_at: string | null
          gateway: string | null
          gateway_customer_id: string | null
          gateway_subscription_id: string | null
          id: string
          plan_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          error_message: string | null
          files_imported: number
          files_seen: number
          files_skipped: number
          files_updated: number
          finished_at: string | null
          folder_id: string
          folder_name: string | null
          id: string
          started_at: string
          started_by: string | null
          status: string
        }
        Insert: {
          error_message?: string | null
          files_imported?: number
          files_seen?: number
          files_skipped?: number
          files_updated?: number
          finished_at?: string | null
          folder_id: string
          folder_name?: string | null
          id?: string
          started_at?: string
          started_by?: string | null
          status?: string
        }
        Update: {
          error_message?: string | null
          files_imported?: number
          files_seen?: number
          files_skipped?: number
          files_updated?: number
          finished_at?: string | null
          folder_id?: string
          folder_name?: string | null
          id?: string
          started_at?: string
          started_by?: string | null
          status?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          created_at: string
          error_message: string | null
          files_imported: number
          files_seen: number
          files_skipped: number
          files_updated: number
          finished_at: string | null
          folder_id: string
          folder_name: string
          id: string
          next_page_token: string | null
          started_at: string | null
          status: string
          sync_job_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          files_imported?: number
          files_seen?: number
          files_skipped?: number
          files_updated?: number
          finished_at?: string | null
          folder_id: string
          folder_name: string
          id?: string
          next_page_token?: string | null
          started_at?: string | null
          status?: string
          sync_job_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          files_imported?: number
          files_seen?: number
          files_skipped?: number
          files_updated?: number
          finished_at?: string | null
          folder_id?: string
          folder_name?: string
          id?: string
          next_page_token?: string | null
          started_at?: string | null
          status?: string
          sync_job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_sync_job_id_fkey"
            columns: ["sync_job_id"]
            isOneToOne: false
            referencedRelation: "sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      f_unaccent: { Args: { value: string }; Returns: string }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_library: {
        Args: { _limit?: number; _q: string }
        Returns: {
          brand_name: string
          brand_slug: string
          displacement_cc: number
          engine: string
          file_size_bytes: number
          format: string
          manual_id: string
          manual_type: Database["public"]["Enums"]["manual_type"]
          model_id: string
          model_name: string
          model_slug: string
          score: number
          thumbnail_url: string
          title: string
          year_end: number
          year_start: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      manual_type:
        | "servico"
        | "proprietario"
        | "pecas"
        | "diagrama_eletrico"
        | "esquema_eletrico"
        | "injecao"
        | "torque"
        | "manutencao"
        | "hidraulico"
        | "boletim"
        | "atualizacao"
        | "outro"
      material_request_status:
        | "pending"
        | "reviewing"
        | "completed"
        | "rejected"
      payment_status: "pending" | "paid" | "refunded" | "chargeback" | "failed"
      subscription_status:
        | "trial"
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
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
      app_role: ["admin", "user"],
      manual_type: [
        "servico",
        "proprietario",
        "pecas",
        "diagrama_eletrico",
        "esquema_eletrico",
        "injecao",
        "torque",
        "manutencao",
        "hidraulico",
        "boletim",
        "atualizacao",
        "outro",
      ],
      material_request_status: [
        "pending",
        "reviewing",
        "completed",
        "rejected",
      ],
      payment_status: ["pending", "paid", "refunded", "chargeback", "failed"],
      subscription_status: [
        "trial",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
