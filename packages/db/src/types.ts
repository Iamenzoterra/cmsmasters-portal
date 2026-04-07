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

// ── Block (stored in blocks table) ──

export interface BlockHooks {
  price?: { selector: string }
  links?: Array<{ selector: string; field: string; label?: string }>
}

export interface BlockMetadata {
  alt?: string
  figma_node?: string
  [key: string]: unknown
}

// ── Template position ──

export interface TemplatePosition {
  position: number
  block_id: string | null
}

// ── Theme block fill (per-theme additions to template) ──

export interface ThemeBlockFill {
  position: number
  block_id: string
}

// ── Slot configuration (stored in pages.slot_config jsonb) ──

export interface SlotConfig {
  [slot: string]: { gap?: string }
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

export type PriceType = 'normal' | 'discount'

// ── Page types ──

export type PageType = 'layout' | 'composed'

import type { GlobalSlot } from './slot-registry'
export type { GlobalSlot }

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
          template_id: string | null
          block_fills: ThemeBlockFill[]
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
          template_id?: string | null
          block_fills?: ThemeBlockFill[]
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
          template_id?: string | null
          block_fills?: ThemeBlockFill[]
          seo?: ThemeSEO | null
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          id: string
          slug: string
          name: string
          html: string
          css: string
          js: string
          block_type: string
          block_category_id: string | null
          is_default: boolean
          sort_order: number
          hooks: BlockHooks
          metadata: BlockMetadata
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          html: string
          css?: string
          js?: string
          block_type?: string
          block_category_id?: string | null
          is_default?: boolean
          sort_order?: number
          hooks?: BlockHooks
          metadata?: BlockMetadata
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          html?: string
          css?: string
          js?: string
          block_type?: string
          block_category_id?: string | null
          is_default?: boolean
          sort_order?: number
          hooks?: BlockHooks
          metadata?: BlockMetadata
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      block_categories: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          positions: TemplatePosition[]
          max_positions: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string
          positions?: TemplatePosition[]
          max_positions?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          positions?: TemplatePosition[]
          max_positions?: number
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
      pages: {
        Row: {
          id: string
          slug: string
          title: string
          type: PageType
          scope: string
          html: string
          css: string
          layout_slots: Record<string, string | string[]>
          slot_config: SlotConfig
          seo: ThemeSEO | null
          status: ThemeStatus
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          type: PageType
          scope?: string
          html?: string
          css?: string
          layout_slots?: Record<string, string | string[]>
          slot_config?: SlotConfig
          seo?: ThemeSEO | null
          status?: ThemeStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          type?: PageType
          scope?: string
          html?: string
          css?: string
          layout_slots?: Record<string, string | string[]>
          slot_config?: SlotConfig
          seo?: ThemeSEO | null
          status?: ThemeStatus
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      page_blocks: {
        Row: {
          id: string
          page_id: string
          block_id: string
          position: number
          config: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          page_id: string
          block_id: string
          position: number
          config?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          page_id?: string
          block_id?: string
          position?: number
          config?: Record<string, unknown>
        }
        Relationships: []
      }
      global_elements: {
        Row: {
          id: string
          slot: GlobalSlot
          block_id: string
          scope: string
          priority: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slot: GlobalSlot
          block_id: string
          scope: string
          priority?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slot?: GlobalSlot
          block_id?: string
          scope?: string
          priority?: number
          created_by?: string | null
          updated_at?: string
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
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      theme_categories: {
        Row: {
          theme_id: string
          category_id: string
          is_primary: boolean
        }
        Insert: {
          theme_id: string
          category_id: string
          is_primary?: boolean
        }
        Update: {
          theme_id?: string
          category_id?: string
          is_primary?: boolean
        }
        Relationships: []
      }
      theme_tags: {
        Row: {
          theme_id: string
          tag_id: string
        }
        Insert: {
          theme_id: string
          tag_id: string
        }
        Update: {
          theme_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      prices: {
        Row: {
          id: string
          name: string
          slug: string
          type: PriceType
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          type?: PriceType
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          type?: PriceType
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      theme_prices: {
        Row: {
          theme_id: string
          price_id: string
        }
        Insert: {
          theme_id: string
          price_id: string
        }
        Update: {
          theme_id?: string
          price_id?: string
        }
        Relationships: []
      }
      use_cases: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      theme_use_cases: {
        Row: {
          theme_id: string
          use_case_id: string
        }
        Insert: {
          theme_id: string
          use_case_id: string
        }
        Update: {
          theme_id?: string
          use_case_id?: string
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

export type Block = Database['public']['Tables']['blocks']['Row']
export type BlockInsert = Database['public']['Tables']['blocks']['Insert']
export type BlockUpdate = Database['public']['Tables']['blocks']['Update']

export type Template = Database['public']['Tables']['templates']['Row']
export type TemplateInsert = Database['public']['Tables']['templates']['Insert']
export type TemplateUpdate = Database['public']['Tables']['templates']['Update']

export type Page = Database['public']['Tables']['pages']['Row']
export type PageInsert = Database['public']['Tables']['pages']['Insert']
export type PageUpdate = Database['public']['Tables']['pages']['Update']

export type PageBlock = Database['public']['Tables']['page_blocks']['Row']
export type PageBlockInsert = Database['public']['Tables']['page_blocks']['Insert']

export type GlobalElement = Database['public']['Tables']['global_elements']['Row']
export type GlobalElementInsert = Database['public']['Tables']['global_elements']['Insert']
export type GlobalElementUpdate = Database['public']['Tables']['global_elements']['Update']

export type AuditEntry = Database['public']['Tables']['audit_log']['Row']
export type AuditEntryInsert = Database['public']['Tables']['audit_log']['Insert']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type Tag = Database['public']['Tables']['tags']['Row']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type TagUpdate = Database['public']['Tables']['tags']['Update']

export type ThemeCategory = Database['public']['Tables']['theme_categories']['Row']
export type ThemeCategoryInsert = Database['public']['Tables']['theme_categories']['Insert']

export type ThemeTag = Database['public']['Tables']['theme_tags']['Row']
export type ThemeTagInsert = Database['public']['Tables']['theme_tags']['Insert']

export type Price = Database['public']['Tables']['prices']['Row']
export type PriceInsert = Database['public']['Tables']['prices']['Insert']
export type PriceUpdate = Database['public']['Tables']['prices']['Update']

export type ThemePrice = Database['public']['Tables']['theme_prices']['Row']
export type ThemePriceInsert = Database['public']['Tables']['theme_prices']['Insert']

export type BlockCategory = Database['public']['Tables']['block_categories']['Row']
export type BlockCategoryInsert = Database['public']['Tables']['block_categories']['Insert']
export type BlockCategoryUpdate = Database['public']['Tables']['block_categories']['Update']

export type UseCase = Database['public']['Tables']['use_cases']['Row']
export type UseCaseInsert = Database['public']['Tables']['use_cases']['Insert']
export type UseCaseUpdate = Database['public']['Tables']['use_cases']['Update']

export type ThemeUseCase = Database['public']['Tables']['theme_use_cases']['Row']
export type ThemeUseCaseInsert = Database['public']['Tables']['theme_use_cases']['Insert']
