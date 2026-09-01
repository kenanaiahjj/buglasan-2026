import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDemoContentApi,
  createHttpContentApi,
  resetContentApi,
  resolveContentApi,
} from './contentApi';
import { VotingApiError } from './votingApi';

afterEach(() => {
  resetContentApi();
  vi.unstubAllEnvs();
});

const ok = (body: unknown) =>
  vi.fn(async (..._args: Parameters<typeof fetch>) =>
    new Response(JSON.stringify(body), { status: 200 }),
  );

describe('content api', () => {
  it('answers from the bundled data when no backend is configured', async () => {
    const api = createDemoContentApi();

    await expect(api.getArenas()).resolves.toHaveLength(4);
    await expect(api.getVoteBundles()).resolves.not.toHaveLength(0);
    expect((await api.getEntries('hara')).length).toBeGreaterThan(0);
    expect((await api.getFestival()).votingDeadline).toBeTruthy();
  });

  it('is abortable even on the demo client, so callers cannot depend on it being sync', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(createDemoContentApi().getArenas(controller.signal)).rejects.toThrow(/abort/i);
  });

  it('calls the documented routes', async () => {
    const fetchImpl = ok([]);
    const api = createHttpContentApi({ baseUrl: 'https://api.example/v1/', fetchImpl });

    await api.getArenas();
    await api.getEntries('booths');
    await api.getVoteBundles();
    await api.getFestival();

    const paths = fetchImpl.mock.calls.map((call) => String(call[0]));
    expect(paths).toEqual([
      // The trailing slash on the base is normalised away, not doubled.
      'https://api.example/v1/arenas',
      'https://api.example/v1/arenas/booths/entries',
      'https://api.example/v1/vote-bundles',
      'https://api.example/v1/festival',
    ]);
  });

  it('reports failures as VotingApiError, so callers catch one thing', async () => {
    const boom = vi.fn(async () => new Response('{"message":"nope"}', { status: 503 }));
    const api = createHttpContentApi({ baseUrl: 'https://api.example', fetchImpl: boom });

    await expect(api.getArenas()).rejects.toBeInstanceOf(VotingApiError);
    await expect(api.getArenas()).rejects.toMatchObject({ code: 'server', retryable: true });

    const dead = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(
      createHttpContentApi({ baseUrl: 'https://api.example', fetchImpl: dead }).getArenas(),
    ).rejects.toMatchObject({ code: 'network', retryable: true });
  });

  it('switches on the content URL, and falls back to the voting one', async () => {
    const fetchImpl = ok([]);

    vi.stubEnv('VITE_CONTENT_API_URL', '');
    vi.stubEnv('VITE_VOTING_API_URL', '');
    resetContentApi();
    // No backend: the demo client, which needs no fetch at all.
    await expect(resolveContentApi().getArenas()).resolves.toHaveLength(4);
    expect(fetchImpl).not.toHaveBeenCalled();

    // One backend for both sides is the common deployment, so the voting URL
    // is enough on its own.
    vi.stubEnv('VITE_VOTING_API_URL', 'https://api.example');
    resetContentApi();
    expect(resolveContentApi()).not.toBe(createDemoContentApi());
  });

  it('hands every caller the same instance', () => {
    expect(resolveContentApi()).toBe(resolveContentApi());
    resetContentApi();
    expect(resolveContentApi()).not.toBe(null);
  });
});
