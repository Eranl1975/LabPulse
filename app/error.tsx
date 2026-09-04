'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem 1rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: '3rem',
        height: '3rem',
        borderRadius: '50%',
        background: 'var(--color-red-50, #fef2f2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-red-500, #ef4444)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display, sans-serif)',
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--color-navy-900, #1e293b)',
        marginBottom: '0.75rem',
      }}>
        Something went wrong
      </h2>

      <p style={{
        color: 'var(--color-slate-500, #64748b)',
        fontSize: '0.9375rem',
        marginBottom: '1.5rem',
        maxWidth: '400px',
      }}>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>

      <button
        onClick={reset}
        style={{
          padding: '0.625rem 1.5rem',
          background: 'var(--color-teal-600, #0d9488)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md, 8px)',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
