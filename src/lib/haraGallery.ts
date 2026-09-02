import type { VoteEntry } from './arenaEntries';

/**
 * Filters a programme's entries for the gallery without changing their source
 * order. Search matches the entry name, town or district, and supporting copy.
 */
/* `readonly` in, mutable out: the roster now arrives from the content store,
   which hands out frozen arrays, and this already copies rather than sorting
   in place. */
export function filterHaraCandidates(source: readonly VoteEntry[], query: string): VoteEntry[] {
  const needle = query.trim().toLocaleLowerCase();

  if (!needle) return [...source];

  return source.filter((candidate) =>
    [candidate.name, candidate.origin, candidate.blurb ?? '']
      .some((field) => field.toLocaleLowerCase().includes(needle)),
  );
}
