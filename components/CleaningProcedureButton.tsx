'use client';

import { useState } from 'react';
import CleaningProcedureModal from './CleaningProcedureModal';

interface Props {
  technique: string;
  vendor: string;
  model: string;
}

export default function CleaningProcedureButton({ technique, vendor, model }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const disabled = !technique.trim();

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.5rem 1.125rem',
          background: disabled ? '#f1f5f9' : hovered ? 'var(--color-teal-50)' : 'transparent',
          border: `1.5px solid ${disabled ? 'var(--color-slate-200)' : hovered ? 'var(--color-teal-500)' : 'var(--color-slate-300)'}`,
          borderRadius: '8px',
          fontFamily: 'var(--font-display)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: disabled ? 'var(--color-slate-400)' : hovered ? 'var(--color-teal-700)' : 'var(--color-slate-500)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all .15s ease',
        }}
      >
        {/* Beaker / cleaning icon */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6 1.5h4M6.5 1.5v4.25L3 12.5a1.5 1.5 0 001.29 2.25h7.42A1.5 1.5 0 0013 12.5L9.5 5.75V1.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 10.5h7"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        Cleaning Procedure
      </button>

      {open && (
        <CleaningProcedureModal
          technique={technique}
          vendor={vendor}
          model={model}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
