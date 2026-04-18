// LabPulse logo — chromatogram peak icon inside a rounded navy square.
// The peak motif is instantly recognisable to analytical chemists.

interface Props {
  size?: number;
  showWordmark?: boolean;
  wordmarkClass?: string;
}

export default function Logo({ size = 36, showWordmark = true, wordmarkClass }: Props) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5625rem', textDecoration: 'none' }}>
      {/* Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        {/* Rounded square background */}
        <rect width="40" height="40" rx="10" fill="#0a1628" />

        {/* Subtle grid lines in bg */}
        <line x1="20" y1="4" x2="20" y2="36" stroke="#1a2d50" strokeWidth="0.5" />
        <line x1="4" y1="20" x2="36" y2="20" stroke="#1a2d50" strokeWidth="0.5" />

        {/* Chromatogram baseline */}
        <line x1="5" y1="30" x2="35" y2="30" stroke="#2a4f80" strokeWidth="1.25" />

        {/* Main peak — Gaussian-like Bézier, teal */}
        <path
          d="M5,30 L9,30 C10.5,30 12,30 13.5,28.5 C15.5,26 18,18 20,9 C22,18 24.5,26 26.5,28.5 C28,30 29.5,30 31,30 L35,30"
          stroke="#14b8a6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Peak fill gradient */}
        <path
          d="M13.5,28.5 C15.5,26 18,18 20,9 C22,18 24.5,26 26.5,28.5 Z"
          fill="url(#peakGrad)"
          opacity="0.18"
        />

        {/* Small secondary peak (right) */}
        <path
          d="M27,30 C27.5,30 28,30 28.5,29 C29,28 30,26 30.5,25 C31,26 32,28 32.5,29 C33,30 33.5,30 34,30"
          stroke="#0f9188"
          strokeWidth="1.25"
          strokeLinecap="round"
          fill="none"
          opacity="0.65"
        />

        {/* Peak tip highlight dot */}
        <circle cx="20" cy="9" r="1.25" fill="#2dd4bf" opacity="0.85" />

        <defs>
          <linearGradient id="peakGrad" x1="20" y1="9" x2="20" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0a1628" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className={wordmarkClass}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: `${size * 0.5}px`,
            color: 'var(--color-navy-900)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Lab<span style={{ color: 'var(--color-teal-600)' }}>Pulse</span>
        </span>
      )}
    </span>
  );
}
