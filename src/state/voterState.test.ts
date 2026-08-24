import { describe, expect, it } from 'vitest';
import { initialVoterState, voterReducer } from './voterState';

describe('voterReducer', () => {
  it('moves from landing to login', () => {
    expect(voterReducer(initialVoterState, { type: 'navigate', view: 'login' }).view).toBe('login');
  });

  it('rejects an empty login submission', () => {
    const next = voterReducer(initialVoterState, { type: 'login', identifier: '', password: '' });
    expect(next.loginError).toBe('Enter your email or mobile number and password.');
    expect(next.isAuthenticated).toBe(false);
  });

  it('authenticates a non-empty demo login', () => {
    const next = voterReducer(initialVoterState, { type: 'login', identifier: 'juan@example.com', password: 'secret' });
    expect(next.isAuthenticated).toBe(true);
    expect(next.view).toBe('dashboard');
    expect(next.loginError).toBe('');
  });

  it('selects and confirms one candidate vote', () => {
    const loggedIn = voterReducer(initialVoterState, { type: 'login', identifier: 'juan@example.com', password: 'secret' });
    const selected = voterReducer(loggedIn, { type: 'selectCandidate', candidateId: 'c-02' });
    const confirmed = voterReducer(selected, { type: 'confirmVote' });

    expect(confirmed.selectedCandidateId).toBe('c-02');
    expect(confirmed.voteConfirmed).toBe(true);
    expect(confirmed.votesRemaining).toBe(0);
    expect(confirmed.votesByCandidate['c-02']).toBe(1981);
  });

  it('does not confirm a second vote after the daily vote is used', () => {
    const loggedIn = voterReducer(initialVoterState, { type: 'login', identifier: 'juan@example.com', password: 'secret' });
    const selected = voterReducer(loggedIn, { type: 'selectCandidate', candidateId: 'c-02' });
    const confirmed = voterReducer(selected, { type: 'confirmVote' });
    const secondSelection = voterReducer(confirmed, { type: 'selectCandidate', candidateId: 'c-03' });
    const secondConfirmation = voterReducer(secondSelection, { type: 'confirmVote' });

    expect(secondConfirmation.votesByCandidate['c-03']).toBe(1102);
    expect(secondConfirmation.votesRemaining).toBe(0);
  });
});
