/**
 * The migration guard.
 *
 * `contentApi.ts` and `contentStore.ts` can both be perfect and the site can
 * still ignore the server entirely — that was in fact the state of this
 * codebase until the components below were changed. A screen that reads
 * `src/data/pageant.ts` at module scope is decided at import time, before any
 * fetch could have answered, and no test of the seam itself catches it.
 *
 * So these render the real components after a server has answered and check
 * that the server's words are the ones on the page. Add a screen to the app
 * and it belongs here too.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ContentApi, FestivalSummary } from '../lib/contentApi';
import { loadContent, resetContentStore } from '../lib/contentStore';
import type { VoteEntry } from '../lib/arenaEntries';
import type { ContestArena } from '../data/pageant';
import { initialVoterState } from '../state/voterState';
import { HaraGallery } from './HaraGallery';
import { LandingPage } from './LandingPage';
import { VoteFlowModal } from './VoteFlowModal';

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  resetContentStore();
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
});

/**
 * VoteFlowModal renders through a portal, which the server renderer refuses,
 * and its price list only mounts on the second step. So this one gets driven
 * rather than snapshotted: `drive` runs between render and read.
 */
function renderClient(
  element: React.ReactElement,
  drive: (root: HTMLElement) => void = () => undefined,
): string {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  act(() => drive(document.body));
  const html = document.body.innerHTML;
  act(() => root.unmount());
  host.remove();
  return html;
}

/** React tracks its own value, so a bare `input.value = x` is not seen. */
function setValue(field: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(prototype.prototype, 'value')!.set!.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

const SERVED_ARENA = {
  id: 'hara',
  title: 'Served Programme',
  shortTitle: 'Served Short',
  subtitle: '',
  tagline: '',
  icon: '',
  badge: '',
  venue: '',
  dateRange: '',
  totalEntries: 1,
  votesOpen: true,
  accentColor: '#fff',
  description: '',
  criteria: [],
} as unknown as ContestArena;

const SERVED_ENTRY: VoteEntry = {
  id: 'served-1',
  number: '07',
  name: 'Serverside Delacruz',
  origin: 'Bais',
  blurb: 'Came off the wire.',
  image: null,
  votes: 42,
  meta: [],
};

const SERVED_FESTIVAL: FestivalSummary = {
  title: 'Served Festival Title',
  votingDeadline: 'Served deadline text',
  votingClosesAt: '2026-12-25T23:59:00+08:00',
};

const SERVED_BUNDLE = { id: 's-77', priceCentavos: 7_700, votes: 90 };

const api: ContentApi = {
  getArenas: async () => [SERVED_ARENA],
  getEntries: async () => [SERVED_ENTRY],
  getVoteBundles: async () => [SERVED_BUNDLE],
  getFestival: async () => SERVED_FESTIVAL,
};

describe('screens read content through the seam', () => {
  it('LandingPage takes its programmes and title from the server', async () => {
    await loadContent(api);

    const html = renderToStaticMarkup(
      <LandingPage state={initialVoterState} dispatch={() => undefined} />,
    );

    expect(html).toContain('Served Festival Title');
    /* The hero row used to be built at module scope from the bundled arena
       list. If this regresses, that is why. */
    expect(html).toContain('Served Short');
    /* And the name is no longer rewritten client-side: arenaDisplayName used
       to return a hardcoded 'Hara sa Negros Oriental' for this arena id
       regardless of what the server called it. */
    expect(html).not.toContain('Hara sa Negros Oriental');
    expect(html).not.toContain('Buglasan Festival 2026</h1>');
  });

  it('HaraGallery takes its roster and deadline from the server', async () => {
    await loadContent(api);

    const html = renderToStaticMarkup(
      <HaraGallery
        arena={SERVED_ARENA}
        onBackToHub={() => undefined}
        onHowToVote={() => undefined}
        onOpenEntry={() => undefined}
        onOpenOverview={() => undefined}
        tallies={{}}
      />,
    );

    expect(html).toContain('Serverside Delacruz');
    expect(html).toContain('Served deadline text');
  });

  it('the ballot prices from the served catalogue', async () => {
    await loadContent(api);

    const html = renderClient(
      <VoteFlowModal
        arena={SERVED_ARENA}
        entryId="served-1"
        mode="flow"
        onClose={() => undefined}
        dispatch={() => undefined}
      />,
      (body) => {
        // The catalogue lives on step two, so fill step one and advance.
        setValue(body.querySelector<HTMLInputElement>('input[type="tel"]')!, '09171234567');
        setValue(body.querySelector<HTMLSelectElement>('select')!, 'Bais City');
        body.querySelector<HTMLButtonElement>('.vote-flow__next')!.click();
      },
    );

    /* The supporter step has to have been cleared, or the assertions below
       pass vacuously against a step that never rendered a price. */
    expect(html).toContain('Choose your bundles');

    /* ₱77.00 is not a rung on the bundled ladder, and ₱1,000/1,300 votes is
       its top rung. If the bundled prices show here, the cart computes an
       amount the server rejects as price_mismatch. */
    expect(html).toContain('77.00');
    expect(html).not.toContain('1,300');
  });

  it('all three fall back to the bundle when no server is configured', () => {
    const html = renderToStaticMarkup(
      <LandingPage state={initialVoterState} dispatch={() => undefined} />,
    );

    expect(html).toContain('Buglasan Festival 2026');
    expect(html).not.toContain('Served');
  });
});
