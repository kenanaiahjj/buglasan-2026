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
 * client that decides they cost nothing. The ladder below is the *fallback*;
 * `ContentApi.getVoteBundles` is the seam, `contentStore.ts` calls it, and the
 * ballot reads whatever came back through `useContent().bundles`.
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

/**
 * Every function below takes the catalogue it should price against, and every
 * one of them defaults to the ladder above.
 *
 * The default is the demo. The parameter is the point: once a server owns the
 * prices, a cart priced against this file's constant would compute an
 * `expectedAmountCentavos` the server disagrees with, and the order would come
 * back `price_mismatch` every single time. The ballot passes
 * `useContent().bundles`.
 */
export function bundleById(
  id: string,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): VoteBundle | undefined {
  return catalogue.find((bundle) => bundle.id === id);
}

/** The base rate the bonus is measured against: the smallest bundle's. */
export function baseVotesPerCentavo(catalogue: readonly VoteBundle[] = VOTE_BUNDLES): number {
  const base = catalogue[0];
  /* An empty catalogue is a server that answered with nothing. Zero here
     makes the bonus zero rather than NaN, which would render as "NaN bonus". */
  return base === undefined ? 0 : base.votes / base.priceCentavos;
}

/**
 * Totals for a cart.
 *
 * Ignores unknown ids and non-positive counts rather than throwing: a cart can
 * outlive the catalogue that made it — a stale link, a restored session, a
 * bundle the festival withdrew — and the honest answer is to price what is
 * still real.
 */
export function bundleCartTotals(
  cart: VoteBundleCart,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): VoteBundleTotals {
  const lines: VoteBundleLine[] = [];

  for (const bundle of catalogue) {
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
    bonusVotes: Math.max(0, votes - Math.round(amountCentavos * baseVotesPerCentavo(catalogue))),
  };
}

/** A cart is orderable once it holds at least one bundle. */
export function isOrderableCart(
  cart: VoteBundleCart,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): boolean {
  return bundleCartTotals(cart, catalogue).votes > 0;
}

export function addBundle(
  cart: VoteBundleCart,
  id: string,
  step = 1,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): VoteBundleCart {
  if (bundleById(id, catalogue) === undefined) return cart;
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
export function cartLineItems(
  cart: VoteBundleCart,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): Array<{ bundleId: string; count: number }> {
  return bundleCartTotals(cart, catalogue).lines.map((line) => ({
    bundleId: line.bundle.id,
    count: line.count,
  }));
}

/** Stable text for the cart, for idempotency keys and references. */
export function cartSignature(
  cart: VoteBundleCart,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): string {
  return cartLineItems(cart, catalogue)
    .map((line) => `${line.bundleId}x${line.count}`)
    .join(',');
}

/* There was a `fetchVoteBundles()` here that returned the constant above and
   called itself the seam. It had no callers, and it competed with the real
   one: `ContentApi.getVoteBundles`, which `contentStore.ts` calls for real and
   which a server can answer. Two functions claiming to be the same seam is
   worse than one. Read the catalogue through `useContent().bundles`. */
