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
      <p>June 10, 2026 · 11:59 PM</p>
    </div>
  );
}
