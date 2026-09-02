import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { Minus } from '@phosphor-icons/react/dist/icons/Minus';
import { Plus } from '@phosphor-icons/react/dist/icons/Plus';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { CheckCircle } from '@phosphor-icons/react/dist/icons/CheckCircle';
import { X } from '@phosphor-icons/react/dist/icons/X';
import { pageantContent, type ContestArena } from '../data/pageant';
import { ARENA_VOTING, arenaDisplayName } from '../lib/arenaEntries';
import { useArenaEntries, useContent } from '../lib/contentStore';
import {
  PAYMENT_METHODS,
  SUPPORTER_ORIGINS,
  VOTE_FLOW_STEPS,
  canLeaveStep,
  emptyVoteFlowDraft,
  formatPeso,
  formatPhMobile,
  VOTE_PRICE_CENTAVOS,
  nextVoteFlowStep,
  normalisePhMobile,
  previousVoteFlowStep,
  voteFlowGuide,
  voteFlowIssues,
  voteDraftTotals,
  voteFlowStepIndex,
  voteReference,
  type PaymentMethodId,
  type VoteFlowStep,
} from '../lib/voteFlow';
import { addBundle, cartLineItems } from '../lib/voteBundles';
import {
  VotingApiError,
  resolveVotingApi,
  resolveVotingReturnUrl,
  type VoteOrderRequest,
  type VotingApi,
} from './../lib/votingApi';
import type { VoterAction } from '../state/voterState';

export type VoteFlowMode = 'guide' | 'flow';

type VoteFlowModalProps = {
  arena: ContestArena;
  /** 'guide' opens on the instructions; 'flow' goes straight to the ballot. */
  mode: VoteFlowMode;
  /** Landing-page help is festival-wide; programme pages keep their own nouns and prompt. */
  guideScope?: 'general' | 'program';
  /** Pre-selected entry when the modal was opened from a card. */
  entryId?: string | null;
  onClose: () => void;
  dispatch: Dispatch<VoterAction>;
  /** Injected in tests; production resolves it from the environment. */
  api?: VotingApi;
};

/** Focusable descendants, in document order — the ring a trap cycles. */
function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => node.offsetParent !== null || node === document.activeElement);
}

export function VoteFlowModal({
  arena,
  mode,
  guideScope = 'program',
  entryId = null,
  onClose,
  dispatch,
  api,
}: VoteFlowModalProps) {
  const cfg = ARENA_VOTING[arena.id];
  const programName = arenaDisplayName(arena);
  const isGeneralGuide = mode === 'guide' && guideScope === 'general';
  const guideEyebrow = isGeneralGuide ? pageantContent.title : programName;
  const guidePrompt = isGeneralGuide
    ? 'Choose a contest, then select the candidate, booth, or festival contingent you want to support.'
    : cfg.prompt;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const roster = useArenaEntries(arena.id);
  /* The live price list. Everything that prices this cart is handed the same
     array — a total computed against a catalogue the server has moved on from
     is an order it will reject as `price_mismatch`. */
  const { bundles: catalogue } = useContent();
  const guide = useMemo(
    () => voteFlowGuide(isGeneralGuide ? null : cfg.nounSingular),
    [cfg.nounSingular, isGeneralGuide],
  );

  const [step, setStep] = useState<VoteFlowStep | 'guide'>(mode === 'guide' ? 'guide' : 'supporter');
  const [draft, setDraft] = useState(() => emptyVoteFlowDraft(entryId));
  const [showIssues, setShowIssues] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<{ message: string; retryable: boolean } | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const client = useMemo(() => api ?? resolveVotingApi(), [api]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const chosen = roster.find((entry) => entry.id === draft.entryId) ?? null;

  const issues = step === 'guide' ? [] : voteFlowIssues(step, draft, catalogue);
  const ready = step === 'guide' || canLeaveStep(step, draft, catalogue);

  // --- dialog behaviour ---------------------------------------------------
  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    // Focus the panel itself, not the first control: landing on "Close"
    // reads the wrong thing first, and landing in a field skips the heading.
    panel?.focus();

    return () => {
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      /* Without this the next Tab walks out of the dialog and into the page
         behind it, which is still there and still clickable to a keyboard. */
      const ring = focusables(panel);
      if (ring.length === 0) return;

      const first = ring[0];
      const last = ring[ring.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  // --- submission ---------------------------------------------------------
  /**
   * Hand the order to whatever settles money.
   *
   * The idempotency key is derived from the order rather than generated per
   * attempt, so a retry after a timeout resolves to the same charge instead
   * of a second one. The reducer is only told about a vote the server has
   * already called confirmed.
   */
  const submitOrder = useCallback(async () => {
    if (draft.entryId === null || draft.method === null) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const key = voteReference(arena.id, draft, catalogue);
    const order: VoteOrderRequest = {
      arenaId: arena.id,
      entryId: draft.entryId,
      quantity: totals.votes,
      mobile: draft.mobile,
      origin: draft.origin,
      method: draft.method,
      expectedAmountCentavos: totals.amountCentavos,
      /* The line items, so a `price_mismatch` can name the bundle that
         disagreed instead of only the total. The server prices from its own
         catalogue either way. */
      bundles: cartLineItems(draft.bundles, catalogue),
      idempotencyKey: key,
      returnUrl: resolveVotingReturnUrl(),
    };

    setSubmitting(true);
    setFailure(null);

    try {
      const result = await client.createVoteOrder(order, controller.signal);
      setReference(result.reference);

      /* Hosted checkout: the supporter finishes on the provider's page and
         comes back. Nothing is counted here — the server hears from the
         gateway, not from us. */
      if (result.status === 'pending' && result.checkoutUrl !== undefined) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      if (result.status !== 'confirmed') {
        setFailure({
          message:
            result.status === 'expired'
              ? 'That payment window closed. Start again to get a new one.'
              : 'The payment did not go through. Nothing was charged.',
          retryable: result.status !== 'expired',
        });
        return;
      }

      /* The public tally is the server's to state. This local echo uses the
         confirmed quantity so the page reflects the purchase before its next
         tally refresh. Prefer the server total when it is available. */
      const fallbackTotal = chosen === null ? null : chosen.votes + result.quantity;
      setConfirmedTotal(fallbackTotal);
      dispatch({
        type: 'castArenaVote',
        arenaId: arena.id,
        entryId: result.entryId,
        quantity: result.quantity,
      });
      setStep('done');

      void client.getTally(arena.id, controller.signal).then((snapshot) => {
        if (controller.signal.aborted) return;
        const liveTotal = snapshot.tallies[result.entryId];
        if (Number.isFinite(liveTotal) && liveTotal >= 0) setConfirmedTotal(liveTotal);
      }).catch(() => {
        /* A confirmed payment stays confirmed if the follow-up tally read is
           unavailable; the fallback above keeps the prototype informative. */
      });
    } catch (cause) {
      if (controller.signal.aborted) return;
      const error = cause instanceof VotingApiError
        ? cause
        : new VotingApiError('unknown', 'Something went wrong. Nothing was charged.');
      setFailure({ message: error.message, retryable: error.retryable });
    } finally {
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }, [arena.id, chosen, client, dispatch, draft]);

  // --- navigation ---------------------------------------------------------
  const advance = useCallback(() => {
    /* Nothing to advance to: the guide explains, and the vote itself starts
       from a candidate's own button out on the programme page. */
    if (step === 'guide') {
      onClose();
      return;
    }

    if (!canLeaveStep(step, draft, catalogue)) {
      setShowIssues(true);
      return;
    }

    setShowIssues(false);

    if (step === 'pay') {
      void submitOrder();
      return;
    }

    setStep(nextVoteFlowStep(step));
  }, [draft, onClose, step, submitOrder]);

  const goBack = useCallback(() => {
    setShowIssues(false);
    if (step === 'guide' || step === 'supporter') {
      onClose();
      return;
    }
    setStep(previousVoteFlowStep(step as VoteFlowStep));
  }, [onClose, step]);

  const patch = (next: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...next }));

  /**
   * Step a bundle's count.
   *
   * Reads the cart out of the updater rather than off `draft`. Through `patch`
   * the new cart is computed from whatever `draft` held when this render ran,
   * so three quick presses of `+` all derive from the same empty basket and
   * the last one wins — the count goes to 1 and stays there. Anyone tapping a
   * stepper taps it faster than React re-renders.
   */
  const stepBundle = (bundleId: string, step: number) =>
    setDraft((current) => ({ ...current, bundles: addBundle(current.bundles, bundleId, step, catalogue) }));

  const activeIndex = step === 'guide' ? -1 : voteFlowStepIndex(step);
  const totals = voteDraftTotals(draft, catalogue);
  const total = totals.amountCentavos;

  /* Portalled to the body. `position: fixed` is only fixed to the viewport
     while no ancestor has a transform, and the subpage's entrance animation
     leaves one behind — which silently turns the backdrop into a box the
     size of the scrolling page. A dialog does not belong inside the thing
     it covers anyway. */
  return createPortal(
    <div className="vote-flow" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="vote-flow__panel"
        ref={panelRef}
        role="dialog"
        style={{ ['--arena' as string]: arena.accentColor }}
        tabIndex={-1}
      >
        <header className="vote-flow__head">
          <div>
            <p className="vote-flow__eyebrow">{guideEyebrow}</p>
            <h2 className="vote-flow__title" id={titleId}>
              {step === 'guide' ? 'How to vote' : step === 'done' ? 'Vote successful' : 'Cast your vote'}
            </h2>
          </div>
          <button aria-label="Close" className="vote-flow__close" onClick={onClose} type="button">
            <X aria-hidden="true" size={17} weight="bold" />
          </button>
        </header>

        {step !== 'guide' && (
          <ol className="vote-flow__steps">
            {VOTE_FLOW_STEPS.map((entry, index) => (
              <li
                className="vote-flow__step"
                data-state={index === activeIndex ? 'current' : index < activeIndex ? 'done' : 'upcoming'}
                key={entry.id}
              >
                <span className="vote-flow__step-mark">{index < activeIndex ? '✓' : index + 1}</span>
                <span className="vote-flow__step-label">{entry.label}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="vote-flow__body">
          {step === 'guide' && (
            <>
              <p className="vote-flow__lede">{guidePrompt}</p>
              <ol className="vote-flow__guide">
                {guide.map((item, index) => (
                  <li key={item.title}>
                    <span className="vote-flow__guide-mark">{index + 1}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          {step === 'supporter' && (
            <>
              {chosen !== null && (
                <div className="vote-flow__chosen">
                  {chosen.image !== null && (
                    <img
                      alt={`${chosen.name}, entry ${chosen.number}`}
                      className="vote-flow__chosen-image"
                      decoding="async"
                      height={56}
                      src={chosen.image}
                      width={56}
                    />
                  )}
                  <p className="vote-flow__chosen-copy">
                    Voting for <strong>{chosen.name}</strong> · #{chosen.number} {chosen.origin}
                  </p>
                </div>
              )}

              <div className="vote-flow__field">
                <label htmlFor={`${titleId}-mobile`}>Mobile number</label>
                <input
                  autoComplete="tel-national"
                  id={`${titleId}-mobile`}
                  inputMode="numeric"
                  onChange={(event) => patch({ mobile: normalisePhMobile(event.target.value) })}
                  placeholder="0917 123 4567"
                  type="tel"
                  value={formatPhMobile(draft.mobile)}
                />
                <p className="vote-flow__hint">Your receipt and vote confirmation go to this number.</p>
              </div>

              <div className="vote-flow__field">
                <label htmlFor={`${titleId}-origin`}>Where are you voting from?</label>
                <select
                  aria-describedby={`${titleId}-origin-hint`}
                  id={`${titleId}-origin`}
                  onChange={(event) => patch({ origin: event.target.value })}
                  value={draft.origin}
                >
                  <option disabled value="">
                    Select a city or municipality
                  </option>
                  {SUPPORTER_ORIGINS.map((origin) => (
                    <option key={origin} value={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
                <p className="vote-flow__hint" id={`${titleId}-origin-hint`}>
                  Used for the province-wide turnout board. Never shown publicly.
                </p>
              </div>
            </>
          )}

          {step === 'pay' && (
            <>
              <fieldset className="vote-flow__field vote-flow__bundles">
                <legend className="vote-flow__field-label">Choose your bundles</legend>
                <p className="vote-flow__hint" id={`${titleId}-bundle-hint`}>
                  The bigger the bundle, the more bonus votes. Add as many as you like.
                </p>

                <ul className="vote-flow__bundle-list">
                  {catalogue.map((bundle) => {
                    const count = draft.bundles[bundle.id] ?? 0;
                    const bonus = bundle.votes - bundle.priceCentavos / VOTE_PRICE_CENTAVOS;

                    return (
                      <li
                        className={`vote-flow__bundle${count > 0 ? ' is-picked' : ''}`}
                        key={bundle.id}
                      >
                        <div className="vote-flow__bundle-copy">
                          <strong>{formatPeso(bundle.priceCentavos)}</strong>
                          <span>{bundle.votes.toLocaleString('en-PH')} votes</span>
                          {bonus > 0 && (
                            <em>{`+${bonus.toLocaleString('en-PH')} bonus`}</em>
                          )}
                        </div>

                        <div className="vote-flow__bundle-stepper">
                          <button
                            aria-label={`Remove one ${formatPeso(bundle.priceCentavos)} bundle`}
                            disabled={count === 0}
                            onClick={() => stepBundle(bundle.id, -1)}
                            type="button"
                          >
                            <Minus aria-hidden="true" size={14} weight="bold" />
                          </button>
                          {/* The count is the value, so it is announced as one
                              rather than left as decoration between two
                              buttons. */}
                          <output aria-label={`${formatPeso(bundle.priceCentavos)} bundles`}>{count}</output>
                          <button
                            aria-label={`Add one ${formatPeso(bundle.priceCentavos)} bundle`}
                            onClick={() => stepBundle(bundle.id, 1)}
                            type="button"
                          >
                            <Plus aria-hidden="true" size={14} weight="bold" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>

              <div className="vote-flow__field">
                <span className="vote-flow__field-label">Pay with</span>
                <div className="vote-flow__methods">
                  {PAYMENT_METHODS.map((method) => (
                    <label className="vote-flow__method" key={method.id}>
                      <input
                        checked={draft.method === method.id}
                        name="vote-flow-method"
                        onChange={() => patch({ method: method.id as PaymentMethodId })}
                        type="radio"
                        value={method.id}
                      />
                      <span>
                        <strong>{method.label}</strong>
                        <small>{method.note}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <dl className="vote-flow__summary">
                <div>
                  <dt>{chosen === null ? 'Entry' : chosen.name}</dt>
                  <dd>{chosen === null ? '—' : `#${chosen.number}`}</dd>
                </div>
                <div>
                  <dt>Votes</dt>
                  <dd>
                    {totals.votes > 0
                      ? `${totals.votes.toLocaleString('en-PH')} votes`
                      : 'Add a bundle'}
                  </dd>
                </div>
                {totals.bonusVotes > 0 && (
                  <div>
                    <dt>Bonus included</dt>
                    <dd>{`+${totals.bonusVotes.toLocaleString('en-PH')} votes`}</dd>
                  </div>
                )}
                <div className="vote-flow__summary-total">
                  <dt>Total</dt>
                  <dd>{formatPeso(total)}</dd>
                </div>
              </dl>
            </>
          )}

          {step === 'done' && (
            <div aria-live="polite" className="vote-flow__done" role="status">
              <CheckCircle aria-hidden="true" size={44} weight="fill" />
              <p className="vote-flow__done-kicker">Vote successful</p>
              <section
                aria-labelledby={`${titleId}-success-entry`}
                className="vote-flow__success-card"
              >
                {chosen !== null && (
                  <div className="vote-flow__success-candidate">
                    {chosen.image !== null && (
                      <img
                        alt={`${chosen.name}, entry ${chosen.number}`}
                        className="vote-flow__success-image"
                        decoding="async"
                        height={88}
                        src={chosen.image}
                        width={88}
                      />
                    )}
                    <div className="vote-flow__success-candidate-copy">
                      <p className="vote-flow__success-label">You voted for</p>
                      <h3 id={`${titleId}-success-entry`}>{chosen.name}</h3>
                      <p className="vote-flow__success-category">{programName}</p>
                      <p>#{chosen.number} · {chosen.origin}</p>
                    </div>
                  </div>
                )}
                <dl className="vote-flow__success-stats">
                  <div>
                    <dt>Votes added</dt>
                    <dd>{totals.votes.toLocaleString('en-PH')}</dd>
                  </div>
                  <div>
                    <dt>Total votes</dt>
                    <dd>{confirmedTotal === null ? 'Updating…' : confirmedTotal.toLocaleString('en-PH')}</dd>
                  </div>
                </dl>
              </section>
              <p className="vote-flow__done-note">
                A receipt is on its way to {formatPhMobile(draft.mobile)}. Reference{' '}
                <strong>{reference ?? voteReference(arena.id, draft, catalogue)}</strong>.
              </p>
            </div>
          )}

          {failure !== null && (
            <p className="vote-flow__failure" role="alert">
              {failure.message}
              {failure.retryable && ' Press Pay to try again.'}
            </p>
          )}

          {showIssues && issues.length > 0 && (
            <ul className="vote-flow__issues" role="alert">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>

        <footer className="vote-flow__foot">
          {step === 'done' ? (
            <button className="vote-flow__next" onClick={onClose} type="button">
              Back to {programName}
            </button>
          ) : (
            <>
              {step !== 'guide' && step !== 'supporter' && (
                <button className="vote-flow__back" onClick={goBack} type="button">
                  <ArrowLeft aria-hidden="true" size={14} weight="bold" />
                  Back
                </button>
              )}
              <button
                aria-busy={submitting}
                aria-disabled={!ready || submitting}
                className="vote-flow__next"
                onClick={submitting ? undefined : advance}
                type="button"
              >
                {submitting
                  ? 'Sending you to pay…'
                  : step === 'guide'
                    ? 'Got it'
                    : step === 'pay'
                      ? `Pay ${formatPeso(total)}`
                      : 'Continue'}
                {!submitting && <ArrowRight aria-hidden="true" size={14} weight="bold" />}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
