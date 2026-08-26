import { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { Buildings } from '@phosphor-icons/react/dist/icons/Buildings';
import { Clock } from '@phosphor-icons/react/dist/icons/Clock';
import { Crown } from '@phosphor-icons/react/dist/icons/Crown';
import { Heart } from '@phosphor-icons/react/dist/icons/Heart';
import { Info } from '@phosphor-icons/react/dist/icons/Info';
import { MapPin } from '@phosphor-icons/react/dist/icons/MapPin';
import { Sparkle } from '@phosphor-icons/react/dist/icons/Sparkle';
import { Trophy } from '@phosphor-icons/react/dist/icons/Trophy';
import { UsersThree } from '@phosphor-icons/react/dist/icons/UsersThree';
import { gsap } from 'gsap';
import { enter } from '../lib/enter';
import {
  candidates,
  festivalContingents,
  lguBooths,
  type ContestArena,
} from '../data/pageant';
import type { VoterAction } from '../state/voterState';
import { BrandMark } from './BrandMark';
import { HaraGallery } from './HaraGallery';

type ContestSubpageViewProps = {
  arena: ContestArena;
  onBackToHub: () => void;
  onSwitchArena: (id: ContestArena['id']) => void;
  onVote: (id: ContestArena['id']) => void;
  dispatch: Dispatch<VoterAction>;
};

export function ContestSubpageView({
  arena,
  onBackToHub,
  onSwitchArena,
  onVote,
  dispatch,
}: ContestSubpageViewProps) {
  const [activeTab, setActiveTab] = useState<'entries' | 'criteria' | 'schedule' | 'rankings'>('entries');
  const contentRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const isHara = arena.id === 'hara';

  const goLogin = () => {
    dispatch({ type: 'navigate', view: 'login' });
  };

  /* Anything labelled "vote" goes to the ballot. Sending it to a login wall
     instead is the classic way a voting funnel leaks. */
  const goVote = () => onVote(arena.id);

  // Tab panel entry
  useEffect(() => {
    if (!contentRef.current) return undefined;
    return enter(
      contentRef.current.children,
      { autoAlpha: 0, y: 16, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.05, ease: 'power3.out' },
    );
  }, [activeTab]);

  // Hero entry on program switch
  useEffect(() => {
    if (!heroRef.current) return undefined;
    return enter(
      heroRef.current.querySelectorAll(
        '.subpage-hero__title, .subpage-hero__subtitle, .subpage-hero__desc, .subpage-hero__meta-strip',
      ),
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out' },
    );
  }, [arena.id]);

  // Magnetic button on back button
  const handleBackMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = backBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.28, y: y * 0.28, duration: 0.25, ease: 'power2.out' });
  };

  const handleBackMouseLeave = () => {
    const btn = backBtnRef.current;
    if (!btn) return;
    gsap.to(btn, { x: 0, y: 0, duration: 0.45, ease: 'elastic.out(1.1, 0.4)' });
  };

  if (isHara) {
    return (
      <div className="contest-subpage contest-subpage--hara" id="subpage-hara">
        <HaraGallery
          arena={arena}
          onBackToHub={onBackToHub}
          onVote={onVote}
        />
      </div>
    );
  }

  return (
    <div className={`contest-subpage contest-subpage--${arena.id}`} id={`subpage-${arena.id}`}>
      {/* Top Floating Utility Header */}
      <header className="subpage-header">
        <div className="subpage-header__left">
          <button
            className="subpage-back-btn"
            onClick={onBackToHub}
            onMouseLeave={handleBackMouseLeave}
            onMouseMove={handleBackMouseMove}
            ref={backBtnRef}
            type="button"
            aria-label="Back to main Buglasan festival hub"
          >
            <ArrowLeft aria-hidden="true" size={18} weight="bold" />
            <span>Festival Hub</span>
          </button>
          <span className="subpage-header__divider" aria-hidden="true">/</span>
          <span className="subpage-header__current">{arena.shortTitle}</span>
        </div>

        <div className="subpage-arena-nav" role="tablist" aria-label="Switch Buglasan programs">
          <button
            aria-selected={isHara}
            className={`subpage-arena-tab${isHara ? ' is-active' : ''}`}
            onClick={() => onSwitchArena('hara')}
            type="button"
          >
            <Crown size={15} /> <span>Hara sa Dumaguete</span>
          </button>
          <button
            aria-selected={arena.id === 'booths'}
            className={`subpage-arena-tab${arena.id === 'booths' ? ' is-active' : ''}`}
            onClick={() => onSwitchArena('booths')}
            type="button"
          >
            <Buildings size={15} /> <span>LGU Booths</span>
          </button>
          <button
            aria-selected={arena.id === 'festival'}
            className={`subpage-arena-tab${arena.id === 'festival' ? ' is-active' : ''}`}
            onClick={() => onSwitchArena('festival')}
            type="button"
          >
            <Sparkle size={15} /> <span>Festival of Festivals</span>
          </button>
          <button
            aria-selected={arena.id === 'gandang'}
            className={`subpage-arena-tab${arena.id === 'gandang' ? ' is-active' : ''}`}
            onClick={() => onSwitchArena('gandang')}
            type="button"
          >
            <Trophy size={15} /> <span>Gandang NegOrense</span>
          </button>
        </div>

        <div className="subpage-header__actions">
          <button className="crown-button crown-button--gold crown-button--sm" onClick={goLogin} type="button">
            <span>Voting Room</span>
            <ArrowRight aria-hidden="true" size={14} weight="bold" />
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className={`subpage-hero${arena.logo ? ' subpage-hero--branded' : ''}`} ref={heroRef}>
        <div className="subpage-shell">
          {arena.logo && (
            <img
              alt=""
              aria-hidden="true"
              className="subpage-hero__logo"
              height={220}
              src={arena.logo}
              width={220}
            />
          )}
          <h1 className="subpage-hero__title">
            {arena.title}
          </h1>
          <p className="subpage-hero__subtitle">
            <span>{arena.subtitle}</span> · <em>{arena.tagline}</em>
          </p>
          <p className="subpage-hero__desc">{arena.description}</p>

          <div className="subpage-hero__meta-strip">
            <div className="meta-strip-cell">
              <MapPin size={18} className="meta-strip-icon" />
              <div>
                <small>Venue</small>
                <strong>{arena.venue}</strong>
              </div>
            </div>
            <div className="meta-strip-cell">
              <Clock size={18} className="meta-strip-icon" />
              <div>
                <small>Dates</small>
                <strong>{arena.dateRange}</strong>
              </div>
            </div>
            <div className="meta-strip-cell">
              <UsersThree size={18} className="meta-strip-icon" />
              <div>
                <small>Entries</small>
                <strong>{arena.totalEntries} Contenders</strong>
              </div>
            </div>
            {arena.votesOpen && (
              <div className="meta-strip-cell meta-strip-cell--action">
                <button className="crown-button crown-button--gold" onClick={goVote} type="button">
                  Cast Daily Vote <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Navigation Tabs (Emil Kowalski Animated Sliding Pill) */}
      <nav className="subpage-tabs-bar" aria-label="Contest section tabs">
        <div className="subpage-shell">
          <div className="subpage-tabs-list">
            <button
              aria-selected={activeTab === 'entries'}
              className={`subpage-tab-item${activeTab === 'entries' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('entries')}
              type="button"
            >
              <span>{arena.id === 'booths' ? 'LGU Booth Pavilions' : arena.id === 'festival' ? 'Festival Contingents' : 'Official Candidates'}</span>
              <small>({arena.totalEntries})</small>
            </button>
            <button
              aria-selected={activeTab === 'criteria'}
              className={`subpage-tab-item${activeTab === 'criteria' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('criteria')}
              type="button"
            >
              <span>Judging Criteria & Score Matrix</span>
            </button>
            <button
              aria-selected={activeTab === 'schedule'}
              className={`subpage-tab-item${activeTab === 'schedule' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('schedule')}
              type="button"
            >
              <span>Schedule & Venue Map</span>
            </button>
            {arena.votesOpen && (
              <button
                aria-selected={activeTab === 'rankings'}
                className={`subpage-tab-item${activeTab === 'rankings' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('rankings')}
                type="button"
              >
                <span>Live Public Leaderboard</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Tab Content Section */}
      <main className="subpage-content">
        <div className="subpage-shell" ref={contentRef}>
          {/* TAB 1: ENTRIES */}
          {activeTab === 'entries' && (
            <div className="subpage-entries-tab">
              {arena.id === 'gandang' && (
                <div className="subpage-grid subpage-grid--candidates">
                  {candidates.map((candidate) => (
                    <article className="subpage-candidate-card" key={candidate.id}>
                      <div className="subpage-candidate-card__media">
                        <img
                          alt={`${candidate.name} representing ${candidate.location}`}
                          decoding="async"
                          height={512}
                          loading="lazy"
                          src={candidate.image}
                          width={512}
                        />
                        <span className="candidate-card-badge">Candidate {candidate.number}</span>
                        <div className="candidate-card-overlay">
                          <span className="candidate-town">
                            <MapPin size={13} weight="fill" /> {candidate.location}
                          </span>
                          <h3 className="candidate-name">{candidate.name}</h3>
                        </div>
                      </div>
                      <div className="subpage-candidate-card__body">
                        {candidate.advocacy && (
                          <p className="candidate-advocacy">
                            <strong>Advocacy:</strong> {candidate.advocacy}
                          </p>
                        )}
                        {candidate.talent && (
                          <p className="candidate-talent">
                            <strong>Talent:</strong> {candidate.talent}
                          </p>
                        )}
                        <div className="candidate-footer-row">
                          <span className="candidate-vote-tally">
                            <Heart size={14} weight="fill" /> {candidate.votes.toLocaleString()} votes
                          </span>
                          <button className="subpage-vote-btn" onClick={goVote} type="button">
                            Vote for {candidate.name.split(' ')[0]} <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {arena.id === 'booths' && (
                <div className="subpage-grid subpage-grid--booths">
                  {lguBooths.map((booth) => (
                    <article className="subpage-booth-card" key={booth.id}>
                      <div className="subpage-booth-card__header">
                        <div className="booth-number-tag">Pavilion {booth.number}</div>
                        <span className="booth-district-tag">{booth.district}</span>
                      </div>
                      <h3 className="booth-municipality">{booth.municipality}</h3>
                      <p className="booth-tagline">“{booth.tagline}”</p>
                      <p className="booth-theme"><strong>Architectural Theme:</strong> {booth.theme}</p>

                      <div className="booth-materials">
                        <small>Native Materials Used:</small>
                        <div className="tags-cluster">
                          {booth.materials.map((mat) => (
                            <span className="tag-pill" key={mat}>{mat}</span>
                          ))}
                        </div>
                      </div>

                      <div className="booth-products">
                        <small>Signature Agri-Trade Delicacies:</small>
                        <div className="tags-cluster tags-cluster--gold">
                          {booth.signatureProducts.map((prod) => (
                            <span className="tag-pill tag-pill--gold" key={prod}>{prod}</span>
                          ))}
                        </div>
                      </div>

                      <p className="booth-highlights">{booth.highlights}</p>

                      <div className="booth-card-footer">
                        <span className="booth-votes">
                          <Heart size={14} weight="fill" /> {booth.votes.toLocaleString()} visitors voted
                        </span>
                        <button className="subpage-vote-btn" onClick={goVote} type="button">
                          Vote This Pavilion <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {arena.id === 'festival' && (
                <div className="subpage-grid subpage-grid--contingents">
                  {festivalContingents.map((contingent) => (
                    <article className="subpage-contingent-card" key={contingent.id}>
                      <div className="contingent-header">
                        <div>
                          <span className="contingent-town-badge"><MapPin size={12} weight="fill" /> {contingent.municipality}</span>
                          <h3 className="contingent-title">{contingent.festivalName}</h3>
                        </div>
                        <span className="contingent-performers">
                          <UsersThree size={16} /> {contingent.performersCount} Dancers
                        </span>
                      </div>
                      <p className="contingent-theme"><strong>Theme:</strong> {contingent.theme}</p>
                      <p className="contingent-storyline">{contingent.storyline}</p>
                      <div className="contingent-details">
                        <div>
                          <small>Costumes & Regalia:</small>
                          <p>{contingent.costumeHighlights}</p>
                        </div>
                        <div>
                          <small>Presentation Slot:</small>
                          <strong className="contingent-slot">{contingent.performanceTime}</strong>
                        </div>
                      </div>
                      <div className="contingent-footer">
                        <span className="contingent-votes">
                          <Sparkle size={14} weight="fill" /> {contingent.votes.toLocaleString()} fan cheers
                        </span>
                        <button className="subpage-vote-btn" onClick={goVote} type="button">
                          Cheer Contingent <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: CRITERIA */}
          {activeTab === 'criteria' && (
            <div className="subpage-criteria-tab">
              <div className="criteria-intro">
                <Info size={28} className="criteria-intro__icon" />
                <div>
                  <h3>Official Board of Judges Scoring Guidelines</h3>
                  <p>
                    All scores are tabulated and verified by an independent audit committee and the Provincial Tourism Board of Negros Oriental.
                  </p>
                </div>
              </div>

              <div className="criteria-matrix">
                {arena.criteria.map((item, index) => (
                  <div className="criteria-card" key={item.name}>
                    <div className="criteria-card__header">
                      <span className="criteria-num">0{index + 1}</span>
                      <span className="criteria-percent">{item.percentage}%</span>
                    </div>
                    <h4 className="criteria-name">{item.name}</h4>
                    <p className="criteria-desc">{item.description}</p>
                    <div className="criteria-bar-track">
                      <div className="criteria-bar-fill" style={{ width: `${item.percentage * 2}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="subpage-schedule-tab">
              <div className="schedule-hero-card">
                <h3>{arena.title} · Event Schedule & Logistics</h3>
                <p>Location: <strong>{arena.venue}</strong></p>
                <p>Dates: <strong>{arena.dateRange}</strong></p>
                <div className="schedule-guidelines">
                  <h4>Visitor & Spectator Guidelines</h4>
                  <ul>
                    <li>Gates open 2 hours prior to scheduled performance time.</li>
                    <li>Eco-friendly waste segregation is strictly enforced throughout the venue.</li>
                    <li>Official online voting checkpoints available on-site with complimentary Wi-Fi.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RANKINGS */}
          {activeTab === 'rankings' && arena.votesOpen && (
            <div className="subpage-rankings-tab">
              <div className="rankings-header">
                <Trophy size={32} className="rankings-trophy-icon" />
                <div>
                  <h3>People’s Choice Live Public Leaderboard</h3>
                  <p>Real-time online votes cast by verified citizens and global festival supporters.</p>
                </div>
              </div>

              <div className="rankings-table">
                {arena.id === 'gandang' &&
                  [...candidates]
                    .sort((a, b) => b.votes - a.votes)
                    .map((candidate, rank) => (
                      <div className={`ranking-item ranking-item--rank-${rank + 1}`} key={candidate.id}>
                        <span className="ranking-pos">#{rank + 1}</span>
                        <img alt="" className="ranking-thumb" src={candidate.image} width={512} height={512} loading="lazy" decoding="async" />
                        <div className="ranking-details">
                          <strong>{candidate.name}</strong>
                          <small><MapPin size={12} weight="fill" /> {candidate.location}</small>
                        </div>
                        <div className="ranking-score">
                          <strong>{candidate.votes.toLocaleString()}</strong>
                          <small>total votes</small>
                        </div>
                      </div>
                    ))}

                {arena.id === 'booths' &&
                  [...lguBooths]
                    .sort((a, b) => b.votes - a.votes)
                    .map((booth, rank) => (
                      <div className={`ranking-item ranking-item--rank-${rank + 1}`} key={booth.id}>
                        <span className="ranking-pos">#{rank + 1}</span>
                        <div className="ranking-details">
                          <strong>{booth.municipality}</strong>
                          <small>{booth.theme}</small>
                        </div>
                        <div className="ranking-score">
                          <strong>{booth.votes.toLocaleString()}</strong>
                          <small>visitor votes</small>
                        </div>
                      </div>
                    ))}

                {arena.id === 'festival' &&
                  [...festivalContingents]
                    .sort((a, b) => b.votes - a.votes)
                    .map((contingent, rank) => (
                      <div className={`ranking-item ranking-item--rank-${rank + 1}`} key={contingent.id}>
                        <span className="ranking-pos">#{rank + 1}</span>
                        <div className="ranking-details">
                          <strong>{contingent.festivalName}</strong>
                          <small>{contingent.municipality}</small>
                        </div>
                        <div className="ranking-score">
                          <strong>{contingent.votes.toLocaleString()}</strong>
                          <small>fan cheers</small>
                        </div>
                      </div>
                    ))}
              </div>

              <div className="rankings-cta">
                <p>Support your hometown and make today’s daily vote count.</p>
                <button className="crown-button crown-button--gold" onClick={goVote} type="button">
                  Login & Cast Your Vote <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Subpage Footer */}
      <footer className="subpage-footer">
        <div className="subpage-shell">
          <div className="subpage-footer__inner">
            <BrandMark official />
            <p>Buglasan Festival 2026 · Province of Negros Oriental · The Festival of Festivals</p>
            <button className="subpage-back-link" onClick={onBackToHub} type="button">
              <span>Back to All Programs</span> <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
