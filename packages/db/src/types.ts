// ── Theme meta (stored in themes.meta jsonb) ──

export interface ThemeMeta {
  name: string
  tagline?: string
  description?: string
  category?: string
  price?: number
  demo_url?: string
  themeforest_url?: string
  themeforest_id?: string
  thumbnail_url?: string
  preview_images?: string[]
  rating?: number
  sales?: number
  compatible_plugins?: string[]
  trust_badges?: string[]
  resources?: {
    public: string[]
    licensed: string[]
    premium: string[]
  }
}

// ── Block types (stored in themes.sections jsonb array) ──

import type { BlockId } from '@cmsmasters/blocks'
export type { BlockId }

export interface ThemeBlock {
  block: BlockId
  data: Record<string, unknown>
}

// ── SEO (stored in themes.seo jsonb) ──

export interface ThemeSEO {
  title?: string
  description?: string
}

// Constrained column unions (match CHECK constraints in migration)

export type UserRole =
  | 'registered'
  | 'licensed'
  | 'admin'
  | 'content_manager'
  | 'support_operator'

export type ThemeStatus = 'draft' | 'published' | 'archived'

export type LicenseType = 'regular' | 'extended'

// Database type (column-for-column from 002_section_architecture migration)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          updated_at?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          id: string
          slug: string
          status: ThemeStatus
          meta: ThemeMeta
          sections: ThemeBlock[]
          seo: ThemeSEO | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          status?: ThemeStatus
          meta: ThemeMeta
          sections?: ThemeBlock[]
          seo?: ThemeSEO | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          status?: ThemeStatus
          meta?: ThemeMeta
          sections?: ThemeBlock[]
          seo?: ThemeSEO | null
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          id: string
          user_id: string
          theme_id: string
          purchase_code: string | null
          license_type: LicenseType | null
          verified_at: string | null
          support_until: string | null
          envato_item_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme_id: string
          purchase_code?: string | null
          license_type?: LicenseType | null
          verified_at?: string | null
          support_until?: string | null
          envato_item_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme_id?: string
          purchase_code?: string | null
          license_type?: LicenseType | null
          verified_at?: string | null
          support_until?: string | null
          envato_item_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          actor_role: string | null
          action: string
          target_type: string | null
          target_id: string | null
          details: Record<string, unknown> | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_role?: string | null
          action: string
          target_type?: string | null
          target_id?: string | null
          details?: Record<string, unknown> | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_role?: string | null
          action?: string
          target_type?: string | null
          target_id?: string | null
          details?: Record<string, unknown> | null
          ip_address?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience aliases

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Theme = Database['public']['Tables']['themes']['Row']
export type ThemeInsert = Database['public']['Tables']['themes']['Insert']
export type ThemeUpdate = Database['public']['Tables']['themes']['Update']

export type License = Database['public']['Tables']['licenses']['Row']
export type LicenseInsert = Database['public']['Tables']['licenses']['Insert']

export type AuditEntry = Database['public']['Tables']['audit_log']['Row']
export type AuditEntryInsert = Database['public']['Tables']['audit_log']['Insert']
