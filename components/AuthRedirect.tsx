'use client';

import { useEffect } from 'react';

/**
 * Detects Supabase implicit-flow recovery tokens in the URL hash.
 * If the user lands on any page with #type=recovery (e.g. because
 * Supabase fell back to the Site URL), redirect to /reset-password
 * preserving the hash fragments so the browser client can process them.
 */
export default function AuthRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Preserve hash fragments — they contain the access token
      window.location.replace('/reset-password' + hash);
    }
  }, []);

  return null;
}
