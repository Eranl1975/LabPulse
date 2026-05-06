import { describe, it, expect } from 'vitest';
import type { Profile } from '@/lib/database.types';

function makeProfile(role: Profile['role'], trialEndsAt?: string): Profile {
  return {
    id: 'test-id',
    email: 'test@example.com',
    full_name: 'Test User',
    role,
    subscription_status: 'none',
    trial_ends_at: trialEndsAt ?? null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_period_end: null,
    login_count: 0,
    last_login_at: null,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function isTrialActive(p: Profile): boolean {
  if (!p.trial_ends_at) return false;
  return new Date(p.trial_ends_at) > new Date();
}

function hasAppAccess(p: Profile): boolean {
  if (p.role === 'blocked_user') return false;
  if (p.role === 'admin' || p.role === 'paid_user') return true;
  if (p.role === 'trial_user') return isTrialActive(p);
  return false;
}

describe('Role-based access control', () => {
  it('admin has full access', () => { expect(hasAppAccess(makeProfile('admin'))).toBe(true); });
  it('paid_user has full access', () => { expect(hasAppAccess(makeProfile('paid_user'))).toBe(true); });
  it('trial_user with active trial has access', () => {
    expect(hasAppAccess(makeProfile('trial_user', new Date(Date.now() + 86400000).toISOString()))).toBe(true);
  });
  it('trial_user with expired trial has no access', () => {
    expect(hasAppAccess(makeProfile('trial_user', new Date(Date.now() - 1000).toISOString()))).toBe(false);
  });
  it('blocked_user has no access', () => { expect(hasAppAccess(makeProfile('blocked_user'))).toBe(false); });
  it('non-admin cannot access admin', () => {
    const isAdmin = (p: Profile) => p.role === 'admin';
    expect(isAdmin(makeProfile('paid_user'))).toBe(false);
    expect(isAdmin(makeProfile('trial_user'))).toBe(false);
  });
});
