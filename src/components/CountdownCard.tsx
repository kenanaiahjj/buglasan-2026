/**
 * Dashboard countdown.
 *
 * This used to take a `values` prop fed from `pageantContent.countdown` — a
 * frozen `06d 12h 45m` written before `votingDeadlineISO` existed. It did not
 * count down. It did not even count: those three numbers were the same on
 * every render, on every day, for every visitor, under a label reading
 * "Voting ends in".
 *
 * It now counts against `festival.votingClosesAt`, which is whatever the
 * content service says — or the bundled date until one is configured. The
 * card is the same size in every state, so a minute ticking over does not
 * reflow the rail.
 */
import { useNow } from '../lib/clock';
import { useContent } from '../lib/contentStore';
import { countdownFrom } from '../lib/votingOverview';
import { Icon } from './Icon';

/** A minute is the smallest unit this card shows, so a minute is the tick. */
const TICK_MS = 30_000;

const pad = (value: number) => String(value).padStart(2, '0');

export function CountdownCard() {
  const { festival } = useContent();
  const now = useNow(TICK_MS);

  const closesAt = festival.votingClosesAt === undefined ? Number.NaN : Date.parse(festival.votingClosesAt);
  const known = Number.isFinite(closesAt);
  const countdown = countdownFrom(closesAt, now);

  return (
    <div className="countdown-card">
      <div className="countdown-label">
        <Icon name="calendar" size={16} />{' '}
        {countdown.closed ? 'Voting has closed' : 'Voting ends in'}
      </div>
      <div className="countdown-card__values">
        {/* Em dashes rather than zeroes when there is no date: "00 days
            00 hrs" under "Voting ends in" reads as closed, which is a
            different and much worse claim than "we do not know". */}
        <strong>{known ? pad(countdown.days) : '—'}</strong><span>days</span>
        <strong>{known ? pad(countdown.hours) : '—'}</strong><span>hrs</span>
        <strong>{known ? pad(countdown.minutes) : '—'}</strong><span>mins</span>
      </div>
      <p>{festival.votingDeadline}</p>
    </div>
  );
}
