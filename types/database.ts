export type LeadStatus = "new" | "in_progress" | "quote_sent" | "won" | "lost";

export type IndustryKey =
  | "autopflege"
  | "reinigung"
  | "gartenservice"
  | "fotografie"
  | "handwerk";

export interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

export interface BusinessRow {
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
}

export interface LeadRow {
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
}

export interface QuoteRow {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  price: number;
  valid_until: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Partial<UserRow> & { id: string; email: string };
        Update: Partial<UserRow>;
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
      };
      quotes: {
        Row: QuoteRow;
        Insert: Partial<QuoteRow> & { lead_id: string; title: string };
        Update: Partial<QuoteRow>;
      };
    };
  };
}
