import { describe, expect, it } from 'vitest';
import { haraCandidates } from '../data/pageant';
import { filterAndSortHaraCandidates } from './haraGallery';

describe('filterAndSortHaraCandidates', () => {
  it('keeps the candidate-number order by default', () => {
    const visible = filterAndSortHaraCandidates(haraCandidates, '', 'number');

    expect(visible.map((candidate) => candidate.number)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
    ]);
  });

  it('searches candidate name, municipality, and advocacy', () => {
    expect(filterAndSortHaraCandidates(haraCandidates, 'jessa', 'number').map((candidate) => candidate.name)).toEqual(['Jessa Mae']);
    expect(filterAndSortHaraCandidates(haraCandidates, 'manjuyod', 'number').map((candidate) => candidate.name)).toEqual(['Kaye Nicole']);
    expect(filterAndSortHaraCandidates(haraCandidates, 'mangrove', 'number').map((candidate) => candidate.name)).toEqual(['Maria Angela', 'Beatrice Joy']);
  });

  it('sorts the complete roster by votes and name', () => {
    expect(filterAndSortHaraCandidates(haraCandidates, '', 'votes')[0].name).toBe('Jessa Mae');

    const byName = filterAndSortHaraCandidates(haraCandidates, '', 'name');
    expect(byName[0].name).toBe('Aira Mae');
    expect(byName.at(-1)?.name).toBe('Shaira');
  });

  it('returns an empty list when no candidate matches', () => {
    expect(filterAndSortHaraCandidates(haraCandidates, 'does-not-exist', 'number')).toEqual([]);
  });
});
