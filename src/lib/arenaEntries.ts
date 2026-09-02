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
  festivalContingents,
  gandangCandidates,
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
  fallbackImage?: string;
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
  /* `origin` is a town on three programmes and a district on booths. The
     standings board counts distinct origins, so it needs the right word. */
  originLabel: string;
  /**
   * What the entry photograph is of.
   *
   * Hara and Gandang photograph one person standing: a tall crop is the
   * portrait. A booth is a building and a contingent is thirty dancers in a
   * line — a tall crop of either throws away the thing being judged, so those
   * two get a wide card and a wide frame.
   */
  cardShape: 'portrait' | 'landscape';
};

/**
 * What each programme is called on screen.
 *
 * This used to special-case `hara` and return a hardcoded "Hara sa Negros
 * Oriental" over whatever the data said. The name now lives in the data, which
 * is the only place a server can reach — see `contestArenas` in `pageant.ts`.
 *
 * Kept as a function rather than inlining `arena.shortTitle` at each call site
 * because there are five of them, and the last time a naming rule lived in one
 * of them the others disagreed with it.
 */
export function arenaDisplayName(arena: ContestArena): string {
  return arena.shortTitle;
}

export const ARENA_VOTING: Record<ContestArena['id'], ArenaVoteConfig> = {
  hara: {
    allowance: 1,
    noun: 'candidates',
    nounSingular: 'candidate',
    action: 'Vote',
    prompt: 'Choose the queen who carries your town, then purchase as many votes as you want to add.',
    originLabel: 'Towns represented',
    cardShape: 'portrait',
  },
  // Booths are the one arena where backing several is fair: a visitor walks
  // the whole park in an evening and genuinely has three favourites.
  booths: {
    allowance: 3,
    noun: 'booths',
    nounSingular: 'booth',
    action: 'Vote',
    prompt: 'Choose the booth you want to support, then purchase as many votes as you want to add.',
    originLabel: 'Districts represented',
    cardShape: 'landscape',
  },
  festival: {
    allowance: 1,
    noun: 'contingents',
    nounSingular: 'contingent',
    action: 'Vote',
    prompt: 'Choose the festival contingent that represents its hometown best, then purchase as many votes as you want to add.',
    originLabel: 'Towns represented',
    cardShape: 'landscape',
  },
  gandang: {
    allowance: 1,
    noun: 'candidates',
    nounSingular: 'candidate',
    action: 'Vote',
    prompt: 'Choose the titleholder whose story stays with you, then purchase as many votes as you want to add.',
    originLabel: 'Towns represented',
    cardShape: 'portrait',
  },
};

const truncate = (text: string, max = 118) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max))}…`;

const candidateEntries = (source: Candidate[]): VoteEntry[] =>
  source.map((c) => ({
    id: c.id,
    number: c.number,
    /* Full name, so the profile page, the ballot and the roster card all
       call the same person the same thing. */
    name: c.surname ? `${c.name} ${c.surname}` : c.name,
    origin: c.location,
    blurb: c.advocacy ?? c.location,
    image: c.image,
    votes: c.votes,
    /* No facts of its own. `blurb` above is already the advocacy, so listing
       it again as a labelled fact printed the same sentence twice on the
       profile — which is what removing Talent left behind. */
    meta: [],
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
        fallbackImage: b.fallbackImage,
        votes: b.votes,
        // The tagline is the blurb, so the theme is the one fact worth listing.
        meta: [{ label: 'Theme', value: truncate(b.theme, 64) }],
      }));

    case 'festival':
      return festivalContingents.map((s, i) => ({
        id: s.id,
        number: String(i + 1).padStart(2, '0'),
        name: s.festivalName,
        origin: s.municipality,
        blurb: truncate(s.theme, 96),
        image: s.image,
        fallbackImage: s.fallbackImage,
        votes: s.votes,
        // `blurb` above is the theme; nothing else earns a label here.
        meta: [],
      }));

    case 'gandang':
      return candidateEntries(gandangCandidates);
  }
}
