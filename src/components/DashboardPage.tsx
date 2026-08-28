import type { Dispatch, ReactNode } from 'react';
import { announcements, candidates, pageantContent } from '../data/pageant';
import type { VoterAction, VoterState } from '../state/voterState';
import { AnnouncementList } from './AnnouncementList';
import { CountdownCard } from './CountdownCard';
import { DashboardNav } from './DashboardNav';
import { Icon } from './Icon';
import { SectionHeading } from './SectionHeading';
import { StatCard } from './StatCard';
import { VotePanel } from './VotePanel';

function titleCaseIdentifier(identifier: string) {
  const firstPart = identifier.split('@')[0].replace(/[._-]/g, ' ').trim();
  return firstPart ? firstPart.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Pageant supporter';
}

function RankingList({ state }: { state: VoterState }) {
  const ranked = [...candidates].sort((left, right) => state.votesByCandidate[right.id] - state.votesByCandidate[left.id]);
  return <div className="ranking-list">{ranked.map((candidate, index) => <div className="ranking-row" key={candidate.id}><span className="ranking-row__rank">{String(index + 1).padStart(2, '0')}</span><span className={`ranking-row__avatar ranking-row__avatar--${candidate.accent}`}><img alt="" src={candidate.image} width={512} height={512} loading="lazy" decoding="async" /></span><span className="ranking-row__name"><strong>{candidate.name}</strong><small>{candidate.location}</small></span><strong className="ranking-row__votes">{state.votesByCandidate[candidate.id].toLocaleString()}</strong></div>)}</div>;
}

function MechanicsPanel() {
  return <div className="panel info-panel"><span className="eyebrow">Voting mechanics</span><h2>One account.<br /><em>One vote per day.</em></h2><p>Every registered supporter gets one vote each day during the online voting period. Choose carefully, confirm your selection, and return tomorrow to keep supporting your candidate.</p><div className="info-list"><span><Icon name="check" size={16} /> Vote from {pageantContent.votingWindow.replace(' — ', ' to ')}</span><span><Icon name="check" size={16} /> Use one email or mobile account</span><span><Icon name="check" size={16} /> Votes close at 11:59 PM each day</span></div></div>;
}

function FaqPanel() {
  const faqs = [['How many votes do I get?', 'One vote per account per day while voting is open.'], ['Can I change my vote?', 'Review your candidate before you confirm. Confirmed votes cannot be changed.'], ['When does voting close?', `Online voting ends on ${pageantContent.votingDeadline}.`]];
  return <div className="panel faq-panel"><span className="eyebrow">Questions, answered</span><h2>Before you <em>vote.</em></h2><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<Icon name="chevron" size={16} /></summary><p>{answer}</p></details>)}</div></div>;
}

export function DashboardPage({ state, dispatch }: { state: VoterState; dispatch: Dispatch<VoterAction> }) {
  const displayName = titleCaseIdentifier(state.identifier);
  const activeSection = state.activeSection;
  const activeLabel = activeSection === 'dashboard' ? 'Your voting room' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1);

  let content: ReactNode;
  if (activeSection === 'vote' || activeSection === 'contestants') content = <VotePanel state={state} dispatch={dispatch} title={activeSection === 'vote' ? 'Choose your candidate' : 'Meet the official candidates'} />;
  else if (activeSection === 'rankings') content = <section className="panel info-panel"><SectionHeading eyebrow="Live snapshot" title="The current ranking" /><RankingList state={state} /></section>;
  else if (activeSection === 'mechanics') content = <MechanicsPanel />;
  else if (activeSection === 'faqs') content = <FaqPanel />;
  else if (activeSection === 'announcements') content = <section className="panel info-panel"><SectionHeading eyebrow="From the festival desk" title="Announcements" /><AnnouncementList announcements={announcements} /></section>;
  else content = <>
    <section className="panel top-contestants" aria-labelledby="top-contestants-title"><SectionHeading eyebrow="People’s choice" title="Top contestants" action="See rankings" onAction={() => dispatch({ type: 'setSection', section: 'rankings' })} /><div className="top-contestants__row">{[...candidates].sort((left, right) => state.votesByCandidate[right.id] - state.votesByCandidate[left.id]).slice(0, 4).map((candidate, index) => <div className="top-contestant" key={candidate.id}><span className="top-contestant__rank">{String(index + 1).padStart(2, '0')}</span><span className={`top-contestant__avatar top-contestant__avatar--${candidate.accent}`}><img alt="" src={candidate.image} width={512} height={512} loading="lazy" decoding="async" /></span><strong>{candidate.name}</strong><small>{state.votesByCandidate[candidate.id].toLocaleString()} votes</small></div>)}</div></section>
    <VotePanel state={state} dispatch={dispatch} />
    <section className="panel dashboard-guide" aria-labelledby="dashboard-guide-title"><SectionHeading eyebrow="A simple ritual" title="How to vote" /><div className="dashboard-guide__steps"><span><b>01</b><Icon name="user" size={17} /> Log in</span><span><b>02</b><Icon name="heart" size={17} /> Choose</span><span><b>03</b><Icon name="check" size={17} /> Confirm</span><span><b>04</b><Icon name="vote" size={17} /> Celebrate</span></div></section>
  </>;

  return (
    <main className="dashboard-page" id="dashboard">
      <div className="dashboard-shell">
        <DashboardNav state={state} dispatch={dispatch} />
        <section className="dashboard-main">
          <header className="dashboard-header">
            <div><span className="eyebrow">{activeLabel}</span><h1>Good evening, <em>{displayName}.</em></h1><p>{state.voteConfirmed ? 'Your voice is part of the story. Thank you for showing up.' : 'The next crown is shaped by supporters like you.'}</p></div>
            <div className="account-chip"><span className="account-chip__avatar">{displayName.slice(0, 2).toUpperCase()}</span><span><strong>{displayName}</strong><small>Voter account</small></span><Icon name="chevron" size={15} /></div>
          </header>
          <div className="stat-grid">
            <StatCard label="Total votes" value={pageantContent.totalVotes.toLocaleString()} detail="across the festival" />
            <StatCard label="Candidates" value={String(candidates.length).padStart(2, '0')} detail="hometowns, one crown" />
            <StatCard label="Voting ends" value="06 · 12 · 45" detail="days · hrs · mins" accent="gold" />
            <StatCard label="Your votes left" value={`${state.votesRemaining} / 1`} detail={state.votesRemaining ? 'make it count today' : 'come back tomorrow'} accent="mint" />
          </div>
          <div className="dashboard-content-grid">
            <div className="dashboard-primary"><div className="dashboard-section-marker"><span>2026 season</span><span>{activeSection === 'dashboard' ? 'Dashboard overview' : activeLabel}</span></div>{content}</div>
            <aside className="dashboard-rail">
              <CountdownCard values={pageantContent.countdown} />
              <section className={`panel vote-summary${state.votesRemaining === 0 ? ' is-complete' : ''}`} aria-label="Your voting summary"><div className="eyebrow"><Icon name="heart" size={15} /> Your voting summary</div><div className="vote-summary__ring"><strong>{state.votesRemaining === 0 ? '1 / 1' : '0 / 1'}</strong><span>VOTES USED</span></div><p>{state.votesRemaining === 0 ? 'You have used your vote for today.' : 'You have one vote ready for today.'}</p><button className="button button--outline button--full" disabled={state.votesRemaining === 0} onClick={() => dispatch({ type: 'setSection', section: 'vote' })} type="button">{state.votesRemaining === 0 ? 'Vote recorded' : 'Vote now'} <Icon name="arrow" size={15} /></button></section>
              <section className="panel dashboard-rail__announcements"><SectionHeading eyebrow="Stay in the loop" title="Announcements" action="View all" onAction={() => dispatch({ type: 'setSection', section: 'announcements' })} /><AnnouncementList announcements={announcements.slice(0, 3)} /></section>
              <div className="dashboard-quote"><Icon name="quote" size={24} /><p>Beauty is more than size — it’s heart, strength, and heritage.</p></div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
