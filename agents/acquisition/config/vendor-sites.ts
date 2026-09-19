// Certified vendor sites the monthly agent is allowed to visit.
// Only these domains are fetched; anything off-list is dropped during discovery.
// Vendor list follows docs/source-policy.md.

import type { Technique } from '@/lib/types';

/**
 * Observed response to an automated request, measured 2026-09-18.
 * `blocked` vendors return HTTP 403 to any non-browser client via their WAF —
 * including their public PDF libraries. LabPulse does not disguise itself to get
 * around that; those vendors need a licensed feed or manual curation instead.
 */
export type VendorAccess = 'reachable' | 'blocked' | 'unverified';

export interface VendorSite {
  /** Stable source slug; must match the sources(id) convention used by the pipeline. */
  source_id: string;
  vendor: string;
  /** Hostnames (and subdomains) that may be fetched for this vendor. */
  domains: string[];
  /** Entry points for discovery: support hubs, manual libraries, troubleshooting indexes. */
  seeds: string[];
  /** Sitemaps to read instead of crawling, when the vendor publishes one. */
  sitemaps: string[];
  /** Techniques this vendor's documentation covers. */
  techniques: Technique[];
  /** Last measured access status; see VendorAccess. */
  access: VendorAccess;
  /** Why the status is what it is, for whoever maintains this list next. */
  access_note?: string;
}

/**
 * Per-vendor crawl budget. Deliberately small: the agent runs monthly and only
 * needs new or changed documents, not a full mirror of each vendor's site.
 */
export const MAX_PAGES_PER_VENDOR = 40;
export const MAX_DOCUMENTS_PER_VENDOR = 25;
/** Delay between requests to the same host, in milliseconds. */
export const REQUEST_DELAY_MS = 1_500;
/** Per-request timeout. */
export const REQUEST_TIMEOUT_MS = 20_000;
/** Largest document body the agent will download (PDFs can be very large). */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const USER_AGENT =
  'LabPulseDocBot/1.0 (+https://labpulse.app; monthly vendor documentation refresh)';

export const VENDOR_SITES: VendorSite[] = [
  {
    source_id: 'agilent-support-library',
    vendor: 'Agilent',
    domains: ['agilent.com', 'www.agilent.com'],
    seeds: [
      'https://www.agilent.com/en/support/liquid-chromatography',
      'https://www.agilent.com/en/support/gas-chromatography',
      'https://www.agilent.com/en/support/mass-spectrometry',
    ],
    sitemaps: [],
    techniques: ['HPLC', 'UHPLC', 'LCMS', 'GC', 'GCMS'],
    access: 'blocked',
    access_note: 'HTTP 403 from the WAF on every path, including /cs/library PDFs.',
  },
  {
    source_id: 'waters-support-library',
    vendor: 'Waters',
    domains: ['waters.com', 'www.waters.com', 'support.waters.com'],
    seeds: [
      'https://www.waters.com/nextgen/us/en/support.html',
      'https://support.waters.com/',
    ],
    sitemaps: [],
    techniques: ['HPLC', 'UHPLC', 'LCMS'],
    access: 'unverified',
    access_note: 'Connection timed out from the test network; status unknown.',
  },
  {
    source_id: 'thermo-support-library',
    vendor: 'Thermo Fisher',
    domains: ['thermofisher.com', 'www.thermofisher.com', 'assets.thermofisher.com'],
    seeds: [
      'https://www.thermofisher.com/us/en/home/technical-resources/technical-reference-library.html',
      'https://www.thermofisher.com/us/en/home/global/forms/industrial/chromatography-support.html',
    ],
    sitemaps: [],
    techniques: ['HPLC', 'UHPLC', 'LCMS', 'GC', 'GCMS', 'IC'],
    access: 'unverified',
    access_note: 'Connection timed out from the test network; status unknown.',
  },
  {
    source_id: 'shimadzu-support-library',
    vendor: 'Shimadzu',
    domains: ['shimadzu.com', 'www.shimadzu.com', 'ssi.shimadzu.com'],
    seeds: [
      'https://www.shimadzu.com/an/service-support/technical-support/index.html',
    ],
    sitemaps: [],
    techniques: ['HPLC', 'UHPLC', 'LCMS', 'GC', 'GCMS', 'XRD'],
    access: 'reachable',
    access_note: 'HTTP 200; crawled successfully in the dry run.',
  },
  {
    source_id: 'sciex-support-library',
    vendor: 'Sciex',
    domains: ['sciex.com', 'www.sciex.com'],
    seeds: [
      'https://sciex.com/support',
    ],
    sitemaps: [],
    techniques: ['LCMS'],
    access: 'reachable',
    access_note: 'HTTP 200; crawled successfully in the dry run.',
  },
  {
    source_id: 'perkinelmer-support-library',
    vendor: 'PerkinElmer',
    domains: ['perkinelmer.com', 'www.perkinelmer.com', 'resources.perkinelmer.com'],
    seeds: [
      'https://www.perkinelmer.com/searchresult?searchName=technical+note',
    ],
    sitemaps: [],
    techniques: ['GC', 'GCMS', 'HPLC', 'TGA', 'DSC'],
    access: 'unverified',
    access_note: 'Only the site root responds; the document index path is not yet known.',
  },
  {
    source_id: 'restek-technical-library',
    vendor: 'Restek',
    domains: ['restek.com', 'www.restek.com'],
    seeds: [
      'https://www.restek.com/global/en/technical-literature',
      'https://www.restek.com/global/en/technical-literature/chromatography-troubleshooting',
    ],
    sitemaps: [],
    techniques: ['GC', 'GCMS', 'HPLC'],
    access: 'blocked',
    access_note: 'HTTP 403 from the WAF on the technical literature index.',
  },
  {
    source_id: 'merck-sigma-technical-library',
    vendor: 'Merck/Sigma',
    domains: ['sigmaaldrich.com', 'www.sigmaaldrich.com', 'merckmillipore.com'],
    seeds: [
      'https://www.sigmaaldrich.com/US/en/technical-documents',
    ],
    sitemaps: [],
    techniques: ['HPLC', 'GC', 'LCMS'],
    access: 'unverified',
    access_note: 'Connection timed out from the test network; status unknown.',
  },
  {
    source_id: 'phenomenex-technical-library',
    vendor: 'Phenomenex',
    domains: ['phenomenex.com', 'www.phenomenex.com'],
    seeds: [
      'https://www.phenomenex.com/support',
      'https://www.phenomenex.com/technical-resources',
    ],
    sitemaps: [],
    techniques: ['HPLC', 'UHPLC', 'LCMS', 'GC'],
    access: 'unverified',
    access_note: 'Only the site root responds; the document index path is not yet known.',
  },
  {
    source_id: 'supelco-technical-library',
    vendor: 'Supelco',
    domains: ['sigmaaldrich.com', 'www.sigmaaldrich.com'],
    seeds: [
      'https://www.sigmaaldrich.com/US/en/products/analytical-chemistry/gas-chromatography',
    ],
    sitemaps: [],
    techniques: ['GC', 'GCMS'],
    access: 'unverified',
    access_note: 'Shares the sigmaaldrich.com host, which timed out from the test network.',
  },
];

/** Look up a vendor site config by source_id. */
export function getVendorSite(source_id: string): VendorSite | null {
  return VENDOR_SITES.find(v => v.source_id === source_id) ?? null;
}

/**
 * Vendors the monthly run should attempt. Sites known to reject automated
 * clients are excluded so the run does not re-request a 403 every month;
 * set `includeBlocked` to retry them after their access policy changes.
 */
export function getCrawlableVendorSites(includeBlocked = false): VendorSite[] {
  return includeBlocked ? VENDOR_SITES : VENDOR_SITES.filter(v => v.access !== 'blocked');
}

/**
 * True when `url` is inside one of the vendor's allowlisted domains.
 * Subdomains are allowed; look-alike domains ("agilent.com.evil.net") are not.
 */
export function isAllowedUrl(url: string, site: VendorSite): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

  const host = parsed.hostname.toLowerCase();
  return site.domains.some(d => {
    const domain = d.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  });
}
