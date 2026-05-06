import type { UserRole, Profile } from './database.types';

export function isTrialActive(profile: Profile): boolean {
  if (!profile.trial_ends_at) return false;
  return new Date(profile.trial_ends_at) > new Date();
}

export function hasAppAccess(profile: Profile): boolean {
  if (profile.role === 'blocked_user') return false;
  if (profile.role === 'admin' || profile.role === 'paid_user') return true;
  if (profile.role === 'trial_user') return isTrialActive(profile);
  return false;
}

export function isAdmin(profile: Profile): boolean {
  return profile.role === 'admin';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  paid_user: 'Paid',
  trial_user: 'Trial',
  blocked_user: 'Blocked',
};
