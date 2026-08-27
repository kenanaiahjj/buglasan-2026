import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contestArenas, haraCandidates, pageantContent } from '../data/pageant';
import { VotingOverviewPage } from './VotingOverviewPage';

describe('VotingOverviewPage', () => {
  it('renders the simulated Hara standings for event display', () => {
    const hara = contestArenas.find((arena) => arena.id === 'hara')!;
    const html = renderToStaticMarkup(
      <VotingOverviewPage
        arena={hara}
        onBackToHara={() => undefined}
        onBackToHub={() => undefined}
        tallies={Object.fromEntries(haraCandidates.map((candidate) => [candidate.id, candidate.votes]))}
      />,
    );

    expect(html).toContain('Hara sa Negros Oriental');
    expect(html).toContain('Public voting overview');
    expect(html).toContain('Live simulation');
    expect(html).toContain('Currently leading');
    expect(html).toContain('Total votes');
    expect(html).toContain(pageantContent.votingDeadline);
    expect(html.match(/class="hara-overview__rank-row"/g)).toHaveLength(12);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Back to Hara');
    expect(html).toContain('Festival Hub');
  });
});
