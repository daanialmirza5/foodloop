export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#1b4d33" />
      <path d="M20 9c6.5 0 11 4.8 11 10.8 0 6.6-5 11.2-11 11.2-3.4 0-6.2-1.4-8.2-3.6" fill="none" stroke="#8cc35f" strokeWidth="3" strokeLinecap="round" />
      <path d="M11.8 27.4 10 31.6l4.6-.4" fill="none" stroke="#8cc35f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.2 15.5c-3.8.2-6.2 2.9-6.2 6.2 3.7 0 6.2-2.4 6.2-6.2Z" fill="#f5b544" />
      <path d="M20.6 15.5c.2 3.4 2.6 5.8 6 5.8 0-3.3-2.4-5.8-6-5.8Z" fill="#fdf0d8" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? "text-white" : "text-forest-900"}`}>
        Food<span className={light ? "text-leaf-400" : "text-leaf-600"}>Loop</span>
      </span>
    </span>
  );
}
