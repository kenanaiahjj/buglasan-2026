import { useState } from 'react';
import type { Dispatch } from 'react';
import { announcements, candidates, pageantContent } from '../data/pageant';
import type { VoterAction } from '../state/voterState';
import { BrandMark } from './BrandMark';
import { CandidateCard } from './CandidateCard';
import { CountdownCard } from './CountdownCard';
import { Icon } from './Icon';
import { SectionHeading } from './SectionHeading';

export function LandingPage({ dispatch }: { dispatch: Dispatch<VoterAction> }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const goLogin = () => {
    setMenuOpen(false);
    dispatch({ type: 'navigate', view: 'login' });
  };

  return (
    <main className="landing-page" id="home">
      <div className="ambient-glow ambient-glow--top" aria-hidden="true" />
      <div className="ambient-glow ambient-glow--side" aria-hidden="true" />

      <header className="site-header page-shell">
        <a href="#home" aria-label="Buglasan Festival home"><BrandMark /></a>
        <nav className={`site-nav${menuOpen ? ' is-open' : ''}`} id="landing-nav" aria-label="Main navigation">
          <a href="#about" onClick={() => setMenuOpen(false)}>The pageant</a>
          <a href="#candidates" onClick={() => setMenuOpen(false)}>Candidates</a>
          <a href="#how-to-vote" onClick={() => setMenuOpen(false)}>How to vote</a>
        </nav>
        <div className="site-header__actions">
          <button className="text-button" onClick={goLogin} type="button">Login</button>
          <button className="button button--outline button--small" onClick={goLogin} type="button">Vote now <Icon name="arrow" size={16} /></button>
        </div>
        <button
          aria-controls="landing-nav"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
        </button>
      </header>

      <section className="hero page-shell" aria-labelledby="hero-title">
        <div className="hero__copy">
          <div className="hero__kicker"><span className="kicker-dot" /> {pageantContent.eventLabel}</div>
          <p className="hero__edition">{pageantContent.edition}</p>
          <h1 id="hero-title">Beauty with <em>purpose.</em><br />A crown with roots.</h1>
          <p className="hero__lede">{pageantContent.tagline} Celebrate the women, stories, and hometown pride that make Negros Oriental shine.</p>
          <div className="hero__actions">
            <button className="button button--primary" onClick={goLogin} type="button">Cast your vote <Icon name="arrow" size={17} /></button>
            <a className="button button--ghost" href="#candidates"><span className="play-icon"><Icon name="play" size={14} /></span> Meet the candidates</a>
          </div>
          <div className="hero__note"><Icon name="ticket" size={16} /> One account · One vote per day</div>
        </div>
        <div className="hero__art" aria-label="Buglasan Festival pageant emblem" role="img">
          <div className="hero__orbit hero__orbit--one" />
          <div className="hero__orbit hero__orbit--two" />
          <div className="hero__medallion">
            <span className="hero__medallion-star">✦</span>
            <span className="hero__medallion-crown">♛</span>
            <span className="hero__medallion-label">BUGLASAN<br /><small>QUEEN SIZE<br />EDITION</small></span>
          </div>
          <span className="hero__art-word hero__art-word--top">HERITAGE</span>
          <span className="hero__art-word hero__art-word--bottom">2026</span>
          <span className="hero__spark hero__spark--one">✦</span>
          <span className="hero__spark hero__spark--two">✧</span>
          <span className="hero__spark hero__spark--three">·</span>
        </div>
      </section>

      <section className="impact-strip page-shell" aria-label="Voting overview">
        <div className="impact-strip__item"><span className="eyebrow">Votes cast</span><strong>{pageantContent.totalVotes.toLocaleString()}</strong><small>as of May 18, 2026</small></div>
        <div className="impact-strip__item"><span className="eyebrow">Official candidates</span><strong>{String(candidates.length).padStart(2, '0')}</strong><small>hometowns, one crown</small></div>
        <CountdownCard values={pageantContent.countdown} />
        <div className="impact-strip__item impact-strip__item--accent"><span className="eyebrow">Your daily vote</span><strong>1 / 1</strong><small>make it count today</small></div>
      </section>

      <section className="content-section page-shell" id="candidates" aria-labelledby="candidates-title">
        <SectionHeading eyebrow="The women carrying their hometowns" title="Meet the Queen Size aspirants" action="View all candidates" actionHref="#candidates" />
        <div className="candidate-grid candidate-grid--landing">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} voteCount={candidate.votes} selected={false} disabled={false} onSelect={goLogin} />
          ))}
        </div>
        <div className="section-footnote"><span /> Your vote helps celebrate confidence, beauty, and the pride of Negros Oriental. <span /></div>
      </section>

      <section className="heritage-section page-shell" id="about" aria-labelledby="heritage-title">
        <div className="heritage-section__seal"><span className="seal-ring">BUGLASAN · 2026 · NEGROS ORIENTAL ·</span><strong>✦</strong><small>THE FESTIVAL<br />OF ISLAND STORIES</small></div>
        <div className="heritage-section__copy">
          <span className="eyebrow">More than a crown</span>
          <h2 id="heritage-title">A pageant shaped by <em>place.</em></h2>
          <p>Gandang Negresense is a celebration of grace with a point of view: the color of our festivals, the warmth of our towns, and the stories carried forward by every woman who steps into the light.</p>
          <a className="text-button" href="#how-to-vote">Discover the story <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="content-section page-shell" id="how-to-vote" aria-labelledby="how-to-vote-title">
        <SectionHeading eyebrow="Your vote. Their journey." title="How to make it count" />
        <div className="voting-steps">
          <article className="voting-step"><span className="voting-step__number">01</span><div className="voting-step__icon"><Icon name="user" size={22} /></div><h3>Log in</h3><p>Use your email or mobile number to enter the voting room.</p></article>
          <article className="voting-step"><span className="voting-step__number">02</span><div className="voting-step__icon"><Icon name="heart" size={22} /></div><h3>Choose</h3><p>Browse the candidates and select the one you believe in.</p></article>
          <article className="voting-step"><span className="voting-step__number">03</span><div className="voting-step__icon"><Icon name="check" size={22} /></div><h3>Confirm</h3><p>Review your choice before sending your one daily vote.</p></article>
          <article className="voting-step"><span className="voting-step__number">04</span><div className="voting-step__icon"><Icon name="vote" size={22} /></div><h3>Celebrate</h3><p>Come back tomorrow and keep their journey moving forward.</p></article>
        </div>
      </section>

      <section className="announcement-section page-shell" aria-labelledby="announcement-title">
        <div className="announcement-section__header"><span className="eyebrow"><Icon name="sparkle" size={14} /> From the festival desk</span><h2 id="announcement-title">What’s happening</h2></div>
        <div className="announcement-preview-list">
          {announcements.map((announcement) => (
            <article className="announcement-preview" key={announcement.title}>
              <span className={`announcement-preview__date announcement-preview__date--${announcement.type}`}>{announcement.date}</span>
              <div><strong>{announcement.title}</strong><p>{announcement.description}</p></div>
              <span className="announcement-preview__arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer page-shell">
        <div><BrandMark /><p>Where every story deserves a spotlight.</p></div>
        <div className="site-footer__center"><span>Presented by</span><strong>Province of Negros Oriental</strong><strong>Buglasan Festival 2026</strong></div>
        <div className="site-footer__social"><span>Follow the journey</span><div><a href="#home" aria-label="Buglasan on Facebook"><Icon name="facebook" size={17} /></a><a href="#home" aria-label="Buglasan on Instagram"><Icon name="instagram" size={17} /></a></div></div>
        <div className="site-footer__bottom"><span>© 2026 Buglasan Festival. All rights reserved.</span><span>{pageantContent.footerHashtags}</span></div>
      </footer>
    </main>
  );
}
