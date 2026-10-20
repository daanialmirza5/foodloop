import Link from "next/link";
import { Logo } from "./logo";

const COLS = [
  {
    title: "Give",
    links: [
      ["/donate", "Donate food"],
      ["/events", "Event food rescue"],
      ["/fresh", "Fresh meals & sponsorship"],
      ["/donate-money", "Donate money"],
    ],
  },
  {
    title: "Receive & help",
    links: [
      ["/find-support", "Find food support"],
      ["/discover", "Discover food (NGOs)"],
      ["/register?role=volunteer", "Volunteer with us"],
      ["/events/partners", "Venue & caterer partners"],
    ],
  },
  {
    title: "Platform",
    links: [
      ["/how-it-works", "How it works"],
      ["/food-safety", "Food safety"],
      ["/impact", "Impact dashboard"],
      ["/about", "About FoodLoop"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/privacy", "Privacy policy"],
      ["/terms", "Terms of use"],
      ["/food-safety#disclaimer", "Safety disclaimer"],
      ["/demo", "Demo access"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-forest-900 text-forest-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-forest-200">Rescue Food. Share Hope. Feed Communities. Every meal deserves a chance to make a difference.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold text-white">{c.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-forest-200 hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-forest-300 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} FoodLoop — a student social-impact project. Not a registered charity; no tax benefits are offered.</p>
          <p>FoodLoop coordinates donations and does not replace safe food handling or legal compliance.</p>
        </div>
      </div>
    </footer>
  );
}
