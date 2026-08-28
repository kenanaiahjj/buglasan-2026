import { describe, expect, it } from 'vitest';
import { ARENA_VOTING, entriesForArena } from '../lib/arenaEntries';
import { initialVoterState, voterReducer, type VoterState } from './voterState';

const cast = (state: VoterState, arenaId: 'hara' | 'booths', entryId: string) =>
  voterReducer(state, { type: 'castArenaVote', arenaId, entryId });

describe('arena voting', () => {
  it('seeds a tally for every entry in every arena', () => {
    for (const id of ['hara', 'booths', 'festival', 'gandang'] as const) {
      const entries = entriesForArena(id);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(initialVoterState.arenaTallies[id][entry.id]).toBe(entry.votes);
      }
    }
  });

  it('records a vote against the arena and increments that entry only', () => {
    const [first, second] = entriesForArena('hara');
    const next = cast(initialVoterState, 'hara', first.id);

    expect(next.arenaVotes.hara).toEqual([first.id]);
    expect(next.arenaTallies.hara[first.id]).toBe(first.votes + 1);
    expect(next.arenaTallies.hara[second.id]).toBe(second.votes);
    // Arenas are independent wallets.
    expect(next.arenaVotes.booths).toEqual([]);
  });

  it('applies the full quantity from a confirmed paid order', () => {
    const [first] = entriesForArena('hara');
    const purchased = voterReducer(initialVoterState, {
      type: 'castArenaVote',
      arenaId: 'hara',
      entryId: first.id,
      quantity: 55,
    });

    expect(purchased.arenaVotes.hara).toEqual([first.id]);
    expect(purchased.arenaTallies.hara[first.id]).toBe(first.votes + 55);

    const secondPurchase = voterReducer(purchased, {
      type: 'castArenaVote',
      arenaId: 'hara',
      entryId: first.id,
      quantity: 10,
    });
    expect(secondPurchase.arenaTallies.hara[first.id]).toBe(first.votes + 65);
  });

  it('refuses a second vote in a single-vote arena', () => {
    const [first, second] = entriesForArena('hara');
    const once = cast(initialVoterState, 'hara', first.id);
    const twice = cast(once, 'hara', second.id);

    expect(twice).toBe(once);
    expect(twice.arenaTallies.hara[second.id]).toBe(second.votes);
  });

  it('refuses to double-count the same entry', () => {
    const [first] = entriesForArena('booths');
    const once = cast(initialVoterState, 'booths', first.id);
    const twice = cast(once, 'booths', first.id);

    expect(twice).toBe(once);
    expect(twice.arenaTallies.booths[first.id]).toBe(first.votes + 1);
  });

  it('allows the booth allowance and stops exactly at it', () => {
    const entries = entriesForArena('booths');
    expect(ARENA_VOTING.booths.allowance).toBe(3);

    let state = initialVoterState;
    for (const entry of entries.slice(0, 3)) state = cast(state, 'booths', entry.id);
    expect(state.arenaVotes.booths).toHaveLength(3);

    const overspent = cast(state, 'booths', entries[3].id);
    expect(overspent).toBe(state);
    expect(overspent.arenaTallies.booths[entries[3].id]).toBe(entries[3].votes);
  });

  it('undo returns both the wallet and the tally', () => {
    const [first] = entriesForArena('hara');
    const voted = cast(initialVoterState, 'hara', first.id);
    const undone = voterReducer(voted, { type: 'undoArenaVote', arenaId: 'hara', entryId: first.id });

    expect(undone.arenaVotes.hara).toEqual([]);
    expect(undone.arenaTallies.hara[first.id]).toBe(first.votes);
  });

  it('ignores an undo for an entry that was never voted for', () => {
    const [, second] = entriesForArena('hara');
    const untouched = voterReducer(initialVoterState, {
      type: 'undoArenaVote',
      arenaId: 'hara',
      entryId: second.id,
    });
    expect(untouched).toBe(initialVoterState);
  });

  it('gives every arena a prompt and a plural noun for its empty and count states', () => {
    for (const id of ['hara', 'booths', 'festival', 'gandang'] as const) {
      expect(ARENA_VOTING[id].prompt).toBeTruthy();
      expect(ARENA_VOTING[id].noun).toBeTruthy();
      expect(ARENA_VOTING[id].allowance).toBeGreaterThan(0);
    }
  });
});
