/**
 * Where the festival's *content* comes from — the rosters, the programmes, the
 * prices, the dates.
 *
 * `votingApi.ts` already owns the write side: orders, payments, tallies. This
 * is the read side, and until now it did not exist as a seam at all — every
 * screen imported `src/data/pageant.ts` directly, so the roster was a compile
 * time constant and a new candidate meant a deploy.
 *
 * The shape deliberately mirrors `VotingApi`: one interface, an HTTP client, a
 * demo client that answers from the bundled data, and one resolver that picks
 * between them on an environment variable. A dev wiring this up should not
 * have to learn a second set of conventions.
 *
 * ## What a server has to serve
 *
 * | method            | request                          |
 * | ----------------- | -------------------------------- |
 * | `getArenas`       | `GET /arenas`                    |
 * | `getEntries`      | `GET /arenas/:arenaId/entries`   |
 * | `getVoteBundles`  | `GET /vote-bundles`              |
 * | `getFestival`     | `GET /festival`                  |
 *
 * Responses are the types below, as JSON, unwrapped — no envelope. Errors use
 * the same `VotingApiError` codes as the write side so callers have one thing
 * to catch.
 *
 * ## Switching it on
 *
 * `VITE_CONTENT_API_URL`, falling back to `VITE_VOTING_API_URL` so a single
 * backend can serve both. Neither set means the demo client, which is what the
 * prototype runs on today.
 *
 * ## What is still placeholder
 *
 * The bundled data is demo data and is marked as such at its source: the
 * candidate surnames in `pageant.ts` are invented, and the bundle ladder in
 * `voteBundles.ts` is a made-up price list. Both are the server's to own.
 */

import type { ContestArena } from '../data/pageant';
import { contestArenas, pageantContent } from '../data/pageant';
import { entriesForArena, type VoteEntry } from './arenaEntries';
import { VOTE_BUNDLES, type VoteBundle } from './voteBundles';
import { VotingApiError, type ArenaId } from './votingApi';
import { contentApiBaseUrl, isLiveContent } from './votingConfig';

/** The festival-wide copy and dates the whole site reads. */
export type FestivalSummary = {
  title: string;
  votingDeadline: string;
  /** ISO 8601. The deadline above is display text; this is the one to compare. */
  votingClosesAt?: string;
};

export type ContentApi = {
  /** Every programme, in the order they should be presented. */
  getArenas(signal?: AbortSignal): Promise<readonly ContestArena[]>;
  /** The current roster for one programme. */
  getEntries(arenaId: ArenaId, signal?: AbortSignal): Promise<readonly VoteEntry[]>;
  /** The price list. See `voteBundles.ts` — the server owns this. */
  getVoteBundles(signal?: AbortSignal): Promise<readonly VoteBundle[]>;
  getFestival(signal?: AbortSignal): Promise<FestivalSummary>;
};

const DEFAULT_TIMEOUT_MS = 15_000;

export type HttpContentApiOptions = {
  baseUrl: string;
  /** Injected so tests do not need a live server and SSR does not need fetch. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Extra headers — an API key, a trace id, whatever the deployment wants. */
  headers?: Record<string, string>;
};

export function createHttpContentApi({
  baseUrl,
  fetchImpl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  headers = {},
}: HttpContentApiOptions): ContentApi {
  const root = baseUrl.replace(/\/+$/, '');
  const doFetch: typeof fetch = fetchImpl ?? ((...args) => fetch(...args));

  async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
    /* Two ways to give up — the caller navigating away and the request never
       coming back — and both have to abort the same fetch. Same handling as
       the voting client, on purpose. */
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await doFetch(`${root}${path}`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    } catch (cause) {
      if (signal?.aborted) throw cause;
      throw new VotingApiError(
        controller.signal.aborted ? 'timeout' : 'network',
        controller.signal.aborted ? 'The request timed out.' : 'Could not reach the content service.',
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new VotingApiError(
        response.status >= 500 ? 'server' : 'invalid',
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : 'The content service rejected the request.',
        response.status,
      );
    }

    return body as T;
  }

  return {
    getArenas: (signal) => get<ContestArena[]>('/arenas', signal),
    getEntries: (arenaId, signal) =>
      get<VoteEntry[]>(`/arenas/${encodeURIComponent(arenaId)}/entries`, signal),
    getVoteBundles: (signal) => get<VoteBundle[]>('/vote-bundles', signal),
    getFestival: (signal) => get<FestivalSummary>('/festival', signal),
  };
}

/**
 * The bundled data, behind the same interface.
 *
 * Async and abortable even though it answers instantly, so that swapping in the
 * HTTP client cannot change a caller's control flow. A caller written against
 * this one already handles awaiting and cancellation.
 */
export function createDemoContentApi(): ContentApi {
  const settle = <T,>(value: T, signal?: AbortSignal): Promise<T> =>
    signal?.aborted
      ? Promise.reject(new DOMException('Aborted', 'AbortError'))
      : Promise.resolve(value);

  return {
    getArenas: (signal) => settle(contestArenas, signal),
    getEntries: (arenaId, signal) => settle(entriesForArena(arenaId), signal),
    getVoteBundles: (signal) => settle(VOTE_BUNDLES, signal),
    getFestival: (signal) =>
      settle(
        { title: pageantContent.title, votingDeadline: pageantContent.votingDeadline },
        signal,
      ),
  };
}

let resolvedContentApi: ContentApi | null = null;

/**
 * The client the app uses. Memoised, so every caller shares one instance.
 *
 * Exported alongside a reset because the memo is what makes tests awkward
 * otherwise — see `resetContentApi`.
 */
export function resolveContentApi(): ContentApi {
  if (resolvedContentApi !== null) return resolvedContentApi;

  resolvedContentApi = isLiveContent()
    ? createHttpContentApi({ baseUrl: contentApiBaseUrl() })
    : createDemoContentApi();
  return resolvedContentApi;
}

/** Drop the memo. For tests, and for a deployment that swaps config at runtime. */
export function resetContentApi(): void {
  resolvedContentApi = null;
}
