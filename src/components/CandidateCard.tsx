import type { Candidate } from '../data/pageant';
import { Icon } from './Icon';

type CandidateCardProps = {
  candidate: Candidate;
  voteCount: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

export function CandidateCard({ candidate, voteCount, selected, disabled, onSelect }: CandidateCardProps) {
  return (
    <button
      aria-pressed={selected}
      className={`candidate-card candidate-card--${candidate.accent}${selected ? ' is-selected' : ''}`}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <span className="candidate-card__number">{candidate.number}</span>
      <span className="candidate-card__portrait" aria-hidden="true"><img alt="" src={candidate.image} width={512} height={512} loading="lazy" decoding="async" /></span>
      <span className="candidate-card__copy">
        <small>{candidate.location}</small>
        <strong>{candidate.name}</strong>
        <span><Icon name="heart" size={13} /> {voteCount.toLocaleString()} votes</span>
      </span>
      <span className="candidate-card__action">{selected ? 'Selected' : 'Vote'} <Icon name={selected ? 'check' : 'heart'} size={16} /></span>
    </button>
  );
}
