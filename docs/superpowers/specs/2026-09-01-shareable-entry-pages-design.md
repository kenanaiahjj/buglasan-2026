# Shareable entry pages design

Date: September 1, 2026
Status: Approved direction; awaiting written-spec review

## Goal

Give every candidate, booth, and festival contingent a dedicated page with a stable, shareable URL. Clicking or tapping any roster card opens that entry page. The page presents the entry clearly and provides a prominent `Vote` button that opens the existing voting flow with the entry already selected.

## Scope

This feature applies to all entries in the four current programs:

- Hara sa Negros Oriental
- Gandang NegOrense
- LGU Booth Contest
- Festival of Festivals

The feature changes entry navigation and adds profile pages. It does not replace the existing payment flow, voting API, roster data, or standings pages.

## Routing

Use the existing hash-routing model. Each entry page uses this route shape:

```text
#<arena-id>/<entry-id>
```

Examples:

```text
#hara/c-01
#festival/sd-01
#booths/booth-01
```

Entry IDs are the canonical route identifiers because they remain stable if a display name changes. The route parser validates both the arena and entry ID against the current data returned by `entriesForArena()`.

The application handles routes as follows:

- A valid arena and entry ID opens the individual entry page.
- An invalid entry ID shows an entry-not-found state with actions to return to the relevant program or Home.
- An invalid arena continues to use the existing landing-page fallback behavior.
- Existing routes such as `#hara`, `#hara/overview`, and `#home` remain unchanged.

## Roster-card behavior

The whole roster card is the pointer target on desktop and touch devices. Clicking or tapping the card changes the hash to the entry route instead of opening the vote modal.

The visible card action changes from `Vote for <name>` to `View <name>`. Each card remains a semantic article. A native anchor inside the card owns navigation, and its stretched hit area covers the full card for pointer and touch input. Keyboard users receive one clear link for each card, without nested interactive elements or duplicate tab stops.

## Individual page

The individual page uses a focused profile layout consistent with the current program styling. It contains:

- The entry image and entry number
- The entry name and origin or represented municipality
- The program category name
- The entry description or advocacy
- The arena-specific metadata already supplied by `VoteEntry.meta`
- The current total vote count
- A prominent `Vote` button
- A `Share` control
- Navigation back to the program roster and Home

The page uses the current arena accent color and card shape. Portrait programs use a portrait-led composition. Booth and festival entries use a landscape-led composition so their reference images are not cropped as portraits.

## Voting flow

The `Vote` button opens the existing `VoteFlowModal` in flow mode with the current entry ID. The individual page does not duplicate payment, validation, receipt, or success-confirmation logic.

After a successful vote, the existing confirmation card shows the votes added and updated total. Closing the modal returns the user to the same individual entry page.

Opening a shared link never opens the payment modal automatically. The user must select the prominent `Vote` button before the voting flow begins.

## Sharing

The `Share` control uses the current individual-page URL.

- When the Web Share API is available, it opens the native share sheet with the entry name, program name, and URL.
- Otherwise, it copies the URL to the clipboard and confirms the action with a short status message.
- If clipboard access fails, the page exposes the URL in a selectable field and announces the fallback.

The shared URL returns directly to the entry page when opened in another browser tab or device.

## Components and data flow

Add an `EntryProfilePage` component that receives the arena, entry, live tally, navigation callbacks, and vote callback. Keep route parsing in `LandingPage`, where existing hash state is already coordinated.

The data flow is:

1. `LandingPage` parses `#<arena-id>/<entry-id>`.
2. `LandingPage` resolves the arena and entry through the canonical program data.
3. `EntryProfilePage` renders the entry and current tally.
4. The page's `Vote` button opens `VoteFlowModal` with that entry selected.
5. The page's `Share` control shares or copies `window.location.href`.

`HaraGallery` receives an entry-navigation callback instead of opening the vote flow directly from the card.

## Accessibility

- The page has one descriptive `h1` for the entry name.
- The image uses the existing arena-aware alternative-text rules.
- Metadata uses semantic terms and descriptions.
- The total vote count has a clear text label.
- Navigation and vote actions use native links or buttons.
- Share success and fallback messages use a polite live region.
- Focus moves to the entry-page heading after client-side navigation.
- Reduced-motion preferences suppress nonessential profile-entry animation.
- Color is not the only signal for actions or status.

## Responsive behavior

- Desktop uses a two-column profile composition with the image and details visible without horizontal scrolling.
- Narrow screens stack the image, identity, metadata, and actions.
- The `Vote` action remains prominent and at least 44 pixels tall.
- Landscape entries retain a wide image ratio on all breakpoints.
- Long names, locations, and metadata wrap without clipping.

## Testing and verification

Add tests before implementation for:

- Parsing valid entry routes for all four arenas
- Rejecting unknown entry IDs without breaking existing routes
- Card click and keyboard activation navigating to the entry page
- Rendering the correct image, name, category, metadata, and live tally
- Opening `VoteFlowModal` with the routed entry selected
- Native sharing and clipboard fallback behavior
- Returning from the entry page to the program roster

Run focused component and route tests, the production build, `git diff --check`, and browser verification for at least one portrait entry and one landscape entry. Verify direct shared-link loading, card navigation, the prominent vote action, modal close behavior, mobile layout, and keyboard focus.

## Out of scope

- Server-rendered social preview metadata for each entry
- Public profile URLs without a hash route
- New candidate biography fields or content-management tooling
- Changes to payment-gateway integration
- Changes to standings or ranking behavior
