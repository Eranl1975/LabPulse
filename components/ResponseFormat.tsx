'use client';

// Response format: Quick Summary or Detailed Analysis. Chosen before an
// analysis (it sets the first view of the result) and switchable afterwards.
// Both views render the same analysis, so switching never calls the API.

import { useCallback, useEffect, useState } from 'react';
import { RESPONSE_FORMATS, DEFAULT_RESPONSE_FORMAT, isResponseFormat, type ResponseFormat } from '@/lib/quick-summary';

const STORAGE_KEY = 'labpulse-response-format';

/** The user's last choice, remembered per browser. Storage failures fall back to the default. */
export function useResponseFormatPreference(): [ResponseFormat, (f: ResponseFormat) => void] {
  const [format, setFormat] = useState<ResponseFormat>(DEFAULT_RESPONSE_FORMAT);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isResponseFormat(stored)) setFormat(stored);
    } catch { /* private mode or blocked storage */ }
  }, []);
  const update = useCallback((f: ResponseFormat) => {
    setFormat(f);
    try { localStorage.setItem(STORAGE_KEY, f); } catch { /* not persisted */ }
  }, []);
  return [format, update];
}

/** Radio choice shown next to the Analyse / Get Answer button. */
export function ResponseFormatPicker({ value, onChange, disabled, name }: {
  value: ResponseFormat;
  onChange: (f: ResponseFormat) => void;
  disabled?: boolean;
  name: string;
}) {
  return (
    <fieldset className="rf-picker" disabled={disabled}>
      <legend className="lab-label">Response format</legend>
      <div className="rf-options">
        {RESPONSE_FORMATS.map(f => (
          <label key={f.key} className="rf-option" data-checked={value === f.key}>
            <input
              type="radio"
              name={name}
              value={f.key}
              checked={value === f.key}
              onChange={() => onChange(f.key)}
            />
            <span>
              <span className="rf-option-title">{f.label}</span>
              <span className="rf-option-desc">{f.desc}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="rf-note">You can switch between the two after the report is ready, at no extra cost.</p>
    </fieldset>
  );
}

/** Segmented switch above a finished report. */
export function ResponseFormatTabs({ value, onChange }: { value: ResponseFormat; onChange: (f: ResponseFormat) => void }) {
  return (
    <div className="rf-tabs" role="tablist" aria-label="Response format" data-no-print>
      {RESPONSE_FORMATS.map(f => (
        <button
          key={f.key}
          type="button"
          role="tab"
          aria-selected={value === f.key}
          className="rf-tab"
          data-active={value === f.key}
          title={f.desc}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
