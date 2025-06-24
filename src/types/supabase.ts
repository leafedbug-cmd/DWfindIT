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
      lists: {
        Row: {
          id: string
          created_at: string
          name: string
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      scan_items: {
        Row: {
          id: string
          created_at: string
          barcode: string
          list_id: string
          part_number: string
          bin_location: string
          quantity: number
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          barcode: string
          list_id: string
          part_number: string
          bin_location: string
          quantity?: number
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          barcode?: string
          list_id?: string
          part_number?: string
          bin_location?: string
          quantity?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_items_list_id_fkey"
            columns: ["list_id"]
            referencedRelation: "lists"
            referencedColumns: ["id"]
          }
        ]
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