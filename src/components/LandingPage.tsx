import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { useGSAP } from '@gsap/react';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { List } from '@phosphor-icons/react/dist/icons/List';
import { X } from '@phosphor-icons/react/dist/icons/X';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BUGLASAN_HERO_LOGO,
  type ContestArena,
} from '../data/pageant';
import type { VoterAction, VoterState } from '../state/voterState';
import { BrandMark } from './BrandMark';
import { ContestSubpageView } from './ContestSubpageView';
import { ContestPickerModal } from './ContestPickerModal';
import { EntryProfilePage } from './EntryProfilePage';
import { ArchNiche } from './ArchNiche';
import { VoteCursor } from './VoteCursor';
import { VoteFlowModal } from './VoteFlowModal';
import { VotingOverviewPage } from './VotingOverviewPage';
import { arenaDisplayName } from '../lib/arenaEntries';
import { entriesFor, useContent } from '../lib/contentStore';
import { enter } from '../lib/enter';
import { entryHash, parseEntryHash, type EntryRoute } from '../lib/entryRoutes';
import { trackPlaqueSheen } from '../lib/plaqueSheen';
import { claimBootStage, useSiteBoot } from '../lib/siteBoot';
import { shouldRenderStage } from '../lib/stageBudget';

gsap.registerPlugin(useGSAP);

/**
 * The sponsor marks, both official and supplied by PlanOut.
 *
 * This replaces a wordmark band I had cropped out of their stacked PNG by
 * hand, back when planout.io shipped no horizontal lockup — their site still
 * carries only the bare chevron, in two colour variants, inlined in its JS.
 *
 * Two shapes because the two slots want different things:
 *
 *   stacked     4.41:1 is useless in a header row, so the near-square lockup
 *               (80% chevron, 14% wordmark beneath) takes the top-left slot
 *               beside the festival's own brand.
 *   horizontal  the full lockup, tagline included, for the hero credit where
 *               there is width to spend and the wordmark should read.
 *
 * Sources live in `scratch/sources/` — gitignored, so the 464 kB of PNG they
 * arrived as does not ship. Regenerate with the sizes noted on each file.
 */
const PLANOUT_STACKED = '/assets/sponsors/planout-lockup-stacked.webp';
const PLANOUT_HORIZONTAL = '/assets/sponsors/planout-lockup-horizontal.webp';

const FestivalScene = lazy(() =>
  import('./FestivalScene').then(({ FestivalScene: Scene }) => ({ default: Scene })),
);

/** Number of scroll-driven camera stops in the WebGL scene. */
const SCENE_STOPS = 2;

/** Hero-only order; the source arena order remains canonical elsewhere. */
const HERO_ARENA_ORDER = ['hara', 'gandang', 'booths', 'festival'] as const satisfies readonly ContestArena['id'][];
const heroArenaLabel = (arena: ContestArena) => arenaDisplayName(arena);

/* Both of these used to be computed at module scope, off the bundled arena
   list. That is the exact reason setting VITE_CONTENT_API_URL changed nothing
   on the home page: the hero row was decided at import time, before any fetch
   could have answered. They take the live list now.

   The order is the hero's own — the source order stays canonical everywhere
   else — and an arena the server does not return simply drops out of the row
   rather than rendering a hole. */
const heroArenasFrom = (arenas: readonly ContestArena[]) =>
  HERO_ARENA_ORDER.map((id) => arenas.find((arena) => arena.id === id)).filter(
    (arena): arena is ContestArena => arena !== undefined,
  );

function SceneFallback({ quiet = false, arenaId }: { quiet?: boolean; arenaId?: string }) {
  return (
    <div
      className={`festival-scene festival-scene--fallback${quiet ? ' is-quiet' : ''}${arenaId ? ` festival-scene--${arenaId}` : ' festival-scene--home'}`}
      data-arena={arenaId ?? 'hub'}
      data-scene-mode={quiet ? 'quiet' : 'full'}
    >
      <canvas className="festival-scene__canvas" role="img" aria-label="Crown of Light festival scene" />
      <div className="festival-scene__tint" aria-hidden="true" />
      <picture aria-hidden={quiet} className="festival-scene__fallback-logo" data-centerpiece="official-logo">
        {/* WebP variants first, the 3198px original as the fallback. A phone
            picking the original decodes ~21 MB for a mark drawn at 54vw. */}
        <source sizes={BUGLASAN_HERO_LOGO.sizes} srcSet={BUGLASAN_HERO_LOGO.srcSet} type="image/webp" />
        <img
          alt="Buglasan Festival 2026"
          height={BUGLASAN_HERO_LOGO.height}
          src={BUGLASAN_HERO_LOGO.src}
          width={BUGLASAN_HERO_LOGO.width}
        />
      </picture>
      <div className="festival-scene__vignette" aria-hidden="true" />
    </div>
  );
}

export function LandingPage({ state, dispatch }: { state: VoterState; dispatch: Dispatch<VoterAction> }) {
  const rootRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const sceneProgressRef = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubpage, setActiveSubpage] = useState<ContestArena['id'] | null>(null);
  const [activeOverview, setActiveOverview] = useState<ContestArena['id'] | null>(null);
  const [activeEntry, setActiveEntry] = useState<EntryRoute | null>(null);
  const [showHowToVote, setShowHowToVote] = useState(false);
  const [showContestPicker, setShowContestPicker] = useState(false);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  /* Read once. The answer depends on connection and memory hints that do not
     change mid-session, and re-deciding on a resize would mean tearing the
     stage down and rebuilding it while someone drags a window. */
  const [stageAllowed] = useState(shouldRenderStage);

  /* The provincial marks are `display: none` under `@media (max-width: 760px)`,
     and `display: none` does not stop a browser fetching an `<img>` that is in
     the document — those two PNGs are 82 kB, downloaded by every phone and
     shown to none of them. Hiding in CSS is not enough; they have to be absent.

     Defaults to rendering them where there is no window to ask (SSR, and the
     static-markup tests), which is the safe direction: a mark that ships when
     it did not need to costs bytes, one that is missing costs the province its
     credit on the page. */
  const [officialMarksShown] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 760,
  );

  /* Same story, bigger numbers. The plaque row is `display: none` under
     `@media (max-width: 1180px)` — the hero offers the "Choose a contest"
     button there instead — but its three programme crests are 281 kB that
     every phone downloaded and none displayed.

     `ArchNiche` already marks them `loading="lazy"`, and that turned out not to
     help: an image with no layout box is not "far from the viewport", it is
     nowhere, and Chrome loads it eagerly. Measured on a 375px viewport with the
     attribute in place — `complete: true`, `initiatorType: "img"`. The only
     thing that keeps an image off a phone is not putting it in the document. */
  const [plaquesShown] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 1180,
  );

  /* The roster, the programmes and the festival dates. Bundled data until the
     content service answers, the server's after that — see contentStore.ts. */
  const content = useContent();
  const { arenas, festival } = content;
  const heroContestArenas = heroArenasFrom(arenas);
  const defaultGuideArena = arenas.find((arena) => arena.id === 'hara') ?? arenas[0];

  /* This view mounts the 3D stage, so the curtain has something to wait for.
     Claimed here rather than inside FestivalScene because that component is
     lazy: on a slow connection its chunk can arrive well after the boot gates
     have given up waiting for a stage nobody claimed. Declared above
     `useSiteBoot` so it runs before the grace timer that hook starts.

     Only when a stage is actually coming. This was unconditional, and on every
     viewport `shouldRenderStage` says no to — which is every phone — it claimed
     a stage that would never mount. Nothing then called `resolveBootStage`, so
     the 0.62-weighted stage gate never filled, and the CLAIM_MS fallback that
     exists for exactly this case was skipped *because* the stage was claimed.
     The curtain sat at 38% until the 12s ceiling. Twelve seconds of loading
     screen on a page with no 3D on it. */
  useEffect(() => {
    if (stageAllowed) claimBootStage();
  }, [stageAllowed]);
  const { ready: bootReady } = useSiteBoot();

  useEffect(() => {
    const updateHeaderScroll = () => {
      setIsHeaderScrolled(window.scrollY > 24);
    };

    updateHeaderScroll();
    window.addEventListener('scroll', updateHeaderScroll, { passive: true });

    return () => window.removeEventListener('scroll', updateHeaderScroll);
  }, []);

  // Synchronize hash with subpages if present
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const arenaIds = ['hara', 'booths', 'festival', 'gandang'];
      const entryRoute = parseEntryHash(window.location.hash);
      if (entryRoute) {
        setActiveEntry(entryRoute);
        setActiveOverview(null);
        setActiveSubpage(entryRoute.arenaId);
        window.scrollTo(0, 0);
        return;
      }

      const overviewMatch = hash.match(/^([a-z]+)\/overview$/);
      if (overviewMatch && arenaIds.includes(overviewMatch[1])) {
        const id = overviewMatch[1] as ContestArena['id'];
        setActiveEntry(null);
        setActiveOverview(id);
        setActiveSubpage(id);
        window.scrollTo(0, 0);
      } else if (arenaIds.includes(hash)) {
        setActiveEntry(null);
        setActiveOverview(null);
        setActiveSubpage(hash as ContestArena['id']);
        window.scrollTo(0, 0);
      } else if (hash === 'home' || hash === 'contests') {
        /* The hero's own anchor, and what Home points at. It used to be
           `#festival`, which is also an arena id — the arena test above always
           won, so Home opened the Festival of Festivals page. One string, two
           meanings; the hero got its own name. `#contests` remains a safe
           legacy bookmark and now lands on the hero's four contest cards. */
        setActiveEntry(null);
        setActiveOverview(null);
        setActiveSubpage(null);
        window.scrollTo(0, 0);
      } else {
        /* Anything else is a landing-page anchor (#vote), an empty hash, or a
           stale link — `#vote-<arena>` used to be a route here and bookmarks
           of it will still arrive. Falling through without clearing state left
           whatever view was already up, so an unrecognised hash quietly did
           nothing. It goes home instead, without stealing the scroll from a
           real in-page anchor. */
        setActiveEntry(null);
        setActiveOverview(null);
        setActiveSubpage(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

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

  const openContestPicker = () => {
    setMenuOpen(false);
    setShowContestPicker(true);
  };

  const selectContest = (id: ContestArena['id']) => {
    setShowContestPicker(false);
    openSubpage(id);
  };

  const openHowToVote = () => {
    setMenuOpen(false);
    setShowHowToVote(true);
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    document.body.classList.add('landing-menu-open');
    window.requestAnimationFrame(() => mobileNavRef.current?.querySelector('a')?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.classList.remove('landing-menu-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  useGSAP(
    () => {
      if (activeSubpage || activeOverview) return undefined;
      /* Held until the curtain lifts. Run on mount, the whole entrance plays
         out behind the loading screen and the reveal is a page that has
         already finished arriving. */
      if (!bootReady) return undefined;
      const root = rootRef.current;
      if (!root) return undefined;

      if (typeof window.matchMedia !== 'function') return undefined;
      gsap.registerPlugin(ScrollTrigger);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        sceneProgressRef.current = 0;
        gsap.set('[data-reveal], [data-hero-reveal]', { clearProps: 'all' });
        return undefined;
      }

      const media = gsap.matchMedia();
      const sceneTrigger = ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.85,
        onUpdate: ({ progress }) => {
          sceneProgressRef.current = progress * SCENE_STOPS;
        },
      });

      const stopHeroEntrance = enter(
        '[data-hero-reveal]',
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 1.05, ease: 'power3.out', stagger: 0.1 },
      );

      return () => {
        stopHeroEntrance();
        media.revert();
        sceneTrigger.kill();
      };
    },
    { scope: rootRef, dependencies: [activeOverview, activeSubpage, bootReady] },
  );

  /**
   * Scroll reveals, as progressive enhancement.
   *
   * Sections are visible in CSS by default. The hidden start state is only
   * armed after a frame has actually been painted with the document visible,
   * so a page that never gets frames simply renders without the animation
   * instead of shipping blank. IntersectionObserver then flips each section
   * once — no per-element scroll-linked instance, no work on the scroll path.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || activeSubpage || activeOverview || !bootReady) return undefined;
    if (typeof window.matchMedia !== 'function') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return undefined;

    let observer: IntersectionObserver | null = null;

    const arm = () => {
      if (document.visibilityState !== 'visible') return;
      root.setAttribute('data-reveal-armed', '');
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            (entry.target as HTMLElement).setAttribute('data-revealed', '');
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      for (const target of targets) observer.observe(target);
    };

    const frame = window.requestAnimationFrame(arm);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      root.removeAttribute('data-reveal-armed');
    };
  }, [activeOverview, activeSubpage, bootReady]);

  /**
   * The plaques are steel, and steel only reads as steel while the highlight
   * on it moves — so the pointer becomes the lamp lighting the whole row.
   * Bails on coarse pointers and reduced motion inside `trackPlaqueSheen`,
   * where the stylesheet's own rest values are already the right answer.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || activeSubpage || activeOverview) return undefined;

    const row = root.querySelector<HTMLElement>('.hero-arena-cards');
    if (!row) return undefined;

    return trackPlaqueSheen(row);
  }, [activeOverview, activeSubpage]);

  const closeMenu = () => setMenuOpen(false);

  const currentArenaId = activeSubpage ?? activeOverview ?? undefined;

  /* Decided once, before the lazy import can be reached: `lazy` only defers
     the chunk, it does not decline it, and the 8.1MB model behind it is not
     something to hand a phone on mobile data. `SceneFallback` is the same
     wordmark as a still. See `stageBudget.ts`. */
  const stageFallback = (
    <SceneFallback arenaId={currentArenaId} quiet={Boolean(activeOverview || activeSubpage)} />
  );

  const scene = !stageAllowed ? (
    stageFallback
  ) : (
    <Suspense fallback={stageFallback}>
      <FestivalScene
        arenaId={currentArenaId}
        progressRef={sceneProgressRef}
        quiet={Boolean(activeOverview || activeSubpage)}
      />
    </Suspense>
  );

  const activeArena = arenas.find(
    (arena) => arena.id === (activeEntry?.arenaId ?? activeOverview ?? activeSubpage),
  ) ?? arenas[0];
  const activeEntryRecord = activeEntry
    ? entriesFor(activeEntry.arenaId, content).find((entry) => entry.id === activeEntry.entryId) ?? null
    : null;

  return (
    <>
      {scene}
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
        <VotingOverviewPage
          arena={activeArena}
          onBackToHub={closeSubpage}
          onBackToProgram={closeOverview}
          tallies={state.arenaTallies[activeArena.id]}
        />
      ) : activeSubpage ? (
        <ContestSubpageView
          arena={activeArena}
          dispatch={dispatch}
          onBackToHub={closeSubpage}
          onOpenEntry={(entryId) => openEntry(activeArena.id, entryId)}
          onOpenOverview={() => openOverview(activeArena.id)}
          onSwitchArena={(id) => openSubpage(id)}
          tallies={state.arenaTallies[activeArena.id]}
        />
      ) : (
      <main className="crown-landing" ref={rootRef}>

      {/* Follows the pointer across the plaque row. Mounted here rather than
          inside the row so it can outlive any one card's hover. */}
      <VoteCursor />

      {/* Ultra-Premium Glass Floating Header */}
      <header className={`crown-header${isHeaderScrolled ? ' is-scrolled' : ''}`} aria-label="Buglasan Festival header">
        <div className="crown-header__container">
          {/* The WebGL wordmark flies into this slot as the hero scrolls away.
              The DOM mark stays hidden until the flight lands, then takes over
              so it can sit above the opaque chapters the canvas renders behind. */}
          {/* One wrapper, because the header is a three-track grid — `1fr auto
              1fr` for brand, nav and provincial marks. A fourth child does not
              get a fourth track; it takes the nav's, which put the sponsor
              badge in the middle of the header and shoved everything right. */}
          <div className="crown-header__left">
            <a
              className="crown-header__brand"
              data-scene-dock
              href="#home"
              aria-label="Buglasan Festival home"
            >
              <BrandMark compact official />
            </a>

            {/* Top-left, beside the festival's own mark rather than instead of
                it — the festival's identity stays primary on its own site. The
                hairline separates two unrelated brands sharing a corner. */}
            <a
              className="planout-badge"
              href="https://planout.io"
              rel="noreferrer noopener"
              target="_blank"
            >
              <img
                alt="planout.io"
                decoding="async"
                height={189}
                src={PLANOUT_STACKED}
                width={192}
              />
            </a>
          </div>

          <nav className="crown-nav" aria-label="Main navigation">
            <a className="crown-nav__link crown-quiet-control" href="#home">
              <span>Home</span>
            </a>
            <button className="crown-nav__link crown-quiet-control" onClick={openHowToVote} type="button">
              <span>How to vote</span>
            </button>
          </nav>

          {officialMarksShown ? (
            <div aria-label="Official provincial marks" className="crown-header__marks hero-official-marks hero-official-marks--header" role="group">
              <img
                alt="Negros Oriental Tourism logo"
                className="hero-official-marks__tourism"
                decoding="async"
                height={2048}
                src="/assets/official-marks/negros-oriental-tourism-logo.png"
                width={2048}
              />
              <img
                alt="Province of Negros Oriental official seal"
                className="hero-official-marks__seal"
                decoding="async"
                height={2460}
                src="/assets/official-marks/province-of-negros-oriental-seal-transparent.png"
                width={2480}
              />
            </div>
          ) : null}

          <button
            aria-controls="crown-mobile-nav"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="crown-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            ref={menuButtonRef}
            type="button"
          >
            {menuOpen ? <X aria-hidden="true" size={22} weight="regular" /> : <List aria-hidden="true" size={22} weight="regular" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Shell */}
      {menuOpen ? (
        <div className="crown-mobile-nav-shell" id="crown-mobile-nav">
          <nav aria-label="Mobile navigation" className="crown-mobile-nav" ref={mobileNavRef}>
            <div className="mobile-nav-group-label">Navigation</div>
            <a href="#home" onClick={closeMenu}>
              <strong>Home</strong>
              <ArrowRight aria-hidden="true" size={19} weight="light" />
            </a>
            <button className="mobile-nav-action" onClick={openHowToVote} type="button">
              <strong>How to vote</strong>
              <ArrowRight aria-hidden="true" size={19} weight="light" />
            </button>

            <div className="mobile-nav-group-label" style={{ marginTop: '1.2rem' }}>Programs</div>
            {arenas.map((arena) => (
              <button
                className="mobile-arena-link"
                key={arena.id}
                onClick={() => {
                  closeMenu();
                  openSubpage(arena.id);
                }}
                type="button"
              >
                <strong>{heroArenaLabel(arena)}</strong>
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            ))}

            <button className="crown-button crown-floating-dots-button" onClick={openContestPicker} style={{ marginTop: '1.5rem' }} type="button">
              <span>Choose a contest</span> <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </button>
          </nav>
        </div>
      ) : null}

      {/* CHAPTER 1: FESTIVAL HERO — type framing the WebGL centrepiece */}
      <section className="crown-hero crown-hero--living-green" data-scene-chapter id="home" aria-labelledby="crown-hero-title">
        {/* The wordmark itself lives on the WebGL stage behind this column;
            the spacer reserves its optical footprint so type never collides. */}
        <div className="hero-stage-reserve" data-scene-anchor aria-hidden="true" />

        <div className="hero-lockup">
          {/* The official wordmark on the WebGL stage is the title. This
              carries it for assistive tech and search without repeating it
              on screen — and without promoting any single arena above the
              festival itself. */}
          <h1 className="visually-hidden" id="crown-hero-title">{festival.title}</h1>
          <a
            className="planout-credit"
            data-hero-reveal
            href="https://planout.io"
            rel="noreferrer noopener"
            target="_blank"
          >
            <span>Powered by</span>
            <img alt="planout.io" height={109} src={PLANOUT_HORIZONTAL} width={480} />
          </a>
          <p className="hero-intro" data-hero-reveal>
            Celebrate Buglasan 2026 and the people, places, and traditions of Negros Oriental.
            {/* Not "select a contest below": below is four cards on a desktop
                and a single button on a phone. The sentence has to be true at
                both widths. */}
            <span className="hero-intro__instruction">To vote, choose a contest.</span>
          </p>

          {/* Phone and tablet only. Four plaques do not survive being stacked
              — each one becomes a full screen of scrolling for one name — so
              there the four become one button and a picker. CSS decides which
              affordance shows, not a JS breakpoint, so the two can never both
              be missing. */}
          <div className="hero-actions" data-hero-reveal>
            <button
              className="crown-button crown-floating-dots-button"
              onClick={openContestPicker}
              type="button"
            >
              <span>Choose a contest</span>
              <ArrowRight aria-hidden="true" size={17} weight="bold" />
            </button>
          </div>
        </div>

        {/* Desktop only; see .hero-actions above. The CSS still hides this at
            the same breakpoint — belt and braces, and it covers a resize. */}
        {plaquesShown ? (
        <div className="hero-arena-cards" data-hero-reveal>
          {heroContestArenas.map((arena) => (
            <button
              aria-label={`Open ${heroArenaLabel(arena)} program`}
              className={`hero-arena-card hero-arena-card--${arena.id}`}
              data-vote-cursor
              key={arena.id}
              onClick={() => openSubpage(arena.id)}
              type="button"
            >
              <span className="hero-arena-card__light-leak" aria-hidden="true" />
              <span className="hero-arena-card__ray" aria-hidden="true" />
              <span className="hero-arena-card__outline" aria-hidden="true" />
              <ArchNiche arena={arena} blockClass="hero-arena-card" />
              <span className="hero-arena-card__plate">
                <strong className="hero-arena-card__name">{heroArenaLabel(arena)}</strong>
                <span aria-hidden="true" className="hero-arena-card__rule" />
              </span>
            </button>
          ))}
        </div>
        ) : null}
      </section>

      {showHowToVote && (
        <VoteFlowModal
          arena={defaultGuideArena}
          dispatch={dispatch}
          guideScope="general"
          mode="guide"
          onClose={() => setShowHowToVote(false)}
        />
      )}
      {showContestPicker && (
        <ContestPickerModal arenas={arenas} onClose={() => setShowContestPicker(false)} onSelect={selectContest} />
      )}
      </main>
      )}
    </>
  );
}
