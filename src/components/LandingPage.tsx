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
  contestArenas,
  pageantContent,
  type ContestArena,
} from '../data/pageant';
import type { VoterAction, VoterState } from '../state/voterState';
import { BrandMark } from './BrandMark';
import { ContestSubpageView } from './ContestSubpageView';
import { ContestPickerModal } from './ContestPickerModal';
import { ArchNiche } from './ArchNiche';
import { VoteCursor } from './VoteCursor';
import { VoteFlowModal } from './VoteFlowModal';
import { VotingOverviewPage } from './VotingOverviewPage';
import { arenaDisplayName } from '../lib/arenaEntries';
import { enter } from '../lib/enter';

gsap.registerPlugin(useGSAP);

const FestivalScene = lazy(() =>
  import('./FestivalScene').then(({ FestivalScene: Scene }) => ({ default: Scene })),
);

/** Number of scroll-driven camera stops in the WebGL scene. */
const SCENE_STOPS = 2;

/** Hero-only order; the source arena order remains canonical elsewhere. */
const HERO_ARENA_ORDER = ['hara', 'gandang', 'booths', 'festival'] as const satisfies readonly ContestArena['id'][];
const heroContestArenas = HERO_ARENA_ORDER.map((id) => contestArenas.find((arena) => arena.id === id)!);
const heroArenaLabel = (arena: ContestArena) => arenaDisplayName(arena);
const defaultGuideArena = contestArenas.find((arena) => arena.id === 'hara') ?? contestArenas[0];

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
  const [showHowToVote, setShowHowToVote] = useState(false);
  const [showContestPicker, setShowContestPicker] = useState(false);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

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
      const overviewMatch = hash.match(/^([a-z]+)\/overview$/);
      if (overviewMatch && arenaIds.includes(overviewMatch[1])) {
        const id = overviewMatch[1] as ContestArena['id'];
        setActiveOverview(id);
        setActiveSubpage(id);
        window.scrollTo(0, 0);
      } else if (arenaIds.includes(hash)) {
        setActiveOverview(null);
        setActiveSubpage(hash as ContestArena['id']);
        window.scrollTo(0, 0);
      } else if (hash === 'home' || hash === 'contests') {
        /* The hero's own anchor, and what Home points at. It used to be
           `#festival`, which is also an arena id — the arena test above always
           won, so Home opened the Festival of Festivals page. One string, two
           meanings; the hero got its own name. `#contests` remains a safe
           legacy bookmark and now lands on the hero's four contest cards. */
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
        setActiveOverview(null);
        setActiveSubpage(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const openSubpage = (id: ContestArena['id']) => {
    setActiveOverview(null);
    setActiveSubpage(id);
    window.location.hash = id;
    window.scrollTo(0, 0);
  };

  const closeSubpage = () => {
    setActiveOverview(null);
    setActiveSubpage(null);
    window.location.hash = 'home';
    window.scrollTo(0, 0);
  };

  const openOverview = (id: ContestArena['id']) => {
    setActiveOverview(id);
    setActiveSubpage(id);
    window.location.hash = `${id}/overview`;
    window.scrollTo(0, 0);
  };

  const closeOverview = () => {
    const id = activeOverview ?? 'hara';
    setActiveOverview(null);
    setActiveSubpage(id);
    window.location.hash = id;
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
    { scope: rootRef, dependencies: [activeOverview, activeSubpage] },
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
    if (!root || activeSubpage || activeOverview) return undefined;
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
  }, [activeOverview, activeSubpage]);

  const closeMenu = () => setMenuOpen(false);

  const currentArenaId = activeSubpage ?? activeOverview ?? undefined;

  const scene = (
    <Suspense fallback={<SceneFallback arenaId={currentArenaId} quiet={Boolean(activeOverview || activeSubpage)} />}>
      <FestivalScene
        arenaId={currentArenaId}
        progressRef={sceneProgressRef}
        quiet={Boolean(activeOverview || activeSubpage)}
      />
    </Suspense>
  );

  const activeArena = contestArenas.find((a) => a.id === (activeOverview ?? activeSubpage)) ?? contestArenas[0];

  return (
    <>
      {scene}
      {activeOverview ? (
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
          <a
            className="crown-header__brand"
            data-scene-dock
            href="#home"
            aria-label="Buglasan Festival home"
          >
            <BrandMark compact official />
          </a>

          <nav className="crown-nav" aria-label="Main navigation">
            <a className="crown-nav__link crown-quiet-control" href="#home">
              <span>Home</span>
            </a>
            <button className="crown-nav__link crown-quiet-control" onClick={openHowToVote} type="button">
              <span>How to vote</span>
            </button>
          </nav>

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
            {contestArenas.map((arena) => (
              <button
                className="mobile-arena-link"
                key={arena.id}
                onClick={() => {
                  closeMenu();
                  openSubpage(arena.id);
                }}
                type="button"
              >
                <strong>{arena.shortTitle}</strong>
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
          <h1 className="visually-hidden" id="crown-hero-title">{pageantContent.title}</h1>
          <p className="hero-intro" data-hero-reveal>
            Celebrate Buglasan 2026 and the people, places, and traditions of Negros Oriental.
            {/* Not "select a contest below": below is four cards on a desktop
                and a single button on a phone. The sentence has to be true at
                both widths. */}
            <span>To vote, choose a contest.</span>
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

        {/* Desktop only; see .hero-actions above. */}
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
      </section>

      {showHowToVote && (
        <VoteFlowModal
          arena={defaultGuideArena}
          dispatch={dispatch}
          mode="guide"
          onClose={() => setShowHowToVote(false)}
        />
      )}
      {showContestPicker && (
        <ContestPickerModal arenas={contestArenas} onClose={() => setShowContestPicker(false)} onSelect={selectContest} />
      )}
      </main>
      )}
    </>
  );
}
