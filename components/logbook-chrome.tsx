import Link from "next/link";

// Header and footer shared by every Training logbook page, so they stay
// identical. Styled by app/logbook/logbook.css.

// Links use the /logbook prefix like the rest of the site's sections
// (/gp/...); proxy.ts leaves prefixed paths alone on logbook.peacehavenrunclub.com.
const PAGES = [
  { id: "calculator", href: "/logbook", label: "Pace calculator" },
  { id: "definitions", href: "/logbook/definitions", label: "Training definitions" },
  { id: "warm-up", href: "/logbook/warm-up", label: "Warm ups and cool downs" },
] as const;

export type LogbookPageId = (typeof PAGES)[number]["id"];

// Each page says which one it is, rather than reading the URL, because the
// URL differs on the logbook subdomain (/ vs /logbook).
export function LogbookHeader({
  current,
  title,
  intro,
}: {
  current: LogbookPageId;
  title: string;
  intro: string;
}) {
  return (
    <header>
      <div className="top">
        {/* A full half-circle track bend hanging from the top edge: circles
            centred on the top edge, so only their lower halves show. 268
            wide = outer lane radius 124 + half its 20 stroke, on each side. */}
        <svg className="bend" viewBox="0 0 268 134" aria-hidden="true">
          <g fill="none" strokeWidth="20">
            <circle cx="134" cy="0" r="58" stroke="#A8321C" />
            <circle cx="134" cy="0" r="80" stroke="#D4521F" />
            <circle cx="134" cy="0" r="102" stroke="#E2A21B" />
            <circle cx="134" cy="0" r="124" stroke="#1E6A44" />
          </g>
        </svg>
        <p className="club">Peacehaven Run Club</p>
        <h1>{title}</h1>
        <p className="intro">{intro}</p>
      </div>
      <div className="stripes" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </div>
      <nav className="pages" aria-label="Training logbook pages">
        <ul>
          {PAGES.map((page) => (
            <li key={page.id}>
              <Link href={page.href} aria-current={page.id === current ? "page" : undefined}>
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function LogbookFooter() {
  return (
    <footer>
      <p>Paces are worked out with the Daniels and Gilbert running formulas.</p>
      <p>Made in collaboration with Tommy Knight Coaching.</p>
    </footer>
  );
}
