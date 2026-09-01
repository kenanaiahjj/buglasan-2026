/**
 * What a supporter can buy.
 *
 * Votes are sold in fixed bundles rather than by the vote: pick ₱50 and you
 * get 55 votes, pick ₱1,000 and you get 1,300. The bonus climbs with the tier,
 * which is the whole point of selling them this way.
 *
 * **These numbers are placeholders.** The ladder below is invented to give the
 * presentation something coherent to show; the real catalogue is the festival's
 * to set. When it arrives it belongs on the server, for the same reason the
 * per-vote price already does: a client that decides what things cost is a
 * client that decides they cost nothing. `fetchVoteBundles` is the seam — it
 * returns the local ladder today and should return the server's tomorrow, and
 * nothing above it needs to know which happened.
 *
 * Money is in centavos throughout. Money in floating point is how a tally goes
 * wrong.
 */

export type VoteBundle = {
  id: string;
  priceCentavos: number;
  /** Total votes credited, bonus included. */
  votes: number;
};

/**
 * The ladder. Ends at ₱1,000 because that is the largest single denomination;
 * beyond it, supporters add more than one — the cart holds a count per bundle,
 * so four ₱1,000s is a normal thing to express.
 */
export const VOTE_BUNDLES: readonly VoteBundle[] = [
  { id: 'b-10', priceCentavos: 1_000, votes: 10 },
  { id: 'b-50', priceCentavos: 5_000, votes: 55 },
  { id: 'b-100', priceCentavos: 10_000, votes: 115 },
  { id: 'b-250', priceCentavos: 25_000, votes: 300 },
  { id: 'b-500', priceCentavos: 50_000, votes: 625 },
  { id: 'b-1000', priceCentavos: 100_000, votes: 1_300 },
];

/** How many of each bundle, keyed by bundle id. Absent means none. */
export type VoteBundleCart = Record<string, number>;

/** One bundle's contribution, for a receipt or an order's line items. */
export type VoteBundleLine = {
  bundle: VoteBundle;
  count: number;
  votes: number;
  amountCentavos: number;
};

export type VoteBundleTotals = {
  lines: VoteBundleLine[];
  votes: number;
  amountCentavos: number;
  /** Votes above what the same money would buy at the base ₱1-per-vote rate. */
  bonusVotes: number;
};

export function bundleById(id: string): VoteBundle | undefined {
  return VOTE_BUNDLES.find((bundle) => bundle.id === id);
}

/** The base rate the bonus is measured against: the smallest bundle's. */
export function baseVotesPerCentavo(): number {
  const base = VOTE_BUNDLES[0];
  return base.votes / base.priceCentavos;
}

/**
 * Totals for a cart.
 *
 * Ignores unknown ids and non-positive counts rather than throwing: a cart can
 * outlive the catalogue that made it — a stale link, a restored session, a
 * bundle the festival withdrew — and the honest answer is to price what is
 * still real.
 */
export function bundleCartTotals(cart: VoteBundleCart): VoteBundleTotals {
  const lines: VoteBundleLine[] = [];

  for (const bundle of VOTE_BUNDLES) {
    const raw = cart[bundle.id] ?? 0;
    const count = Number.isSafeInteger(raw) && raw > 0 ? raw : 0;
    if (count === 0) continue;

    lines.push({
      bundle,
      count,
      votes: bundle.votes * count,
      amountCentavos: bundle.priceCentavos * count,
    });
  }

  const votes = lines.reduce((sum, line) => sum + line.votes, 0);
  const amountCentavos = lines.reduce((sum, line) => sum + line.amountCentavos, 0);

  return {
    lines,
    votes,
    amountCentavos,
    bonusVotes: Math.max(0, votes - Math.round(amountCentavos * baseVotesPerCentavo())),
  };
}

/** A cart is orderable once it holds at least one bundle. */
export function isOrderableCart(cart: VoteBundleCart): boolean {
  return bundleCartTotals(cart).votes > 0;
}

export function addBundle(cart: VoteBundleCart, id: string, step = 1): VoteBundleCart {
  if (bundleById(id) === undefined) return cart;
  const next = Math.max(0, (cart[id] ?? 0) + step);
  const updated: VoteBundleCart = { ...cart, [id]: next };
  if (next === 0) delete updated[id];
  return updated;
}

/**
 * The line items an order carries.
 *
 * The server prices from its own catalogue; these say what the supporter
 * believed they were buying, so a mismatch can be reported against something
 * specific instead of one wrong total.
 */
export function cartLineItems(cart: VoteBundleCart): Array<{ bundleId: string; count: number }> {
  return bundleCartTotals(cart).lines.map((line) => ({ bundleId: line.bundle.id, count: line.count }));
}

/** Stable text for the cart, for idempotency keys and references. */
export function cartSignature(cart: VoteBundleCart): string {
  return cartLineItems(cart)
    .map((line) => `${line.bundleId}x${line.count}`)
    .join(',');
}

/**
 * The catalogue, as an async read.
 *
 * Local today. The signature is the shape a fetch would have so that swapping
 * the body does not ripple outward.
 */
export async function fetchVoteBundles(): Promise<readonly VoteBundle[]> {
  return VOTE_BUNDLES;
}
