import type { Candidate } from '../data/pageant';

export type HaraSortKey = 'votes' | 'number' | 'name';

const candidateNumber = (candidate: Candidate) => Number.parseInt(candidate.number, 10);

export function filterAndSortHaraCandidates(
  source: Candidate[],
  query: string,
  sort: HaraSortKey,
): Candidate[] {
  const needle = query.trim().toLocaleLowerCase();
  const matched = needle
    ? source.filter((candidate) =>
        [candidate.name, candidate.location, candidate.advocacy ?? '']
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
