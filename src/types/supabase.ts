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
      equipment: {
        Row: {
          stock_number: string
          barcode: string | null
          serial_number: string | null
          make: string | null
          model: string | null
          customer_number: string | null
          customer: string | null
          description: string | null
          store_location: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          stock_number: string
          barcode?: string | null
          serial_number?: string | null
          make?: string | null
          model?: string | null
          customer_number?: string | null
          customer?: string | null
          description?: string | null
          store_location?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          stock_number?: string
          barcode?: string | null
          serial_number?: string | null
          make?: string | null
          model?: string | null
          customer_number?: string | null
          customer?: string | null
          description?: string | null
          store_location?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
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
      parts: {
        Row: {
          id: string
          part_number: string
          bin_location: string
          store_location: string
          description: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          part_number: string
          bin_location: string
          store_location: string
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          part_number?: string
          bin_location?: string
          store_location?: string
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          store_location: string | null
          employee_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          store_location?: string | null
          employee_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_location?: string | null
          employee_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
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
          store_location: string | null
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
          store_location?: string | null
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
          store_location?: string | null
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
