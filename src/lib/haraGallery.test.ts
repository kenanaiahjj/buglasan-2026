import { entriesForArena } from './arenaEntries';
import { describe, expect, it } from 'vitest';
import { filterAndSortHaraCandidates } from './haraGallery';

describe('filterAndSortHaraCandidates', () => {
  it('keeps the candidate-number order by default', () => {
    const visible = filterAndSortHaraCandidates(entriesForArena('hara'), '', 'number');

    expect(visible.map((candidate) => candidate.number)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
      '13', '14', '15', '16', '17', '18', '19', '20', '21', '22',
    ]);
  });

  it('searches candidate name, municipality, and advocacy', () => {
    expect(filterAndSortHaraCandidates(entriesForArena('hara'), 'jessa', 'number').map((candidate) => candidate.name)).toEqual(['Jessa Mae']);
    expect(filterAndSortHaraCandidates(entriesForArena('hara'), 'manjuyod', 'number').map((candidate) => candidate.name)).toEqual(['Kaye Nicole']);
    expect(filterAndSortHaraCandidates(entriesForArena('hara'), 'mangrove', 'number').map((candidate) => candidate.name)).toEqual(['Maria Angela', 'Beatrice Joy', 'Dana Faye']);
  });

  it('sorts the complete roster by votes and name', () => {
    expect(filterAndSortHaraCandidates(entriesForArena('hara'), '', 'votes')[0].name).toBe('Jessa Mae');

    const byName = filterAndSortHaraCandidates(entriesForArena('hara'), '', 'name');
    expect(byName[0].name).toBe('Aira Mae');
    expect(byName.at(-1)?.name).toBe('Shaira');
  });

  it('returns an empty list when no candidate matches', () => {
    expect(filterAndSortHaraCandidates(entriesForArena('hara'), 'does-not-exist', 'number')).toEqual([]);
  });
});
