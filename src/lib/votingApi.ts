/**
 * The seam between this front end and whatever settles money and counts votes.
 *
 * Nothing in the UI talks to a server directly. Everything goes through
 * `VotingApi`, which has two implementations: `createHttpVotingApi` for a real
 * backend and `createDemoVotingApi` for the prototype running without one.
 * `resolveVotingApi()` picks between them on `VITE_VOTING_API_URL`, so wiring
 * the real thing up is an environment variable and nothing else.
 *
 * The contract is written out in VOTING_API.md. Two rules matter more than the
 * shapes:
 *
 *  - **Money is centavos, integers only.** ₱20.00 is 2000. A total that lands
 *    between two centavos is a total two systems will disagree about.
 *  - **Every order carries an idempotency key.** A retried request, a double
 *    tap, a flaky network — all of them must settle to one charge and one set
 *    of votes. The key is derived from the order, not generated per attempt.
 *  - **Hosted checkout owns payment details.** The optional return URL is only
 *    a navigation hint; the backend must allowlist it and confirm payment from
 *    its gateway webhook.
 *
 * The tally is deliberately server-owned. A client that can add to a public
 * count is a client that can invent one, so `getTally` reads and nothing here
 * writes.
 */

import type { ContestArena } from '../data/pageant';
import { entriesForArena } from './arenaEntries';
import type { PaymentMethodId } from './voteFlow';
import { isLiveVoting, votingApiBaseUrl, votingReturnUrl } from './votingConfig';

export type ArenaId = ContestArena['id'];

export type VoteOrderRequest = {
  arenaId: ArenaId;
  entryId: string;
  /** How many positive whole-number votes are being bought. The server prices them. */
  quantity: number;
  /** Ten-digit national significant number, no leading zero, no country code. */
  mobile: string;
  /** A Negros Oriental LGU, or the agreed out-of-province label. */
  origin: string;
  method: PaymentMethodId;
  /**
   * Expected charge in centavos, as the client computed it.
   *
   * Sent so a mismatch can be caught, never trusted: the server prices the
   * order from its own one-vote price and rejects with `price_mismatch` if the two
   * disagree. A client that sets the price is a client that sets it to zero.
   */
  expectedAmountCentavos: number;
  /** Stable across retries of the same order. See the note above. */
  idempotencyKey: string;
  /**
   * Where the hosted checkout can send the supporter back after payment.
   * Treat this as an allowlisted navigation hint, never as proof of payment.
   */
  returnUrl?: string;
};

export type VoteOrderStatus = 'pending' | 'confirmed' | 'failed' | 'expired';

export type VoteOrder = {
  reference: string;
  status: VoteOrderStatus;
  arenaId: ArenaId;
  entryId: string;
  quantity: number;
  amountCentavos: number;
  /**
   * Where to send the supporter to pay. Hosted checkout, always — GCash, Maya
   * and every card acquirer would rather you did not hold card details, and
   * so would you.
   */
  checkoutUrl?: string;
  /** Milliseconds to wait before asking again while `status` is 'pending'. */
  pollAfterMs?: number;
};

export type TallySnapshot = {
  arenaId: ArenaId;
  /** entryId → votes. Absent entries count as zero. */
  tallies: Record<string, number>;
  /** Server time the counts were taken, epoch milliseconds. */
  updatedAt: number;
  /** Votes counted in the trailing minute, if the server tracks it. */
  votesPerMinute?: number;
};

export type VotingApiErrorCode =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'rate_limited'
  | 'price_mismatch'
  | 'voting_closed'
  | 'invalid'
  | 'server'
  | 'unknown';

export class VotingApiError extends Error {
  readonly code: VotingApiErrorCode;
  readonly status: number | null;
  /** Whether pressing the button again could plausibly work. */
  readonly retryable: boolean;

  constructor(code: VotingApiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = 'VotingApiError';
    this.code = code;
    this.status = status;
    this.retryable = code === 'network' || code === 'timeout' || code === 'server' || code === 'rate_limited';
  }
}

export type VotingApi = {
  /** Open an order. Returns it with a checkoutUrl unless already settled. */
  createVoteOrder(request: VoteOrderRequest, signal?: AbortSignal): Promise<VoteOrder>;
  /** Poll an order the supporter has been sent away to pay for. */
  getVoteOrder(reference: string, signal?: AbortSignal): Promise<VoteOrder>;
  /** Current public counts for one programme. */
  getTally(arenaId: ArenaId, signal?: AbortSignal): Promise<TallySnapshot>;
  /**
   * Optional live feed. Implement with SSE or a socket and the overview board
   * stops polling; leave it off and the board falls back to `getTally`.
   * Returns its own unsubscribe.
   */
  openTallyStream?(arenaId: ArenaId, onSnapshot: (snapshot: TallySnapshot) => void): () => void;
};

/**
 * Resolve the browser destination for a hosted checkout return.
 *
 * A deployment can provide one canonical route with `VITE_VOTING_RETURN_URL`.
 * Otherwise the current page preserves the programme the supporter started
 * from. The backend must still validate the value against its own allowlist.
 */
export function resolveVotingReturnUrl(currentUrl?: string): string | undefined {
  const configured = votingReturnUrl();
  if (configured !== '') return configured;
  if (currentUrl !== undefined) return currentUrl;
  return typeof window !== 'undefined' ? window.location.href : undefined;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function codeForStatus(status: number, body: unknown): VotingApiErrorCode {
  const declared = typeof body === 'object' && body !== null && 'code' in body ? String((body as { code: unknown }).code) : '';

  /* A server that names its own failure is believed — the status alone
     cannot tell "you priced this wrong" apart from "voting has closed". */
  if (
    declared === 'price_mismatch'
    || declared === 'voting_closed'
    || declared === 'rate_limited'
    || declared === 'invalid'
    || declared === 'unauthorized'
  ) {
    return declared;
  }

  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 409 || status === 422) return 'invalid';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  if (status >= 400) return 'invalid';
  return 'unknown';
}

export type HttpVotingApiOptions = {
  baseUrl: string;
  /** Injected so tests do not need a live server and SSR does not need fetch. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Extra headers — an API key, a trace id, whatever the deployment wants. */
  headers?: Record<string, string>;
};

export function createHttpVotingApi({
  baseUrl,
  fetchImpl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  headers = {},
}: HttpVotingApiOptions): VotingApi {
  const root = baseUrl.replace(/\/+$/, '');
  const doFetch: typeof fetch = fetchImpl ?? ((...args) => fetch(...args));

  async function request<T>(path: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
    /* Two ways to give up: the caller navigating away, and the request simply
       never coming back. Both have to abort the same fetch. */
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await doFetch(`${root}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...headers, ...(init.headers ?? {}) },
      });
    } catch (cause) {
      if (signal?.aborted) throw cause;
      throw new VotingApiError(
        controller.signal.aborted ? 'timeout' : 'network',
        controller.signal.aborted ? 'The request timed out.' : 'Could not reach the voting service.',
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const code = codeForStatus(response.status, body);
      const message = typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : 'The voting service rejected the request.';
      throw new VotingApiError(code, message, response.status);
    }

    return body as T;
  }

  return {
    createVoteOrder: (order, signal) =>
      request<VoteOrder>(
        '/vote-orders',
        {
          method: 'POST',
          body: JSON.stringify(order),
          /* Belt and braces: in the body for servers that read it there, and
             in the header for gateways that dedupe before the app sees it. */
          headers: { 'Idempotency-Key': order.idempotencyKey },
        },
        signal,
      ),

    getVoteOrder: (reference, signal) =>
      request<VoteOrder>(`/vote-orders/${encodeURIComponent(reference)}`, { method: 'GET' }, signal),

    getTally: (arenaId, signal) =>
      request<TallySnapshot>(`/arenas/${encodeURIComponent(arenaId)}/tally`, { method: 'GET' }, signal),
  };
}

export type DemoVotingApiOptions = {
  /** Fake latency, so the loading state is exercised rather than skipped. */
  latencyMs?: number;
  /** Seed counts, normally the ones already in the reducer. */
  tallies?: Partial<Record<ArenaId, Record<string, number>>>;
};

/**
 * What runs until a server exists.
 *
 * It settles every order immediately and keeps the counts in memory. That is
 * a demo, not a gateway: nothing is charged and nothing survives a reload.
 */
export function createDemoVotingApi({ latencyMs = 650, tallies = {} }: DemoVotingApiOptions = {}): VotingApi {
  const counts: Partial<Record<ArenaId, Record<string, number>>> = structuredClone(tallies);
  const settled = new Map<string, VoteOrder>();

  const sleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });

  return {
    async createVoteOrder(order, signal) {
      await sleep(latencyMs, signal);

      // The same key twice is the same order, which is the whole point of it.
      const existing = settled.get(order.idempotencyKey);
      if (existing) return existing;

      const arena = (counts[order.arenaId] ??= {});
      arena[order.entryId] = (arena[order.entryId] ?? 0) + order.quantity;

      const result: VoteOrder = {
        reference: order.idempotencyKey,
        status: 'confirmed',
        arenaId: order.arenaId,
        entryId: order.entryId,
        quantity: order.quantity,
        amountCentavos: order.expectedAmountCentavos,
      };
      settled.set(order.idempotencyKey, result);
      return result;
    },

    async getVoteOrder(reference, signal) {
      await sleep(Math.min(latencyMs, 250), signal);
      const found = settled.get(reference);
      if (!found) throw new VotingApiError('invalid', 'No such order.', 404);
      return found;
    },

    async getTally(arenaId, signal) {
      await sleep(Math.min(latencyMs, 250), signal);
      return { arenaId, tallies: { ...(counts[arenaId] ?? {}) }, updatedAt: Date.now() };
    },
  };
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '']);

let resolved: VotingApi | null = null;

const DEMO_ARENA_IDS: ArenaId[] = ['hara', 'booths', 'festival', 'gandang'];

function seedDemoTallies(): Partial<Record<ArenaId, Record<string, number>>> {
  return Object.fromEntries(
    DEMO_ARENA_IDS.map((arenaId) => [
      arenaId,
      Object.fromEntries(entriesForArena(arenaId).map((entry) => [entry.id, entry.votes])),
    ]),
  ) as Partial<Record<ArenaId, Record<string, number>>>;
}

/**
 * The client the app uses.
 *
 * Set `VITE_VOTING_API_URL` and this returns the HTTP client; leave it unset
 * and the prototype keeps working on the demo one. Memoised so every caller
 * shares one instance and one set of in-memory demo counts.
 */
export function resolveVotingApi(): VotingApi {
  if (resolved !== null) return resolved;

  if (isLiveVoting()) {
    resolved = createHttpVotingApi({ baseUrl: votingApiBaseUrl() });
    return resolved;
  }

  /* The demo client charges nothing and counts nothing. That is correct for a
     prototype and catastrophic in production, and an unset environment
     variable is a quiet way to arrive there — so say so, loudly, anywhere
     that is not a developer's own machine. */
  if (typeof window !== 'undefined' && !LOCAL_HOSTS.has(window.location.hostname)) {
    console.error(
      '[voting] VITE_VOTING_API_URL is not set, so votes are being settled by the '
      + 'in-memory demo client: nothing is charged and no tally is recorded. '
      + 'Set it to the voting service before taking real votes. See VOTING_API.md.',
    );
  }

  resolved = createDemoVotingApi({ tallies: seedDemoTallies() });
  return resolved;
}

/** Test seam. Pass null to fall back to the environment again. */
export function setVotingApi(api: VotingApi | null): void {
  resolved = api;
}
