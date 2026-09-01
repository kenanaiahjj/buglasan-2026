# Vote confirmation card

**Status:** Approved direction; awaiting written-spec review

## Goal

After a confirmed vote, show a compact result card that makes the purchase
and its effect on the selected entry immediately understandable. The card
must identify the candidate or contest entry, the program category, the
number of votes added, and the updated total vote count.

## Scope

Update the existing `VoteFlowModal` success state for all four programs:
Hara sa Negros Oriental, Gandang NegOrense, LGU Booth Contest, and Festival of
Festivals. Keep the current payment handoff, server confirmation, reducer
update, receipt reference, and tally refresh unchanged. This is a presentation
change; it does not add a payment provider or change the voting API.

## Confirmation card

Use the existing confirmed order state as the single source of truth:

- Show the selected entry image when one is available.
- Show the selected entry name and entry number.
- Show the program display name as the category. For example, a Festival
  entry must show `Festival of Festivals`, and a booth entry must show
  `LGU Booth Contest`.
- Show `Votes added` using the confirmed quantity.
- Show `Total votes` using the server tally when available, with the existing
  fallback and updating state while the follow-up tally request is pending.
- Keep the existing receipt reference and mobile-number message outside the
  stats area so the voting result remains the visual focus.

Use the existing arena accent for the border and restrained glow. Keep the
card compact enough for the modal on small screens and allow text to wrap
without horizontal overflow.

## Component and data boundaries

`VoteFlowModal` remains responsible for rendering the success state. It uses
the already selected `chosen` entry and `arenaDisplayName(arena)` for the
category label. No new global state, API fields, or payment logic is needed.

The result remains inside the existing `role="status"` live region. Use a
heading for the entry name and a semantic definition list for `Votes added`
and `Total votes`. Keep image alt text descriptive and do not make the
confirmation card itself a second interactive control.

## Testing and verification

Extend the focused modal test to verify the success card class, the selected
entry image and name, the program category, the added quantity, and the
updated total. Add coverage that the category is derived from the arena data
for representative non-pageant programs. Preserve existing tests for failed
payments, hosted checkout, idempotency, and focus behavior.

Run the focused modal tests, the related component tests, the production
build, and `git diff --check`. In the browser, open the Festival and Booth
flows far enough to confirm their category labels and verify the success card
at a narrow viewport through the existing test-backed confirmed state.

## Non-goals

- Do not connect a live payment gateway in this change.
- Do not change vote pricing, quantities, tally calculations, or API
  contracts.
- Do not redesign the candidate galleries or overview pages.
