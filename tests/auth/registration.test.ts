import { describe, it, expect } from 'vitest';

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include a number.';
  return null;
}

describe('Password validation', () => {
  it('accepts a strong password', () => {
    expect(validatePassword('StrongPass1!')).toBeNull();
  });
  it('rejects short passwords', () => {
    expect(validatePassword('Ab1!')).toBe('Password must be at least 8 characters.');
  });
  it('rejects no uppercase', () => {
    expect(validatePassword('lowercase1!')).toBe('Password must include an uppercase letter.');
  });
  it('rejects no number', () => {
    expect(validatePassword('NoNumbers!')).toBe('Password must include a number.');
  });
});
