import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { useGSAP } from '@gsap/react';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { CalendarBlank } from '@phosphor-icons/react/dist/icons/CalendarBlank';
import { CheckCircle } from '@phosphor-icons/react/dist/icons/CheckCircle';
import { Heart } from '@phosphor-icons/react/dist/icons/Heart';
import { List } from '@phosphor-icons/react/dist/icons/List';
import { UserCircle } from '@phosphor-icons/react/dist/icons/UserCircle';
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
import { ContestCard } from './ContestCard';
import { ArenaVotingPage } from './ArenaVotingPage';
import { ContestSubpageView } from './ContestSubpageView';
import { VotingOverviewPage } from './VotingOverviewPage';
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
const heroArenaLabel = (arena: ContestArena) => arena.id === 'hara' ? 'Hara sa Negros Oriental' : arena.shortTitle;

const VOTE_STEPS = [
  { title: 'Enter', copy: 'Log in with your email or mobile number.', Icon: UserCircle },
  { title: 'Choose', copy: 'Meet the official candidates and choose your favorite.', Icon: Heart },
  { title: 'Confirm', copy: 'Review your choice before sending today’s verified vote.', Icon: CheckCircle },
  { title: 'Return', copy: 'Come back tomorrow and keep the provincial journey moving.', Icon: CalendarBlank },
] as const;

function SceneFallback({ quiet = false }: { quiet?: boolean }) {
  return (
    <div className={`festival-scene festival-scene--fallback${quiet ? ' is-quiet' : ''}`} data-scene-mode={quiet ? 'quiet' : 'full'}>
      <canvas className="festival-scene__canvas" role="img" aria-label="Crown of Light festival scene" />
      <picture aria-hidden={quiet} className="festival-scene__fallback-logo" data-centerpiece="official-logo">
        <source srcSet={BUGLASAN_HERO_LOGO.src} type="image/png" />
        <img alt="Buglasan Festival 2026" src={BUGLASAN_HERO_LOGO.src} width={BUGLASAN_HERO_LOGO.width} height={BUGLASAN_HERO_LOGO.height} />
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
  const [activeVote, setActiveVote] = useState<ContestArena['id'] | null>(null);
  const [activeOverview, setActiveOverview] = useState(false);

  // Synchronize hash with subpages if present
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const arenaIds = ['hara', 'booths', 'festival', 'gandang'];
      if (hash === 'hara/overview') {
        setActiveOverview(true);
        setActiveSubpage('hara');
        setActiveVote(null);
        window.scrollTo(0, 0);
      } else if (hash.startsWith('vote-') && arenaIds.includes(hash.slice(5))) {
        setActiveOverview(false);
        setActiveVote(hash.slice(5) as ContestArena['id']);
        setActiveSubpage(null);
        window.scrollTo(0, 0);
      } else if (arenaIds.includes(hash)) {
        setActiveOverview(false);
        setActiveSubpage(hash as ContestArena['id']);
        setActiveVote(null);
        window.scrollTo(0, 0);
      } else if (hash === 'festival' || hash === 'contests' || hash === 'candidates' || hash === '') {
        setActiveOverview(false);
        setActiveSubpage(null);
        setActiveVote(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const openSubpage = (id: ContestArena['id']) => {
    setActiveOverview(false);
    setActiveSubpage(id);
    setActiveVote(null);
    window.location.hash = id;
    window.scrollTo(0, 0);
  };

  const openVoting = (id: ContestArena['id']) => {
    setActiveOverview(false);
    setActiveVote(id);
    setActiveSubpage(null);
    window.location.hash = `vote-${id}`;
    window.scrollTo(0, 0);
  };

  const closeSubpage = () => {
    setActiveOverview(false);
    setActiveSubpage(null);
    setActiveVote(null);
    window.location.hash = 'contests';
    window.scrollTo(0, 0);
  };

  const openOverview = () => {
    setActiveOverview(true);
    setActiveSubpage('hara');
    setActiveVote(null);
    window.location.hash = 'hara/overview';
    window.scrollTo(0, 0);
  };

  const closeOverview = () => {
    setActiveOverview(false);
    setActiveSubpage('hara');
    setActiveVote(null);
    window.location.hash = 'hara';
    window.scrollTo(0, 0);
  };

  const goLogin = () => {
    setMenuOpen(false);
    dispatch({ type: 'navigate', view: 'login' });
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
      if (activeSubpage || activeVote || activeOverview) return undefined;
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
    { scope: rootRef, dependencies: [activeOverview, activeSubpage, activeVote] },
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
    if (!root || activeSubpage || activeVote || activeOverview) return undefined;
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
  }, [activeOverview, activeSubpage, activeVote]);

  const closeMenu = () => setMenuOpen(false);

  const scene = (
    <Suspense fallback={<SceneFallback quiet={Boolean(activeOverview || activeSubpage || activeVote)} />}>
      <FestivalScene progressRef={sceneProgressRef} quiet={Boolean(activeOverview || activeSubpage || activeVote)} />
    </Suspense>
  );

  const activeArena = contestArenas.find((a) => a.id === (activeVote ?? activeSubpage ?? (activeOverview ? 'hara' : null))) ?? contestArenas[0];

  return (
    <>
      {scene}
      {activeVote ? (
        <ArenaVotingPage
          arena={activeArena}
          arenas={contestArenas}
          dispatch={dispatch}
          onBack={closeSubpage}
          onSwitchArena={openVoting}
          state={state}
        />
      ) : activeOverview ? (
        <VotingOverviewPage
          arena={activeArena}
          onBackToHara={closeOverview}
          onBackToHub={closeSubpage}
          tallies={state.arenaTallies.hara}
        />
      ) : activeSubpage ? (
        <ContestSubpageView
          arena={activeArena}
          dispatch={dispatch}
          onBackToHub={closeSubpage}
          onOpenOverview={openOverview}
          onSwitchArena={(id) => openSubpage(id)}
          onVote={openVoting}
        />
      ) : (
      <main className="crown-landing" ref={rootRef}>

      {/* Ultra-Premium Glass Floating Header */}
      <header className="crown-header" aria-label="Buglasan Festival header">
        <div className="crown-header__container">
          {/* The WebGL wordmark flies into this slot as the hero scrolls away.
              The DOM mark stays hidden until the flight lands, then takes over
              so it can sit above the opaque chapters the canvas renders behind. */}
          <a
            className="crown-header__brand"
            data-scene-dock
            href="#festival"
            aria-label="Buglasan Festival home"
          >
            <BrandMark compact official />
          </a>

          <nav className="crown-nav" aria-label="Main navigation">
            <a className="crown-nav__link" href="#festival">
              <span>Festival</span>
            </a>
            <a className="crown-nav__link" href="#contests">
              <span>Contests</span>
            </a>
            <a className="crown-nav__link" href="#vote">
              <span>How to vote</span>
            </a>
          </nav>

          <div className="crown-header__actions">
            <button className="crown-header__cta-button crown-floating-dots-button" onClick={goLogin} type="button">
              <span>Vote now</span>
              <ArrowRight aria-hidden="true" size={15} weight="bold" />
            </button>
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
            <a href="#festival" onClick={closeMenu}>
              <strong>Festival</strong>
              <ArrowRight aria-hidden="true" size={19} weight="light" />
            </a>
            <a href="#contests" onClick={closeMenu}>
              <strong>Contests</strong>
              <ArrowRight aria-hidden="true" size={19} weight="light" />
            </a>
            <a href="#vote" onClick={closeMenu}>
              <strong>How to vote</strong>
              <ArrowRight aria-hidden="true" size={19} weight="light" />
            </a>

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

            <button className="crown-button crown-floating-dots-button" onClick={goLogin} style={{ marginTop: '1.5rem' }} type="button">
              <span>Enter the voting room</span> <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </button>
          </nav>
        </div>
      ) : null}

      {/* CHAPTER 1: FESTIVAL HERO — type framing the WebGL centrepiece */}
      <section className="crown-hero crown-hero--living-green" data-scene-chapter id="festival" aria-labelledby="crown-hero-title">
        {/* The wordmark itself lives on the WebGL stage behind this column;
            the spacer reserves its optical footprint so type never collides. */}
        <div className="hero-stage-reserve" data-scene-anchor aria-hidden="true" />

        <div className="hero-lockup">
          {/* The official wordmark on the WebGL stage is the title. This
              carries it for assistive tech and search without repeating it
              on screen — and without promoting any single arena above the
              festival itself. */}
          <h1 className="visually-hidden" id="crown-hero-title">{pageantContent.title}</h1>
          <p className="hero-lede" data-hero-reveal>{pageantContent.heroLede}</p>
          <div className="hero-actions" data-hero-reveal>
            <button className="crown-button crown-floating-dots-button" onClick={goLogin} type="button">
              <span>Enter the voting room</span> <ArrowRight aria-hidden="true" size={17} weight="bold" />
            </button>
            <a className="crown-button crown-button--quiet" href="#contests">
              See the four programs
            </a>
          </div>
        </div>

        {/* Four program cards integrated directly into the hero. */}
        <div className="hero-arena-cards" data-hero-reveal>
          {heroContestArenas.map((arena) => (
            <button
              aria-label={`Open ${heroArenaLabel(arena)} program`}
              className={`hero-arena-card hero-arena-card--${arena.id}`}
              key={arena.id}
              onClick={() => openSubpage(arena.id)}
              type="button"
            >
              <span className="hero-arena-card__light-leak" aria-hidden="true" />
              <span className="hero-arena-card__ray" aria-hidden="true" />
              <span className="hero-arena-card__outline" aria-hidden="true" />
              {arena.logo && (
                <img
                  alt=""
                  aria-hidden="true"
                  className="hero-arena-card__logo"
                  height={96}
                  loading="lazy"
                  src={arena.logo}
                  width={96}
                />
              )}
              <strong className="hero-arena-card__name">{heroArenaLabel(arena)}</strong>
            </button>
          ))}
        </div>
      </section>

      {/* CHAPTER 2: THE 4 CONTEST SCREENS */}
      <section className="contests-chapter" data-scene-chapter id="contests" aria-labelledby="contests-chapter-title">
        <div className="chapter-shell">
          <div className="chapter-heading" data-reveal>
            <h2 id="contests-chapter-title">Four Grand Programs.<br />One Celebrated Province.</h2>
            <p className="chapter-heading__copy">
              Buglasan unites Negros Oriental across four signature programs. Click any screen below to enter its dedicated interactive subpage with pageant rosters, architectural booths, festival contingents, criteria, and voting.
            </p>
          </div>

          <div className="contest-screens-grid">
            {contestArenas.map((arena, index) => (
              <ContestCard
                arena={arena}
                index={index}
                key={arena.id}
                onEnter={(id) => openSubpage(id)}
                onVote={() => openVoting(arena.id)}
              />
            ))}
          </div>

          <div className="contests-footer-callout" data-reveal>
            <div>
              <h3>Ready to explore all candidates and pavilions?</h3>
              <p>Every subpage features complete contestant bios, high-res photos, score criteria, and live leaderboards.</p>
            </div>
            <button
              className="crown-button crown-button--ivory"
              onClick={() => openSubpage('hara')}
              type="button"
            >
              <span>Explore Hara sa Dumaguete</span> <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </div>
      </section>

      {/* CHAPTER 3: VOTING STEPS */}
      <section className="vote-chapter" data-scene-chapter id="vote" aria-labelledby="vote-chapter-title">
        <div className="chapter-shell vote-chapter__layout">
          <div className="chapter-heading" data-reveal>
            <h2 id="vote-chapter-title">One clear choice.<br />Made in four steps.</h2>
            <p className="chapter-heading__copy">The voting room keeps the process focused, reviewable, and easy to repeat each day.</p>
            <button className="crown-button crown-floating-dots-button" onClick={goLogin} type="button">
              <span>Start voting</span> <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </button>
          </div>
          <ol className="vote-sequence" data-reveal>
            {VOTE_STEPS.map(({ title, copy, Icon }, index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <Icon aria-hidden="true" size={25} weight="light" />
                <div><h3>{title}</h3><p>{copy}</p></div>
              </li>
            ))}
          </ol>
        </div>

        <div className="closing-call" data-reveal style={{ marginTop: '5rem' }}>
          <BrandMark compact official />
          <h2>Your vote belongs in the story.</h2>
          <button className="crown-button crown-floating-dots-button" onClick={goLogin} type="button">
            <span>Enter the voting room</span> <ArrowRight aria-hidden="true" size={18} weight="bold" />
          </button>
        </div>
      </section>

      <footer className="crown-footer">
        <span>© 2026 Buglasan Festival</span>
        <span>Province of Negros Oriental</span>
        <span>{pageantContent.footerHashtags}</span>
      </footer>
      </main>
      )}
    </>
  );
}
