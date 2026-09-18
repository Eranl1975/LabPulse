// Read/write source_refresh_runs (migration 007) so a monthly run can span
// several serverless invocations instead of one long request.

export type RunStatus = 'running' | 'success' | 'partial' | 'failed';

export interface VendorResult {
  source_id: string;
  vendor: string;
  pages_visited: number;
  documents_found: number;
  documents_unchanged: number;
  documents_skipped: number;
  /** True when this vendor's crawl stopped on the clock and was re-queued. */
  hit_deadline?: boolean;
  items_new: number;
  items_updated: number;
  errors: string[];
  finished_at: string;
}

/** Everything the run needs to resume, carried in report_json. */
export interface RunReport {
  /** source_ids still to process, in order. */
  pending: string[];
  /** Completed vendors, newest last. */
  completed: VendorResult[];
  ai_status: 'ok' | 'skipped' | 'failed' | 'not_used';
  ai_reason: string | null;
  notes: string[];
}

export interface RefreshRun {
  id: string;
  run_date: string;
  triggered_by: 'scheduler' | 'manual' | 'test';
  dry_run: boolean;
  status: RunStatus;
  sources_checked: number;
  items_fetched: number;
  items_new: number;
  items_updated: number;
  items_deprecated: number;
  conflicts_found: number;
  error_message: string | null;
  report_json: RunReport;
  started_at: string;
  finished_at: string | null;
}

export interface RunStateStore {
  findResumable(): Promise<RefreshRun | null>;
  create(run: Omit<RefreshRun, 'id' | 'started_at' | 'finished_at'>): Promise<RefreshRun>;
  update(id: string, patch: Partial<RefreshRun>): Promise<void>;
  recent(limit: number): Promise<RefreshRun[]>;
}

export const EMPTY_REPORT: RunReport = {
  pending: [], completed: [], ai_status: 'not_used', ai_reason: null, notes: [],
};

/** In-memory implementation for tests and for running without Supabase. */
export class MockRunStateStore implements RunStateStore {
  readonly runs: RefreshRun[] = [];
  private seq = 0;

  async findResumable(): Promise<RefreshRun | null> {
    return this.runs.find(r => r.status === 'running') ?? null;
  }

  async create(run: Omit<RefreshRun, 'id' | 'started_at' | 'finished_at'>): Promise<RefreshRun> {
    const full: RefreshRun = {
      ...run,
      id: `mock-run-${++this.seq}`,
      started_at: new Date().toISOString(),
      finished_at: null,
    };
    this.runs.unshift(full);
    return full;
  }

  async update(id: string, patch: Partial<RefreshRun>): Promise<void> {
    const idx = this.runs.findIndex(r => r.id === id);
    if (idx >= 0) this.runs[idx] = { ...this.runs[idx], ...patch };
  }

  async recent(limit: number): Promise<RefreshRun[]> {
    return this.runs.slice(0, limit);
  }
}

export function hasRunStateCredentials(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export class SupabaseRunStateStore implements RunStateStore {
  private readonly url: string;
  private readonly key: string;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SupabaseRunStateStore requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    this.url = url.replace(/\/$/, '');
    this.key = key;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async findResumable(): Promise<RefreshRun | null> {
    const res = await fetch(
      `${this.url}/rest/v1/source_refresh_runs?status=eq.running&order=started_at.desc&limit=1`,
      { headers: this.headers(), cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`findResumable failed: HTTP ${res.status}`);
    const rows = (await res.json()) as RefreshRun[];
    return rows[0] ? normalize(rows[0]) : null;
  }

  async create(run: Omit<RefreshRun, 'id' | 'started_at' | 'finished_at'>): Promise<RefreshRun> {
    const res = await fetch(`${this.url}/rest/v1/source_refresh_runs`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'return=representation' }),
      body: JSON.stringify([run]),
    });
    if (!res.ok) throw new Error(`create run failed: HTTP ${res.status} ${await res.text()}`);
    const rows = (await res.json()) as RefreshRun[];
    if (!rows[0]) throw new Error('create run returned no row');
    return normalize(rows[0]);
  }

  async update(id: string, patch: Partial<RefreshRun>): Promise<void> {
    const res = await fetch(
      `${this.url}/rest/v1/source_refresh_runs?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: this.headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(patch),
      },
    );
    if (!res.ok) throw new Error(`update run failed: HTTP ${res.status} ${await res.text()}`);
  }

  async recent(limit: number): Promise<RefreshRun[]> {
    const res = await fetch(
      `${this.url}/rest/v1/source_refresh_runs?order=started_at.desc&limit=${Math.max(1, Math.min(limit, 50))}`,
      { headers: this.headers(), cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`recent runs failed: HTTP ${res.status}`);
    return ((await res.json()) as RefreshRun[]).map(normalize);
  }
}

/** report_json may come back as {} from the DB default; give it the expected shape. */
function normalize(row: RefreshRun): RefreshRun {
  const report = row.report_json as Partial<RunReport> | null;
  return {
    ...row,
    report_json: {
      pending: Array.isArray(report?.pending) ? report.pending : [],
      completed: Array.isArray(report?.completed) ? report.completed : [],
      ai_status: report?.ai_status ?? 'not_used',
      ai_reason: report?.ai_reason ?? null,
      notes: Array.isArray(report?.notes) ? report.notes : [],
    },
  };
}
