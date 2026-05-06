import { describe, it, expect } from 'vitest';

function mapStripeStatusToRole(status: string): 'paid_user' | 'trial_user' {
  return ['active', 'trialing'].includes(status) ? 'paid_user' : 'trial_user';
}

describe('Stripe status → role mapping', () => {
  it('"active" → paid_user',    () => { expect(mapStripeStatusToRole('active')).toBe('paid_user'); });
  it('"trialing" → paid_user',  () => { expect(mapStripeStatusToRole('trialing')).toBe('paid_user'); });
  it('"canceled" → trial_user', () => { expect(mapStripeStatusToRole('canceled')).toBe('trial_user'); });
  it('"past_due" → trial_user', () => { expect(mapStripeStatusToRole('past_due')).toBe('trial_user'); });
  it('"unpaid" → trial_user',   () => { expect(mapStripeStatusToRole('unpaid')).toBe('trial_user'); });
});
