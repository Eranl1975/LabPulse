export type DisplayMode = 'concise' | 'standard' | 'deep' | 'manager';

interface Props {
  selected: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

const MODES: { key: DisplayMode; label: string; desc: string }[] = [
  { key: 'concise',  label: 'Concise',       desc: 'Quick summary' },
  { key: 'standard', label: 'Standard',       desc: 'Full guidance' },
  { key: 'deep',     label: 'Deep Technical', desc: 'Expert detail' },
  { key: 'manager',  label: 'Manager',        desc: 'Brief overview' },
];

export default function ModeSwitcher({ selected, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Answer detail level"
      style={{
        display: 'flex',
        gap: '0.3125rem',
        padding: '0.3rem',
        background: 'var(--color-slate-100)',
        borderRadius: '11px',
        marginBottom: '1.375rem',
        width: '100%',
      }}
    >
      {MODES.map(({ key, label, desc }) => {
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            title={desc}
            onClick={() => onChange(key)}
            style={{
              flex: 1,
              padding: '0.5625rem 0.375rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: '0.8125rem',     /* ↑ was 0.8rem */
              fontWeight: 700,
              letterSpacing: '0.01em',
              transition: 'all .18s ease',
              background:  active ? '#fff' : 'transparent',
              color:       active ? 'var(--color-teal-600)' : 'var(--color-slate-500)',
              boxShadow:   active ? '0 1px 5px rgba(15,23,42,.10)' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
