export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
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
      }
      thumbnails: {
        Row: {
          blur_data_url: string
          created_at: string
          deleted_at: string | null
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
          height?: number
          id?: number
          path?: string
          updated_at?: string
          width?: number
        }
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
