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
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      terms: {
        Row: {
          created_at: string
          id: string
          readings: string[]
          synonyms: string[]
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          readings: string[]
          synonyms: string[]
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          readings?: string[]
          synonyms?: string[]
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      thumbnails: {
        Row: {
          blur_data_url: string
          created_at: string
          deleted_at: string | null
          etag: string | null
          height: number
          id: string
          path: string
          updated_at: string
          width: number
        }
        Insert: {
          blur_data_url: string
          created_at?: string
          deleted_at?: string | null
          etag?: string | null
          height: number
          id?: string
          path: string
          updated_at?: string
          width: number
        }
        Update: {
          blur_data_url?: string
          created_at?: string
          deleted_at?: string | null
          etag?: string | null
          height?: number
          id?: string
          path?: string
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      twitch_users: {
        Row: {
          channel_id: string
          twitch_login_name: string | null
          twitch_user_id: string
        }
        Insert: {
          channel_id: string
          twitch_login_name?: string | null
          twitch_user_id: string
        }
        Update: {
          channel_id?: string
          twitch_login_name?: string | null
          twitch_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'twitch_users_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: true
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
        ]
      }
      twitch_videos: {
        Row: {
          twitch_video_id: string
          type: Database['public']['Enums']['twitch_video_type'] | null
          video_id: string
        }
        Insert: {
          twitch_video_id: string
          type?: Database['public']['Enums']['twitch_video_type'] | null
          video_id: string
        }
        Update: {
          twitch_video_id?: string
          type?: Database['public']['Enums']['twitch_video_type'] | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'twitch_videos_video_id_fkey'
            columns: ['video_id']
            isOneToOne: true
            referencedRelation: 'videos'
            referencedColumns: ['id']
          },
        ]
      }
      videos: {
        Row: {
          channel_id: string
          created_at: string
          deleted_at: string | null
          duration: string
          id: string
          platform: Database['public']['Enums']['platform_type'] | null
          published_at: string
          slug: string
          thumbnail_id: string | null
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          channel_id: string
          created_at?: string
          deleted_at?: string | null
          duration: string
          id?: string
          platform?: Database['public']['Enums']['platform_type'] | null
          published_at: string
          slug: string
          thumbnail_id?: string | null
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          channel_id?: string
          created_at?: string
          deleted_at?: string | null
          duration?: string
          id?: string
          platform?: Database['public']['Enums']['platform_type'] | null
          published_at?: string
          slug?: string
          thumbnail_id?: string | null
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'videos_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'videos_thumbnail_id_fkey'
            columns: ['thumbnail_id']
            isOneToOne: false
            referencedRelation: 'thumbnails'
            referencedColumns: ['id']
          },
        ]
      }
      youtube_channels: {
        Row: {
          channel_id: string
          youtube_channel_id: string
          youtube_handle: string | null
        }
        Insert: {
          channel_id: string
          youtube_channel_id: string
          youtube_handle?: string | null
        }
        Update: {
          channel_id?: string
          youtube_channel_id?: string
          youtube_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'youtube_channels_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: true
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
        ]
      }
      youtube_videos: {
        Row: {
          video_id: string
          youtube_video_id: string
        }
        Insert: {
          video_id: string
          youtube_video_id: string
        }
        Update: {
          video_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'youtube_videos_video_id_fkey'
            columns: ['video_id']
            isOneToOne: true
            referencedRelation: 'videos'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      index_advisor: {
        Args: { query: string }
        Returns: {
          errors: string[]
          index_statements: string[]
          startup_cost_after: Json
          startup_cost_before: Json
          total_cost_after: Json
          total_cost_before: Json
        }[]
      }
      search_videos_v2: {
        Args: {
          channel_ids: string[]
          perpage: number
          query: string
          until: string
        }
        Returns: {
          channel_id: string
          created_at: string
          deleted_at: string | null
          duration: string
          id: string
          platform: Database['public']['Enums']['platform_type'] | null
          published_at: string
          slug: string
          thumbnail_id: string | null
          title: string
          updated_at: string
          visible: boolean
        }[]
        SetofOptions: {
          from: '*'
          to: 'videos'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      suggestions: {
        Args: { query: string }
        Returns: {
          term: string
        }[]
      }
    }
    Enums: {
      platform_type: 'youtube' | 'twitch'
      twitch_video_type: 'vod' | 'clip' | 'highlight' | 'premiere' | 'upload'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      platform_type: ['youtube', 'twitch'],
      twitch_video_type: ['vod', 'clip', 'highlight', 'premiere', 'upload'],
    },
  },
} as const
