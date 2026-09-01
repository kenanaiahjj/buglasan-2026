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

    expect(filterHaraCandidates(source, 'JESSA').map((entry) => entry.name)).toEqual(['Jessa Mae']);
    expect(filterHaraCandidates(source, '  MANJUYOD  ').map((entry) => entry.name)).toEqual(['Kaye Nicole']);
    expect(filterHaraCandidates(source, 'mangrove').map((entry) => entry.name)).toEqual([
      'Maria Angela',
      'Beatrice Joy',
      'Dana Faye',
    ]);
  });

  it('returns an empty list when no entry matches', () => {
    expect(filterHaraCandidates(entriesForArena('hara'), 'does-not-exist')).toEqual([]);
  });
});
