import Link from "next/link";

export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-ink" />
      <circle cx="12" cy="16" r="4.2" className="fill-accent" />
      <circle cx="21" cy="16" r="4.2" fill="#d6f25c" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-ink no-underline">
      <Mark />
      <span className="font-display text-xl tracking-tight">Tandem</span>
    </Link>
  );
}
