import { candidates } from '../data/pageant';

export type View = 'landing' | 'login' | 'dashboard';

export type VoterState = {
  view: View;
  isAuthenticated: boolean;
  identifier: string;
  loginError: string;
  selectedCandidateId: string | null;
  voteConfirmed: boolean;
  votesRemaining: number;
  votesByCandidate: Record<string, number>;
  activeSection: 'dashboard' | 'vote' | 'contestants' | 'rankings' | 'mechanics' | 'faqs' | 'announcements';
};

export type VoterAction =
  | { type: 'navigate'; view: View }
  | { type: 'login'; identifier: string; password: string }
  | { type: 'selectCandidate'; candidateId: string }
  | { type: 'confirmVote' }
  | { type: 'setSection'; section: VoterState['activeSection'] };

export const initialVoterState: VoterState = {
  view: 'landing',
  isAuthenticated: false,
  identifier: '',
  loginError: '',
  selectedCandidateId: null,
  voteConfirmed: false,
  votesRemaining: 1,
  votesByCandidate: Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate.votes])),
  activeSection: 'dashboard',
};

export function voterReducer(state: VoterState, action: VoterAction): VoterState {
  switch (action.type) {
    case 'navigate':
      return { ...state, view: action.view, loginError: '' };
    case 'login':
      if (!action.identifier.trim() || !action.password.trim()) {
        return { ...state, loginError: 'Enter your email or mobile number and password.' };
      }
      return { ...state, view: 'dashboard', isAuthenticated: true, identifier: action.identifier, loginError: '' };
    case 'selectCandidate':
      if (state.voteConfirmed || state.votesRemaining === 0) return state;
      return { ...state, selectedCandidateId: action.candidateId };
    case 'confirmVote': {
      if (state.voteConfirmed || state.votesRemaining === 0 || !state.selectedCandidateId) return state;
      return {
        ...state,
        voteConfirmed: true,
        votesRemaining: 0,
        votesByCandidate: {
          ...state.votesByCandidate,
          [state.selectedCandidateId]: state.votesByCandidate[state.selectedCandidateId] + 1,
        },
      };
    }
    case 'setSection':
      return { ...state, activeSection: action.section };
  }
}
