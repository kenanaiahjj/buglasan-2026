import type { ContestArena } from '../data/pageant';

export type EntryRoute = {
  arenaId: ContestArena['id'];
  entryId: string;
};

const ARENA_IDS = new Set<ContestArena['id']>(['hara', 'booths', 'festival', 'gandang']);

const isArenaId = (value: string): value is ContestArena['id'] =>
  ARENA_IDS.has(value as ContestArena['id']);

export function entryHash(arenaId: ContestArena['id'], entryId: string): string {
  return `#${arenaId}/${entryId}`;
}

export function parseEntryHash(rawHash: string): EntryRoute | null {
  const hash = rawHash.replace(/^#/, '').toLowerCase();
  const match = /^([a-z]+)\/([a-z0-9-]+)$/.exec(hash);

  if (!match || !isArenaId(match[1]) || match[2] === 'overview') return null;

  return { arenaId: match[1], entryId: match[2] };
}
