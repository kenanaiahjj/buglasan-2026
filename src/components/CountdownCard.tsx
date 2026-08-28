/**
 * Dashboard countdown.
 *
 * `values` comes from `pageantContent.countdown`, which is a frozen
 * `06d 12h 45m` from before `votingDeadlineISO` existed — this card does not
 * count down. The wall board computes the real remaining time with
 * `countdownFrom()`; pointing this at the same function is a two-line change
 * and is listed in VOTING_API.md.
 */
import { pageantContent } from '../data/pageant';
import { Icon } from './Icon';

export function CountdownCard({ values }: { values: { days: string; hours: string; minutes: string } }) {
  return (
    <div className="countdown-card">
      <div className="countdown-label"><Icon name="calendar" size={16} /> Voting ends in</div>
      <div className="countdown-card__values">
        <strong>{values.days}</strong><span>days</span>
        <strong>{values.hours}</strong><span>hrs</span>
        <strong>{values.minutes}</strong><span>mins</span>
      </div>
      <p>{pageantContent.votingDeadline}</p>
    </div>
  );
}
