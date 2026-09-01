import { useState } from 'react';
import type { Dispatch } from 'react';
import type { ContestArena } from '../data/pageant';
import type { VoterAction } from '../state/voterState';
import { HaraGallery } from './HaraGallery';
import { VoteFlowModal, type VoteFlowMode } from './VoteFlowModal';

/**
 * One programme's page: the roster, and the dialog that votes on it.
 *
 * This used to hold a second, tabbed layout — hero, criteria, schedule,
 * rankings — behind a `useGallery` flag that was hardcoded `true`, so roughly
 * four hundred lines of it were unreachable. Unreachable UI is worse than
 * missing UI: it reads as a feature to anyone scanning the file and it rots
 * without anyone noticing.
 *
 * That layout is gone. What it showed and nothing else does now:
 *
 *  - judging criteria, still in `arena.criteria`
 *  - the schedule, still in `arena.dateRange`
 *  - the venue, still in `arena.venue`
 *
 * All three are one field away if they should come back — build them into the
 * gallery rather than restoring a parallel page. `git show HEAD~:` has the
 * original if the markup is worth reusing.
 */

type ContestSubpageViewProps = {
  arena: ContestArena;
  onBackToHub: () => void;
  onOpenEntry: (entryId: string) => void;
  onOpenOverview: () => void;
  /** Kept for the programme switcher; the gallery does not use it yet. */
  onSwitchArena: (id: ContestArena['id']) => void;
  /** Live counts for this programme, entryId → votes. */
  tallies: Record<string, number>;
  dispatch: Dispatch<VoterAction>;
};

export function ContestSubpageView({
  arena,
  onBackToHub,
  onOpenEntry,
  onOpenOverview,
  tallies,
  dispatch,
}: ContestSubpageViewProps) {
  /* The roster keeps one dialog for voting instructions. Entry cards now
     navigate to shareable profiles, whose prominent Vote action opens the
     same paid flow with that entry selected. */
  const [voteFlow, setVoteFlow] = useState<{ mode: VoteFlowMode; entryId: string | null } | null>(null);

  return (
    <div
      className={`contest-subpage contest-subpage--${arena.id}`}
      id={`subpage-${arena.id}`}
      style={{ ['--arena' as string]: arena.accentColor }}
    >
      <HaraGallery
        arena={arena}
        onBackToHub={onBackToHub}
        onHowToVote={() => setVoteFlow({ mode: 'guide', entryId: null })}
        onOpenEntry={onOpenEntry}
        onOpenOverview={onOpenOverview}
        tallies={tallies}
      />

      {voteFlow !== null && (
        /* Keyed so re-opening against a different entry remounts rather than
           carrying the previous supporter's half-filled draft across. */
        <VoteFlowModal
          arena={arena}
          dispatch={dispatch}
          entryId={voteFlow.entryId}
          key={`${voteFlow.mode}-${voteFlow.entryId ?? 'none'}`}
          mode={voteFlow.mode}
          onClose={() => setVoteFlow(null)}
        />
      )}
    </div>
  );
}
