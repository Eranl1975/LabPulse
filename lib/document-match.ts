// Match an operator-supplied PDF filename to a document row that already exists.
//
// Chunks can only be attached to a document the catalogue already knows about,
// so ingestion never invents rows. Two rules, tried in order:
//   1. the row's document_number appears in the filename
//   2. the basename of the row's url equals the filename
// Anything else is reported unmatched rather than guessed at.

import type { DocumentRecord } from './document-types';

export type MatchRule = 'document_number' | 'url_basename';

export interface FileMatch {
  matched: true;
  document: DocumentRecord;
  rule: MatchRule;
}

export interface FileMiss {
  matched: false;
  /** 'unmatched' = nothing fits; 'ambiguous' = several rows fit equally well. */
  reason: 'unmatched' | 'ambiguous';
  /** Candidate ids when ambiguous, so the operator can rename the file. */
  candidates: string[];
}

export type MatchResult = FileMatch | FileMiss;

/** Lowercase, drop every separator. "5990-8580EN" and "5990_8580_en" collapse together. */
export function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Filename without directory or extension. */
export function baseName(filePath: string): string {
  const last = filePath.replace(/\\/g, '/').split('/').pop() ?? filePath;
  return last.replace(/\.pdf$/i, '');
}

/** The file part of a URL, percent-decoded. Returns '' when the url is unusable. */
export function urlBaseName(url: string): string {
  let pathPart: string;
  try {
    pathPart = new URL(url).pathname;
  } catch {
    pathPart = url.split(/[?#]/)[0];
  }

  const last = pathPart.split('/').filter(Boolean).pop() ?? '';
  try {
    return decodeURIComponent(last).replace(/\.pdf$/i, '');
  } catch {
    // A stray '%' that is not a valid escape; compare the raw form instead.
    return last.replace(/\.pdf$/i, '');
  }
}

/**
 * Find the document a file belongs to.
 *
 * Rule 1 wins over rule 2, and a longer document_number wins over a shorter one
 * so "D0133021" is not swallowed by a row numbered "D013302". Two different rows
 * matching equally well is reported as ambiguous, never resolved by guessing.
 */
export function matchFileToDocument(filePath: string, documents: DocumentRecord[]): MatchResult {
  const fileToken = normalizeToken(baseName(filePath));
  if (!fileToken) return { matched: false, reason: 'unmatched', candidates: [] };

  // Rule 1: document number contained in the filename.
  let best: DocumentRecord[] = [];
  let bestLength = 0;

  for (const doc of documents) {
    const number = normalizeToken(doc.document_number ?? '');
    if (number.length < 4 || !fileToken.includes(number)) continue;

    if (number.length > bestLength) {
      best = [doc];
      bestLength = number.length;
    } else if (number.length === bestLength) {
      best.push(doc);
    }
  }

  if (best.length === 1) return { matched: true, document: best[0], rule: 'document_number' };
  if (best.length > 1) {
    return { matched: false, reason: 'ambiguous', candidates: best.map(d => d.id) };
  }

  // Rule 2: the basename of the stored url.
  const byUrl = documents.filter(d => {
    const token = normalizeToken(urlBaseName(d.url));
    return token.length > 0 && token === fileToken;
  });

  if (byUrl.length === 1) return { matched: true, document: byUrl[0], rule: 'url_basename' };
  if (byUrl.length > 1) {
    return { matched: false, reason: 'ambiguous', candidates: byUrl.map(d => d.id) };
  }

  return { matched: false, reason: 'unmatched', candidates: [] };
}
