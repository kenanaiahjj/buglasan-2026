# Shareable entry pages implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every Buglasan candidate, booth, and festival contingent a dedicated hash-routed profile page that opens from the full roster card, can be shared, and starts the existing vote flow from a prominent `Vote` button.

**Architecture:** Keep routing inside `LandingPage`, matching the application's existing hash-navigation model. Isolate entry-route parsing and share behavior in small library modules, render one reusable `EntryProfilePage` for all four arenas, and keep payment and confirmation logic inside the existing `VoteFlowModal`.

**Tech stack:** React, TypeScript, Vite hash navigation, Vitest with jsdom, CSS, Phosphor icons.

## Global constraints

- Apply the feature to `hara`, `gandang`, `booths`, and `festival`.
- Use stable routes in the exact form `#<arena-id>/<entry-id>`.
- Clicking or tapping anywhere on a roster card must open the individual page.
- The individual page must not open the vote flow automatically.
- A prominent `Vote` button must open `VoteFlowModal` with the routed entry selected.
- The individual page must show the image, entry number, name, origin, category, description, arena-specific metadata, and current total votes.
- Sharing must prefer the Web Share API, fall back to clipboard copy, then expose the URL for manual copying.
- Preserve `#<arena>`, `#<arena>/overview`, `#home`, and `#contests` behavior.
- Preserve unrelated dirty-worktree changes and stage only files owned by each task.
- Honor reduced motion, keyboard navigation, semantic headings, descriptive image alternatives, and a minimum 44-pixel action height.
- Do not add a routing library or change the payment API.

---

### Task 1: Define the entry-route contract

**Files:**
- Create: `src/lib/entryRoutes.ts`
- Create: `src/lib/entryRoutes.test.ts`

**Interfaces:**
- Consumes: `ContestArena['id']` from `src/data/pageant.ts`.
- Produces: `EntryRoute`, `entryHash(arenaId, entryId)`, and `parseEntryHash(hash)`.

- [ ] **Step 1: Write the failing route tests**

Create `src/lib/entryRoutes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { entryHash, parseEntryHash } from './entryRoutes';

describe('entry routes', () => {
  it.each([
    ['#hara/c-01', 'hara', 'c-01'],
    ['#gandang/c-01', 'gandang', 'c-01'],
    ['#booths/booth-01', 'booths', 'booth-01'],
    ['#festival/sd-01', 'festival', 'sd-01'],
  ] as const)('parses %s', (hash, arenaId, entryId) => {
    expect(parseEntryHash(hash)).toEqual({ arenaId, entryId });
  });

  it('normalizes uppercase hashes', () => {
    expect(parseEntryHash('#HARA/C-01')).toEqual({ arenaId: 'hara', entryId: 'c-01' });
  });

  it.each(['#hara', '#hara/overview', '#unknown/c-01', '#hara/', '#hara/c_01', '#']) (
    'rejects the non-entry route %s',
    (hash) => {
      expect(parseEntryHash(hash)).toBeNull();
    },
  );

  it('builds a stable shareable hash', () => {
    expect(entryHash('festival', 'sd-01')).toBe('#festival/sd-01');
  });
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
npm test -- src/lib/entryRoutes.test.ts
```

Expected: FAIL because `src/lib/entryRoutes.ts` does not exist.

- [ ] **Step 3: Implement the route helpers**

Create `src/lib/entryRoutes.ts`:

```ts
import type { ContestArena } from '../data/pageant';

export type EntryRoute = {
  arenaId: ContestArena['id'];
  entryId: string;
};

const ARENA_IDS = new Set<ContestArena['id']>(['hara', 'booths', 'festival', 'gandang']);

const isArenaId = (value: string): value is ContestArena['id'] =>
  ARENA_IDS.has(value as ContestArena['id']);

export function entryHash(arenaId: ContestArena['id'], entryId: string): string {
  return `#${arenaId}/${entryId}`;
}

export function parseEntryHash(rawHash: string): EntryRoute | null {
  const hash = rawHash.replace(/^#/, '').toLowerCase();
  const match = /^([a-z]+)\/([a-z0-9-]+)$/.exec(hash);

  if (!match || !isArenaId(match[1]) || match[2] === 'overview') return null;

  return { arenaId: match[1], entryId: match[2] };
}
```

- [ ] **Step 4: Run the route tests and verify they pass**

Run:

```bash
npm test -- src/lib/entryRoutes.test.ts
```

Expected: 4 parameterized parsing cases and 3 route-behavior tests pass.

- [ ] **Step 5: Commit the route contract**

```bash
git add src/lib/entryRoutes.ts src/lib/entryRoutes.test.ts
git commit -m "feat: define shareable entry routes"
```

---

### Task 2: Add native-share and clipboard fallback behavior

**Files:**
- Create: `src/lib/shareEntryPage.ts`
- Create: `src/lib/shareEntryPage.test.ts`

**Interfaces:**
- Consumes: a title, descriptive text, URL, and an optional share-capable navigator.
- Produces: `ShareEntryPayload`, `ShareEntryOutcome`, and `shareEntryPage(payload, navigatorLike)`.

- [ ] **Step 1: Write the failing sharing tests**

Create `src/lib/shareEntryPage.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { shareEntryPage } from './shareEntryPage';

const payload = {
  title: 'Sandurot Festival · Festival of Festivals',
  text: 'View Sandurot Festival and vote in Festival of Festivals.',
  url: 'https://example.com/#festival/sd-01',
};

describe('shareEntryPage', () => {
  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const clipboard = { writeText: vi.fn() };

    await expect(shareEntryPage(payload, { share, clipboard })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(payload);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('does not copy when the user cancels native sharing', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    const clipboard = { writeText: vi.fn() };

    await expect(shareEntryPage(payload, { share, clipboard })).resolves.toBe('cancelled');
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copies the URL when native sharing is unavailable or fails', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };

    await expect(shareEntryPage(payload, { clipboard })).resolves.toBe('copied');
    expect(clipboard.writeText).toHaveBeenCalledWith(payload.url);
  });

  it('requests a manual fallback when sharing and clipboard access fail', async () => {
    const share = vi.fn().mockRejectedValue(new Error('Unavailable'));
    const clipboard = { writeText: vi.fn().mockRejectedValue(new Error('Denied')) };

    await expect(shareEntryPage(payload, { share, clipboard })).resolves.toBe('manual');
  });
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
npm test -- src/lib/shareEntryPage.test.ts
```

Expected: FAIL because `src/lib/shareEntryPage.ts` does not exist.

- [ ] **Step 3: Implement the sharing helper**

Create `src/lib/shareEntryPage.ts`:

```ts
export type ShareEntryPayload = {
  title: string;
  text: string;
  url: string;
};

export type ShareEntryOutcome = 'shared' | 'copied' | 'manual' | 'cancelled';

export type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export async function shareEntryPage(
  payload: ShareEntryPayload,
  navigatorLike: ShareNavigator = navigator,
): Promise<ShareEntryOutcome> {
  if (navigatorLike.share) {
    try {
      await navigatorLike.share(payload);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigatorLike.clipboard?.writeText(payload.url);
    if (navigatorLike.clipboard) return 'copied';
  } catch {
    return 'manual';
  }

  return 'manual';
}
```

- [ ] **Step 4: Run the sharing tests and verify they pass**

Run:

```bash
npm test -- src/lib/shareEntryPage.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit the sharing behavior**

```bash
git add src/lib/shareEntryPage.ts src/lib/shareEntryPage.test.ts
git commit -m "feat: add entry sharing fallback"
```

---

### Task 3: Build the reusable individual entry page

**Files:**
- Create: `src/components/EntryProfilePage.tsx`
- Create: `src/components/EntryProfilePage.test.tsx`

**Interfaces:**
- Consumes: `ContestArena`, `VoteEntry | null`, the live tally, `Dispatch<VoterAction>`, `onBackToProgram`, `onBackToHome`, and optional `shareEntry` injection.
- Produces: `EntryProfilePage`, which owns its local `VoteFlowModal` visibility and share-status feedback.

- [ ] **Step 1: Write failing profile-page tests**

Create `src/components/EntryProfilePage.test.tsx` with these tests:

```tsx
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { contestArenas } from '../data/pageant';
import { entriesForArena } from '../lib/arenaEntries';
import { EntryProfilePage } from './EntryProfilePage';

const hara = contestArenas.find((arena) => arena.id === 'hara')!;
const festival = contestArenas.find((arena) => arena.id === 'festival')!;

describe('EntryProfilePage', () => {
  it('renders the routed entry identity, category, metadata, and live tally', () => {
    const entry = entriesForArena('festival')[0];
    const html = renderToStaticMarkup(
      <EntryProfilePage
        arena={festival}
        dispatch={() => undefined}
        entry={entry}
        onBackToHome={() => undefined}
        onBackToProgram={() => undefined}
        tally={3192}
      />,
    );

    expect(html).toContain('<h1');
    expect(html).toContain(entry.name);
    expect(html).toContain(entry.origin);
    expect(html).toContain('Festival of Festivals');
    expect(html).toContain('3,192 votes');
    for (const fact of entry.meta) {
      expect(html).toContain(fact.label);
      expect(html).toContain(fact.value);
    }
    expect(html).toContain(`Vote for ${entry.name}`);
    expect(html).toContain('Share');
  });

  it('renders a recoverable not-found state for an unknown entry', () => {
    const html = renderToStaticMarkup(
      <EntryProfilePage
        arena={hara}
        dispatch={() => undefined}
        entry={null}
        onBackToHome={() => undefined}
        onBackToProgram={() => undefined}
        tally={undefined}
      />,
    );

    expect(html).toContain('Entry not found');
    expect(html).toContain('Back to Hara sa Negros Oriental');
    expect(html).toContain('Home');
  });

  it('opens the existing vote flow with the profile entry selected', async () => {
    const entry = entriesForArena('hara')[0];
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await act(async () => {
        root.render(
          <EntryProfilePage
            arena={hara}
            dispatch={() => undefined}
            entry={entry}
            onBackToHome={() => undefined}
            onBackToProgram={() => undefined}
            tally={entry.votes}
          />,
        );
      });

      const vote = container.querySelector<HTMLButtonElement>('.entry-profile__vote');
      await act(async () => vote?.click());

      const dialog = document.body.querySelector('.vote-flow');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain(entry.name);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  });

  it('announces clipboard sharing and exposes the URL for manual fallback', async () => {
    const entry = entriesForArena('hara')[0];
    const shareEntry = vi.fn().mockResolvedValueOnce('copied').mockResolvedValueOnce('manual');
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await act(async () => {
        root.render(
          <EntryProfilePage
            arena={hara}
            dispatch={() => undefined}
            entry={entry}
            onBackToHome={() => undefined}
            onBackToProgram={() => undefined}
            shareEntry={shareEntry}
            tally={entry.votes}
          />,
        );
      });

      const share = container.querySelector<HTMLButtonElement>('.entry-profile__share');
      await act(async () => share?.click());
      expect(container.querySelector('[role="status"]')?.textContent).toContain('Link copied');

      await act(async () => share?.click());
      expect(container.querySelector<HTMLInputElement>('.entry-profile__share-url')?.readOnly).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  });
});
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run:

```bash
npm test -- src/components/EntryProfilePage.test.tsx
```

Expected: FAIL because `EntryProfilePage` does not exist.

- [ ] **Step 3: Implement `EntryProfilePage`**

Create `src/components/EntryProfilePage.tsx`. Use this exact public interface and structure:

```tsx
import { useEffect, useRef, useState, type Dispatch, type SyntheticEvent } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { House } from '@phosphor-icons/react/dist/icons/House';
import { ShareNetwork } from '@phosphor-icons/react/dist/icons/ShareNetwork';
import type { ContestArena } from '../data/pageant';
import { arenaDisplayName, type VoteEntry } from '../lib/arenaEntries';
import { shareEntryPage, type ShareEntryOutcome, type ShareEntryPayload } from '../lib/shareEntryPage';
import type { VoterAction } from '../state/voterState';
import { VoteFlowModal } from './VoteFlowModal';

type EntryProfilePageProps = {
  arena: ContestArena;
  entry: VoteEntry | null;
  tally: number | undefined;
  dispatch: Dispatch<VoterAction>;
  onBackToProgram: () => void;
  onBackToHome: () => void;
  shareEntry?: (payload: ShareEntryPayload) => Promise<ShareEntryOutcome>;
};

const entryImageAlt = (arenaId: ContestArena['id'], name: string, origin: string) => {
  if (arenaId === 'booths') return `${name} Buglasan booth representing ${origin}`;
  if (arenaId === 'festival') return `${name} festival contingent representing ${origin}`;
  return `${name} representing ${origin}`;
};

const replaceBrokenImage = (event: SyntheticEvent<HTMLImageElement>) => {
  const fallback = event.currentTarget.dataset.fallbackSrc;
  if (!fallback || event.currentTarget.src.endsWith(fallback)) return;
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallback;
};

export function EntryProfilePage({
  arena,
  entry,
  tally,
  dispatch,
  onBackToProgram,
  onBackToHome,
  shareEntry = shareEntryPage,
}: EntryProfilePageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [voteOpen, setVoteOpen] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<ShareEntryOutcome | null>(null);
  const programName = arenaDisplayName(arena);

  useEffect(() => {
    headingRef.current?.focus();
  }, [arena.id, entry?.id]);

  useEffect(() => {
    if (!entry) return undefined;
    const previousTitle = document.title;
    document.title = `${entry.name} · ${programName}`;
    return () => {
      document.title = previousTitle;
    };
  }, [entry, programName]);

  if (!entry) {
    return (
      <main className="entry-profile entry-profile--not-found" style={{ ['--arena' as string]: arena.accentColor }}>
        <section className="entry-profile__not-found">
          <p className="entry-profile__eyebrow">{programName}</p>
          <h1 ref={headingRef} tabIndex={-1}>Entry not found</h1>
          <p>This shared link no longer matches an entry in the current roster.</p>
          <div className="entry-profile__actions">
            <button onClick={onBackToProgram} type="button">Back to {programName}</button>
            <button onClick={onBackToHome} type="button">Home</button>
          </div>
        </section>
      </main>
    );
  }

  const shareUrl = window.location.href;
  const sharePayload = {
    title: `${entry.name} · ${programName}`,
    text: `View ${entry.name} and vote in ${programName}.`,
    url: shareUrl,
  };
  const imageSource = entry.image ?? entry.fallbackImage;

  const handleShare = async () => {
    setShareOutcome(await shareEntry(sharePayload));
  };

  return (
    <main className={`entry-profile entry-profile--${arena.id} entry-profile--${arena.id === 'booths' || arena.id === 'festival' ? 'landscape' : 'portrait'}`} style={{ ['--arena' as string]: arena.accentColor }}>
      <nav aria-label={`${entry.name} navigation`} className="entry-profile__nav">
        <button onClick={onBackToProgram} type="button"><ArrowLeft aria-hidden="true" />Back to {programName}</button>
        <button onClick={onBackToHome} type="button"><House aria-hidden="true" />Home</button>
      </nav>

      <article aria-labelledby="entry-profile-title" className="entry-profile__card">
        <div className="entry-profile__media">
          {imageSource ? (
            <img
              alt={entryImageAlt(arena.id, entry.name, entry.origin)}
              data-fallback-src={entry.fallbackImage}
              height={768}
              onError={entry.fallbackImage ? replaceBrokenImage : undefined}
              src={imageSource}
              width={768}
            />
          ) : (
            <div aria-label={`${entry.name} image unavailable`} className="entry-profile__image-placeholder" role="img" />
          )}
        </div>

        <div className="entry-profile__content">
          <p className="entry-profile__eyebrow">{programName}</p>
          <p className="entry-profile__number">Entry {entry.number}</p>
          <h1 id="entry-profile-title" ref={headingRef} tabIndex={-1}>{entry.name}</h1>
          <p className="entry-profile__origin">{entry.origin}</p>
          <p className="entry-profile__description">{entry.blurb}</p>

          <dl className="entry-profile__metadata">
            {entry.meta.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
            <div>
              <dt>Total votes</dt>
              <dd>{(tally ?? entry.votes).toLocaleString()} votes</dd>
            </div>
          </dl>

          <div className="entry-profile__actions">
            <button className="entry-profile__vote crown-button crown-floating-dots-button" onClick={() => setVoteOpen(true)} type="button">
              Vote for {entry.name}
            </button>
            <button className="entry-profile__share" onClick={handleShare} type="button">
              <ShareNetwork aria-hidden="true" />Share
            </button>
          </div>

          <p aria-live="polite" className="entry-profile__share-status" role="status">
            {shareOutcome === 'copied' ? 'Link copied.' : shareOutcome === 'shared' ? 'Share sheet opened.' : ''}
          </p>
          {shareOutcome === 'manual' && (
            <label className="entry-profile__share-fallback">
              Copy this link
              <input className="entry-profile__share-url" onFocus={(event) => event.currentTarget.select()} readOnly value={shareUrl} />
            </label>
          )}
        </div>
      </article>

      {voteOpen && (
        <VoteFlowModal
          arena={arena}
          dispatch={dispatch}
          entryId={entry.id}
          mode="flow"
          onClose={() => setVoteOpen(false)}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run the profile and existing modal tests**

Run:

```bash
npm test -- src/components/EntryProfilePage.test.tsx src/components/VoteFlowModal.test.tsx
```

Expected: all profile and modal tests pass.

- [ ] **Step 5: Commit the profile component**

```bash
git add src/components/EntryProfilePage.tsx src/components/EntryProfilePage.test.tsx
git commit -m "feat: add individual entry profiles"
```

---

### Task 4: Route every roster card to its individual page

**Files:**
- Modify: `src/components/HaraGallery.tsx`
- Modify: `src/components/ContestSubpageView.tsx`
- Modify: `src/components/ContestSubpageView.test.tsx`
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `parseEntryHash`, `entryHash`, `EntryProfilePage`, `entriesForArena`, and the existing arena tallies.
- Produces: direct hash loading, card-to-profile navigation, program/home return navigation, and invalid-entry recovery.

- [ ] **Step 1: Replace the card-voting tests with failing profile-navigation tests**

In `src/components/ContestSubpageView.test.tsx`, update render calls to pass `onOpenEntry={() => undefined}`. Replace the existing `opens a vote from the card surface or its one real button` test with:

```tsx
it('opens an individual page from the full card through one native link', async () => {
  const originalMatchMedia = window.matchMedia;
  const onOpenEntry = vi.fn();
  const container = document.createElement('div');
  const root = createRoot(container);

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
  document.body.appendChild(container);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  try {
    const hara = contestArenas.find((arena) => arena.id === 'hara')!;

    await act(async () => {
      root.render(
        <HaraGallery
          arena={hara}
          onBackToHub={() => undefined}
          onHowToVote={() => undefined}
          onOpenEntry={onOpenEntry}
          onOpenOverview={() => undefined}
          tallies={{}}
        />,
      );
    });

    const card = container.querySelector<HTMLElement>('.hara-gallery-card');
    const link = card?.querySelector<HTMLAnchorElement>('.subpage-entry-link');

    expect(card?.getAttribute('role')).toBeNull();
    expect(card?.hasAttribute('tabindex')).toBe(false);
    expect(card?.querySelectorAll('a,button')).toHaveLength(1);
    expect(link?.getAttribute('href')).toBe(`#hara/${haraCandidates[0].id}`);
    expect(link?.textContent).toContain(`View ${haraCandidates[0].name}`);

    await act(async () => link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    expect(onOpenEntry).toHaveBeenCalledOnce();
    expect(onOpenEntry).toHaveBeenCalledWith(haraCandidates[0].id);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  }
});
```

Update static assertions from `Vote for ${candidate.name}` to `View ${candidate.name}` and require each card to contain one anchor and no button.

- [ ] **Step 2: Add failing direct-route tests to `LandingPage.test.tsx`**

Add this complete test, using the same `beforeEach` `matchMedia` and `scrollTo` setup already present in the file:

```tsx
it('loads shared entry routes and keeps invalid entry links recoverable', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const originalIntersectionObserver = globalThis.IntersectionObserver;

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  document.body.appendChild(container);

  try {
    window.location.hash = '#festival/sd-01';

    await act(async () => {
      root.render(<LandingPage state={initialVoterState} dispatch={() => undefined} />);
    });

    expect(container.querySelector('.entry-profile')).not.toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe('Sandurot Festival');
    expect(container.textContent).toContain('Festival of Festivals');
    expect(container.textContent).toContain('3,120 votes');

    await act(async () => {
      window.location.hash = '#hara/not-current';
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(container.querySelector('.entry-profile--not-found')).not.toBeNull();
    expect(container.textContent).toContain('Entry not found');
    expect(container.textContent).toContain('Back to Hara sa Negros Oriental');
  } finally {
    await act(async () => root.unmount());
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: originalIntersectionObserver,
    });
    container.remove();
  }
});
```

- [ ] **Step 3: Run the focused tests and verify the expected failures**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx src/components/LandingPage.test.tsx
```

Expected: FAIL because the gallery still opens voting and `LandingPage` does not parse or render entry routes.

- [ ] **Step 4: Convert the gallery action to a stretched native link**

In `HaraGallery.tsx`:

- Replace `onVote` with `onOpenEntry` in `HaraGalleryProps` and the component signature.
- Import `entryHash` from `../lib/entryRoutes`.
- Remove `onClick` from `<article>`.
- Replace the vote `<button>` with this link:

```tsx
<a
  className="crown-button crown-floating-dots-button subpage-entry-link"
  href={entryHash(arena.id, candidate.id)}
  onClick={(event) => {
    event.preventDefault();
    onOpenEntry(candidate.id);
  }}
>
  <span>View {candidate.name}</span>
  <ArrowRight aria-hidden="true" size={14} />
</a>
```

In `ContestSubpageView.tsx`:

- Add `onOpenEntry: (entryId: string) => void` to the props.
- Pass `onOpenEntry` to `HaraGallery`.
- Keep the local modal only for `How to vote`; no roster card opens the vote flow.

- [ ] **Step 5: Integrate entry routing in `LandingPage.tsx`**

Import:

```ts
import { EntryProfilePage } from './EntryProfilePage';
import { entriesForArena } from '../lib/arenaEntries';
import { entryHash, parseEntryHash, type EntryRoute } from '../lib/entryRoutes';
```

Add state:

```ts
const [activeEntry, setActiveEntry] = useState<EntryRoute | null>(null);
```

At the start of `handleHash`, parse an entry route before checking overview routes:

```ts
const entryRoute = parseEntryHash(window.location.hash);
if (entryRoute) {
  setActiveEntry(entryRoute);
  setActiveOverview(null);
  setActiveSubpage(entryRoute.arenaId);
  window.scrollTo(0, 0);
  return;
}
```

Every non-entry branch must call `setActiveEntry(null)` before setting its existing state.

Update the existing navigation handlers so a profile cannot remain active after program, overview, or Home navigation:

```ts
const openSubpage = (id: ContestArena['id']) => {
  setActiveEntry(null);
  setActiveOverview(null);
  setActiveSubpage(id);
  window.location.hash = id;
  window.scrollTo(0, 0);
};

const closeSubpage = () => {
  setActiveEntry(null);
  setActiveOverview(null);
  setActiveSubpage(null);
  window.location.hash = 'home';
  window.scrollTo(0, 0);
};

const openOverview = (id: ContestArena['id']) => {
  setActiveEntry(null);
  setActiveOverview(id);
  setActiveSubpage(id);
  window.location.hash = `${id}/overview`;
  window.scrollTo(0, 0);
};

const closeOverview = () => {
  const id = activeOverview ?? 'hara';
  setActiveEntry(null);
  setActiveOverview(null);
  setActiveSubpage(id);
  window.location.hash = id;
  window.scrollTo(0, 0);
};
```

Add navigation handlers:

```ts
const openEntry = (arenaId: ContestArena['id'], entryId: string) => {
  setActiveEntry({ arenaId, entryId });
  setActiveOverview(null);
  setActiveSubpage(arenaId);
  window.location.hash = entryHash(arenaId, entryId);
  window.scrollTo(0, 0);
};

const closeEntryToProgram = () => {
  if (!activeEntry) return;
  const arenaId = activeEntry.arenaId;
  setActiveEntry(null);
  setActiveOverview(null);
  setActiveSubpage(arenaId);
  window.location.hash = arenaId;
  window.scrollTo(0, 0);
};
```

Include `activeEntry?.arenaId` when resolving `activeArena`, then resolve the record:

```ts
const activeArena = contestArenas.find(
  (arena) => arena.id === (activeEntry?.arenaId ?? activeOverview ?? activeSubpage),
) ?? contestArenas[0];

const activeEntryRecord = activeEntry
  ? entriesForArena(activeEntry.arenaId).find((entry) => entry.id === activeEntry.entryId) ?? null
  : null;
```

Render the entry page before overview and program branches:

```tsx
{activeEntry ? (
  <EntryProfilePage
    arena={activeArena}
    dispatch={dispatch}
    entry={activeEntryRecord}
    onBackToHome={closeSubpage}
    onBackToProgram={closeEntryToProgram}
    tally={activeEntryRecord ? state.arenaTallies[activeEntry.arenaId][activeEntryRecord.id] : undefined}
  />
) : activeOverview ? (
```

Pass this callback to `ContestSubpageView`:

```tsx
onOpenEntry={(entryId) => openEntry(activeArena.id, entryId)}
```

- [ ] **Step 6: Run route, gallery, profile, and modal tests**

Run:

```bash
npm test -- src/lib/entryRoutes.test.ts src/components/ContestSubpageView.test.tsx src/components/EntryProfilePage.test.tsx src/components/LandingPage.test.tsx src/components/VoteFlowModal.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 7: Commit route and card integration**

```bash
git add src/components/HaraGallery.tsx src/components/ContestSubpageView.tsx src/components/ContestSubpageView.test.tsx src/components/LandingPage.tsx src/components/LandingPage.test.tsx
git commit -m "feat: open entries on shareable pages"
```

---

### Task 5: Add responsive profile styling and complete verification

**Files:**
- Create: `src/entryProfileStyles.test.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: the `entry-profile` and `subpage-entry-link` class contracts from Tasks 3 and 4.
- Produces: responsive portrait and landscape layouts, full-card pointer targeting, visible keyboard focus, reduced-motion behavior, and mobile containment.

- [ ] **Step 1: Write the failing CSS contract test**

Create `src/entryProfileStyles.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
};

describe('entry profile styles', () => {
  it('uses a responsive two-column profile shell without horizontal overflow', () => {
    expect(rule('.entry-profile__card')).toMatch(/display:\s*grid/);
    expect(rule('.entry-profile__card')).toMatch(/grid-template-columns:/);
    expect(rule('.entry-profile')).toMatch(/overflow-x:\s*clip/);
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*\.entry-profile__card\s*\{[^}]*grid-template-columns:\s*1fr/);
  });

  it('keeps primary actions touch-sized and stretches the roster link over its card', () => {
    expect(rule('.entry-profile__vote')).toMatch(/min-height:\s*44px/);
    expect(rule('.entry-profile__share')).toMatch(/min-height:\s*44px/);
    expect(rule('.subpage-entry-link::after')).toMatch(/position:\s*absolute/);
    expect(rule('.subpage-entry-link::after')).toMatch(/inset:\s*0/);
  });

  it('suppresses nonessential profile motion when reduced motion is requested', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.entry-profile__card/);
  });
});
```

- [ ] **Step 2: Run the CSS test and verify the expected failure**

Run:

```bash
npm test -- src/entryProfileStyles.test.ts
```

Expected: FAIL because the profile and stretched-link rules do not exist.

- [ ] **Step 3: Add the profile and card-link styles**

Append a scoped `entry-profile` block to `src/styles.css` with these required declarations:

```css
.entry-profile {
  --entry-profile-max: 1180px;
  min-height: 100svh;
  overflow-x: clip;
  padding: clamp(1rem, 3vw, 2.5rem);
  color: var(--ivory);
}

.entry-profile__nav,
.entry-profile__card,
.entry-profile__not-found {
  width: min(100%, var(--entry-profile-max));
  margin-inline: auto;
}

.entry-profile__nav {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: clamp(1rem, 3vw, 2rem);
}

.entry-profile__nav button,
.entry-profile__share,
.entry-profile__not-found button {
  min-height: 44px;
}

.entry-profile__card {
  display: grid;
  grid-template-columns: minmax(18rem, .9fr) minmax(20rem, 1.1fr);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--arena) 58%, transparent);
  border-radius: clamp(1.25rem, 3vw, 2rem);
  background: linear-gradient(145deg, rgba(4, 22, 15, .94), rgba(1, 12, 9, .98));
  box-shadow: 0 24px 80px rgba(0, 0, 0, .42), 0 0 42px color-mix(in srgb, var(--arena) 14%, transparent);
  animation: entry-profile-arrive .55s cubic-bezier(.22, 1, .36, 1) both;
}

.entry-profile__media {
  min-height: min(72svh, 760px);
  background: rgba(0, 0, 0, .34);
}

.entry-profile--landscape .entry-profile__media {
  min-height: 28rem;
}

.entry-profile__media img,
.entry-profile__image-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-profile--landscape .entry-profile__media img {
  object-fit: contain;
}

.entry-profile__content,
.entry-profile__not-found {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(1.5rem, 5vw, 4.5rem);
}

.entry-profile__eyebrow,
.entry-profile__number {
  color: var(--arena);
  font-size: .76rem;
  font-weight: 760;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.entry-profile h1 {
  margin: .35rem 0;
  font-size: clamp(2.35rem, 6vw, 5.5rem);
  line-height: .94;
}

.entry-profile__origin,
.entry-profile__description {
  color: rgba(247, 244, 232, .72);
}

.entry-profile__metadata {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .75rem;
  margin: 1.5rem 0;
}

.entry-profile__metadata > div {
  padding: .9rem;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: .9rem;
  background: rgba(255, 255, 255, .035);
}

.entry-profile__metadata dt {
  color: rgba(247, 244, 232, .56);
  font-size: .7rem;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.entry-profile__metadata dd {
  margin: .3rem 0 0;
  font-weight: 680;
}

.entry-profile__actions {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
}

.entry-profile__vote,
.entry-profile__share {
  min-height: 44px;
}

.entry-profile__share-url {
  width: 100%;
  min-height: 44px;
}

.hara-gallery-card {
  position: relative;
}

.subpage-entry-link::after {
  position: absolute;
  z-index: 2;
  inset: 0;
  border-radius: var(--radius-lg);
  content: '';
}

.subpage-entry-link:focus-visible::after {
  outline: 3px solid var(--arena);
  outline-offset: 4px;
}

@keyframes entry-profile-arrive {
  from { opacity: 0; transform: translateY(18px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 720px) {
  .entry-profile__card {
    grid-template-columns: 1fr;
  }

  .entry-profile__media,
  .entry-profile--landscape .entry-profile__media {
    min-height: 0;
    aspect-ratio: 4 / 5;
  }

  .entry-profile--landscape .entry-profile__media {
    aspect-ratio: 16 / 10;
  }

  .entry-profile__metadata {
    grid-template-columns: 1fr;
  }

  .entry-profile__actions > * {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .entry-profile__card {
    animation: none;
  }
}
```

Use the declarations above as written. Keep every new selector scoped to `.entry-profile` or `.subpage-entry-link`.

- [ ] **Step 4: Run all focused feature tests**

Run:

```bash
npm test -- src/lib/entryRoutes.test.ts src/lib/shareEntryPage.test.ts src/components/EntryProfilePage.test.tsx src/components/ContestSubpageView.test.tsx src/components/LandingPage.test.tsx src/components/VoteFlowModal.test.tsx src/entryProfileStyles.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 5: Run repository verification**

Run:

```bash
npm run build
npm test
git diff --check
git status --short
```

Expected: the build and new focused tests pass. Record any full-suite failures that reproduce on the pre-feature baseline, and do not modify unrelated dirty files to make them pass.

- [ ] **Step 6: Verify the live flow in the browser**

At `http://localhost:5173`:

1. Open `#hara`, click the first portrait card, and confirm the hash becomes `#hara/c-01`.
2. Confirm the profile shows the Hara category, image, name, origin, metadata, current vote total, Share control, and prominent Vote button.
3. Reload the direct URL and confirm the same profile remains open.
4. Select Vote and confirm `VoteFlowModal` opens with the same candidate selected; close it and confirm the profile remains.
5. Open `#festival`, click the first landscape card, and confirm the hash becomes `#festival/sd-01` with a wide uncropped image.
6. Open `#hara/not-current` and confirm the recoverable not-found state.
7. At 375 by 812 pixels, confirm there is no horizontal overflow, all actions are at least 44 pixels tall, names wrap, and the page remains keyboard operable.
8. With reduced motion enabled, confirm the profile appears without entry animation.

- [ ] **Step 7: Commit the responsive profile treatment**

```bash
git add src/styles.css src/entryProfileStyles.test.ts
git commit -m "feat: style shareable entry profiles"
```

---

## Completion criteria

- Every current roster card opens a stable `#<arena-id>/<entry-id>` page by click, tap, or keyboard activation.
- Directly loading a shared entry URL renders the correct entry or a recoverable not-found state.
- The profile page contains the required identity, category, metadata, and live vote total.
- The profile Vote button opens the existing preselected vote flow; shared links never open payment automatically.
- Native sharing, clipboard copy, and manual fallback are covered by tests.
- Portrait and landscape entries render without clipping or horizontal overflow.
- Focused tests, production build, diff checks, and live browser journeys are verified with unrelated dirty-worktree changes preserved.
