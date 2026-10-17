// CSRF defence for JSON routes that act on the session cookie. Browsers always
// send Origin on a cross-site POST, and Sec-Fetch-Site on every modern request,
// so a request is accepted only when it demonstrably comes from this site.

export function isSameOriginRequest(headers: Headers, requestUrl: string): boolean {
  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;

  const origin = headers.get('origin');
  if (!origin) {
    // Same-origin fetches from older browsers may omit Origin; rely on Sec-Fetch-Site then.
    return fetchSite === 'same-origin';
  }

  let expectedHost: string;
  try {
    expectedHost = new URL(requestUrl).host;
  } catch {
    return false;
  }
  // Behind Vercel's proxy the request URL already carries the public host;
  // x-forwarded-host covers custom domains.
  const forwarded = headers.get('x-forwarded-host');
  try {
    const originHost = new URL(origin).host;
    return originHost === expectedHost || (!!forwarded && originHost === forwarded);
  } catch {
    return false;
  }
}
