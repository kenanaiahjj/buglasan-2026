import { describe, expect, it } from 'vitest';
import { NEGROS_ORIENTAL_LGUS, OUTSIDE_PROVINCE } from '../data/pageant';
import {
  SUPPORTER_ORIGINS,
  canLeaveStep,
  emptyVoteFlowDraft,
  formatPeso,
  formatPhMobile,
  isValidVoteQuantity,
  isValidPhMobile,
  nextVoteFlowStep,
  normalisePhMobile,
  previousVoteFlowStep,
  voteFlowGuide,
  voteFlowIssues,
  voteReference,
  voteDraftTotals,
  voteTotalCentavos,
  type VoteFlowDraft,
} from './voteFlow';

const complete = (over: Partial<VoteFlowDraft> = {}): VoteFlowDraft => ({
  entryId: 'c-01',
  mobile: '9171234567',
  origin: 'Dumaguete City',
  bundles: { 'b-100': 1 },
  method: 'gcash',
  ...over,
});

describe('Philippine mobile numbers', () => {
  /* +63 917…, 0917… and 917… are one phone. Storing three shapes of it is
     how the same supporter shows up as three people in a report. */
  it('reduces every way a supporter might type theirs to one form', () => {
    for (const typed of ['+63 917 123 4567', '0917-123-4567', '9171234567', '63 917 123 4567', '(0917) 1234567']) {
      expect(normalisePhMobile(typed)).toBe('9171234567');
    }
  });

  it('never grows past ten significant digits', () => {
    expect(normalisePhMobile('0917123456789999')).toHaveLength(10);
  });

  it('accepts only ten digits opening with 9', () => {
    expect(isValidPhMobile('9171234567')).toBe(true);
    // A landline, a short number, and a number that starts wrong.
    expect(isValidPhMobile('353225555')).toBe(false);
    expect(isValidPhMobile('917123456')).toBe(false);
    expect(isValidPhMobile('8171234567')).toBe(false);
  });

  it('formats back into the grouping people read their own number in', () => {
    expect(formatPhMobile('9171234567')).toBe('0917 123 4567');
    expect(formatPhMobile('917')).toBe('0917');
    expect(formatPhMobile('')).toBe('');
  });
});

describe('vote pricing', () => {
  it('starts with an empty basket, because a bundle is a choice', () => {
    expect(emptyVoteFlowDraft().bundles).toEqual({});
    expect(voteDraftTotals(emptyVoteFlowDraft()).votes).toBe(0);
    expect(voteDraftTotals(emptyVoteFlowDraft()).amountCentavos).toBe(0);
  });

  it('reads votes and amount off the bundles in the draft', () => {
    const totals = voteDraftTotals(complete({ bundles: { 'b-1000': 2, 'b-50': 1 } }));

    expect(totals.votes).toBe(2_655);
    expect(totals.amountCentavos).toBe(205_000);
  });

  it('still prices bare votes at the base rate for callers that use it', () => {
    expect(voteTotalCentavos(1)).toBe(100);
    expect(voteTotalCentavos(20)).toBe(2_000);
    expect(voteTotalCentavos(55)).toBe(5_500);
    expect(voteTotalCentavos(537)).toBe(53_700);
  });

  it('rejects quantities that cannot be charged as whole votes', () => {
    expect(isValidVoteQuantity(1)).toBe(true);
    expect(isValidVoteQuantity(500)).toBe(true);
    expect(isValidVoteQuantity(0)).toBe(false);
    expect(isValidVoteQuantity(-1)).toBe(false);
    expect(isValidVoteQuantity(1.5)).toBe(false);
    expect(isValidVoteQuantity(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(voteTotalCentavos(0)).toBe(0);
    expect(voteTotalCentavos(1.5)).toBe(0);
  });

  it('renders pesos with both centavos, always', () => {
    expect(formatPeso(2000)).toBe('₱20.00');
    expect(formatPeso(voteTotalCentavos(55))).toBe('₱55.00');
  });
});

describe('step gating', () => {
  it('will not leave a step while something it needs is missing', () => {
    /* Choosing happens out on the programme page, so an entry-less draft is
       a bug rather than a state the dialog can walk the supporter out of. */
    expect(voteFlowIssues('supporter', emptyVoteFlowDraft())).toContain('Choose who you are voting for.');

    const noOrigin = complete({ origin: '' });
    expect(voteFlowIssues('supporter', noOrigin)).toEqual(['Tell us which town you are voting from.']);

    const badPhone = complete({ mobile: '8171234567' });
    expect(voteFlowIssues('supporter', badPhone)[0]).toMatch(/09XX/);

    expect(voteFlowIssues('pay', complete({ method: null }))).toHaveLength(1);
    expect(voteFlowIssues('pay', complete({ bundles: { 'b-10': 1 } }))).not.toContain(
      'Add at least one vote bundle.',
    );
    expect(voteFlowIssues('pay', complete({ bundles: {} }))).toContain('Add at least one vote bundle.');
    /* A bundle the catalogue no longer sells is no bundle at all. */
    expect(voteFlowIssues('pay', complete({ bundles: { 'b-withdrawn': 4 } }))).toContain(
      'Add at least one vote bundle.',
    );
    expect(canLeaveStep('pay', complete())).toBe(true);
  });

  /* The messages are the reason the Continue button is only aria-disabled:
     a press has to be able to say what is missing. */
  it('reports every missing thing at once, not just the first', () => {
    expect(voteFlowIssues('supporter', complete({ mobile: '', origin: '' }))).toHaveLength(2);
  });

  it('walks forwards and backwards without falling off either end', () => {
    expect(nextVoteFlowStep('supporter')).toBe('pay');
    expect(nextVoteFlowStep('pay')).toBe('done');
    expect(nextVoteFlowStep('done')).toBe('done');
    expect(previousVoteFlowStep('pay')).toBe('supporter');
    expect(previousVoteFlowStep('supporter')).toBe('supporter');
  });
});

describe('supporter origins', () => {
  it('offers every Negros Oriental LGU plus somewhere to put everyone else', () => {
    // Twenty-five towns, the same twenty-five the hero copy counts.
    expect(NEGROS_ORIENTAL_LGUS).toHaveLength(25);
    expect(SUPPORTER_ORIGINS).toHaveLength(26);
    expect(SUPPORTER_ORIGINS.at(-1)).toBe(OUTSIDE_PROVINCE);
    expect(SUPPORTER_ORIGINS).toContain('Dumaguete City');
    expect(new Set(SUPPORTER_ORIGINS).size).toBe(SUPPORTER_ORIGINS.length);
  });
});

describe('receipt reference', () => {
  /* A reference that changes when the page reloads is not a reference. */
  it('is stable for the same submission and different for another', () => {
    expect(voteReference('hara', complete())).toBe(voteReference('hara', complete()));
    expect(voteReference('hara', complete())).not.toBe(
      voteReference('hara', complete({ bundles: { 'b-500': 3 } })),
    );
    expect(voteReference('hara', complete())).not.toBe(voteReference('booths', complete()));
    expect(voteReference('hara', complete())).toMatch(/^BF26-HA-[0-9A-Z]{7}$/);
  });
});

describe('the guide', () => {
  it('names the programme, and says what each step asks for', () => {
    const booths = voteFlowGuide('booth');

    expect(booths).toHaveLength(4);
    // Step one points back out to the page rather than into the dialog.
    expect(booths[0].copy).toContain('booth');
    expect(booths[0].copy).toMatch(/on this page/);
    expect(booths[1].copy).toMatch(/mobile number/);
    expect(booths[1].copy).toMatch(/town/);
    expect(booths[2].copy).toMatch(/how many votes/);
  });
});
