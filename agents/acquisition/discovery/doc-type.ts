// Rule-based document classification from URL, title and headings.
// Returns null when nothing matches — the crawler then skips the page rather
// than guessing (no silent fallback).

import type { DocType } from '@/lib/document-types';
import type { Technique } from '@/lib/types';

interface TypeRule {
  type: DocType;
  patterns: RegExp[];
}

// Ordered: the most specific classification wins.
const RULES: TypeRule[] = [
  { type: 'troubleshooting_guide', patterns: [/troubleshoot/i, /problem[\s-]?solving/i, /diagnos(is|tic)[\s-]?guide/i, /symptom/i] },
  { type: 'service_manual',        patterns: [/service[\s-]?manual/i, /repair[\s-]?manual/i, /service[\s-]?guide/i] },
  { type: 'maintenance_guide',     patterns: [/maintenance[\s-]?(guide|manual|procedure)/i, /preventive[\s-]?maintenance/i] },
  { type: 'quick_reference',       patterns: [/quick[\s-]?reference/i, /quick[\s-]?start/i, /at[\s-]?a[\s-]?glance/i] },
  { type: 'user_guide',            patterns: [/user[\s-]?(guide|manual)/i, /operat(or|ing)[\s-]?(guide|manual)/i, /instruction[\s-]?manual/i, /usermanuals?/i] },
  { type: 'application_note',      patterns: [/application[\s-]?note/i, /app[\s-]?note/i, /applicationnotes?/i] },
  { type: 'tech_note',             patterns: [/technical[\s-]?note/i, /tech[\s-]?note/i, /white[\s-]?paper/i, /technical[\s-]?(brief|overview)/i] },
  { type: 'faq',                   patterns: [/\bfaq\b/i, /frequently[\s-]?asked/i, /knowledge[\s-]?base[\s-]?article/i] },
  { type: 'article',               patterns: [/\barticle\b/i, /\bblog\b/i, /technical[\s-]?librar/i, /resource[\s-]?librar/i] },
];

/**
 * Classify a candidate document. `headings` are the first few H1/H2 strings.
 * Signals are weighted: URL path and title are stronger than body headings.
 */
export function detectDocType(
  url: string,
  title: string,
  headings: string[] = [],
): DocType | null {
  const path = safePath(url);
  const strong = `${path} ${title}`;
  const weak = headings.slice(0, 8).join(' ');

  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(strong))) return rule.type;
  }
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(weak))) return rule.type;
  }
  return null;
}

const TECHNIQUE_PATTERNS: Array<[Technique, RegExp]> = [
  ['LCMS',     /\b(lc[\s\/-]?ms|lcms|liquid chromatograph\w* mass spec)/i],
  ['GCMS',     /\b(gc[\s\/-]?ms|gcms|gas chromatograph\w* mass spec)/i],
  ['UHPLC',    /\b(uhplc|uplc|ultra[\s-]?high[\s-]?performance)/i],
  ['HPLC',     /\b(hplc|high[\s-]?performance liquid)/i],
  ['GC',       /\bgas chromatograph|\bgc\b/i],
  ['IC',       /\bion chromatograph|\bic\b(?!\w)/i],
  ['CE',       /\bcapillary electrophoresis\b/i],
  ['SFC',      /\bsupercritical fluid chromatograph|\bsfc\b/i],
  ['TGA',      /\bthermogravimetric|\btga\b/i],
  ['DSC',      /\bdifferential scanning calorimetr|\bdsc\b/i],
  ['XRD',      /\bx[\s-]?ray diffraction|\bxrd\b/i],
  ['DLS',      /\bdynamic light scattering|\bdls\b|\bzetasizer\b/i],
  ['Titration',/\btitrat(ion|or)\b/i],
  ['KF',       /\bkarl fischer\b/i],
  ['FPLC',     /\bfplc\b|\bakta\b|\bäkta\b/i],
  ['SPPS',     /\bpeptide synthes/i],
];

/** Techniques mentioned in the URL/title/headings, used to tag the document. */
export function detectTechniques(url: string, title: string, headings: string[] = []): Technique[] {
  const haystack = `${safePath(url)} ${title} ${headings.slice(0, 12).join(' ')}`;
  const found = new Set<Technique>();

  for (const [technique, pattern] of TECHNIQUE_PATTERNS) {
    if (pattern.test(haystack)) found.add(technique);
  }
  // A GCMS or LCMS hit implies the base separation technique too.
  if (found.has('GCMS')) found.add('GC');
  if (found.has('UHPLC')) found.add('HPLC');

  return [...found];
}

/**
 * Vendor document numbers, e.g. "D0133020", "G1960-90104", "5991-1234EN".
 * The trailing boundary is an explicit character class rather than \b, because
 * these identifiers are usually followed by "_" in filenames and "_" is a word
 * character — \b would never match there.
 */
const DOC_NUMBER_PATTERNS: RegExp[] = [
  /(?:^|[^A-Za-z0-9])([A-Z]\d{4}-\d{5})(?![A-Za-z0-9])/,
  /(?:^|[^A-Za-z0-9])([A-Z]{1,2}\d{6,7}(?:-\d{2,5})?)(?![A-Za-z0-9])/,
  /(?:^|[^A-Za-z0-9])(\d{4}-\d{4}[A-Z]{0,2})(?![A-Za-z0-9])/,
];

export function detectDocumentNumber(url: string, title: string): string | null {
  const haystack = `${decodeURIComponent(safePath(url))} ${title}`;
  for (const pattern of DOC_NUMBER_PATTERNS) {
    const m = haystack.match(pattern);
    if (m) return m[1];
  }
  return null;
}

function safePath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}
