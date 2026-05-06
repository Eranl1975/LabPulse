export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'paid_user' | 'trial_user' | 'blocked_user';
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_period_end: string | null;
  login_count: number;
  last_login_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: number;
  admin_id: string;
  admin_email: string | null;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  details: Json | null;
  ip_address: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription>;
        Update: Partial<Subscription>;
      };
      admin_audit_logs: {
        Row: AdminAuditLog;
        Insert: Omit<AdminAuditLog, 'id' | 'created_at'>;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
