export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string
          deleted_at: string | null
          group_id: number
          id: number
          name: string
          slug: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          group_id: number
          id?: number
          name: string
          slug: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          group_id?: number
          id?: number
          name?: string
          slug?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channels_group_id_fkey'
            columns: ['group_id']
            referencedRelation: 'groups'
            referencedColumns: ['id']
          }
        ]
      }
      groups: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: number
          name: string
          short_name: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: number
          name: string
          short_name?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: number
          name?: string
          short_name?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      synonyms: {
        Row: {
          created_at: string
          id: number
          synonyms: string[]
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          synonyms: string[]
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
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
          id: number
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
          id?: number
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
          id?: number
          path?: string
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      videos: {
        Row: {
          channel_id: number
          created_at: string
          deleted_at: string | null
          duration: string
          id: number
          published_at: string
          slug: string
          thumbnail_id: number | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          channel_id: number
          created_at?: string
          deleted_at?: string | null
          duration: string
          id?: number
          published_at: string
          slug: string
          thumbnail_id?: number | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          channel_id?: number
          created_at?: string
          deleted_at?: string | null
          duration?: string
          id?: number
          published_at?: string
          slug?: string
          thumbnail_id?: number | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: 'videos_channel_id_fkey'
            columns: ['channel_id']
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'videos_thumbnail_id_fkey'
            columns: ['thumbnail_id']
            referencedRelation: 'thumbnails'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_videos: {
        Args: {
          query: string
        }
        Returns: {
          channel_id: number
          created_at: string
          deleted_at: string | null
          duration: string
          id: number
          published_at: string
          slug: string
          thumbnail_id: number | null
          title: string
          updated_at: string
          url: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
