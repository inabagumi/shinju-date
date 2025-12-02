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
      announcements: {
        Row: {
          created_at: string | null
          enabled: boolean
          end_at: string
          id: string
          level: string
          message: string
          start_at: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          end_at: string
          id?: string
          level?: string
          message: string
          start_at: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          end_at?: string
          id?: string
          level?: string
          message?: string
          start_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: Database['public']['Enums']['audit_action']
          created_at: string
          details: Json | null
          id: string
          target_record_id: string | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          action: Database['public']['Enums']['audit_action']
          created_at?: string
          details?: Json | null
          id?: string
          target_record_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database['public']['Enums']['audit_action']
          created_at?: string
          details?: Json | null
          id?: string
          target_record_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      talents: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      terms: {
        Row: {
          created_at: string
          id: string
          popularity: number
          readings: string[]
          synonyms: string[]
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          popularity?: number
          readings: string[]
          synonyms: string[]
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          popularity?: number
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
          id: string
          talent_id: string
          twitch_login_name: string | null
          twitch_user_id: string
        }
        Insert: {
          id?: string
          talent_id: string
          twitch_login_name?: string | null
          twitch_user_id: string
        }
        Update: {
          id?: string
          talent_id?: string
          twitch_login_name?: string | null
          twitch_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'twitch_users_talent_id_fkey'
            columns: ['talent_id']
            isOneToOne: false
            referencedRelation: 'talents'
            referencedColumns: ['id']
          },
        ]
      }
      twitch_videos: {
        Row: {
          id: string
          twitch_user_id: string
          twitch_video_id: string
          type: Database['public']['Enums']['twitch_video_type'] | null
          video_id: string
        }
        Insert: {
          id?: string
          twitch_user_id: string
          twitch_video_id: string
          type?: Database['public']['Enums']['twitch_video_type'] | null
          video_id: string
        }
        Update: {
          id?: string
          twitch_user_id?: string
          twitch_video_id?: string
          type?: Database['public']['Enums']['twitch_video_type'] | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'twitch_videos_twitch_user_id_fkey'
            columns: ['twitch_user_id']
            isOneToOne: false
            referencedRelation: 'twitch_users'
            referencedColumns: ['id']
          },
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
          created_at: string
          deleted_at: string | null
          duration: string
          id: string
          platform: Database['public']['Enums']['platform_type'] | null
          published_at: string
          status: Database['public']['Enums']['video_status']
          talent_id: string
          thumbnail_id: string | null
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duration: string
          id?: string
          platform?: Database['public']['Enums']['platform_type'] | null
          published_at: string
          status?: Database['public']['Enums']['video_status']
          talent_id: string
          thumbnail_id?: string | null
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duration?: string
          id?: string
          platform?: Database['public']['Enums']['platform_type'] | null
          published_at?: string
          status?: Database['public']['Enums']['video_status']
          talent_id?: string
          thumbnail_id?: string | null
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'videos_talent_id_fkey'
            columns: ['talent_id']
            isOneToOne: false
            referencedRelation: 'talents'
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
          id: string
          name: string | null
          talent_id: string
          youtube_channel_id: string
          youtube_handle: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          talent_id: string
          youtube_channel_id: string
          youtube_handle?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          talent_id?: string
          youtube_channel_id?: string
          youtube_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'youtube_channels_talent_id_fkey'
            columns: ['talent_id']
            isOneToOne: false
            referencedRelation: 'talents'
            referencedColumns: ['id']
          },
        ]
      }
      youtube_videos: {
        Row: {
          id: string
          video_id: string
          youtube_channel_id: string
          youtube_video_id: string
        }
        Insert: {
          id?: string
          video_id: string
          youtube_channel_id: string
          youtube_video_id: string
        }
        Update: {
          id?: string
          video_id?: string
          youtube_channel_id?: string
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
          {
            foreignKeyName: 'youtube_videos_youtube_channel_id_fkey'
            columns: ['youtube_channel_id']
            isOneToOne: false
            referencedRelation: 'youtube_channels'
            referencedColumns: ['id']
          },
        ]
      }
      feature_requests: {
        Row: {
          id: string
          message: string
          status: Database['public']['Enums']['feature_request_status']
          admin_memo: string | null
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          message: string
          status?: Database['public']['Enums']['feature_request_status']
          admin_memo?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message?: string
          status?: Database['public']['Enums']['feature_request_status']
          admin_memo?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_audit_logs: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_sort_by?: string
          p_sort_direction?: string
        }
        Returns: {
          action: Database['public']['Enums']['audit_action']
          created_at: string
          details: Json
          id: string
          target_record_id: string
          target_table: string
          user_email: string
          user_id: string
        }[]
      }
      insert_audit_log: {
        Args: {
          p_action: Database['public']['Enums']['audit_action']
          p_details?: Json
          p_target_record_id?: string
          p_target_table: string
        }
        Returns: undefined
      }
      search_videos_v2: {
        Args: {
          channel_ids: string[]
          perpage?: number
          query: string
          until: string
        }
        Returns: {
          created_at: string
          deleted_at: string | null
          duration: string
          id: string
          platform: Database['public']['Enums']['platform_type'] | null
          published_at: string
          status: Database['public']['Enums']['video_status']
          talent_id: string
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
      suggestions_v2: {
        Args: { p_query: string }
        Returns: {
          priority: number
          term: string
        }[]
      }
    }
    Enums: {
      audit_action:
        | 'CHANNEL_CREATE'
        | 'CHANNEL_DELETE'
        | 'CHANNEL_UPDATE'
        | 'RECOMMENDED_QUERY_CREATE'
        | 'RECOMMENDED_QUERY_DELETE'
        | 'TERM_CREATE'
        | 'TERM_DELETE'
        | 'TERM_UPDATE'
        | 'VIDEO_DELETE'
        | 'VIDEO_VISIBILITY_TOGGLE'
        | 'VIDEO_UPDATE'
        | 'VIDEO_SYNC'
        | 'CHANNEL_SYNC'
        | 'MAINTENANCE_MODE_ENABLE'
        | 'MAINTENANCE_MODE_DISABLE'
        | 'ACCOUNT_EMAIL_UPDATE'
        | 'ACCOUNT_PASSWORD_UPDATE'
        | 'ANNOUNCEMENT_CREATE'
        | 'ANNOUNCEMENT_DELETE'
        | 'ANNOUNCEMENT_UPDATE'
        | 'YOUTUBE_CHANNEL_CREATE'
        | 'YOUTUBE_CHANNEL_DELETE'
        | 'VIDEO_RESTORE'
      feature_request_status:
        | 'pending'
        | 'in_progress'
        | 'resolved'
        | 'rejected'
      platform_type: 'youtube' | 'twitch'
      twitch_video_type: 'vod' | 'clip' | 'highlight' | 'premiere' | 'upload'
      video_status: 'UPCOMING' | 'LIVE' | 'ENDED' | 'PUBLISHED'
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
      audit_action: [
        'CHANNEL_CREATE',
        'CHANNEL_DELETE',
        'CHANNEL_UPDATE',
        'RECOMMENDED_QUERY_CREATE',
        'RECOMMENDED_QUERY_DELETE',
        'TERM_CREATE',
        'TERM_DELETE',
        'TERM_UPDATE',
        'VIDEO_DELETE',
        'VIDEO_VISIBILITY_TOGGLE',
        'VIDEO_UPDATE',
        'VIDEO_SYNC',
        'CHANNEL_SYNC',
        'MAINTENANCE_MODE_ENABLE',
        'MAINTENANCE_MODE_DISABLE',
        'ACCOUNT_EMAIL_UPDATE',
        'ACCOUNT_PASSWORD_UPDATE',
        'ANNOUNCEMENT_CREATE',
        'ANNOUNCEMENT_DELETE',
        'ANNOUNCEMENT_UPDATE',
        'YOUTUBE_CHANNEL_CREATE',
        'YOUTUBE_CHANNEL_DELETE',
        'VIDEO_RESTORE',
      ],
      feature_request_status: [
        'pending',
        'in_progress',
        'resolved',
        'rejected',
      ],
      platform_type: ['youtube', 'twitch'],
      twitch_video_type: ['vod', 'clip', 'highlight', 'premiere', 'upload'],
      video_status: ['UPCOMING', 'LIVE', 'ENDED', 'PUBLISHED'],
    },
  },
} as const
