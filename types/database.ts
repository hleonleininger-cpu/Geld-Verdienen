export type LeadStatus = "new" | "in_progress" | "quote_sent" | "won" | "lost";

export type IndustryKey =
  | "autopflege"
  | "reinigung"
  | "gartenservice"
  | "fotografie"
  | "handwerk";

// Diese Row-Typen sind bewusst `type` (nicht `interface`): Supabase-JS
// prüft strukturell, ob `Row` etc. `Record<string, unknown>` erfüllen
// (Voraussetzung für `GenericSchema`). Ein `interface` erfüllt diese
// Prüfung wegen TypeScripts "closed vs. open type"-Regeln NICHT (siehe
// https://github.com/microsoft/TypeScript/issues/15300) und lässt jede
// Query stillschweigend auf `never` typisieren – ein `type`-Alias schon.
export type UserRow = {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

export type BusinessRow = {
  id: string;
  owner_id: string;
  business_name: string;
  slug: string;
  industry: IndustryKey | string;
  description: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadRow = {
  id: string;
  business_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  service: string;
  preferred_date: string | null;
  location: string | null;
  budget: string | null;
  description: string | null;
  status: LeadStatus;
  attachment_url: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteRow = {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  price: number;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Partial<UserRow> & { id: string; email: string };
        Update: Partial<UserRow>;
        Relationships: [];
      };
      businesses: {
        Row: BusinessRow;
        Insert: Partial<BusinessRow> & {
          owner_id: string;
          business_name: string;
          slug: string;
          industry: string;
        };
        Update: Partial<BusinessRow>;
        Relationships: [];
      };
      leads: {
        Row: LeadRow;
        Insert: Partial<LeadRow> & {
          business_id: string;
          customer_name: string;
          customer_email: string;
          service: string;
        };
        Update: Partial<LeadRow>;
        Relationships: [];
      };
      quotes: {
        Row: QuoteRow;
        Insert: Partial<QuoteRow> & { lead_id: string; title: string };
        Update: Partial<QuoteRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_and_record_lead_attempt: {
        Args: {
          p_business_id: string;
          p_ip_hash: string;
          p_max_attempts?: number;
          p_window_minutes?: number;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
