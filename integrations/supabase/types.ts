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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          bullet: string
          category: string | null
          confidence: number | null
          created_at: string
          evidence: Json
          id: string
          impact: string | null
          included: boolean
          model: string | null
          period_end: string | null
          period_start: string | null
          provider: string | null
          repository_id: string | null
          skills: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bullet: string
          category?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          impact?: string | null
          included?: boolean
          model?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string | null
          repository_id?: string | null
          skills?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bullet?: string
          category?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          impact?: string | null
          included?: boolean
          model?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string | null
          repository_id?: string | null
          skills?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          additions: number
          body: string | null
          created_at: string
          deletions: number
          external_id: string
          files_changed: number
          id: string
          kind: string
          occurred_at: string
          repository_id: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          additions?: number
          body?: string | null
          created_at?: string
          deletions?: number
          external_id: string
          files_changed?: number
          id?: string
          kind: string
          occurred_at: string
          repository_id: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          additions?: number
          body?: string | null
          created_at?: string
          deletions?: number
          external_id?: string
          files_changed?: number
          id?: string
          kind?: string
          occurred_at?: string
          repository_id?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_gaps: {
        Row: {
          achievement_id: string | null
          confidence: number | null
          created_at: string
          cv_excerpt: string | null
          evidence: Json
          id: string
          issue: string
          kind: string
          model: string | null
          provider: string | null
          section: string | null
          skills: string[]
          status: string
          suggestion: string
          updated_at: string
          upload_id: string
          user_id: string
        }
        Insert: {
          achievement_id?: string | null
          confidence?: number | null
          created_at?: string
          cv_excerpt?: string | null
          evidence?: Json
          id?: string
          issue: string
          kind?: string
          model?: string | null
          provider?: string | null
          section?: string | null
          skills?: string[]
          status?: string
          suggestion: string
          updated_at?: string
          upload_id: string
          user_id: string
        }
        Update: {
          achievement_id?: string | null
          confidence?: number | null
          created_at?: string
          cv_excerpt?: string | null
          evidence?: Json
          id?: string
          issue?: string
          kind?: string
          model?: string | null
          provider?: string | null
          section?: string | null
          skills?: string[]
          status?: string
          suggestion?: string
          updated_at?: string
          upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_gaps_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_gaps_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "cv_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_uploads: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          model: string | null
          parsed: Json
          provider: string | null
          source_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          model?: string | null
          parsed?: Json
          provider?: string | null
          source_text?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          model?: string | null
          parsed?: Json
          provider?: string | null
          source_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cvs: {
        Row: {
          content: Json
          created_at: string
          id: string
          model: string | null
          provider: string | null
          summary: string | null
          target_role: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          summary?: string | null
          target_role?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          summary?: string | null
          target_role?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      github_connections: {
        Row: {
          avatar_url: string | null
          created_at: string
          github_login: string
          github_name: string | null
          scopes: string | null
          token_ciphertext: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          github_login: string
          github_name?: string | null
          scopes?: string | null
          token_ciphertext: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          github_login?: string
          github_name?: string | null
          scopes?: string | null
          token_ciphertext?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          headline: string | null
          id: string
          linkedin: string | null
          location: string | null
          target_role: string | null
          updated_at: string
          website: string | null
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id: string
          linkedin?: string | null
          location?: string | null
          target_role?: string | null
          updated_at?: string
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          linkedin?: string | null
          location?: string | null
          target_role?: string | null
          updated_at?: string
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      repositories: {
        Row: {
          created_at: string
          description: string | null
          full_name: string
          github_id: number
          id: string
          is_fork: boolean
          is_private: boolean
          last_synced_at: string | null
          name: string
          primary_language: string | null
          pushed_at: string | null
          selected: boolean
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          full_name: string
          github_id: number
          id?: string
          is_fork?: boolean
          is_private?: boolean
          last_synced_at?: string | null
          name: string
          primary_language?: string | null
          pushed_at?: string | null
          selected?: boolean
          stars?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          full_name?: string
          github_id?: number
          id?: string
          is_fork?: boolean
          is_private?: boolean
          last_synced_at?: string | null
          name?: string
          primary_language?: string | null
          pushed_at?: string | null
          selected?: boolean
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          commits_count: number
          created_at: string
          error: string | null
          id: string
          period_end: string | null
          period_start: string | null
          prs_count: number
          repos_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commits_count?: number
          created_at?: string
          error?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          prs_count?: number
          repos_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commits_count?: number
          created_at?: string
          error?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          prs_count?: number
          repos_count?: number
          status?: string
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
