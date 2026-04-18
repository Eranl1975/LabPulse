'use client';

import { useState, useRef, useEffect } from 'react';

interface ComboInputProps {
  value: string;
  onChange: (val: string) => void;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  /** If true the dropdown is shown as a categorised list (options separated by ─) */
  grouped?: boolean;
}

export default function ComboInput({
  value, onChange, options, placeholder, required,
}: ComboInputProps) {
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const filtered = value.trim()
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  const showDropdown = open && filtered.length > 0;

  // ── Border/bg style helpers ────────────────────────────────────────────────
  const borderColor = focused
    ? 'var(--color-teal-500)'
    : 'var(--color-slate-200)';
  const shadow = focused ? '0 0 0 3px rgba(20,184,166,.15)' : 'none';
  const bg     = focused ? '#fff' : 'var(--color-slate-50)';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      {/* Input row */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
            if (e.key === 'ArrowDown' && !open) setOpen(true);
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0.6875rem 2.5rem 0.6875rem 0.9375rem',
            background: bg,
            border: `1.5px solid ${borderColor}`,
            borderRadius: '8px',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9375rem',
            color: 'var(--color-navy-900)',
            outline: 'none',
            transition: 'border-color .15s ease, box-shadow .15s ease, background .15s ease',
            boxShadow: shadow,
            lineHeight: 1.4,
          }}
        />

        {/* Chevron toggle */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen(v => !v); inputRef.current?.focus(); }}
          aria-label={open ? 'Close options' : 'Show options'}
          style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: 'transform .2s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            color: focused ? 'var(--color-teal-500)' : 'var(--color-slate-400)',
            display: 'flex',
            alignItems: 'center',
            transition: 'transform .2s ease, color .15s ease',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1.5px solid var(--color-teal-400)',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(15,23,42,.13), 0 2px 8px rgba(15,23,42,.07)',
            zIndex: 200,
            maxHeight: '236px',
            overflowY: 'auto',
            padding: '0.3125rem',
          }}
        >
          {/* "Type custom…" hint when there are exact matches */}
          {value.trim() && !filtered.some(o => o.toLowerCase() === value.toLowerCase()) && (
            <div
              role="option"
              aria-selected={false}
              onMouseDown={e => { e.preventDefault(); setOpen(false); }}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                color: 'var(--color-slate-400)',
                fontStyle: 'italic',
                marginBottom: '0.125rem',
              }}
            >
              ↩ Use &ldquo;{value}&rdquo; as custom value
            </div>
          )}

          {filtered.map(opt => {
            const isSelected = opt.toLowerCase() === value.toLowerCase();
            return (
              <ComboOption
                key={opt}
                label={opt}
                selected={isSelected}
                onSelect={() => { onChange(opt); setOpen(false); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Option row ────────────────────────────────────────────────────────────────
function ComboOption({
  label, selected, onSelect,
}: {
  label: string; selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="option"
      aria-selected={selected}
      onMouseDown={e => { e.preventDefault(); onSelect(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5625rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: selected ? 600 : 400,
        color: selected ? 'var(--color-teal-600)' : 'var(--color-slate-700)',
        background: selected
          ? 'var(--color-teal-50)'
          : hovered
          ? 'var(--color-slate-50)'
          : 'transparent',
        transition: 'background .1s ease',
      }}
    >
      {/* Checkmark for selected */}
      <span style={{
        width: '14px',
        flexShrink: 0,
        color: 'var(--color-teal-500)',
        visibility: selected ? 'visible' : 'hidden',
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      {label}
    </div>
  );
}
