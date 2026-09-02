/**
 * The paid vote flow: having picked an entry on the programme page, say who
 * you are and where you are from, then pay for the votes.
 *
 * All of it is pure so the rules can be tested without a dialog around them.
 * The view decides what a step looks like; this decides whether a step is
 * finished, which is the part that must not disagree with itself.
 */

import { NEGROS_ORIENTAL_LGUS, OUTSIDE_PROVINCE } from '../data/pageant';
import {
  VOTE_BUNDLES,
  bundleCartTotals,
  cartSignature,
  isOrderableCart,
  type VoteBundle,
  type VoteBundleCart,
} from './voteBundles';

/* Choosing happens on the programme page, not in here: the dialog opens
   against a candidate the supporter already pressed Vote on. */
export type VoteFlowStep = 'supporter' | 'pay' | 'done';

export const VOTE_FLOW_STEPS: Array<{ id: VoteFlowStep; label: string }> = [
  { id: 'supporter', label: 'Your details' },
  { id: 'pay', label: 'Pay' },
];

/**
 * Centavos, not pesos: money in floating point is how a tally goes wrong.
 *
 * This is the base rate the smallest bundle is priced at, and the rate the
 * bonus on every larger bundle is measured against. Votes are not sold at it
 * individually — see `voteBundles.ts`.
 */
export const VOTE_PRICE_CENTAVOS = 100;

/** The payment gateway can only charge a positive, whole number of votes. */
export function isValidVoteQuantity(quantity: number): boolean {
  return Number.isSafeInteger(quantity) && quantity > 0;
}

export type PaymentMethodId = 'gcash' | 'maya' | 'card';

export const PAYMENT_METHODS: Array<{ id: PaymentMethodId; label: string; note: string }> = [
  { id: 'gcash', label: 'GCash', note: 'Confirm in the GCash app' },
  { id: 'maya', label: 'Maya', note: 'Confirm in the Maya app' },
  { id: 'card', label: 'Card', note: 'Visa, Mastercard or JCB' },
];

export const SUPPORTER_ORIGINS: string[] = [...NEGROS_ORIENTAL_LGUS, OUTSIDE_PROVINCE];

/**
 * The instructions, written once.
 *
 * "How to vote" opens on these and the stepper walks the same four titles, so
 * the explanation and the thing being explained cannot drift apart. Nouns
 * follow the programme — you back a booth, you do not back a candidate.
 */
export function voteFlowGuide(nounSingular: string | null): Array<{ title: string; copy: string }> {
  return [
    {
      title: 'Choose',
      copy: nounSingular
        ? `Find the ${nounSingular} you are backing on this page and press Vote.`
        : 'Open a contest, choose the candidate, booth, or festival contingent you want to support, and press Vote.',
    },
    {
      title: 'Your details',
      copy: 'Enter your mobile number and the town you are voting from. The receipt goes to that number.',
    },
    {
      title: 'Pay',
      copy: 'Enter how many votes you want to add, then pay by GCash, Maya or card.',
    },
    {
      title: 'Confirmed',
      copy: 'Your votes are added to the public tally the moment payment clears.',
    },
  ];
}

export type VoteFlowDraft = {
  entryId: string | null;
  /** National significant number: ten digits, no leading zero, no country code. */
  mobile: string;
  origin: string;
  /**
   * How many of each bundle. Votes are bought in bundles, so this is the
   * order — the vote count and the amount are both read off it rather than
   * stored beside it, because two places to say how much this costs is one
   * place too many.
   */
  bundles: VoteBundleCart;
  method: PaymentMethodId | null;
};

export function emptyVoteFlowDraft(entryId: string | null = null): VoteFlowDraft {
  return { entryId, mobile: '', origin: '', bundles: {}, method: null };
}

/**
 * Votes and amount for a draft, from its bundles.
 *
 * `catalogue` defaults to the bundled ladder and should be the live one
 * wherever a server owns the prices — see `voteBundles.ts`.
 */
export function voteDraftTotals(draft: VoteFlowDraft, catalogue: readonly VoteBundle[] = VOTE_BUNDLES) {
  return bundleCartTotals(draft.bundles, catalogue);
}

/**
 * Reduce anything a Filipino supporter might type to the ten-digit national
 * number. `+63 917 123 4567`, `0917-123-4567` and `9171234567` are the same
 * phone, and only one of those three is worth storing.
 */
export function normalisePhMobile(input: string): string {
  let digits = input.replace(/\D/g, '');

  if (digits.startsWith('63')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

/** `0917 123 4567` — the grouping people read their own number back in. */
export function formatPhMobile(nationalDigits: string): string {
  const digits = nationalDigits.slice(0, 10);
  if (digits === '') return '';

  const parts = [`0${digits.slice(0, 3)}`, digits.slice(3, 6), digits.slice(6, 10)];
  return parts.filter((part) => part !== '' && part !== '0').join(' ').trim() || `0${digits}`;
}

/* Every Philippine mobile number is ten significant digits opening with 9.
   Anything else is a landline, a typo, or a foreign number the SMS receipt
   will never reach. */
export function isValidPhMobile(nationalDigits: string): boolean {
  return /^9\d{9}$/.test(nationalDigits);
}

/** What the same number of votes would cost at the base rate. Kept for the
 *  places that still reason in votes rather than in bundles. */
export function voteTotalCentavos(quantity: number): number {
  return isValidVoteQuantity(quantity) ? quantity * VOTE_PRICE_CENTAVOS : 0;
}

export function formatPeso(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString('en-PH', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

/**
 * What is still missing before this step can be left.
 *
 * Returned as messages rather than a boolean so the dialog can say why the
 * button is dead instead of just presenting a dead button.
 */
export function voteFlowIssues(
  step: VoteFlowStep,
  draft: VoteFlowDraft,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): string[] {
  const issues: string[] = [];

  switch (step) {
    case 'supporter':
      if (draft.entryId === null) issues.push('Choose who you are voting for.');
      if (!isValidPhMobile(draft.mobile)) {
        issues.push('Enter a mobile number as 09XX XXX XXXX.');
      }
      if (draft.origin === '') issues.push('Tell us which town you are voting from.');
      break;

    case 'pay':
      if (!isOrderableCart(draft.bundles, catalogue)) issues.push('Add at least one vote bundle.');
      if (draft.method === null) issues.push('Choose how you want to pay.');
      break;

    case 'done':
      break;
  }

  return issues;
}

export function canLeaveStep(
  step: VoteFlowStep,
  draft: VoteFlowDraft,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): boolean {
  return voteFlowIssues(step, draft, catalogue).length === 0;
}

const ORDER: VoteFlowStep[] = ['supporter', 'pay', 'done'];

export function nextVoteFlowStep(step: VoteFlowStep): VoteFlowStep {
  return ORDER[Math.min(ORDER.indexOf(step) + 1, ORDER.length - 1)];
}

export function previousVoteFlowStep(step: VoteFlowStep): VoteFlowStep {
  return ORDER[Math.max(ORDER.indexOf(step) - 1, 0)];
}

export function voteFlowStepIndex(step: VoteFlowStep): number {
  return ORDER.indexOf(step);
}

/**
 * A reference the supporter can quote when a vote does not appear.
 *
 * Derived from the draft rather than random so the same submission produces
 * the same reference — a receipt that changes when you reload is not a
 * receipt. Real references come from the payment gateway; this stands in
 * until one is wired up.
 */
export function voteReference(
  arenaId: string,
  draft: VoteFlowDraft,
  catalogue: readonly VoteBundle[] = VOTE_BUNDLES,
): string {
  const seed = `${arenaId}:${draft.entryId ?? ''}:${draft.mobile}:${cartSignature(draft.bundles, catalogue)}`;
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `BF26-${arenaId.slice(0, 2).toUpperCase()}-${hash.toString(36).toUpperCase().padStart(7, '0').slice(0, 7)}`;
}
