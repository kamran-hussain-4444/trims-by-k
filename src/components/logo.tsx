// Crisp vector version of the TBK logo (the original file is only 150px).
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex aspect-square items-center justify-center rounded-full bg-red font-display font-extrabold tracking-tighter text-black ${className}`}
    >
      TBK
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-2xl font-extrabold italic tracking-tight ${className}`}>
      TB<span className="text-red">K</span>
    </span>
  );
}
