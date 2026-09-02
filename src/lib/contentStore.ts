/**
 * The content the screens actually render, and one place that decides where it
 * came from.
 *
 * `contentApi.ts` is the seam — an interface, an HTTP client, a demo client.
 * This is the thing that *calls* it. Without this module the seam was inert:
 * every screen still imported `src/data/pageant.ts` at module scope, so
 * `VITE_CONTENT_API_URL` could be set to a perfectly good server and nothing
 * on the page would change.
 *
 * ## Why a module store rather than a context
 *
 * Three of the callers are not components. `voterState.ts` seeds its opening
 * tallies from the roster, `votingOverview.ts` takes one as a default
 * argument, and the demo voting client answers `getTally` from it. A provider
 * cannot reach any of those. A module store can, and `siteBoot.ts` already
 * establishes the pattern here: module state, a listener set, a hook on top.
 *
 * ## The bundled data is the opening position, not a fallback of last resort
 *
 * The store starts *full* — every arena, roster, price and date from
 * `pageant.ts`, synchronously, before any effect runs. Two things follow:
 *
 *   - In demo mode nothing ever loads, nothing flashes, and a component
 *     rendered bare in a test sees exactly what it saw before this module
 *     existed.
 *   - In live mode the server's answer *replaces* it, and until it lands the
 *     page is populated rather than skeletal. The curtain in `siteBoot.ts`
 *     normally covers that swap entirely.
 *
 * A failed load keeps the bundled data on screen and records the error. That
 * is a deliberate trade and worth understanding before you copy it: a festival
 * site that renders last year's roster is bad, but a festival site that
 * renders nothing on voting night is worse. `live` and `error` are both
 * exposed so a deployment can put a banner over the top of a stale roster —
 * see `useContent()`.
 */

import { useSyncExternalStore } from 'react';
import type { ContestArena } from '../data/pageant';
import { contestArenas, pageantContent } from '../data/pageant';
import { entriesForArena, type VoteEntry } from './arenaEntries';
import { resolveContentApi, type ContentApi, type FestivalSummary } from './contentApi';
import { VOTE_BUNDLES, type VoteBundle } from './voteBundles';
import { VotingApiError, type ArenaId } from './votingApi';
import { isLiveContent } from './votingConfig';

export type ContentStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ContentSnapshot = {
  arenas: readonly ContestArena[];
  /** Keyed by arena. Partial on purpose — a server may omit one. */
  entries: Readonly<Partial<Record<ArenaId, readonly VoteEntry[]>>>;
  bundles: readonly VoteBundle[];
  festival: FestivalSummary;
  status: ContentStatus;
  /** True once the data above came off a server rather than the bundle. */
  live: boolean;
  /** Message from the last failed load. Null until one fails. */
  error: string | null;
};

function bundledEntries(): Partial<Record<ArenaId, readonly VoteEntry[]>> {
  const out: Partial<Record<ArenaId, readonly VoteEntry[]>> = {};
  for (const arena of contestArenas) out[arena.id] = entriesForArena(arena.id);
  return out;
}

/**
 * The bundle, in the server's shape.
 *
 * `pageant.ts` carries more than `FestivalSummary` names — an edition, a
 * tagline, hero copy. Only the fields a server is expected to own are lifted
 * here; the rest stay presentational constants, which is what they are.
 */
function bundledFestival(): FestivalSummary {
  return {
    title: pageantContent.title,
    votingDeadline: pageantContent.votingDeadline,
    votingClosesAt: pageantContent.votingDeadlineISO,
    votingWindow: pageantContent.votingWindow,
    totalVotes: pageantContent.totalVotes,
  };
}

function bundledSnapshot(): ContentSnapshot {
  return {
    arenas: contestArenas,
    entries: bundledEntries(),
    bundles: VOTE_BUNDLES,
    festival: bundledFestival(),
    status: 'idle',
    live: false,
    error: null,
  };
}

let snapshot: ContentSnapshot = bundledSnapshot();
const listeners = new Set<() => void>();

/* One object identity per state, replaced wholesale. useSyncExternalStore
   compares by reference and will spin forever on a getSnapshot that builds a
   fresh object each call. */
function set(patch: Partial<ContentSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current content, without subscribing. For non-component callers. */
export function contentSnapshot(): ContentSnapshot {
  return snapshot;
}

/**
 * The roster for one arena, bundled data if the server has not answered or
 * did not include it.
 *
 * Every caller wants this rather than the raw record: an arena missing from a
 * server response should cost that programme its live counts, not blank the
 * page.
 */
export function entriesFor(arenaId: ArenaId, from: ContentSnapshot = snapshot): readonly VoteEntry[] {
  return from.entries[arenaId] ?? entriesForArena(arenaId);
}

let inFlight: Promise<ContentSnapshot> | null = null;

/**
 * Fetch everything and publish it.
 *
 * Two round trips, not one: the arena list decides which roster endpoints
 * exist, so it has to land before they can be asked for. Everything after
 * that goes out together.
 *
 * Called unconditionally, including in demo mode where it resolves off the
 * bundled data. That is on purpose — a prototype that only exercises the
 * synchronous path is a prototype that hides every await-shaped bug until the
 * day someone sets the environment variable.
 */
export function loadContent(
  api: ContentApi = resolveContentApi(),
  signal?: AbortSignal,
): Promise<ContentSnapshot> {
  if (inFlight !== null) return inFlight;

  const live = isLiveContent();
  set({ status: 'loading' });

  /* Both places that clear `inFlight` check that it is still *this* request
     first. An abort releases the slot early (below), a replacement load can
     start immediately, and this request's own `finally` then runs last — so
     without the identity check it would null out its successor and the store
     would forget a load was running. */
  let request: Promise<ContentSnapshot>;
  const release = () => {
    if (inFlight === request) inFlight = null;
  };

  /* Release the moment the caller gives up, not when the request finally
     settles. Otherwise a second caller arriving in that window is handed a
     promise already on its way to rejecting, and gets an abort it never asked
     for instead of a load. React 19's StrictMode double-invoked effect is
     exactly this sequence. */
  signal?.addEventListener('abort', release, { once: true });

  request = (async () => {
    try {
      const arenas = await api.getArenas(signal);
      const [rosters, bundles, festival] = await Promise.all([
        Promise.all(arenas.map(async (arena) => [arena.id, await api.getEntries(arena.id, signal)] as const)),
        api.getVoteBundles(signal),
        api.getFestival(signal),
      ]);

      set({
        arenas,
        entries: Object.fromEntries(rosters) as Partial<Record<ArenaId, readonly VoteEntry[]>>,
        bundles,
        festival,
        status: 'ready',
        live,
        error: null,
      });
    } catch (cause) {
      /* An abort is the caller leaving, not a failure. Leave the snapshot
         exactly as it was so a remount does not inherit an error state. */
      if (signal?.aborted) throw cause;

      set({
        status: 'error',
        error:
          cause instanceof VotingApiError
            ? cause.message
            : cause instanceof Error
              ? cause.message
              : 'The content service could not be reached.',
      });
    } finally {
      release();
    }

    return snapshot;
  })();

  inFlight = request;
  return request;
}

/**
 * Subscribe a component to the content.
 *
 * `live` is false and `error` is set when a load failed and the bundled
 * roster is what is on screen. Nothing in the app currently renders a banner
 * for that case; a production deployment should.
 */
export function useContent(): ContentSnapshot {
  return useSyncExternalStore(subscribe, contentSnapshot, contentSnapshot);
}

/** The roster for one arena, subscribed. */
export function useArenaEntries(arenaId: ArenaId): readonly VoteEntry[] {
  return entriesFor(arenaId, useContent());
}

/** Back to the bundle, memo dropped. For tests, and for a config swap. */
export function resetContentStore(): void {
  inFlight = null;
  snapshot = bundledSnapshot();
  for (const listener of listeners) listener();
}
