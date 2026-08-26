/**
 * One shape for everything that can be voted on.
 *
 * The four programs hold genuinely different records — a candidate has an
 * advocacy and a height, a booth has building materials, a contingent has a
 * choreographer — but the voting screen only ever needs six things from any
 * of them. Normalising here rather than branching inside the view is what
 * lets one page serve all four programs without turning into a switch
 * statement with four layouts inside it.
 *
 * `meta` is the escape hatch: two or three facts worth showing on the card,
 * already labelled, chosen per arena. That keeps the arena-specific knowledge
 * in one file instead of scattered through the JSX.
 */

import {
  candidates,
  festivalContingents,
  haraCandidates,
  lguBooths,
  type Candidate,
  type ContestArena,
} from '../data/pageant';

export type VoteEntry = {
  id: string;
  /** Sash number. Carries identity and vote state on the card. */
  number: string;
  name: string;
  /** The town. On every arena this is what people scan for. */
  origin: string;
  blurb: string;
  image: string | null;
  votes: number;
  meta: Array<{ label: string; value: string }>;
};

export type ArenaVoteConfig = {
  /** How many entries one person may back in this arena. */
  allowance: number;
  /** Plural noun for the entries — used in counts, search and empty states. */
  noun: string;
  nounSingular: string;
  /** Verb on the primary action. */
  action: string;
  /** What the person is being asked to do, in one line. */
  prompt: string;
};

export const ARENA_VOTING: Record<ContestArena['id'], ArenaVoteConfig> = {
  hara: {
    allowance: 1,
    noun: 'candidates',
    nounSingular: 'candidate',
    action: 'Vote',
    prompt: 'One vote per person. Choose the queen who carries your town.',
  },
  // Booths are the one arena where backing several is fair: a visitor walks
  // the whole park in an evening and genuinely has three favourites.
  booths: {
    allowance: 3,
    noun: 'booths',
    nounSingular: 'booth',
    action: 'Vote',
    prompt: 'Back up to three booths. Spend them however you like.',
  },
  festival: {
    allowance: 1,
    noun: 'contingents',
    nounSingular: 'contingent',
    action: 'Vote',
    prompt: 'One vote per person. Choose the festival contingent that represents its hometown best.',
  },
  gandang: {
    allowance: 1,
    noun: 'candidates',
    nounSingular: 'candidate',
    action: 'Vote',
    prompt: 'One vote per person. Choose the titleholder whose story stays with you.',
  },
};

const truncate = (text: string, max = 118) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max))}…`;

const candidateEntries = (source: Candidate[]): VoteEntry[] =>
  source.map((c) => ({
    id: c.id,
    number: c.number,
    name: c.name,
    origin: c.location,
    blurb: c.advocacy ?? c.location,
    image: c.image,
    votes: c.votes,
    meta: [
      { label: 'Advocacy', value: c.advocacy ?? '—' },
      { label: 'Talent', value: c.talent ?? '—' },
    ],
  }));

export function entriesForArena(arenaId: ContestArena['id']): VoteEntry[] {
  switch (arenaId) {
    case 'hara':
      return candidateEntries(haraCandidates);

    case 'booths':
      return lguBooths.map((b) => ({
        id: b.id,
        number: b.number,
        name: b.municipality,
        origin: b.district,
        blurb: b.tagline,
        image: b.image,
        votes: b.votes,
        meta: [
          { label: 'Theme', value: truncate(b.theme, 64) },
          { label: 'Known for', value: b.signatureProducts.slice(0, 2).join(' · ') },
        ],
      }));

    case 'festival':
      return festivalContingents.map((s, i) => ({
        id: s.id,
        number: String(i + 1).padStart(2, '0'),
        name: s.festivalName,
        origin: s.municipality,
        blurb: truncate(s.theme, 96),
        image: s.image,
        votes: s.votes,
        meta: [
          { label: 'Performers', value: `${s.performersCount} dancers` },
          { label: 'Presentation slot', value: s.performanceTime },
        ],
      }));

    case 'gandang':
      return candidateEntries(candidates);
  }
}
