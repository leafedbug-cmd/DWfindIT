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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          customer_number: string
          id: number
          store_location: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_number: string
          id?: number
          store_location: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_number?: string
          id?: number
          store_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_number_store_location_fkey"
            columns: ["customer_number", "store_location"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_number", "store_location"]
          },
        ]
      }
      customer_equipment: {
        Row: {
          created_at: string | null
          customer_number: string
          description: string | null
          equipment_id: string | null
          id: number
          store_location: string
        }
        Insert: {
          created_at?: string | null
          customer_number: string
          description?: string | null
          equipment_id?: string | null
          id?: number
          store_location: string
        }
        Update: {
          created_at?: string | null
          customer_number?: string
          description?: string | null
          equipment_id?: string | null
          id?: number
          store_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_equipment_customer_number_store_location_fkey"
            columns: ["customer_number", "store_location"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_number", "store_location"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string | null
          credit_limit: number | null
          customer_number: string
          name: string | null
          phone_number: string | null
          status: string | null
          store_location: string
          total_ar: number | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_number: string
          name?: string | null
          phone_number?: string | null
          status?: string | null
          store_location: string
          total_ar?: number | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_number?: string
          name?: string | null
          phone_number?: string | null
          status?: string | null
          store_location?: string
          total_ar?: number | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          base_code: string | null
          basic_warranty_date: string | null
          branch: string | null
          category: string | null
          class: string | null
          control_number: string | null
          created_at: string
          customer_invoice_date: string | null
          customer_name: string | null
          customer_number: string | null
          date_added: string | null
          date_delivered: string | null
          date_modified: string | null
          date_not_available_for_sale: string | null
          date_ordered: string | null
          date_traded: string | null
          description: string | null
          engine_serial_number: string | null
          extended_warranty_date: string | null
          factory: string | null
          finance_start_date: string | null
          floor_plan_due_code: string | null
          floor_plan_due_date: string | null
          group_code: string | null
          hour_reading_2_date: string | null
          hour_reading_date: string | null
          hours_estimate_code: string | null
          id: string | null
          in_or_out_indicator: string | null
          internal_unit_y_or_n: string | null
          invoice_number: string | null
          last_preventative_maint_wo_date: string | null
          machine_location: string | null
          make: string | null
          model: string | null
          model_year: number | null
          parent_division: string | null
          parent_stock_number: string | null
          rental_cost_of_sales_percent: number | null
          rental_fleet_date: string | null
          serial_number: string | null
          status: string | null
          stock_number: string
          store_location: string | null
          sub_class: string | null
          supplier_invoice_date: string | null
          supplier_invoice_number: string | null
          updated_at: string
        }
        Insert: {
          base_code?: string | null
          basic_warranty_date?: string | null
          branch?: string | null
          category?: string | null
          class?: string | null
          control_number?: string | null
          created_at?: string
          customer_invoice_date?: string | null
          customer_name?: string | null
          customer_number?: string | null
          date_added?: string | null
          date_delivered?: string | null
          date_modified?: string | null
          date_not_available_for_sale?: string | null
          date_ordered?: string | null
          date_traded?: string | null
          description?: string | null
          engine_serial_number?: string | null
          extended_warranty_date?: string | null
          factory?: string | null
          finance_start_date?: string | null
          floor_plan_due_code?: string | null
          floor_plan_due_date?: string | null
          group_code?: string | null
          hour_reading_2_date?: string | null
          hour_reading_date?: string | null
          hours_estimate_code?: string | null
          id?: string | null
          in_or_out_indicator?: string | null
          internal_unit_y_or_n?: string | null
          invoice_number?: string | null
          last_preventative_maint_wo_date?: string | null
          machine_location?: string | null
          make?: string | null
          model?: string | null
          model_year?: number | null
          parent_division?: string | null
          parent_stock_number?: string | null
          rental_cost_of_sales_percent?: number | null
          rental_fleet_date?: string | null
          serial_number?: string | null
          status?: string | null
          stock_number: string
          store_location?: string | null
          sub_class?: string | null
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          updated_at?: string
        }
        Update: {
          base_code?: string | null
          basic_warranty_date?: string | null
          branch?: string | null
          category?: string | null
          class?: string | null
          control_number?: string | null
          created_at?: string
          customer_invoice_date?: string | null
          customer_name?: string | null
          customer_number?: string | null
          date_added?: string | null
          date_delivered?: string | null
          date_modified?: string | null
          date_not_available_for_sale?: string | null
          date_ordered?: string | null
          date_traded?: string | null
          description?: string | null
          engine_serial_number?: string | null
          extended_warranty_date?: string | null
          factory?: string | null
          finance_start_date?: string | null
          floor_plan_due_code?: string | null
          floor_plan_due_date?: string | null
          group_code?: string | null
          hour_reading_2_date?: string | null
          hour_reading_date?: string | null
          hours_estimate_code?: string | null
          id?: string | null
          in_or_out_indicator?: string | null
          internal_unit_y_or_n?: string | null
          invoice_number?: string | null
          last_preventative_maint_wo_date?: string | null
          machine_location?: string | null
          make?: string | null
          model?: string | null
          model_year?: number | null
          parent_division?: string | null
          parent_stock_number?: string | null
          rental_cost_of_sales_percent?: number | null
          rental_fleet_date?: string | null
          serial_number?: string | null
          status?: string | null
          stock_number?: string
          store_location?: string | null
          sub_class?: string | null
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          customer_number: string
          id: number
          invoice_date: string | null
          invoice_number: string | null
          invoice_total: number | null
          store_location: string
        }
        Insert: {
          created_at?: string | null
          customer_number: string
          id?: number
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_total?: number | null
          store_location: string
        }
        Update: {
          created_at?: string | null
          customer_number?: string
          id?: number
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_total?: number | null
          store_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_number_store_location_fkey"
            columns: ["customer_number", "store_location"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_number", "store_location"]
          },
        ]
      }
      list_items: {
        Row: {
          bin_location: string | null
          created_at: string
          id: number
          list_id: string
          notes: string | null
          part_number: string | null
          quantity: number
        }
        Insert: {
          bin_location?: string | null
          created_at?: string
          id?: number
          list_id: string
          notes?: string | null
          part_number?: string | null
          quantity?: number
        }
        Update: {
          bin_location?: string | null
          created_at?: string
          id?: number
          list_id?: string
          notes?: string | null
          part_number?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      parts: {
        Row: {
          bin_location: string | null
          created_at: string | null
          id: string
          Part_Description: string | null
          part_number: string
          store_location: string
          updated_at: string | null
        }
        Insert: {
          bin_location?: string | null
          created_at?: string | null
          id?: string
          Part_Description?: string | null
          part_number: string
          store_location?: string
          updated_at?: string | null
        }
        Update: {
          bin_location?: string | null
          created_at?: string | null
          id?: string
          Part_Description?: string | null
          part_number?: string
          store_location?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      parts_on_order: {
        Row: {
          created_at: string | null
          customer_number: string
          id: number
          part_number: string | null
          status: string | null
          store_location: string
        }
        Insert: {
          created_at?: string | null
          customer_number: string
          id?: number
          part_number?: string | null
          status?: string | null
          store_location: string
        }
        Update: {
          created_at?: string | null
          customer_number?: string
          id?: number
          part_number?: string | null
          status?: string | null
          store_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_on_order_customer_number_store_location_fkey"
            columns: ["customer_number", "store_location"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_number", "store_location"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          employee_name: string | null
          id: string
          role: string
          store_location: string | null
        }
        Insert: {
          created_at?: string
          employee_name?: string | null
          id?: string
          role?: string
          store_location?: string | null
        }
        Update: {
          created_at?: string
          employee_name?: string | null
          id?: string
          role?: string
          store_location?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string | null
          customer_number: string
          id: number
          quote_date: string | null
          quote_number: string | null
          quote_total: number | null
          status: string | null
          store_location: string
        }
        Insert: {
          created_at?: string | null
          customer_number: string
          id?: number
          quote_date?: string | null
          quote_number?: string | null
          quote_total?: number | null
          status?: string | null
          store_location: string
        }
        Update: {
          created_at?: string | null
          customer_number?: string
          id?: number
          quote_date?: string | null
          quote_number?: string | null
          quote_total?: number | null
          status?: string | null
          store_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_number_store_location_fkey"
            columns: ["customer_number", "store_location"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_number", "store_location"]
          },
        ]
      }
      work_orders: {
        Row: {
          created_at: string | null
          customer_number: string
          description: string | null
          id: number
          open_date: string | null
          status: string | null
          store_location: string
          work_order_number: string | null
        }
        Insert: {
          created_at?: string | null
          customer_number: string
          description?: string | null
          id?: number
          open_date?: string | null
          status?: string | null
          store_location: string
          work_order_number?: string | null
        }
        Update: {
          created_at?: string | null
          customer_number?: string
          description?: string | null
          id?: number
          open_date?: string | null
          status?: string | null
          store_location?: string
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_customer_number_store_location_fkey"
            columns: ["customer_number", "store_location"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_number", "store_location"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_auth_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
