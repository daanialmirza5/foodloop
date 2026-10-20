"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";

export function MobileMenu({ links, signedIn, dashHref }: { links: { href: string; label: string }[]; signedIn: boolean; dashHref: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="xl:hidden">
      <button type="button" className="grid size-10 place-items-center rounded-xl text-forest-800 hover:bg-forest-50" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {/* Portal: the sticky header uses backdrop-filter, which would trap a fixed overlay inside it. */}
      {open &&
        createPortal(
        <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 overflow-y-auto bg-cream px-4 pb-10 pt-3">
          <div className="mb-2 flex justify-end">
            <button type="button" className="grid size-10 place-items-center rounded-xl text-forest-800 hover:bg-forest-50" aria-label="Close menu" onClick={() => setOpen(false)} autoFocus>
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-forest-50">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid gap-2 border-t border-black/5 pt-4">
            {signedIn ? (
              <Link href={dashHref} className="btn-primary">
                My Dashboard
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary">
                  Get Started
                </Link>
                <Link href="/login" className="btn-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}

export function AccountMenu({ name, roleLabel, dashHref, logout, isAdmin }: { name: string; roleLabel: string; dashHref: string; logout: () => Promise<void>; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 hover:bg-forest-50">
        <span className="grid size-8 place-items-center rounded-lg bg-forest-700 text-xs font-bold text-white">{initials}</span>
        <ChevronDown className="hidden size-4 text-muted sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-black/5 bg-white p-1.5 shadow-[var(--shadow-lift)]">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-forest-900">{name}</p>
            <p className="text-xs text-muted">{roleLabel}</p>
          </div>
          <Link role="menuitem" href={dashHref} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-forest-50">
            <LayoutDashboard className="size-4" /> {isAdmin ? "Admin dashboard" : "My dashboard"}
          </Link>
          <Link role="menuitem" href="/dashboard/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-forest-50">
            <UserRound className="size-4" /> Profile & settings
          </Link>
          <form action={logout}>
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
