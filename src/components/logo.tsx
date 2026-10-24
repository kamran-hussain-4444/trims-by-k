// Vector version of the Instagram logo: bold black TBK on a red circle
// (the original file is only 150px, too small for modern screens).

export function LogoMark({ className = "", withName = false }: { className?: string; withName?: boolean }) {
  return (
    <span
      className={`inline-flex aspect-square shrink-0 flex-col items-center justify-center rounded-full bg-red font-sans leading-none text-black ${className}`}
    >
      <span className="font-black tracking-[-0.08em]">TBK</span>
      {withName && <span className="mt-[0.35em] text-[0.22em] font-medium tracking-normal text-white">Trims by K</span>}
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-9 text-[13px]" />
      <span className="text-base font-bold tracking-tight text-fg">Trims by K</span>
    </span>
  );
}
