export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "quote_sent"
  | "negotiating"
  | "won"
  | "lost";

export type LeadPriority = "low" | "medium" | "high";

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";

export type BusinessPlan = "free" | "starter" | "pro" | "business";

export type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

export type ActivityActor = "system" | "owner" | "customer";

export type IndustryKey =
  | "autopflege"
  | "reinigung"
  | "gartenservice"
  | "fotografie"
  | "handwerk";

export type OpeningHoursEntry = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: string; // "09:00"
  close: string; // "18:00"
  closed: boolean;
};

export type QuoteLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

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
  tagline: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  accent_color: string | null;
  opening_hours: OpeningHoursEntry[];
  gallery_urls: string[];
  published: boolean;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  plan: BusinessPlan;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  referral_code: string;
  referred_by_code: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  duration_minutes: number | null;
  active: boolean;
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
  priority: LeadPriority;
  assignee_id: string | null;
  attachment_url: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteRow = {
  id: string;
  lead_id: string;
  quote_number: string;
  public_token: string;
  title: string;
  description: string | null;
  line_items: QuoteLineItem[];
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  price: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  status: QuoteStatus;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityEventRow = {
  id: string;
  business_id: string;
  lead_id: string | null;
  quote_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  actor: ActivityActor;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  business_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type ReferralEventRow = {
  id: number;
  referral_code: string;
  event_type: "clicked" | "signed_up";
  referred_business_id: string | null;
  created_at: string;
};

export type AnalyticsEventRow = {
  id: number;
  event_name: string;
  business_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PublicQuotePayload = {
  id: string;
  quote_number: string;
  title: string;
  description: string | null;
  line_items: QuoteLineItem[];
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  price: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  status: QuoteStatus;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  customer_name: string;
  customer_email: string;
  business_name: string;
  business_phone: string | null;
  business_email: string | null;
  business_logo_url: string | null;
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
      services: {
        Row: ServiceRow;
        Insert: Partial<ServiceRow> & { business_id: string; name: string };
        Update: Partial<ServiceRow>;
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
      activity_events: {
        Row: ActivityEventRow;
        Insert: Partial<ActivityEventRow> & { business_id: string; type: string };
        Update: Partial<ActivityEventRow>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> & {
          business_id: string;
          type: string;
          title: string;
        };
        Update: Partial<NotificationRow>;
        Relationships: [];
      };
      referral_events: {
        Row: ReferralEventRow;
        Insert: Partial<ReferralEventRow> & { referral_code: string; event_type: string };
        Update: Partial<ReferralEventRow>;
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: Partial<AnalyticsEventRow> & { event_name: string };
        Update: Partial<AnalyticsEventRow>;
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
      get_public_quote: {
        Args: { p_public_token: string };
        Returns: PublicQuotePayload | null;
      };
      record_public_quote_event: {
        Args: { p_public_token: string; p_event: string };
        Returns: { ok: boolean };
      };
      admin_funnel_counts: {
        Args: { p_since?: string | null };
        Returns: Record<string, number>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
