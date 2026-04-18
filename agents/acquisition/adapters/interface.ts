import type { AdapterFetchQuery, RawFetchedItem, SourceType } from '../types';

// All source adapters implement this interface.
// For real integrations (vendor APIs, PubMed, etc.) build a concrete class here.
// For unavailable integrations: stub with hasUpdates()→true, fetch()→[].
export interface SourceAdapter {
  readonly source_id: string;
  readonly source_type: SourceType;
  readonly display_name: string;

  // Return false if the source has not changed since `since`.
  // Allows the pipeline to skip unchanged sources entirely.
  hasUpdates(since: string | null): Promise<boolean>;

  // Fetch raw items matching the query from this source.
  fetch(query: AdapterFetchQuery): Promise<RawFetchedItem[]>;
}
