import { describe, expect, it } from 'vitest';
import { entryHash, parseEntryHash } from './entryRoutes';

describe('entry routes', () => {
  it.each([
    ['#hara/c-01', 'hara', 'c-01'],
    ['#gandang/c-01', 'gandang', 'c-01'],
    ['#booths/booth-01', 'booths', 'booth-01'],
    ['#festival/sd-01', 'festival', 'sd-01'],
  ] as const)('parses %s', (hash, arenaId, entryId) => {
    expect(parseEntryHash(hash)).toEqual({ arenaId, entryId });
  });

  it('normalizes uppercase hashes', () => {
    expect(parseEntryHash('#HARA/C-01')).toEqual({ arenaId: 'hara', entryId: 'c-01' });
  });

  it.each(['#hara', '#hara/overview', '#unknown/c-01', '#hara/', '#hara/c_01', '#'])(
    'rejects the non-entry route %s',
    (hash) => {
      expect(parseEntryHash(hash)).toBeNull();
    },
  );

  it('builds a stable shareable hash', () => {
    expect(entryHash('festival', 'sd-01')).toBe('#festival/sd-01');
  });
});
