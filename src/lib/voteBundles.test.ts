import { describe, expect, it } from 'vitest';
import {
  addBundle,
  bundleCartTotals,
  cartLineItems,
  cartSignature,
  fetchVoteBundles,
  isOrderableCart,
  VOTE_BUNDLES,
} from './voteBundles';

describe('vote bundles', () => {
  it('climbs: more money buys proportionally more votes', () => {
    const rates = VOTE_BUNDLES.map((bundle) => bundle.votes / bundle.priceCentavos);

    // Every tier is at least as generous as the one below it, and the top one
    // is strictly better than the bottom — otherwise there is no reason to
    // sell bundles at all.
    for (let i = 1; i < rates.length; i += 1) expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1]);
    expect(rates.at(-1)!).toBeGreaterThan(rates[0]);

    // Whole votes and whole centavos only.
    for (const bundle of VOTE_BUNDLES) {
      expect(Number.isSafeInteger(bundle.votes)).toBe(true);
      expect(Number.isSafeInteger(bundle.priceCentavos)).toBe(true);
    }
  });

  it('tops out at ₱1,000 per bundle and scales by adding more of them', () => {
    expect(Math.max(...VOTE_BUNDLES.map((b) => b.priceCentavos))).toBe(100_000);

    const four = bundleCartTotals({ 'b-1000': 4 });
    expect(four.amountCentavos).toBe(400_000);
    expect(four.votes).toBe(5_200);
  });

  it('sums a mixed cart and reports the bonus over the base rate', () => {
    // ₱1,000 + ₱50 = ₱1,050, which at the base rate would be 1,050 votes.
    const totals = bundleCartTotals({ 'b-1000': 1, 'b-50': 1 });

    expect(totals.amountCentavos).toBe(105_000);
    expect(totals.votes).toBe(1_355);
    expect(totals.bonusVotes).toBe(305);
    expect(totals.lines).toHaveLength(2);
  });

  it('prices what is still real when a cart outlives the catalogue', () => {
    const totals = bundleCartTotals({ 'b-50': 2, 'b-withdrawn': 9, 'b-100': -3, 'b-10': 1.5 });

    expect(totals.votes).toBe(110);
    expect(totals.amountCentavos).toBe(10_000);
    expect(totals.lines.map((line) => line.bundle.id)).toEqual(['b-50']);
  });

  it('is not orderable until it holds a bundle', () => {
    expect(isOrderableCart({})).toBe(false);
    expect(isOrderableCart({ 'b-10': 0 })).toBe(false);
    expect(isOrderableCart({ 'b-unknown': 5 })).toBe(false);
    expect(isOrderableCart({ 'b-10': 1 })).toBe(true);
  });

  it('adds and removes, and drops a bundle rather than keeping a zero', () => {
    let cart = addBundle({}, 'b-100');
    cart = addBundle(cart, 'b-100');
    expect(cart['b-100']).toBe(2);

    cart = addBundle(cart, 'b-100', -1);
    expect(cart['b-100']).toBe(1);

    cart = addBundle(cart, 'b-100', -1);
    expect('b-100' in cart).toBe(false);

    // Never negative, and an unknown id changes nothing.
    expect(addBundle(cart, 'b-100', -5)['b-100']).toBeUndefined();
    expect(addBundle(cart, 'nope')).toBe(cart);
  });

  it('describes the cart the same way twice, for keys and line items', () => {
    const cart = { 'b-1000': 2, 'b-10': 1 };

    // Catalogue order, not insertion order, so the same cart always signs the
    // same way.
    expect(cartSignature(cart)).toBe('b-10x1,b-1000x2');
    expect(cartSignature({ 'b-10': 1, 'b-1000': 2 })).toBe(cartSignature(cart));
    expect(cartLineItems(cart)).toEqual([
      { bundleId: 'b-10', count: 1 },
      { bundleId: 'b-1000', count: 2 },
    ]);
    expect(cartSignature({})).toBe('');
  });

  it('exposes the catalogue through an async seam a server can take over', async () => {
    await expect(fetchVoteBundles()).resolves.toEqual(VOTE_BUNDLES);
  });
});
