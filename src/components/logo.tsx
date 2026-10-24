// Vector version of the Instagram logo: bold black TBK on a red circle
// (the original file is only 150px, too small for modern screens).
// Drawn as an SVG image so it scales crisply and screen readers announce "Trims by K".

export function LogoMark({ className = "", withName = false }: { className?: string; withName?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Trims by K" className={`shrink-0 ${className}`}>
      <circle cx="50" cy="50" r="50" fill="var(--color-red)" />
      <text
        x="50"
        y={withName ? 56 : 62}
        textAnchor="middle"
        fontFamily="var(--font-inter), Arial, sans-serif"
        fontWeight="900"
        fontSize="40"
        letterSpacing="-3"
        fill="#000"
      >
        TBK
      </text>
      {withName && (
        <text x="50" y="73" textAnchor="middle" fontFamily="var(--font-inter), Arial, sans-serif" fontWeight="500" fontSize="9" fill="#fff">
          Trims by K
        </text>
      )}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-9" />
      <span className="text-base font-bold tracking-tight text-fg" aria-hidden>
        Trims by K
      </span>
    </span>
  );
}
