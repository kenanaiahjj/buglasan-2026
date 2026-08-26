# Hara archive gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only the Hara sa Dumaguete contest-detail view with a full-screen archive-style gallery of the six existing contestants, including a staggered entrance and accessible vote actions.

**Architecture:** Add a focused `HaraGallery` leaf component that owns the Hara-only utility header, gallery stage, card markup, and scoped entrance animation. `ContestSubpageView` will route Hara renders to that leaf after its existing hooks, while the existing standard rendering remains the source for LGU Booth Contest, Festival of Festivals, and Gandang NegOrense. Add Hara-specific CSS without changing the other program layouts.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, GSAP, existing `enter` helper, Phosphor icons, CSS Grid, CSS media queries.

## Global Constraints

- Reuse the six candidate records and existing portrait paths from `src/data/pageant.ts`.
- Keep the existing `#hara` route and `onVote` callback semantics.
- Keep `Festival Hub` and `Voting Room` available on the Hara page.
- Do not render the standard Hara hero, metadata strip, tabs, footer, arena labels, eyebrow labels, or decorative chips.
- Keep LGU Booth Contest, Festival of Festivals, and Gandang NegOrense rendering unchanged.
- Keep the shared quiet festival background behind the Hara route. Do not change the 3D logo, model structure, lights, particles, shaders, fireworks, or landing hover illustrations.
- Use the existing sans-serif font tokens. Do not introduce a serif font or external assets.
- Animate only opacity and compositor-friendly transforms. Do not add a perpetual animation loop or scroll listener.
- Respect `prefers-reduced-motion: reduce` by leaving cards in their final positions and disabling motion-heavy hover transitions.
- Preserve unrelated dirty worktree changes and stage only files belonging to this feature when committing.

## File map

- Create: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/HaraGallery.tsx` - Hara-only utility header, candidate gallery markup, vote actions, and scoped staggered entrance.
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ContestSubpageView.tsx` - route Hara renders to `HaraGallery`; remove Hara from the standard candidate branch because it no longer reaches that markup.
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ContestSubpageView.test.tsx` - replace the old standard-Hara assertions with the gallery contract and keep coverage for the other programs.
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css` - add Hara gallery layout, card states, responsive rules, reduced-motion rules, and Hara header overrides.

## Task 1: Add the failing Hara gallery contract

**Files:**

- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ContestSubpageView.test.tsx`

**Interfaces:**

- Consumes: the existing server-renderable `ContestSubpageView` and `candidates` data.
- Produces: a regression test that describes the new Hara structure before production code changes.

- [ ] **Step 1: Update the Hara test imports and assertions**

Import `candidates` beside `contestArenas`, then replace the old Hara logo and standard-tab assertions with:

```tsx
expect(html).toContain('class="hara-gallery"');
expect(html).toContain('id="hara-gallery-title"');
expect(html).toContain('Festival Hub');
expect(html).toContain('Voting Room');
expect(html).not.toContain('subpage-hero');
expect(html).not.toContain('subpage-tabs-bar');
expect(html).not.toContain('subpage-arena-nav');
expect(html.match(/class="hara-gallery-card"/g)).toHaveLength(candidates.length);

for (const candidate of candidates) {
  expect(html).toContain(candidate.name);
  expect(html).toContain(candidate.location);
  expect(html).toContain(candidate.image);
  expect(html).toContain(`Vote for ${candidate.name}`);
}
```

The complete Hara test body should continue to render `ContestSubpageView` with the existing no-op callbacks. Keep the separate booth, festival, and Gandang tests unchanged.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx
```

Expected result: the Hara test fails because the current component still renders the standard `.subpage-hero` and does not render `.hara-gallery` or six `.hara-gallery-card` elements.

## Task 2: Add the Hara gallery component

**Files:**

- Create: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/HaraGallery.tsx`

**Interfaces:**

- Consumes: `ContestArena`, `candidates`, the existing `enter` helper, and the existing `onBackToHub`, `onVote`, and login callback behavior.
- Produces: a semantic `main.hara-gallery` with six image-led candidate cards and a compact utility header.

- [ ] **Step 1: Define the component props and animation refs**

Use this interface and hook shape:

```tsx
type HaraGalleryProps = {
  arena: ContestArena;
  onBackToHub: () => void;
  onVote: (id: ContestArena['id']) => void;
  onOpenVoting: () => void;
};

const galleryRef = useRef<HTMLElement>(null);
```

The component must return early from its entrance effect when `matchMedia('(prefers-reduced-motion: reduce)')` matches. Otherwise call `enter` on each card's `.hara-gallery-card__motion` inner wrapper with:

```tsx
{ autoAlpha: 0, y: 28, scale: 0.96 }
```

and:

```tsx
{ autoAlpha: 1, y: 0, scale: 1, duration: 0.72, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,visibility' }
```

Return the helper cleanup from the effect.

- [ ] **Step 2: Render the compact utility header**

Render only the existing top-level actions, with no program tablist:

```tsx
<header className="subpage-header hara-gallery__header">
  <div className="subpage-header__left">
    <button className="subpage-back-btn" onClick={onBackToHub} type="button">
      <ArrowLeft aria-hidden="true" size={18} weight="bold" />
      <span>Festival Hub</span>
    </button>
    <span className="subpage-header__current">{arena.shortTitle}</span>
  </div>
  <div className="subpage-header__actions">
    <button className="crown-button crown-button--gold crown-button--sm" onClick={onOpenVoting} type="button">
      <span>Voting Room</span>
      <ArrowRight aria-hidden="true" size={14} weight="bold" />
    </button>
  </div>
</header>
```

The header is a utility bar, not a second hero. Do not add an arena number, logo block, eyebrow, chip, or metadata strip.

- [ ] **Step 3: Render the accessible gallery stage and card content**

Use this semantic structure:

```tsx
<main className="hara-gallery" ref={galleryRef} aria-labelledby="hara-gallery-title">
  <div className="hara-gallery__intro">
    <h1 id="hara-gallery-title">Hara sa Dumaguete</h1>
  </div>
  <div className="hara-gallery__grid" aria-label="Hara sa Dumaguete contestants">
    {candidates.map((candidate, index) => (
      <article
        className="hara-gallery-card"
        key={candidate.id}
        style={{ '--hara-card-rotation': `${[ -1.2, 1.1, -0.6, 0.8, -1, 1.4 ][index]}deg` } as CSSProperties}
      >
        <div className="hara-gallery-card__motion">
          <div className="hara-gallery-card__media">
          <img
            alt={`${candidate.name} representing ${candidate.location}`}
            decoding="async"
            height={512}
            loading={index === 0 ? 'eager' : 'lazy'}
            src={candidate.image}
            width={512}
          />
          <span className="hara-gallery-card__number" aria-label={`Candidate ${candidate.number}`}>
            {candidate.number}
          </span>
          <div className="hara-gallery-card__caption">
            <span className="hara-gallery-card__location">
              <MapPin aria-hidden="true" size={13} weight="fill" />
              {candidate.location}
            </span>
            <h2>{candidate.name}</h2>
          </div>
          </div>
          <div className="hara-gallery-card__body">
            {candidate.advocacy && <p>{candidate.advocacy}</p>}
            <div className="hara-gallery-card__footer">
              <span>{candidate.votes.toLocaleString()} votes</span>
              <button
                aria-label={`Vote for ${candidate.name}`}
                className="subpage-vote-btn"
                onClick={() => onVote(arena.id)}
                type="button"
              >
                Vote for {candidate.name}
                <ArrowRight aria-hidden="true" size={14} />
              </button>
            </div>
          </div>
        </div>
      </article>
    ))}
  </div>
</main>
```

Keep each vote action as a real button. Use `:focus-within` for the card focus state so keyboard focus on the button elevates the same card as pointer hover.

## Task 3: Route Hara through the dedicated component

**Files:**

- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ContestSubpageView.tsx`

**Interfaces:**

- Consumes: the existing `ContestSubpageView` props and reducer dispatch.
- Produces: Hara-only gallery rendering while preserving all existing non-Hara branches.

- [ ] **Step 1: Import the Hara leaf component**

Add:

```tsx
import { HaraGallery } from './HaraGallery';
```

- [ ] **Step 2: Return the Hara gallery after the existing hooks**

After the existing effects and before the standard `return`, add:

```tsx
  if (arena.id === 'hara') {
    return (
      <div className="contest-subpage contest-subpage--hara" id="subpage-hara">
        <HaraGallery
          arena={arena}
          onBackToHub={onBackToHub}
          onOpenVoting={goLogin}
          onVote={onVote}
        />
      </div>
    );
  }
```

Keeping the branch after the hooks preserves hook order when the user switches between program pages. The existing standard return remains the implementation for all other arena IDs.

- [ ] **Step 3: Remove Hara from the unreachable standard candidate branch**

Change:

```tsx
(arena.id === 'hara' || arena.id === 'gandang')
```

to:

```tsx
arena.id === 'gandang'
```

Do not change the Gandang data, tabs, criteria, schedule, rankings, or footer.

## Task 4: Add the archive field styling

**Files:**

- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css`

**Interfaces:**

- Consumes: the classes emitted by `HaraGallery.tsx`.
- Produces: a dark, spacious, offset card field with restrained hover/focus elevation and explicit mobile collapse.

- [ ] **Step 1: Add the Hara stage and header rules**

Add Hara-specific rules after the existing contest-subpage rules:

```css
.contest-subpage--hara {
  min-height: 100dvh;
}

.contest-subpage--hara .hara-gallery__header {
  border-bottom-color: transparent;
  background: rgba(2, 8, 5, 0.62);
}

.hara-gallery {
  min-height: calc(100dvh - 72px);
  padding: clamp(1.5rem, 4vw, 3.5rem) clamp(1.25rem, 4vw, 4rem) 5rem;
}

.hara-gallery__intro {
  width: min(1240px, 100%);
  margin: 0 auto clamp(1.25rem, 3vw, 2.5rem);
}

.hara-gallery__intro h1 {
  margin: 0;
  color: var(--crown-ivory);
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3.6vw, 3.5rem);
  font-weight: 520;
  letter-spacing: -0.04em;
}
```

- [ ] **Step 2: Add the offset three-column desktop field and card surface**

Use a `repeat(3, minmax(0, 1fr))` grid for large screens, with small row offsets and controlled rotations. Keep the surface dark and use an outline only for structure and hover/focus state:

```css
.hara-gallery__grid {
  display: grid;
  width: min(1240px, 100%);
  margin: 0 auto;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 2vw, 2rem);
  align-items: start;
  perspective: 1400px;
}

.hara-gallery-card {
  position: relative;
  z-index: 0;
  overflow: hidden;
  border: 1px solid rgba(224, 178, 84, 0.22);
  border-radius: 16px;
  background: rgba(5, 20, 13, 0.9);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
  rotate: var(--hara-card-rotation, 0deg);
  transition: transform 280ms cubic-bezier(0.2, 0, 0, 1), border-color 180ms ease, box-shadow 280ms cubic-bezier(0.2, 0, 0, 1);
}

.hara-gallery-card:nth-child(2),
.hara-gallery-card:nth-child(5) { margin-top: clamp(1.25rem, 4vh, 3rem); }

.hara-gallery-card:nth-child(3),
.hara-gallery-card:nth-child(6) { margin-top: clamp(-0.75rem, -1vh, 0rem); }

.hara-gallery-card:hover,
.hara-gallery-card:focus-within {
  z-index: 2;
  border-color: var(--crown-gold-light);
  box-shadow: 0 24px 55px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(247, 211, 119, 0.12);
  transform: translateY(-8px) scale(1.015);
}

.hara-gallery-card__media {
  position: relative;
  aspect-ratio: 0.78;
  overflow: hidden;
  background: #0a2116;
}

.hara-gallery-card__media::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(2, 10, 7, 0.02) 42%, rgba(2, 10, 7, 0.88) 100%);
  content: '';
  pointer-events: none;
}

.hara-gallery-card__media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  outline: 1px solid rgba(255, 255, 255, 0.1);
  outline-offset: -1px;
  transition: transform 280ms cubic-bezier(0.2, 0, 0, 1), filter 280ms cubic-bezier(0.2, 0, 0, 1);
}

.hara-gallery-card:hover .hara-gallery-card__media img,
.hara-gallery-card:focus-within .hara-gallery-card__media img {
  filter: saturate(1.08) contrast(1.03);
  transform: scale(1.035);
}
```

- [ ] **Step 3: Add the caption, card body, and accessible focus treatment**

Style the card number as plain editorial metadata, not a chip, and keep the vote label on one line at desktop:

```css
.hara-gallery-card__number {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 1;
  color: rgba(247, 211, 119, 0.9);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.hara-gallery-card__caption {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  left: 1rem;
  z-index: 1;
}

.hara-gallery-card__location {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--crown-gold-light);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hara-gallery-card__caption h2 {
  margin: 0.3rem 0 0;
  color: var(--crown-ivory);
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 2.5vw, 2.25rem);
  font-weight: 520;
  letter-spacing: -0.04em;
}

.hara-gallery-card__body {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.1rem 1.1rem;
}

.hara-gallery-card__body p {
  min-height: 2.6em;
  margin: 0;
  color: var(--crown-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.hara-gallery-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.hara-gallery-card__footer > span {
  flex: 0 0 auto;
  color: var(--crown-muted);
  font-size: 0.7rem;
  white-space: nowrap;
}

.hara-gallery-card .subpage-vote-btn {
  min-height: 40px;
  padding: 0.55rem 0.75rem;
  white-space: nowrap;
}

.hara-gallery-card:focus-within {
  outline: 2px solid var(--crown-gold-light);
  outline-offset: 4px;
}
```

- [ ] **Step 4: Add explicit tablet and mobile fallbacks**

Use two columns below the desktop field and remove the asymmetric offsets on the smallest screens:

```css
@media (max-width: 900px) {
  .hara-gallery__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .hara-gallery { padding-inline: 1rem; }
  .hara-gallery__grid { grid-template-columns: 1fr; gap: 1.25rem; }
  .hara-gallery-card:nth-child(n) { margin-top: 0; }
  .hara-gallery-card__caption h2 { font-size: 1.8rem; }
}

@media (prefers-reduced-motion: reduce) {
  .contest-subpage--hara { animation: none; }
  .hara-gallery-card,
  .hara-gallery-card__media img { transition: none; }
  .hara-gallery-card:hover,
  .hara-gallery-card:focus-within { transform: none; }
}
```

## Task 5: Verify behavior and visual regressions

**Files:**

- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/HaraGallery.tsx`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ContestSubpageView.tsx`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ContestSubpageView.test.tsx`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css`

**Interfaces:**

- Consumes: the completed Hara gallery implementation.
- Produces: passing automated checks and browser-confirmed route, interaction, responsive, and reduced-motion behavior.

- [ ] **Step 1: Run the focused Hara test**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx
```

Expected: all three component tests pass, including six Hara cards and no standard Hara hero or tabs.

- [ ] **Step 2: Run the full test suite, build, and whitespace check**

Run each command:

```bash
npm test
npm run build
git diff --check
```

Expected: Vitest passes, TypeScript and Vite build successfully, and the diff check reports no whitespace errors.

- [ ] **Step 3: Verify the live browser route**

Open `http://127.0.0.1:5174/#hara` at desktop width and confirm:

- The quiet festival background remains visible behind the page.
- The Hara page has the minimal header, one gallery title, six portrait cards, and no standard hero/tabs/footer.
- Cards enter in data order with a restrained 80 ms stagger.
- Hovering or focusing one card elevates only that card.
- Every vote button invokes the existing Hara vote route.

- [ ] **Step 4: Verify responsive and reduced-motion behavior**

Check tablet and mobile widths. Confirm that cards use two columns where space permits, collapse to one column on small screens, and do not cause horizontal scrolling. Emulate reduced motion and confirm cards render immediately without entrance or hover transforms.

- [ ] **Step 5: Check unchanged program and landing behavior**

Navigate back to the hub, open LGU Booth Contest, Festival of Festivals, and Gandang NegOrense, and confirm their existing standard layouts still render. Confirm the landing route restores the 3D logo, particles, shaders, fireworks, and hover illustrations. Check the browser console during each route change and interaction.

- [ ] **Step 6: Review the scoped diff**

Run:

```bash
git diff -- src/components/HaraGallery.tsx src/components/ContestSubpageView.tsx src/components/ContestSubpageView.test.tsx src/styles.css
git status --short
```

Expected: only the Hara component, its route/test/CSS changes, and no unrelated worktree files are staged by this feature.
