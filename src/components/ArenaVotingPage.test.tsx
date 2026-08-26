import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contestArenas } from '../data/pageant';
import { initialVoterState } from '../state/voterState';
import { ArenaVotingPage } from './ArenaVotingPage';

describe('ArenaVotingPage', () => {
  it('does not present one vote per person as a voting fact', () => {
    const arena = contestArenas.find((item) => item.id === 'hara')!;
    const html = renderToStaticMarkup(
      <ArenaVotingPage
        arena={arena}
        arenas={contestArenas}
        dispatch={() => undefined}
        onBack={() => undefined}
        onSwitchArena={() => undefined}
        state={initialVoterState}
      />,
    );

    expect(html).not.toContain('vote-hero__fact--trust');
    expect(html).not.toContain('>Verified</dt>');
    expect(html).not.toContain('<dd>One vote per person</dd>');
  });
});
