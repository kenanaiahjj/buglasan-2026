import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VotingApiError,
  createDemoVotingApi,
  createHttpVotingApi,
  setVotingApi,
  type VoteOrderRequest,
} from './votingApi';

const order: VoteOrderRequest = {
  arenaId: 'hara',
  entryId: 'c-03',
  quantity: 25,
  mobile: '9171234567',
  origin: 'Bais City',
  method: 'gcash',
  expectedAmountCentavos: 50_000,
  idempotencyKey: 'BF26-HA-0DURU50',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  setVotingApi(null);
  vi.useRealTimers();
});

describe('HTTP voting client', () => {
  it('posts the order with the idempotency key in both places a gateway might read it', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ reference: 'R1', status: 'pending', checkoutUrl: 'https://pay/1' }));
    const api = createHttpVotingApi({ baseUrl: 'https://api.test/v1/', fetchImpl: fetchImpl as unknown as typeof fetch });

    const result = await api.createVoteOrder(order);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    // The trailing slash on baseUrl must not produce a double slash.
    expect(url).toBe('https://api.test/v1/vote-orders');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe(order.idempotencyKey);
    expect(JSON.parse(String(init.body))).toMatchObject({
      idempotencyKey: order.idempotencyKey,
      expectedAmountCentavos: 50_000,
    });
    expect(result.checkoutUrl).toBe('https://pay/1');
  });

  it('trusts a code the server names over the one the status implies', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: 'price_mismatch', message: 'Prices changed.' }, 409));
    const api = createHttpVotingApi({ baseUrl: 'https://api.test', fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(api.createVoteOrder(order)).rejects.toMatchObject({
      code: 'price_mismatch',
      message: 'Prices changed.',
      // A repriced order is not fixed by pressing the button again.
      retryable: false,
    });
  });

  it('maps a bare status when the server does not name its failure', async () => {
    const cases: Array<[number, string, boolean]> = [
      [401, 'unauthorized', false],
      [429, 'rate_limited', true],
      [500, 'server', true],
      [422, 'invalid', false],
    ];

    for (const [status, code, retryable] of cases) {
      const api = createHttpVotingApi({
        baseUrl: 'https://api.test',
        fetchImpl: (async () => jsonResponse({}, status)) as unknown as typeof fetch,
      });
      await expect(api.createVoteOrder(order)).rejects.toMatchObject({ code, retryable });
    }
  });

  it('reports an unreachable service as retryable rather than as a rejection', async () => {
    const api = createHttpVotingApi({
      baseUrl: 'https://api.test',
      fetchImpl: (async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as typeof fetch,
    });

    const error = await api.createVoteOrder(order).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(VotingApiError);
    expect((error as VotingApiError).code).toBe('network');
    expect((error as VotingApiError).retryable).toBe(true);
  });

  it('lets the caller abort without dressing it up as a network failure', async () => {
    const controller = new AbortController();
    const api = createHttpVotingApi({
      baseUrl: 'https://api.test',
      fetchImpl: ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })) as unknown as typeof fetch,
    });

    const pending = api.createVoteOrder(order, controller.signal);
    controller.abort();

    await expect(pending).rejects.toThrow(/abort/i);
  });

  it('reads a tally from the arena endpoint', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ arenaId: 'booths', tallies: { 'booth-01': 12 }, updatedAt: 7 }));
    const api = createHttpVotingApi({ baseUrl: 'https://api.test', fetchImpl: fetchImpl as unknown as typeof fetch });

    const tally = await api.getTally('booths');

    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe('https://api.test/arenas/booths/tally');
    expect(tally.tallies['booth-01']).toBe(12);
  });
});

describe('demo voting client', () => {
  it('settles an order and adds the bought quantity to its own tally', async () => {
    const api = createDemoVotingApi({ latencyMs: 0 });

    const result = await api.createVoteOrder(order);
    expect(result.status).toBe('confirmed');

    const tally = await api.getTally('hara');
    expect(tally.tallies['c-03']).toBe(25);
  });

  /* The whole point of the key: a retried request is the same order, not a
     second charge. */
  it('returns the same order for a repeated idempotency key', async () => {
    const api = createDemoVotingApi({ latencyMs: 0 });

    const first = await api.createVoteOrder(order);
    const second = await api.createVoteOrder(order);

    expect(second).toEqual(first);
    const tally = await api.getTally('hara');
    expect(tally.tallies['c-03']).toBe(25);
  });
});
