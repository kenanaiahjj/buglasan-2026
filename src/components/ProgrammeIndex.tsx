import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { contestArenas, type ContestArena } from '../data/pageant';
import { arenaDisplayName } from '../lib/arenaEntries';

/**
 * The four programmes, set as a bill.
 *
 * This used to be four cards, each carrying a numbered eyebrow, a subtitle, a
 * "Voting Open" tag, a title, a crest, a tagline, a paragraph, three labelled
 * fields and two buttons. Nine kinds of thing to say four names — and the
 * arched plaques in the hero had already said them once.
 *
 * So it is a list now, not a grid: names stacked large on hairline rules, the
 * way a festival bill or a theatre programme sets its events. One line of
 * difference under each name, the two facts that decide whether you care, and
 * one action. Everything else lives on the programme's own page, which is
 * exactly one click away.
 */

type ProgrammeIndexProps = {
  onEnter: (id: ContestArena['id']) => void;
};

export function ProgrammeIndex({ onEnter }: ProgrammeIndexProps) {
  return (
    <ol className="programme-index">
      {contestArenas.map((arena) => (
        <li key={arena.id}>
          <button
            className="programme-row"
            data-reveal
            id={`contest-card-${arena.id}`}
            onClick={() => onEnter(arena.id)}
            type="button"
          >
            <span className="programme-row__name">{arenaDisplayName(arena)}</span>
            <span className="programme-row__note">{arena.subtitle}</span>
            {/* Entries and dates decide whether you open it. The venue is a
                travel decision, and it belongs on the page you open. */}
            <span className="programme-row__facts">
              <span>{arena.totalEntries} entries</span>
              <span aria-hidden="true">·</span>
              <span>{arena.dateRange}</span>
            </span>
            <span aria-hidden="true" className="programme-row__go">
              <ArrowRight size={17} weight="bold" />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
