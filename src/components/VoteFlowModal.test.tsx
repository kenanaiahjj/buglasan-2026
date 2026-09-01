import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contestArenas, haraCandidates } from '../data/pageant';
import { entriesForArena } from '../lib/arenaEntries';
import { VoteFlowModal } from './VoteFlowModal';
import { VotingApiError, type VoteOrder, type VoteOrderRequest, type VotingApi } from '../lib/votingApi';
import type { VoterAction } from '../state/voterState';

const hara = contestArenas.find((arena) => arena.id === 'hara')!;

let container: HTMLDivElement;
let root: Root;

function mount(node: React.ReactElement) {
  act(() => {
    root.render(node);
  });
}

/* The dialog portals to the body, so it is never inside `container`. */
const q = <T extends Element>(selector: string) => document.body.querySelector<T>(selector);
const all = <T extends Element = Element>(selector: string) => Array.from(document.body.querySelectorAll<T>(selector));
const text = () => q('.vote-flow')?.textContent ?? '';

function click(element: Element | null) {
  act(() => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** React tracks the value on the node, so a raw `.value =` is ignored. */
function type(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, value);
  act(() => {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function nextButton() {
  return q<HTMLButtonElement>('.vote-flow__next');
}

/** Settles immediately, so a click plus a flushed microtask is the whole flow. */
function stubApi(over: Partial<VotingApi> = {}) {
  const orders: VoteOrderRequest[] = [];
  const api: VotingApi = {
    createVoteOrder: async (order) => {
      orders.push(order);
      return {
        reference: 'REF-TEST-1',
        status: 'confirmed',
        arenaId: order.arenaId,
        entryId: order.entryId,
        quantity: order.quantity,
        amountCentavos: order.expectedAmountCentavos,
      } satisfies VoteOrder;
    },
    getVoteOrder: async () => {
      throw new Error('not used');
    },
    getTally: async (arenaId) => ({ arenaId, tallies: {}, updatedAt: 0 }),
    ...over,
  };
  return { api, orders };
}

async function clickAsync(element: Element | null) {
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function fillSupporter() {
  type(q<HTMLInputElement>('input[type="tel"]')!, '0917 123 4567');
  type(q<HTMLSelectElement>('select')!, 'Valencia');
  click(nextButton());
  click(all('.vote-flow__method input')[0]);
}

describe('VoteFlowModal', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it('is strictly instructions, with no way to vote from inside it', () => {
    const onClose = vi.fn();
    mount(<VoteFlowModal arena={hara} dispatch={() => undefined} mode="guide" onClose={onClose} />);

    expect(q('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(text()).toContain('How to vote');
    expect(all('.vote-flow__guide li')).toHaveLength(4);
    // No stepper, no roster, no fields: choosing happens out on the page.
    expect(q('.vote-flow__steps')).toBeNull();
    expect(q('input[type="tel"]')).toBeNull();
    expect(q('input[type="radio"]')).toBeNull();
    expect(text()).toContain('press Vote');

    // The only way out is out.
    expect(nextButton()?.textContent).toContain('Got it');
    click(nextButton());
    expect(onClose).toHaveBeenCalled();
  });

  it('will not advance past a step whose answers are missing, and says why', () => {
    mount(
      <VoteFlowModal
        arena={hara}
        dispatch={() => undefined}
        entryId={haraCandidates[0].id}
        mode="flow"
        onClose={() => undefined}
      />,
    );

    expect(nextButton()?.getAttribute('aria-disabled')).toBe('true');
    click(nextButton());

    // aria-disabled, not disabled: the press has to be able to explain itself.
    const issues = q('.vote-flow__issues')?.textContent ?? '';
    expect(issues).toContain('09XX');
    expect(issues).toContain('which town');
  });

  it('opens straight on the supporter step for the entry that was pressed', () => {
    mount(
      <VoteFlowModal
        arena={hara}
        dispatch={() => undefined}
        entryId={haraCandidates[1].id}
        mode="flow"
        onClose={() => undefined}
      />,
    );

    expect(text()).toContain('Voting for');
    expect(text()).toContain(haraCandidates[1].name);
    expect(q<HTMLImageElement>('.vote-flow__chosen-image')?.getAttribute('src')).toBe(haraCandidates[1].image);
    expect(q('.vote-flow__back')).toBeNull();
    expect(q('input[type="tel"]')).not.toBeNull();
    const origin = q<HTMLSelectElement>('select');
    expect(origin).not.toBeNull();
    const descriptionId = origin?.getAttribute('aria-describedby');
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain('turnout board');
    // Two steps in the dialog, because the first one already happened.
    expect(all('.vote-flow__step')).toHaveLength(2);
  });

  it('lets the supporter enter any whole-number quantity and updates the price 1:1', async () => {
    mount(
      <VoteFlowModal
        arena={hara}
        dispatch={() => undefined}
        entryId={haraCandidates[0].id}
        mode="flow"
        onClose={() => undefined}
      />,
    );

    await fillSupporter();

    const quantity = q<HTMLInputElement>('input[type="number"]')!;
    expect(quantity.value).toBe('1');

    type(quantity, '73');
    expect(text()).toContain('73 votes');
    expect(text()).toContain('₱73.00');
    expect(nextButton()?.textContent).toContain('₱73.00');
  });

  it('runs details → pay → confirmed and reports the purchased quantity and total', async () => {
    const dispatch = vi.fn<(action: VoterAction) => void>();
    const { api, orders } = stubApi({
      getTally: async (arenaId) => ({
        arenaId,
        tallies: { [haraCandidates[0].id]: haraCandidates[0].votes + 55 },
        updatedAt: 0,
      }),
    });
    mount(
      <VoteFlowModal
        api={api}
        arena={hara}
        dispatch={dispatch}
        entryId={haraCandidates[0].id}
        mode="flow"
        onClose={() => undefined}
      />,
    );

    await fillSupporter();
    type(q<HTMLInputElement>('input[type="number"]')!, '55');

    // Pay: the entered quantity shows its complete 1:1 price.
    expect(text()).toContain('Pay with');
    expect(text()).toContain('55 votes');
    expect(text()).toContain('₱55.00');
    expect(nextButton()?.textContent).toContain('₱55.00');

    await clickAsync(nextButton());

    /* The order the server receives, not just the screen the user sees. The
       amount is sent for cross-checking and the key is what stops a retry
       from charging twice. */
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      arenaId: 'hara',
      entryId: haraCandidates[0].id,
      quantity: 55,
      mobile: '9171234567',
      origin: 'Valencia',
      method: 'gcash',
      expectedAmountCentavos: 5_500,
      returnUrl: window.location.href,
    });
    expect(orders[0].idempotencyKey).toMatch(/^BF26-HA-/);

    // The reducer only hears about a quantity the server already confirmed.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0]).toEqual({
      type: 'castArenaVote',
      arenaId: 'hara',
      entryId: haraCandidates[0].id,
      quantity: 55,
    });
    expect(text()).toContain('Vote successful');
    expect(q('.vote-flow__success-card')).not.toBeNull();
    expect(q('.vote-flow__success-card')?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(q('.vote-flow__success-candidate-copy h3')?.textContent).toBe(haraCandidates[0].name);
    expect(q('.vote-flow__success-category')?.textContent).toBe('Hara sa Negros Oriental');
    expect(q('.vote-flow__success-stats dd')?.textContent).toBe('55');
    expect(q<HTMLImageElement>('.vote-flow__success-image')?.getAttribute('src')).toBe(haraCandidates[0].image);
    expect(text()).toContain('Votes added');
    expect(text()).toContain('55');
    expect(text()).toContain('Total votes');
    expect(text()).toContain((haraCandidates[0].votes + 55).toLocaleString('en-PH'));
    expect(text()).toContain('0917 123 4567');
    // The server's reference wins over the locally derived one.
    expect(text()).toContain('REF-TEST-1');
  });

  it.each([
    ['booths', 'LGU Booth Contest'],
    ['festival', 'Festival of Festivals'],
  ] as const)('labels the confirmation card with the %s program', async (arenaId, category) => {
    const arena = contestArenas.find((candidate) => candidate.id === arenaId)!;
    const entry = entriesForArena(arena.id)[0];

    mount(
      <VoteFlowModal
        api={stubApi().api}
        arena={arena}
        dispatch={() => undefined}
        entryId={entry.id}
        mode="flow"
        onClose={() => undefined}
      />,
    );

    await fillSupporter();
    await clickAsync(nextButton());

    expect(q('.vote-flow__success-category')?.textContent).toBe(category);
  });

  it('keeps the vote uncounted when the charge fails, and offers a retry', async () => {
    const dispatch = vi.fn<(action: VoterAction) => void>();
    const { api } = stubApi({
      createVoteOrder: async () => {
        throw new VotingApiError('network', 'Could not reach the voting service.');
      },
    });
    mount(
      <VoteFlowModal
        api={api}
        arena={hara}
        dispatch={dispatch}
        entryId={haraCandidates[0].id}
        mode="flow"
        onClose={() => undefined}
      />,
    );

    await fillSupporter();
    await clickAsync(nextButton());

    expect(dispatch).not.toHaveBeenCalled();
    expect(text()).not.toContain('Vote successful');
    expect(q('.vote-flow__failure')?.textContent).toContain('Could not reach');
    expect(q('.vote-flow__failure')?.textContent).toContain('try again');
  });

  it('sends the supporter to hosted checkout rather than taking card details', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });

    const dispatch = vi.fn<(action: VoterAction) => void>();
    const { api } = stubApi({
      createVoteOrder: async (order) => ({
        reference: 'REF-PENDING',
        status: 'pending',
        arenaId: order.arenaId,
        entryId: order.entryId,
        quantity: order.quantity,
        amountCentavos: order.expectedAmountCentavos,
        checkoutUrl: 'https://pay.example.test/checkout/REF-PENDING',
      }),
    });
    mount(
      <VoteFlowModal
        api={api}
        arena={hara}
        dispatch={dispatch}
        entryId={haraCandidates[0].id}
        mode="flow"
        onClose={() => undefined}
      />,
    );

    await fillSupporter();
    await clickAsync(nextButton());

    expect(assign).toHaveBeenCalledWith('https://pay.example.test/checkout/REF-PENDING');
    // Nothing is counted here: the server hears from the gateway, not from us.
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('normalises whatever shape the mobile number is typed in', () => {
    mount(
      <VoteFlowModal
        arena={hara}
        dispatch={() => undefined}
        entryId={haraCandidates[0].id}
        mode="flow"
        onClose={() => undefined}
      />,
    );

    const tel = q<HTMLInputElement>('input[type="tel"]')!;
    type(tel, '+639171234567');
    expect(tel.value).toBe('0917 123 4567');
  });

  it('closes on Escape and restores the page scroll', () => {
    const onClose = vi.fn();
    mount(<VoteFlowModal arena={hara} dispatch={() => undefined} mode="guide" onClose={onClose} />);

    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalled();

    act(() => root.render(<div />));
    expect(document.body.style.overflow).toBe('');
    expect(q('.vote-flow')).toBeNull();
  });

  it('follows the programme it was opened for', () => {
    const booths = contestArenas.find((arena) => arena.id === 'booths')!;
    mount(<VoteFlowModal arena={booths} dispatch={() => undefined} mode="guide" onClose={() => undefined} />);

    expect(text()).toContain('LGU Booth Contest');
    expect(text()).toContain('booth');
  });
});
