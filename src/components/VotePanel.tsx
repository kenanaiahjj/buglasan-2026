/**
 * The dashboard's one-vote-a-day panel.
 *
 * Predates the paid flow and is a separate mechanism: it drives
 * `selectedCandidateId` / `voteConfirmed` / `votesRemaining` in the reducer,
 * not `arenaVotes` / `arenaTallies`, and it charges nothing. Merging the two
 * would break the dashboard, so they were deliberately left apart.
 *
 * If the festival only ever sells votes, this panel and its reducer branch are
 * the next things to delete. See VOTING_API.md.
 */
import type { Dispatch } from 'react';
import { candidates } from '../data/pageant';
import type { VoterAction, VoterState } from '../state/voterState';
import { CandidateCard } from './CandidateCard';
import { Icon } from './Icon';
import { SectionHeading } from './SectionHeading';

export function VotePanel({ state, dispatch, title = 'Choose your candidate' }: { state: VoterState; dispatch: Dispatch<VoterAction>; title?: string }) {
  const selected = candidates.find((candidate) => candidate.id === state.selectedCandidateId);
  const canVote = state.isAuthenticated && !state.voteConfirmed && state.votesRemaining > 0;

  if (state.voteConfirmed && selected) {
    return (
      <section className="panel vote-panel" aria-labelledby="vote-confirmed-title">
        <div className="vote-confirmed" role="status">
          <span className="success-mark"><Icon name="check" size={24} /></span>
          <span className="eyebrow">Daily vote recorded</span>
          <h2 id="vote-confirmed-title">Your vote is <em>in.</em></h2>
          <p>You voted for <strong>{selected.name}</strong> of {selected.location}. Come back tomorrow for another vote.</p>
          <div className="vote-confirmed__meta"><span>Candidate {selected.number}</span><span>1 vote used today</span></div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel vote-panel" aria-labelledby="vote-title">
      <SectionHeading eyebrow="Make it count" title={title} />
      <div className="candidate-grid candidate-grid--dashboard">
        {candidates.map((candidate) => (
          <CandidateCard key={candidate.id} candidate={candidate} voteCount={state.votesByCandidate[candidate.id]} selected={candidate.id === state.selectedCandidateId} disabled={!canVote} onSelect={() => dispatch({ type: 'selectCandidate', candidateId: candidate.id })} />
        ))}
      </div>
      {state.votesRemaining === 0 && <p className="vote-locked-note"><Icon name="check" size={15} /> Your vote for today has already been used. Come back tomorrow.</p>}
      <button className="button button--primary button--full vote-confirm-button" disabled={!state.selectedCandidateId || !canVote} onClick={() => dispatch({ type: 'confirmVote' })} type="button">{state.selectedCandidateId ? 'Confirm my vote' : 'Select a candidate first'} <Icon name="arrow" size={17} /></button>
    </section>
  );
}
