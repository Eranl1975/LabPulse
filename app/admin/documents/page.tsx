import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { loadSeedDocuments } from '@/lib/document-seed';
import { fetchChunkCounts, summarizeSearchability } from '@/lib/document-chunk-counts';
import type { DocumentRecord } from '@/lib/document-types';
import {
  SupabaseRunStateStore, hasRunStateCredentials, type RefreshRun,
} from '@/agents/acquisition/pipeline/run-state';
import DocumentsPanel from './DocumentsPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vendor Documentation — LabPulse Admin' };

export default async function AdminDocumentsPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'admin') redirect('/ask');

  const [documents, remoteBacked] = await loadDocuments();
  const { runs, runsError } = await loadRuns();

  // null when the counts cannot be read (no Supabase, or migration 022 not
  // applied); the panel then says so instead of calling every document empty.
  const counts = remoteBacked ? await fetchChunkCounts() : null;
  const summary = counts ? summarizeSearchability(documents.map(d => d.id), counts) : null;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Vendor Documentation
        </h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9375rem' }}>
          {documents.length} stored document{documents.length === 1 ? '' : 's'}
          {remoteBacked ? '' : ' — from the curated catalogue; Supabase is not configured'}
        </p>
      </div>

      <DocumentsPanel
        documents={documents}
        runs={runs}
        runsError={runsError}
        remoteBacked={remoteBacked}
        chunkCounts={counts ? Object.fromEntries(counts) : null}
        banner={summary?.banner ?? null}
      />
    </div>
  );
}

/** Returns the documents plus whether they came from Supabase or the seed catalogue. */
async function loadDocuments(): Promise<[DocumentRecord[], boolean]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [loadSeedDocuments(), false];

  try {
    const res = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/documents?status=eq.active&order=last_changed_at.desc.nullslast&limit=1000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!res.ok) return [loadSeedDocuments(), false];
    return [(await res.json()) as DocumentRecord[], true];
  } catch {
    return [loadSeedDocuments(), false];
  }
}

async function loadRuns(): Promise<{ runs: RefreshRun[]; runsError: string | null }> {
  if (!hasRunStateCredentials()) {
    return { runs: [], runsError: 'Supabase is not configured, so refresh history is unavailable.' };
  }
  try {
    return { runs: await new SupabaseRunStateStore().recent(10), runsError: null };
  } catch (err) {
    return { runs: [], runsError: `Could not load refresh history: ${String(err)}` };
  }
}
