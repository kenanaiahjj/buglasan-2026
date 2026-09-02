import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContentApi, FestivalSummary } from './contentApi';
import {
  contentSnapshot,
  entriesFor,
  loadContent,
  resetContentStore,
} from './contentStore';
import type { VoteEntry } from './arenaEntries';
import { VotingApiError } from './votingApi';
import { VOTE_BUNDLES, bundleCartTotals, cartLineItems } from './voteBundles';

afterEach(() => {
  resetContentStore();
  vi.unstubAllEnvs();
});

const entry = (id: string, name: string, votes = 0): VoteEntry => ({
  id,
  number: '01',
  name,
  origin: 'Dumaguete',
  blurb: '',
  image: null,
  votes,
  meta: [],
});

const FESTIVAL: FestivalSummary = {
  title: 'Served Festival',
  votingDeadline: 'December 25, 2026',
  votingClosesAt: '2026-12-25T23:59:00+08:00',
};

/**
 * A server that honours its abort signal, the way both real clients do.
 *
 * Worth being fussy about: a fake that ignores the signal completes happily
 * through an abort, and an abort test written against it passes for the wrong
 * reason.
 */
const settle = <T,>(value: T, signal?: AbortSignal): Promise<T> =>
  new Promise((resolve, reject) => {
    queueMicrotask(() =>
      signal?.aborted ? reject(new DOMException('Aborted', 'AbortError')) : resolve(value),
    );
  });

/** A server that answers with one arena and a two-rung price ladder. */
function serverApi(overrides: Partial<ContentApi> = {}): ContentApi {
  return {
    getArenas: (signal) => settle([{ id: 'hara', shortTitle: 'Served Hara' } as never], signal),
    getEntries: async () => [entry('served-1', 'Served Candidate')],
    getVoteBundles: async () => [
      { id: 's-20', priceCentavos: 2_000, votes: 25 },
      { id: 's-200', priceCentavos: 20_000, votes: 260 },
    ],
    getFestival: async () => FESTIVAL,
    ...overrides,
  };
}

describe('content store', () => {
  it('starts full, from the bundle, before anything is fetched', () => {
    const snapshot = contentSnapshot();

    expect(snapshot.status).toBe('idle');
    expect(snapshot.live).toBe(false);
    expect(snapshot.arenas).toHaveLength(4);
    expect(snapshot.bundles).toEqual(VOTE_BUNDLES);
    expect(entriesFor('hara').length).toBeGreaterThan(0);
    /* The bundled festival must carry the machine-readable date, not just the
       display string — the standings board counts against it. */
    expect(Number.isFinite(Date.parse(snapshot.festival.votingClosesAt!))).toBe(true);
  });

  it('replaces the bundle with what the server sent', async () => {
    await loadContent(serverApi());
    const snapshot = contentSnapshot();

    expect(snapshot.status).toBe('ready');
    expect(snapshot.arenas).toHaveLength(1);
    expect(entriesFor('hara')[0].name).toBe('Served Candidate');
    expect(snapshot.festival.title).toBe('Served Festival');
    expect(snapshot.bundles.map((bundle) => bundle.id)).toEqual(['s-20', 's-200']);
  });

  it('keeps the bundled roster on screen when the load fails, and says so', async () => {
    await loadContent(
      serverApi({
        getArenas: async () => {
          throw new VotingApiError('network', 'Could not reach the content service.');
        },
      }),
    );

    const snapshot = contentSnapshot();
    expect(snapshot.status).toBe('error');
    expect(snapshot.error).toMatch(/could not reach/i);
    // A festival site that renders nothing on voting night is the worse bug.
    expect(snapshot.arenas).toHaveLength(4);
    expect(entriesFor('hara').length).toBeGreaterThan(0);
    expect(snapshot.live).toBe(false);
  });

  it('falls back per arena, so one missing roster does not blank a programme', async () => {
    await loadContent(serverApi({ getEntries: async () => [] }));

    // 'hara' was served (empty), 'booths' was never in the server's arena list.
    expect(entriesFor('hara')).toEqual([]);
    expect(entriesFor('booths').length).toBeGreaterThan(0);
  });

  it('leaves the snapshot untouched when the caller aborts', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      loadContent(
        serverApi({
          getArenas: async () => {
            throw new DOMException('Aborted', 'AbortError');
          },
        }),
        controller.signal,
      ),
    ).rejects.toThrow(/abort/i);

    /* Not 'error'. An unmount is not a failure, and a remount should not
       inherit one. */
    expect(contentSnapshot().status).not.toBe('error');
  });

  it('shares one in-flight request between concurrent callers', async () => {
    const getArenas = vi.fn(async () => [{ id: 'hara' } as never]);
    const api = serverApi({ getArenas });

    await Promise.all([loadContent(api), loadContent(api), loadContent(api)]);

    expect(getArenas).toHaveBeenCalledTimes(1);
  });

  it('lets a load start again after one is aborted mid-flight', async () => {
    /* React 19 StrictMode, exactly: effect runs, cleanup aborts, effect runs
       again. The second call must get a real load rather than the first
       call's rejected promise — which is what shipped for one commit, and
       showed up only as an unhandled AbortError in the console. */
    const controller = new AbortController();
    const first = loadContent(serverApi(), controller.signal);
    controller.abort();
    await expect(first).rejects.toThrow(/abort/i);

    const second = await loadContent(serverApi());

    expect(second.status).toBe('ready');
    expect(contentSnapshot().festival.title).toBe('Served Festival');
  });

  it('prices a cart against the served catalogue, not the bundled one', async () => {
    await loadContent(serverApi());
    const { bundles } = contentSnapshot();

    /* The whole reason the catalogue is threaded through the cart maths. A
       total computed against the local ladder is a total the server rejects
       as price_mismatch, and 's-20' is not in the local ladder at all. */
    const cart = { 's-20': 2 };

    expect(bundleCartTotals(cart, bundles).amountCentavos).toBe(4_000);
    expect(bundleCartTotals(cart, bundles).votes).toBe(50);
    expect(cartLineItems(cart, bundles)).toEqual([{ bundleId: 's-20', count: 2 }]);

    // Priced against the default ladder the id is unknown and the order is empty.
    expect(bundleCartTotals(cart).amountCentavos).toBe(0);
  });

  it('goes back to the bundle on reset', async () => {
    await loadContent(serverApi());
    expect(contentSnapshot().arenas).toHaveLength(1);

    resetContentStore();
    expect(contentSnapshot().arenas).toHaveLength(4);
    expect(contentSnapshot().status).toBe('idle');
  });
});
