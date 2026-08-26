import { useState, type Dispatch } from 'react';
import type { VoterAction, VoterState } from '../state/voterState';
import { BrandMark } from './BrandMark';
import { Icon, type IconName } from './Icon';

const items: Array<[VoterState['activeSection'], string, IconName]> = [
  ['dashboard', 'Dashboard', 'sparkle'],
  ['vote', 'Vote', 'heart'],
  ['contestants', 'Contestants', 'users'],
  ['rankings', 'Rankings', 'vote'],
  ['mechanics', 'Mechanics', 'check'],
  ['faqs', 'FAQs', 'sparkle'],
  ['announcements', 'Announcements', 'calendar'],
];

export function DashboardNav({ state, dispatch }: { state: VoterState; dispatch: Dispatch<VoterAction> }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectSection = (section: VoterState['activeSection']) => {
    dispatch({ type: 'setSection', section });
    setMobileOpen(false);
  };

  return (
    <>
      <div className="mobile-bar">
        <BrandMark compact official />
        <button aria-controls="dashboard-navigation" aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Close dashboard menu' : 'Open dashboard menu'} className="menu-button" onClick={() => setMobileOpen((open) => !open)} type="button"><Icon name={mobileOpen ? 'x' : 'menu'} size={22} /></button>
      </div>
      <aside className={`dashboard-nav${mobileOpen ? ' is-open' : ''}`} id="dashboard-navigation">
        <button aria-label="Return to the pageant landing page" className="dashboard-nav__brand" onClick={() => dispatch({ type: 'navigate', view: 'landing' })} type="button"><BrandMark compact official /></button>
        <nav aria-label="Voter dashboard navigation">
          <span className="dashboard-nav__label">Your voting room</span>
          {items.map(([section, label, icon]) => (
            <button aria-current={state.activeSection === section ? 'page' : undefined} className={`dashboard-nav__item${state.activeSection === section ? ' is-active' : ''}`} key={section} onClick={() => selectSection(section)} type="button"><Icon name={icon} size={17} /><span>{label}</span></button>
          ))}
        </nav>
        <div className="dashboard-nav__footer">
          <div className="dashboard-nav__quote"><span>One vote.<br /><em>One chance.</em></span><strong>Make it count.</strong></div>
          <span className="dashboard-nav__follow">Follow the journey</span>
          <div className="dashboard-nav__social"><a href="#dashboard" aria-label="Buglasan on Facebook"><Icon name="facebook" size={15} /></a><a href="#dashboard" aria-label="Buglasan on Instagram"><Icon name="instagram" size={15} /></a></div>
          <small>#BuglasanFestival2026</small>
        </div>
      </aside>
    </>
  );
}
