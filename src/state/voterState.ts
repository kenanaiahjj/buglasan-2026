import { candidates, type ContestArena } from '../data/pageant';
import { ARENA_VOTING, entriesForArena } from '../lib/arenaEntries';
import { isValidVoteQuantity } from '../lib/voteFlow';

export type ArenaId = ContestArena['id'];

/** Entry ids this person has backed, per arena. */
export type ArenaVotes = Record<ArenaId, string[]>;

/** Running public tallies, seeded from the source data. */
export type ArenaTallies = Record<ArenaId, Record<string, number>>;

const ARENA_IDS: ArenaId[] = ['hara', 'booths', 'festival', 'gandang'];

const emptyArenaVotes = (): ArenaVotes =>
  ARENA_IDS.reduce((acc, id) => {
    acc[id] = [];
    return acc;
  }, {} as ArenaVotes);

/**
 * Starting counts, taken from the `votes` field on each entry.
 *
 * These exist so the prototype is not a wall of zeroes. They are placeholders:
 * once `VITE_VOTING_API_URL` is set, `GET /tally` is the only source of counts
 * and this seed is overwritten on the first read. See VOTING_API.md.
 */
const seedTallies = (): ArenaTallies =>
  ARENA_IDS.reduce((acc, id) => {
    acc[id] = entriesForArena(id).reduce<Record<string, number>>((tally, entry) => {
      tally[entry.id] = entry.votes;
      return tally;
    }, {});
    return acc;
  }, {} as ArenaTallies);

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
  /* Arena voting is tracked separately from the dashboard's single-candidate
     flow: the two answer different questions (which queen did I crown, versus
     which of the four programs have I spent my votes in) and collapsing them
     would break the dashboard. */
  arenaVotes: ArenaVotes;
  arenaTallies: ArenaTallies;
};

export type VoterAction =
  | { type: 'navigate'; view: View }
  | { type: 'login'; identifier: string; password: string }
  | { type: 'selectCandidate'; candidateId: string }
  | { type: 'confirmVote' }
  | { type: 'setSection'; section: VoterState['activeSection'] }
  | { type: 'castArenaVote'; arenaId: ArenaId; entryId: string; quantity?: number }
  | { type: 'undoArenaVote'; arenaId: ArenaId; entryId: string };

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
  arenaVotes: emptyArenaVotes(),
  arenaTallies: seedTallies(),
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

    case 'castArenaVote': {
      const { arenaId, entryId } = action;
      const spent = state.arenaVotes[arenaId];
      const isPaidOrder = action.quantity !== undefined;
      const quantity = action.quantity ?? 1;

      if (!isValidVoteQuantity(quantity)) return state;

      // Guard here rather than only in the view: a disabled button is a
      // courtesy, not a rule, and double-submits are the normal way a tally
      // goes wrong. A confirmed paid order is allowed to add its full
      // quantity, including a second purchase for the same entry. The
      // quantity-less action remains the legacy one-vote path.
      if (!isPaidOrder && (spent.includes(entryId) || spent.length >= ARENA_VOTING[arenaId].allowance)) return state;
      return {
        ...state,
        arenaVotes: {
          ...state.arenaVotes,
          [arenaId]: spent.includes(entryId) ? spent : [...spent, entryId],
        },
        arenaTallies: {
          ...state.arenaTallies,
          [arenaId]: {
            ...state.arenaTallies[arenaId],
            [entryId]: (state.arenaTallies[arenaId][entryId] ?? 0) + quantity,
          },
        },
      };
    }

    /* Only reachable while the confirmation toast is still up. A vote that can
       never be taken back makes people hesitate to cast one at all. */
    case 'undoArenaVote': {
      const { arenaId, entryId } = action;
      const spent = state.arenaVotes[arenaId];
      if (!spent.includes(entryId)) return state;
      return {
        ...state,
        arenaVotes: { ...state.arenaVotes, [arenaId]: spent.filter((id) => id !== entryId) },
        arenaTallies: {
          ...state.arenaTallies,
          [arenaId]: {
            ...state.arenaTallies[arenaId],
            [entryId]: Math.max(0, (state.arenaTallies[arenaId][entryId] ?? 1) - 1),
          },
        },
      };
    }
  }
}
