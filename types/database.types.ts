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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_invites: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          answer_count_spaces: boolean
          answer_min_length: number
          id: boolean
          public_browsing: boolean
        }
        Insert: {
          answer_count_spaces?: boolean
          answer_min_length?: number
          id?: boolean
          public_browsing?: boolean
        }
        Update: {
          answer_count_spaces?: boolean
          answer_min_length?: number
          id?: boolean
          public_browsing?: boolean
        }
        Relationships: []
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: number
          last_message_at: string | null
          mentee_id: string
          mentor_id: string
          semester_id: number
        }
        Insert: {
          created_at?: string
          id?: never
          last_message_at?: string | null
          mentee_id: string
          mentor_id: string
          semester_id: number
        }
        Update: {
          created_at?: string
          id?: never
          last_message_at?: string | null
          mentee_id?: string
          mentor_id?: string
          semester_id?: number
        }
        Relationships: []
      }
      colleges: {
        Row: {
          description: string | null
          id: number
          is_active: boolean
          name: string
          position: number
        }
        Insert: {
          description?: string | null
          id?: never
          is_active?: boolean
          name: string
          position?: number
        }
        Update: {
          description?: string | null
          id?: never
          is_active?: boolean
          name?: string
          position?: number
        }
        Relationships: []
      }
      departments: {
        Row: {
          college_id: number
          id: number
          is_active: boolean
          name: string
          position: number
        }
        Insert: {
          college_id: number
          id?: never
          is_active?: boolean
          name: string
          position?: number
        }
        Update: {
          college_id?: number
          id?: never
          is_active?: boolean
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "departments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      job_fields: {
        Row: {
          id: number
          name: string
          position: number
        }
        Insert: {
          id?: never
          name: string
          position?: number
        }
        Update: {
          id?: never
          name?: string
          position?: number
        }
        Relationships: []
      }
      mentee_profiles: {
        Row: {
          department_id: number
          id: string
        }
        Insert: {
          department_id: number
          id: string
        }
        Update: {
          department_id?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentee_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          hidden_at: string | null
          id: number
          room_id: number
          sender_id: string
          sender_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          body: string
          created_at?: string
          hidden_at?: string | null
          id?: never
          room_id: number
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          body?: string
          created_at?: string
          hidden_at?: string | null
          id?: never
          room_id?: number
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      mentor_profiles: {
        Row: {
          accepting_questions: boolean
          career: string | null
          college_id: number | null
          company: string
          headline: string | null
          id: string
          intro: string | null
          job_field_id: number
          photo_path: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["mentor_status"]
        }
        Insert: {
          accepting_questions?: boolean
          career?: string | null
          college_id?: number | null
          company: string
          headline?: string | null
          id: string
          intro?: string | null
          job_field_id: number
          photo_path?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["mentor_status"]
        }
        Update: {
          accepting_questions?: boolean
          career?: string | null
          college_id?: number | null
          company?: string
          headline?: string | null
          id?: string
          intro?: string | null
          job_field_id?: number
          photo_path?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["mentor_status"]
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profiles_job_field_id_fkey"
            columns: ["job_field_id"]
            isOneToOne: false
            referencedRelation: "job_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          login_group: string
          login_name: string
          must_change_pin: boolean
          name: string
          name_tag: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id: string
          login_group: string
          login_name: string
          must_change_pin?: boolean
          name: string
          name_tag?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          login_group?: string
          login_name?: string
          must_change_pin?: boolean
          name?: string
          name_tag?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      room_reads: {
        Row: {
          last_read_at: string
          room_id: number
          user_id: string
        }
        Insert: {
          last_read_at?: string
          room_id: number
          user_id: string
        }
        Update: {
          last_read_at?: string
          room_id?: number
          user_id?: string
        }
        Relationships: []
      }
      semesters: {
        Row: {
          closed_at: string | null
          created_at: string
          ends_on: string
          id: number
          is_current: boolean
          name: string
          starts_on: string
          survey_closes_at: string | null
          survey_opens_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          ends_on: string
          id?: never
          is_current?: boolean
          name: string
          starts_on: string
          survey_closes_at?: string | null
          survey_opens_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          ends_on?: string
          id?: never
          is_current?: boolean
          name?: string
          starts_on?: string
          survey_closes_at?: string | null
          survey_opens_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      mentor_directory: {
        Row: {
          accepting_questions: boolean | null
          career: string | null
          college_id: number | null
          college_name: string | null
          company: string | null
          headline: string | null
          id: string | null
          intro: string | null
          job_field_id: number | null
          job_field_name: string | null
          name: string | null
          name_tag: string | null
          photo_path: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["mentor_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      answer_length: { Args: { body: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_room_member: { Args: { room_id: number }; Returns: boolean }
      is_backend: { Args: never; Returns: boolean }
      login_email: {
        Args: { login_group: string; login_name: string }
        Returns: string
      }
      mark_room_read: { Args: { room_id: number }; Returns: undefined }
      mentor_activity: {
        Args: { mentor_id: string }
        Returns: {
          answer_count: number
          answered_room_count: number
          room_count: number
        }[]
      }
      my_unread_counts: {
        Args: never
        Returns: {
          room_id: number
          unread: number
        }[]
      }
      normalize_login_name: { Args: { raw: string }; Returns: string }
      open_chat_room: { Args: { mentor_id: string }; Returns: number }
      set_current_semester: { Args: { semester_id: number }; Returns: undefined }
    }
    Enums: {
      mentor_status: "pending" | "published" | "hidden"
      user_role: "admin" | "mentor" | "mentee"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      mentor_status: ["pending", "published", "hidden"],
      user_role: ["admin", "mentor", "mentee"],
    },
  },
} as const
