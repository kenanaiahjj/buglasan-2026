# Buglasan pageant voting experience design

## Status

Approved in conversation on August 24, 2026. This document defines the scope for the first implementation pass.

## Summary

Create a responsive, linked prototype for **Buglasan Festival 2026 — Gandang Negresense Queen Size Edition**. The experience has a public landing page, a demo login screen, and a signed-in voter dashboard. A voter can select a candidate, confirm one daily vote, and see the updated vote status without a backend.

The two supplied images are visual references only. They establish the forest-green, antique-gold pageant direction and the dashboard patterns; they are not product copy or rendered page assets.

## Goals

- Give first-time visitors a clear, ceremonial introduction to the pageant and the online voting call to action.
- Let a voter complete a simulated login and vote flow from the landing page.
- Make the dashboard useful at a glance: voting status, candidate choices, rankings, instructions, and announcements.
- Preserve the reference mood while keeping the interface readable, responsive, and easy to change later.
- Keep pageant content in local data objects so the title, dates, candidates, vote counts, and announcements can be replaced without rewriting layout code.

## Non-goals

- No production authentication, account creation, API, database, payment, or real vote submission.
- No administrator tooling or scoring/judging workflow.
- No full CMS, persistent cross-device vote state, or real-time ranking service.
- No requirement to reproduce the reference screenshots pixel for pixel.

## User flow

1. A visitor opens the landing page and sees the pageant hero, event context, featured candidates, voting steps, countdown, and a `Vote now` action.
2. The visitor selects `Vote now` and moves to the login screen.
3. The visitor enters any non-empty email or mobile value and password. The prototype accepts the values as demo credentials and opens the dashboard.
4. The voter browses candidate cards and selects one candidate. The selected card gets an explicit active treatment and the primary action changes to review the selection.
5. The voter confirms the vote. The prototype increments the selected candidate's displayed vote count, sets the daily votes remaining value to `0`, and shows a confirmation state.
6. The voter can continue browsing candidates, rankings, mechanics, FAQs, and announcements from the dashboard navigation. The vote state remains for the current browser session.
7. If the voter attempts to vote again after confirmation, the interface explains that the daily vote has already been used and disables the submit action.

## Surface architecture

### Landing page

The landing page is the public entry point. It includes:

- A top navigation with the Buglasan mark, section links, `Login`, and `Vote now`.
- A hero for **Buglasan Festival 2026 — Gandang Negresense Queen Size Edition** with the supporting line `Support your favorite candidate`.
- A voting-period countdown and a compact event summary.
- A featured candidate grid with candidate number, city or municipality, name, vote count, and `Vote` action.
- A concise three-step or four-step voting guide: login, choose, confirm, submit.
- A pageant statement that connects the vote to confidence, beauty, and Negros Oriental heritage.
- An announcement strip or event-notice block.
- A footer with partner marks represented as text placeholders, social links, and editable festival hashtags.

### Login screen

The login screen is a focused surface with the same visual system as the landing page. It includes:

- Pageant title and a short reason to sign in.
- Email or mobile input.
- Password input.
- Remember-me checkbox.
- `Login` primary button.
- Demo helper text that explains any non-empty values are accepted.
- Links for `Create an account` and `Back to pageant`.
- Inline validation for empty required fields.

### Voter dashboard

The dashboard uses the reference's three-part desktop structure:

- **Navigation rail:** brand, active `Dashboard`, `Vote`, `Contestants`, `Rankings`, `Mechanics`, `FAQs`, and `Announcements`.
- **Main column:** welcome message, voting-period status, top-contestant cards, candidate selection area, voting steps, and confirmation state.
- **Status rail:** account summary, countdown, votes used/remaining, announcement cards, and a supporting pageant message.

On mobile, the navigation rail becomes a top bar or compact menu, the status rail stacks below the main content, and primary actions span the available width.

## Visual direction

### Color

- Forest green page background for the pageant atmosphere.
- Dark emerald and translucent emerald panels for depth.
- Antique gold for borders, headings, ornaments, numbers, and primary call-to-action emphasis.
- Warm ivory for readable text and candidate names.
- Lime or mint green only for selected, confirmed, or successful vote feedback.
- Use contrast that keeps all body text and controls readable; ornamental effects must not carry meaning by color alone.

### Typography

- Use a high-contrast serif display face for the festival/pageant title and short editorial statements.
- Use a clean sans-serif for navigation, labels, metrics, form controls, and supporting copy.
- Use uppercase sparingly for labels and navigation. Preserve sentence case for instructions and error text.

### Surfaces and ornament

- Use rounded panels, thin gold borders, soft internal glows, and restrained translucent layers.
- Add botanical linework, fine gold particles, and curved framing as background decoration.
- Keep ornament low contrast and behind content to protect reading order and interaction clarity.
- Use editorial portrait cards with consistent aspect ratios. Candidate content should be data-driven and replaceable.

## Content and sample data

Use editable local sample data for the following candidates:

| Number | Name | Location | Starting votes |
| --- | --- | --- | ---: |
| 01 | Maria Angela | Ayungon | 1245 |
| 02 | Jessa Mae | Dumaguete City | 1980 |
| 03 | Charmine | Tanjay City | 1102 |
| 04 | Shaira | Bayawan City | 967 |
| 05 | Nicole | Guihulngan City | 834 |
| 06 | Joanne | Bais City | 732 |

The prototype should also define editable values for the voting window, countdown copy, total vote summary, announcements, pageant tagline, footer hashtags, and partner labels. The exact reference dates can be used as initial sample values and should remain centralized so they can be replaced later.

## Interaction states

The implementation must represent these states explicitly:

- Signed out.
- Login form empty.
- Login form validation error.
- Signed in with votes remaining.
- Candidate selected but not confirmed.
- Vote confirmed with a success message.
- Signed in with no votes remaining.
- Navigation section active.
- Mobile navigation expanded or collapsed.

Required feedback includes a visible selected-card treatment, disabled or replaced submit action after voting, inline form errors, and a confirmation message that identifies the selected candidate.

## Implementation boundary

Use a small React application with local state and CSS. Keep the first pass front-end only. The implementation can use client-side route/view state rather than introducing a routing or backend dependency if the starter setup does not already include one.

Organize the code around focused components for:

- Landing hero and event summary.
- Candidate card and candidate grid.
- Login form.
- Dashboard shell and navigation.
- Countdown/stat cards.
- Voting guide.
- Announcement list.
- Vote confirmation state.

Keep content and initial state in separate data/constants modules where practical. Avoid unrelated refactors because the workspace starts empty.

## Verification plan

Verify the following before reporting completion:

1. The app starts from the documented local command.
2. The landing page renders without browser console errors.
3. `Vote now` reaches the login screen.
4. Empty login fields show inline validation.
5. Demo login reaches the dashboard.
6. Candidate selection changes the active card and enables the review/confirm action.
7. Confirming a vote updates the selected candidate, vote count, confirmation message, and votes remaining state.
8. A second vote attempt is unavailable after confirmation.
9. Desktop and narrow mobile viewports contain all content without horizontal overflow.
10. Navigation links reach the intended dashboard sections or views.

## Decisions and assumptions

- The user approved a linked landing-page and voter-dashboard prototype.
- The user approved the reference title and may replace it later.
- The user approved a functional simulation rather than visual-only screens.
- Sample names, counts, dates, and partner labels are placeholders for the prototype and are not claims about the real pageant.
- The supplied reference screenshots guide the visual language but do not define exact product requirements.
