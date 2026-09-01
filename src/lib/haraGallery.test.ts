import { entriesForArena } from './arenaEntries';
import { describe, expect, it } from 'vitest';
import { filterHaraCandidates } from './haraGallery';

describe('filterHaraCandidates', () => {
  it('returns a new array in the supplied source order when the query is empty', () => {
    const source = entriesForArena('hara').slice(0, 3).reverse();

    const visible = filterHaraCandidates(source, '');

    expect(visible).toEqual(source);
    expect(visible).not.toBe(source);
  });

  it('searches entry name, origin, and blurb case-insensitively', () => {
    const source = entriesForArena('hara');

    /* Matched on given names rather than the whole string, because entries
       carry a surname now and these placeholder surnames are the first thing
       the real roster will replace. */
    const given = (query: string) =>
      filterHaraCandidates(source, query).map((entry) => entry.name.split(' ').slice(0, -1).join(' '));

    expect(given('JESSA')).toEqual(['Jessa Mae']);
    expect(given('  MANJUYOD  ')).toEqual(['Kaye Nicole']);
    expect(given('mangrove')).toEqual(['Maria Angela', 'Beatrice Joy', 'Dana Faye']);

    // And a surname is searchable in its own right.
    const first = source[0];
    expect(filterHaraCandidates(source, first.name.split(' ').at(-1)!).map((e) => e.name)).toContain(
      first.name,
    );
  });

  it('returns an empty list when no entry matches', () => {
    expect(filterHaraCandidates(entriesForArena('hara'), 'does-not-exist')).toEqual([]);
  });
});
