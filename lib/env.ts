/**
 * Runtime environment validation.
 * Warns on missing optional vars, throws on missing required vars (server-side only).
 */

interface EnvVar {
  key: string;
  required: boolean;
  isPublic?: boolean;
}

const ENV_VARS: EnvVar[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', required: true, isPublic: true },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, isPublic: true },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', required: false },
  { key: 'ANTHROPIC_API_KEY', required: false },
  { key: 'AUTH_SECRET', required: false },
  { key: 'STRIPE_SECRET_KEY', required: false },
  { key: 'STRIPE_WEBHOOK_SECRET', required: false },
  { key: 'STRIPE_PRICE_ID', required: false },
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false, isPublic: true },
  { key: 'NEXT_PUBLIC_SITE_URL', required: false, isPublic: true },
];

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const { key, required } of ENV_VARS) {
    const value = process.env[key];
    if (!value || value === 'placeholder') {
      if (required) {
        missing.push(key);
      } else {
        warnings.push(key);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}
