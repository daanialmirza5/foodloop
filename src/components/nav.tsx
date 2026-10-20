import Link from "next/link";
import { Bell } from "lucide-react";
import { getActor } from "@/lib/session";
import { unreadCount } from "@/lib/services/notifications";
import { ROLE_LABELS } from "@/lib/constants";
import { isDemoMode } from "@/lib/utils";
import { logoutAction } from "@/lib/actions";
import { MobileMenu, AccountMenu } from "./nav-client";
import { Logo } from "./logo";

export const NAV_LINKS = [
  { href: "/events", label: "Event Food Rescue" },
  { href: "/discover", label: "Discover Food" },
  { href: "/donate", label: "Donate Food" },
  { href: "/donate-money", label: "Donate Money" },
  { href: "/find-support", label: "Find Food Support" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/impact", label: "Impact" },
  { href: "/about", label: "About" },
];

export async function Navbar() {
  const actor = await getActor();
  const unread = actor ? unreadCount(actor.id) : 0;
  const dash = actor?.role === "admin" ? "/admin" : "/dashboard";
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/75">
      {isDemoMode() && (
        <div className="bg-forest-900 px-4 py-1.5 text-center text-xs text-forest-50">
          <strong className="font-semibold text-saffron-400">Demonstration mode.</strong> Records marked DEMO are fictional. Payments are simulated — no real money is transferred.{" "}
          <Link href="/demo" className="underline underline-offset-2">
            Demo accounts
          </Link>
        </div>
      )}
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0" aria-label="FoodLoop home">
          <Logo />
        </Link>
        <nav className="ml-2 hidden items-center xl:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-medium text-ink/80 transition hover:bg-forest-50 hover:text-forest-800">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actor ? (
            <>
              <Link href="/dashboard/notifications" className="relative grid size-10 place-items-center rounded-xl text-forest-800 hover:bg-forest-50" aria-label={`Notifications, ${unread} unread`}>
                <Bell className="size-5" />
                {unread > 0 && <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-saffron-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
              </Link>
              <AccountMenu name={actor.name} roleLabel={ROLE_LABELS[actor.role]} dashHref={dash} logout={logoutAction} isAdmin={actor.role === "admin"} />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden whitespace-nowrap sm:inline-flex">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary hidden whitespace-nowrap sm:inline-flex">
                Get Started
              </Link>
            </>
          )}
          <MobileMenu links={NAV_LINKS} signedIn={!!actor} dashHref={dash} />
        </div>
      </div>
    </header>
  );
}
