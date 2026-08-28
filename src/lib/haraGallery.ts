import type { VoteEntry } from './arenaEntries';

export type HaraSortKey = 'votes' | 'number' | 'name';

const candidateNumber = (candidate: VoteEntry) => Number.parseInt(candidate.number, 10);

/**
 * Filter and sort a programme's entries for the gallery.
 *
 * Takes the normalised VoteEntry rather than Candidate so booths and
 * contingents sort through the same path as candidates — `origin` is the town
 * or district, `blurb` the advocacy or tagline, whichever the programme has.
 */
export function filterAndSortHaraCandidates(
  source: VoteEntry[],
  query: string,
  sort: HaraSortKey,
): VoteEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  const matched = needle
    ? source.filter((candidate) =>
        [candidate.name, candidate.origin, candidate.blurb ?? '']
          .some((field) => field.toLocaleLowerCase().includes(needle)),
      )
    : [...source];

  return matched.sort((left, right) => {
    if (sort === 'votes') {
      return right.votes - left.votes || candidateNumber(left) - candidateNumber(right);
    }

    if (sort === 'name') {
      return left.name.localeCompare(right.name) || candidateNumber(left) - candidateNumber(right);
    }

    return candidateNumber(left) - candidateNumber(right);
  });
}
