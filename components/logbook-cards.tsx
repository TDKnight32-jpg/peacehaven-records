import type { ReactNode } from "react";

// Numbered, lane-coloured cards used by the Training logbook's reading pages
// (definitions, warm ups). Card n takes lane n's colour from the calculator,
// via the l1 to l6 classes in app/logbook/logbook.css.
export type LogbookCard = {
  name: string;
  rows: { label: string; content: ReactNode }[];
};

export function LogbookCards({ cards }: { cards: LogbookCard[] }) {
  return (
    <ol className="cards">
      {cards.map((card, i) => (
        <li key={card.name} className={`card l${i + 1}`}>
          <span className="num" aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <h2>{card.name}</h2>
            <dl>
              {card.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.content}</dd>
                </div>
              ))}
            </dl>
          </div>
        </li>
      ))}
    </ol>
  );
}
