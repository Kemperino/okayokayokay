export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_votes: {
        Row: {
          agent_id: string
          dispute_id: string
          id: string
          vote_for: Database["public"]["Enums"]["user_role"]
          vote_rationale: string | null
          voted_at: string
        }
        Insert: {
          agent_id: string
          dispute_id: string
          id?: string
          vote_for: Database["public"]["Enums"]["user_role"]
          vote_rationale?: string | null
          voted_at?: string
        }
        Update: {
          agent_id?: string
          dispute_id?: string
          id?: string
          vote_for?: Database["public"]["Enums"]["user_role"]
          vote_rationale?: string | null
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_votes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dispute_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_votes_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      alchemy_events: {
        Row: {
          amount: string | null
          authorizer: string | null
          block_number: number | null
          created_at: string | null
          from_address: string | null
          id: number
          network: string | null
          nonce: string | null
          raw_payload: Json
          to_address: string | null
          tx_hash: string | null
          type: string | null
        }
        Insert: {
          amount?: string | null
          authorizer?: string | null
          block_number?: number | null
          created_at?: string | null
          from_address?: string | null
          id?: never
          network?: string | null
          nonce?: string | null
          raw_payload: Json
          to_address?: string | null
          tx_hash?: string | null
          type?: string | null
        }
        Update: {
          amount?: string | null
          authorizer?: string | null
          block_number?: number | null
          created_at?: string | null
          from_address?: string | null
          id?: never
          network?: string | null
          nonce?: string | null
          raw_payload?: Json
          to_address?: string | null
          tx_hash?: string | null
          type?: string | null
        }
        Relationships: []
      }
      dispute_agents: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          reputation_score: number
          stake_amount: number
          successful_votes: number
          total_votes_cast: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          reputation_score?: number
          stake_amount: number
          successful_votes?: number
          total_votes_cast?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          reputation_score?: number
          stake_amount?: number
          successful_votes?: number
          total_votes_cast?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          agent_vote_results: Json | null
          claim_description: string
          escalated_at: string | null
          evidence: Json | null
          filed_at: string
          filed_by: string
          id: string
          resolution_details: string | null
          resolved_at: string | null
          resolved_in_favor_of: Database["public"]["Enums"]["user_role"] | null
          transaction_id: string
        }
        Insert: {
          agent_vote_results?: Json | null
          claim_description: string
          escalated_at?: string | null
          evidence?: Json | null
          filed_at?: string
          filed_by: string
          id?: string
          resolution_details?: string | null
          resolved_at?: string | null
          resolved_in_favor_of?: Database["public"]["Enums"]["user_role"] | null
          transaction_id: string
        }
        Update: {
          agent_vote_results?: Json | null
          claim_description?: string
          escalated_at?: string | null
          evidence?: Json | null
          filed_at?: string
          filed_by?: string
          id?: string
          resolution_details?: string | null
          resolved_at?: string | null
          resolved_in_favor_of?: Database["public"]["Enums"]["user_role"] | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          input_data: Json
          output_data: Json | null
          request_id: string
          resource_url: string | null
          seller_address: string
          seller_description: Json | null
          status: string
          tx_hash: string | null
          user_address: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          input_data: Json
          output_data?: Json | null
          request_id: string
          resource_url?: string | null
          seller_address: string
          seller_description?: Json | null
          status?: string
          tx_hash?: string | null
          user_address: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          input_data?: Json
          output_data?: Json | null
          request_id?: string
          resource_url?: string | null
          seller_address?: string
          seller_description?: Json | null
          status?: string
          tx_hash?: string | null
          user_address?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          base_url: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          payment_address: string | null
          price_per_request: number | null
          updated_at: string
          well_known_data: Json | null
          well_known_url: string
        }
        Insert: {
          base_url: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_address?: string | null
          price_per_request?: number | null
          updated_at?: string
          well_known_data?: Json | null
          well_known_url: string
        }
        Update: {
          base_url?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_address?: string | null
          price_per_request?: number | null
          updated_at?: string
          well_known_data?: Json | null
          well_known_url?: string
        }
        Relationships: []
      }
      session_wallets: {
        Row: {
          cdp_wallet_name: string
          created_at: string
          id: string
          network: string
          session_id: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          cdp_wallet_name: string
          created_at?: string
          id?: string
          network?: string
          session_id: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          cdp_wallet_name?: string
          created_at?: string
          id?: string
          network?: string
          session_id?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      transaction_flags: {
        Row: {
          created_at: string
          flag_note: string | null
          flag_type: string
          flagged_by: string
          id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          flag_note?: string | null
          flag_type: string
          flagged_by: string
          id?: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          flag_note?: string | null
          flag_type?: string
          flagged_by?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_flags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          dispute_window_expires_at: string | null
          id: string
          payment_settled_at: string | null
          request_id: string
          resource_url: string | null
          seller_id: string
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          dispute_window_expires_at?: string | null
          id?: string
          payment_settled_at?: string | null
          request_id: string
          resource_url?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          dispute_window_expires_at?: string | null
          id?: string
          payment_settled_at?: string | null
          request_id?: string
          resource_url?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          total_disputes_filed: number
          total_disputes_received: number
          total_transactions: number
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          total_disputes_filed?: number
          total_disputes_received?: number
          total_transactions?: number
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          total_disputes_filed?: number
          total_disputes_received?: number
          total_transactions?: number
          updated_at?: string
          wallet_address?: string | null
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
      dispute_status:
        | "service_initiated"
        | "escrowed"
        | "escrow_released"
        | "dispute_opened"
        | "seller_accepted"
        | "dispute_escalated"
        | "dispute_resolved"
        | "master_review_escalation"
      user_role: "buyer" | "seller" | "dispute_agent" | "keeper"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      dispute_status: [
        "service_initiated",
        "escrowed",
        "escrow_released",
        "dispute_opened",
        "seller_accepted",
        "dispute_escalated",
        "dispute_resolved",
        "master_review_escalation",
      ],
      user_role: ["buyer", "seller", "dispute_agent", "keeper"],
    },
  },
} as const

