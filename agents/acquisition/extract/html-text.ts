// HTML → structured text. Regex-based on purpose: vendor support pages are the
// only input, and adding a DOM parser dependency is not justified (docs/coding-rules.md).

export interface HtmlDocument {
  title: string;
  headings: string[];
  /** Body text with navigation, script and style content removed. */
  text: string;
  /** Absolute-ready hrefs found in the body, in document order. */
  links: string[];
}

const DROP_BLOCKS = /<(script|style|noscript|svg|head|nav|header|footer|form|aside)\b[^>]*>[\s\S]*?<\/\1>/gi;
const BLOCK_END = /<\/(p|div|section|article|li|tr|h[1-6]|table|br)\s*>/gi;
// List markers are structural: a troubleshooting guide's causes and actions are
// nearly always <li> items, and stripping tags would erase that they are a list.
const LIST_ITEM_START = /<li\b[^>]*>/gi;
const TABLE_CELL_END = /<\/t[dh]\s*>/gi;

/** Restore bullet markers and cell separators before tags are stripped. */
function markStructure(html: string): string {
  return html
    .replace(LIST_ITEM_START, '\n- ')
    .replace(TABLE_CELL_END, ' | ');
}

export function parseHtml(html: string, baseUrl?: string): HtmlDocument {
  const title = decodeEntities(
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim(),
  );

  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map(m => decodeEntities(stripTags(m[2])).trim())
    .filter(Boolean);

  const links = baseUrl ? extractLinks(html, baseUrl) : [];

  const cleaned = markStructure(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(DROP_BLOCKS, ' '),
  ).replace(BLOCK_END, '\n');

  const text = decodeEntities(stripTags(cleaned))
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .trim();

  return { title, headings, text, links };
}

/**
 * Headings paired with the text beneath them, so the chunker can keep sections intact.
 * Content before the first heading is returned with a null heading.
 */
export interface HtmlSection {
  heading: string | null;
  text: string;
}

export function parseHtmlSections(html: string): HtmlSection[] {
  const cleaned = markStructure(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(DROP_BLOCKS, ' '),
  );

  const sections: HtmlSection[] = [];
  const headingRe = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;

  let lastIndex = 0;
  let currentHeading: string | null = null;
  let match: RegExpExecArray | null;

  const pushSection = (heading: string | null, raw: string): void => {
    const text = decodeEntities(stripTags(raw.replace(BLOCK_END, '\n')))
      .replace(/[ \t ]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text) sections.push({ heading, text });
  };

  while ((match = headingRe.exec(cleaned)) !== null) {
    pushSection(currentHeading, cleaned.slice(lastIndex, match.index));
    currentHeading = decodeEntities(stripTags(match[2])).trim() || null;
    lastIndex = headingRe.lastIndex;
  }
  pushSection(currentHeading, cleaned.slice(lastIndex));

  return sections;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)) {
    const href = decodeEntities(m[1]).trim();
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) continue;
    try {
      out.push(new URL(href, baseUrl).toString());
    } catch {
      // Unparseable href — skip it.
    }
  }
  return out;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ');
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', deg: '°', micro: 'µ', times: '×',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (full, name: string) => ENTITIES[name.toLowerCase()] ?? full);
}

function safeCodePoint(cp: number): string {
  return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
}
