/**
 * Live Vendor Adapter Scaffolds
 *
 * Stub implementations for future direct instrument data acquisition from
 * Agilent, Waters, and Shimadzu systems. Each adapter will eventually
 * connect to vendor-specific APIs or local instrument services to pull
 * real-time status, run data, and error logs.
 *
 * None of these adapters are functional yet — all methods throw
 * "Not implemented" errors. They exist as integration scaffolds.
 */

/** Status snapshot returned by a connected instrument. */
export interface InstrumentStatus {
  online: boolean;
  instrumentId: string;
  model: string;
  currentState: 'idle' | 'running' | 'error' | 'maintenance';
  lastHeartbeat: string; // ISO 8601
}

/** A single acquisition run record. */
export interface RunData {
  runId: string;
  sampleName: string;
  method: string;
  startedAt: string;  // ISO 8601
  finishedAt: string | null;
  status: 'completed' | 'aborted' | 'in_progress';
  rawFilePath: string | null;
}

/** An entry from the instrument error/event log. */
export interface ErrorLogEntry {
  timestamp: string; // ISO 8601
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/** Interface for live instrument data adapters. */
export interface LiveVendorAdapter {
  /** Human-readable vendor name. */
  readonly vendor: string;

  /** Open a connection to the instrument service. */
  connect(host: string, port: number): Promise<void>;

  /** Gracefully close the connection. */
  disconnect(): Promise<void>;

  /** Retrieve the current instrument status. */
  fetchStatus(): Promise<InstrumentStatus>;

  /** Fetch completed or in-progress run data since a given date. */
  fetchRunData(since: string): Promise<RunData[]>;

  /** Fetch error/event log entries since a given date. */
  fetchErrorLog(since: string): Promise<ErrorLogEntry[]>;
}

/** Stub adapter for Agilent instruments (OpenLab / MassHunter). */
class AgilentAdapter implements LiveVendorAdapter {
  readonly vendor = 'Agilent';
  async connect(_host: string, _port: number): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  async fetchStatus(): Promise<InstrumentStatus> { throw new Error('Not implemented'); }
  async fetchRunData(_since: string): Promise<RunData[]> { throw new Error('Not implemented'); }
  async fetchErrorLog(_since: string): Promise<ErrorLogEntry[]> { throw new Error('Not implemented'); }
}

/** Stub adapter for Waters instruments (Empower / UNIFI). */
class WatersAdapter implements LiveVendorAdapter {
  readonly vendor = 'Waters';
  async connect(_host: string, _port: number): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  async fetchStatus(): Promise<InstrumentStatus> { throw new Error('Not implemented'); }
  async fetchRunData(_since: string): Promise<RunData[]> { throw new Error('Not implemented'); }
  async fetchErrorLog(_since: string): Promise<ErrorLogEntry[]> { throw new Error('Not implemented'); }
}

/** Stub adapter for Shimadzu instruments (LabSolutions). */
class ShimadzuAdapter implements LiveVendorAdapter {
  readonly vendor = 'Shimadzu';
  async connect(_host: string, _port: number): Promise<void> { throw new Error('Not implemented'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  async fetchStatus(): Promise<InstrumentStatus> { throw new Error('Not implemented'); }
  async fetchRunData(_since: string): Promise<RunData[]> { throw new Error('Not implemented'); }
  async fetchErrorLog(_since: string): Promise<ErrorLogEntry[]> { throw new Error('Not implemented'); }
}

/**
 * Factory function that returns the appropriate adapter for a vendor name.
 * Returns `null` if the vendor is not recognized.
 */
export function getAdapter(vendor: string): LiveVendorAdapter | null {
  switch (vendor.toLowerCase()) {
    case 'agilent':  return new AgilentAdapter();
    case 'waters':   return new WatersAdapter();
    case 'shimadzu': return new ShimadzuAdapter();
    default:         return null;
  }
}
