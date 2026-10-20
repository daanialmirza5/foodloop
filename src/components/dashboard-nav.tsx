"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle, BarChart3, Bell, Building2, CalendarHeart, ClipboardList, FileClock, HandCoins, Inbox, LayoutDashboard, ListChecks, MapPinned,
  PackageCheck, PlusCircle, Search, Settings, ShieldCheck, Siren, Truck, UserRound, Users, Wallet, Handshake, ScrollText, Utensils,
} from "lucide-react";
import { cn } from "@/lib/format";
import type { Role } from "@/lib/constants";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const COMMON: Item[] = [
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile & Settings", icon: UserRound },
];

export const NAV: Record<Role, Item[]> = {
  donor: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/listings", label: "My Food Donations", icon: Utensils },
    { href: "/dashboard/listings/new", label: "Add Food Donation", icon: PlusCircle },
    { href: "/dashboard/events", label: "My Events", icon: CalendarHeart },
    { href: "/dashboard/events/urgent", label: "Urgent Event Rescue", icon: Siren },
    { href: "/dashboard/requests", label: "Incoming Requests", icon: Inbox },
    { href: "/dashboard/collections", label: "Collection Tracking", icon: Truck },
    { href: "/dashboard/history", label: "Donation History", icon: FileClock },
    { href: "/dashboard/impact", label: "Impact Reports", icon: BarChart3 },
    { href: "/dashboard/contributions", label: "Monetary Contributions", icon: Wallet },
    { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
    { href: "/dashboard/organization", label: "Business Profile", icon: Building2 },
    ...COMMON,
  ],
  ngo: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/discover", label: "Browse Available Food", icon: Search },
    { href: "/dashboard/requests", label: "My Requests", icon: ClipboardList },
    { href: "/dashboard/deliveries", label: "Deliveries & Receipts", icon: PackageCheck },
    { href: "/dashboard/needs", label: "Food Requirements", icon: ListChecks },
    { href: "/dashboard/history", label: "Donation History", icon: FileClock },
    { href: "/dashboard/incidents", label: "Report a Problem", icon: AlertTriangle },
    { href: "/dashboard/organization", label: "Organisation & Verification", icon: ShieldCheck },
    ...COMMON,
  ],
  volunteer: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/tasks", label: "Available Tasks", icon: MapPinned },
    { href: "/dashboard/assignments", label: "My Assignments", icon: Truck },
    { href: "/dashboard/volunteer-profile", label: "Volunteer Profile", icon: Users },
    { href: "/dashboard/incidents", label: "Report a Problem", icon: AlertTriangle },
    ...COMMON,
  ],
  supporter: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/contributions", label: "My Contributions", icon: Wallet },
    { href: "/donate-money", label: "Donate Money", icon: HandCoins },
    { href: "/impact", label: "Platform Impact", icon: BarChart3 },
    ...COMMON,
  ],
  admin: [
    { href: "/admin", label: "Platform Overview", icon: LayoutDashboard },
    { href: "/admin/listings", label: "Listing Moderation", icon: ShieldCheck },
    { href: "/admin/events", label: "Events", icon: CalendarHeart },
    { href: "/admin/logistics", label: "Logistics & Collections", icon: Truck },
    { href: "/admin/requests", label: "Requests & Deliveries", icon: PackageCheck },
    { href: "/admin/organizations", label: "NGO Verification", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/incidents", label: "Safety Incidents", icon: AlertTriangle },
    { href: "/admin/payments", label: "Payments & Funds", icon: Wallet },
    { href: "/admin/partners", label: "Venue Partners", icon: Handshake },
    { href: "/admin/reports", label: "Reports & Exports", icon: BarChart3 },
    { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
    { href: "/admin/settings", label: "Platform Settings", icon: Settings },
    ...COMMON,
  ],
};

export function DashboardNav({ role, title }: { role: Role; title: string }) {
  const pathname = usePathname();
  const items = NAV[role];
  const isActive = (href: string) => (href === "/dashboard" || href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  // pick the most specific match so "/dashboard/listings/new" doesn't also light "/dashboard/listings"
  const active = items.filter((i) => isActive(i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <>
      <nav aria-label="Dashboard" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {items.map((i) => (
          <Link key={i.href} href={i.href} aria-current={active === i.href ? "page" : undefined} className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium", active === i.href ? "bg-forest-700 text-white" : "bg-white text-ink/80 ring-1 ring-black/5")}>
            <i.icon className="size-3.5" /> {i.label}
          </Link>
        ))}
      </nav>
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-24">
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
          <nav aria-label="Dashboard" className="flex flex-col gap-0.5">
            {items.map((i) => (
              <Link key={i.href} href={i.href} aria-current={active === i.href ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition", active === i.href ? "bg-forest-700 text-white" : "text-ink/75 hover:bg-white hover:text-forest-800")}>
                <i.icon className="size-4" /> {i.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
