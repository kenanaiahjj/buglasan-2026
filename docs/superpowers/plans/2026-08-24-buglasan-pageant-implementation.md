# Buglasan pageant voting experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive Buglasan Festival 2026 pageant prototype with a public landing page, demo login, voter dashboard, candidate selection, vote confirmation, and daily vote state.

**Architecture:** Create a small Vite + React + TypeScript app from the empty repository. Keep pageant copy and candidate data in a data module, keep vote/login state in a reducer, and render the landing, login, and dashboard views from a single app shell without adding a router dependency. Use focused components and one responsive CSS system to reproduce the forest-green and antique-gold editorial direction from the approved design spec.

**Tech Stack:** Vite, React, TypeScript, Vitest, CSS, inline SVG icons, and browser verification through the local app.

## Global Constraints

- Use the title **Buglasan Festival 2026 — Gandang Negresense Queen Size Edition** throughout the initial prototype.
- Keep the first pass front-end only; do not add authentication, API, database, payment, or real vote submission.
- Keep candidate names, counts, dates, announcements, tagline, hashtags, and partner labels in editable local data.
- Use forest green, emerald panels, antique gold, warm ivory text, and lime/mint only for selected or confirmed vote feedback.
- Keep the landing page, login screen, and voter dashboard linked by working UI actions.
- Represent signed-out, login-error, selected-candidate, confirmed-vote, no-votes-remaining, active-section, and mobile-navigation states explicitly.
- Avoid external image dependencies; use replaceable CSS portrait tiles with initials and data-driven candidate identity until real candidate assets are supplied.
- Verify desktop and narrow mobile viewports for horizontal overflow and browser-console errors.

---

### Task 1: Scaffold the React app and define the pageant state contract

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/data/pageant.ts`
- Create: `src/state/voterState.ts`
- Create: `src/state/voterState.test.ts`

**Interfaces:**
- `src/data/pageant.ts` exports `Candidate`, `Announcement`, `pageantContent`, and `candidates`.
- `src/state/voterState.ts` exports `View`, `VoterState`, `VoterAction`, `initialVoterState`, and `voterReducer`.
- Later components consume the state contract instead of mutating candidate data directly.

- [ ] **Step 1: Create the package and Vite configuration**

Create `package.json` with the scripts and dependencies used by every later task:

```json
{
  "name": "buglasan-pageant",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "vitest": "latest",
    "jsdom": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest"
  }
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

Create `tsconfig.json` and `tsconfig.node.json` with strict TypeScript settings:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.app.json` because the build command references it:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `index.html` with an accessible document title and root element:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#052c20" />
    <title>Buglasan Festival 2026 | Gandang Negresense</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write the failing reducer tests**

Create `src/state/voterState.test.ts` with tests that describe the required state transitions before the reducer exists:

```ts
import { describe, expect, it } from 'vitest';
import { initialVoterState, voterReducer } from './voterState';

describe('voterReducer', () => {
  it('moves from landing to login', () => {
    expect(voterReducer(initialVoterState, { type: 'navigate', view: 'login' }).view).toBe('login');
  });

  it('rejects an empty login submission', () => {
    const next = voterReducer(initialVoterState, { type: 'login', identifier: '', password: '' });
    expect(next.loginError).toBe('Enter your email or mobile number and password.');
    expect(next.isAuthenticated).toBe(false);
  });

  it('authenticates a non-empty demo login', () => {
    const next = voterReducer(initialVoterState, { type: 'login', identifier: 'juan@example.com', password: 'secret' });
    expect(next.isAuthenticated).toBe(true);
    expect(next.view).toBe('dashboard');
    expect(next.loginError).toBe('');
  });

  it('selects and confirms one candidate vote', () => {
    const loggedIn = voterReducer(initialVoterState, { type: 'login', identifier: 'juan@example.com', password: 'secret' });
    const selected = voterReducer(loggedIn, { type: 'selectCandidate', candidateId: 'c-02' });
    const confirmed = voterReducer(selected, { type: 'confirmVote' });

    expect(confirmed.selectedCandidateId).toBe('c-02');
    expect(confirmed.voteConfirmed).toBe(true);
    expect(confirmed.votesRemaining).toBe(0);
    expect(confirmed.votesByCandidate['c-02']).toBe(1981);
  });

  it('does not confirm a second vote after the daily vote is used', () => {
    const loggedIn = voterReducer(initialVoterState, { type: 'login', identifier: 'juan@example.com', password: 'secret' });
    const selected = voterReducer(loggedIn, { type: 'selectCandidate', candidateId: 'c-02' });
    const confirmed = voterReducer(selected, { type: 'confirmVote' });
    const secondSelection = voterReducer(confirmed, { type: 'selectCandidate', candidateId: 'c-03' });
    const secondConfirmation = voterReducer(secondSelection, { type: 'confirmVote' });

    expect(secondConfirmation.votesByCandidate['c-03']).toBe(1102);
    expect(secondConfirmation.votesRemaining).toBe(0);
  });
});
```

- [ ] **Step 3: Run the reducer test to confirm it fails**

Run:

```bash
npm install
npm test -- src/state/voterState.test.ts
```

Expected result: FAIL because `src/state/voterState.ts` does not exist yet.

- [ ] **Step 4: Implement pageant data and the reducer**

Create `src/data/pageant.ts`:

```ts
export type Candidate = {
  id: string;
  number: string;
  name: string;
  location: string;
  votes: number;
  initials: string;
  accent: string;
};

export type Announcement = {
  date: string;
  title: string;
  description: string;
  type: 'live' | 'event' | 'notice';
};

export const pageantContent = {
  title: 'Buglasan Festival 2026',
  edition: 'Gandang Negresense Queen Size Edition',
  tagline: 'Support your favorite candidate.',
  heroTitle: 'Beauty with purpose.\nA crown with roots.',
  eventLabel: 'Online voting is open',
  votingWindow: 'May 20, 2026 — June 10, 2026',
  countdown: { days: '06', hours: '12', minutes: '45' },
  totalVotes: 12846,
  footerHashtags: '#BuglasanFestival2026 #GandangNegresense',
};

export const candidates: Candidate[] = [
  { id: 'c-01', number: '01', name: 'Maria Angela', location: 'Ayungon', votes: 1245, initials: 'MA', accent: 'rose' },
  { id: 'c-02', number: '02', name: 'Jessa Mae', location: 'Dumaguete City', votes: 1980, initials: 'JM', accent: 'teal' },
  { id: 'c-03', number: '03', name: 'Charmine', location: 'Tanjay City', votes: 1102, initials: 'C', accent: 'amber' },
  { id: 'c-04', number: '04', name: 'Shaira', location: 'Bayawan City', votes: 967, initials: 'S', accent: 'gold' },
  { id: 'c-05', number: '05', name: 'Nicole', location: 'Guihulngan City', votes: 834, initials: 'N', accent: 'plum' },
  { id: 'c-06', number: '06', name: 'Joanne', location: 'Bais City', votes: 732, initials: 'J', accent: 'mint' },
];

export const announcements: Announcement[] = [
  { date: 'MAY 18', title: 'Online voting is now open', description: 'Vote daily for your favorite candidate.', type: 'live' },
  { date: 'MAY 15', title: 'Meet the official candidates', description: 'Get to know the women carrying their hometowns.', type: 'event' },
  { date: 'JUN 10', title: 'Pageant night', description: 'Silliman University Gym · 7:00 PM', type: 'notice' },
];
```

Create `src/state/voterState.ts`:

```ts
import { candidates } from '../data/pageant';

export type View = 'landing' | 'login' | 'dashboard';

export type VoterState = {
  view: View;
  isAuthenticated: boolean;
  identifier: string;
  loginError: string;
  selectedCandidateId: string | null;
  voteConfirmed: boolean;
  votesRemaining: number;
  votesByCandidate: Record<string, number>;
  activeSection: 'dashboard' | 'vote' | 'contestants' | 'rankings' | 'mechanics' | 'faqs' | 'announcements';
};

export type VoterAction =
  | { type: 'navigate'; view: View }
  | { type: 'login'; identifier: string; password: string }
  | { type: 'selectCandidate'; candidateId: string }
  | { type: 'confirmVote' }
  | { type: 'setSection'; section: VoterState['activeSection'] };

export const initialVoterState: VoterState = {
  view: 'landing',
  isAuthenticated: false,
  identifier: '',
  loginError: '',
  selectedCandidateId: null,
  voteConfirmed: false,
  votesRemaining: 1,
  votesByCandidate: Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate.votes])),
  activeSection: 'dashboard',
};

export function voterReducer(state: VoterState, action: VoterAction): VoterState {
  switch (action.type) {
    case 'navigate':
      return { ...state, view: action.view, loginError: '' };
    case 'login':
      if (!action.identifier.trim() || !action.password.trim()) {
        return { ...state, loginError: 'Enter your email or mobile number and password.' };
      }
      return { ...state, view: 'dashboard', isAuthenticated: true, identifier: action.identifier, loginError: '' };
    case 'selectCandidate':
      if (state.voteConfirmed || state.votesRemaining === 0) return state;
      return { ...state, selectedCandidateId: action.candidateId };
    case 'confirmVote': {
      if (state.voteConfirmed || state.votesRemaining === 0 || !state.selectedCandidateId) return state;
      return {
        ...state,
        voteConfirmed: true,
        votesRemaining: 0,
        votesByCandidate: {
          ...state.votesByCandidate,
          [state.selectedCandidateId]: state.votesByCandidate[state.selectedCandidateId] + 1,
        },
      };
    }
    case 'setSection':
      return { ...state, activeSection: action.section };
  }
}
```

- [ ] **Step 5: Run the reducer tests to confirm they pass**

Run:

```bash
npm test -- src/state/voterState.test.ts
```

Expected result: all five reducer tests pass.

- [ ] **Step 6: Add the minimal app entry point**

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create a temporary `src/App.tsx` so the scaffold builds while later tasks add the real shell:

```tsx
export default function App() {
  return <main>Buglasan Festival 2026</main>;
}
```

Create an empty `src/styles.css` and run:

```bash
npm run build
```

Expected result: the Vite build completes successfully.

- [ ] **Step 7: Commit the state contract**

Run:

```bash
git add package.json package-lock.json index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts src/main.tsx src/data/pageant.ts src/state/voterState.ts src/state/voterState.test.ts src/App.tsx src/styles.css
git -c user.name='Codex' -c user.email='codex@local' commit -m "feat: scaffold Buglasan voting prototype"
```

### Task 2: Build the public landing page and reusable visual primitives

**Files:**
- Create: `src/components/Icon.tsx`
- Create: `src/components/BrandMark.tsx`
- Create: `src/components/CandidateCard.tsx`
- Create: `src/components/CountdownCard.tsx`
- Create: `src/components/SectionHeading.tsx`
- Create: `src/components/LandingPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `LandingPage` receives `state: VoterState` and `dispatch: Dispatch<VoterAction>`.
- `CandidateCard` receives `candidate: Candidate`, `voteCount: number`, `selected: boolean`, `disabled: boolean`, and `onSelect: () => void`.
- `Icon` receives a constrained icon name and renders inline SVG with `aria-hidden="true"`.

- [ ] **Step 1: Define the icon and brand primitives**

Create `src/components/Icon.tsx` with a small inline SVG set for navigation and actions:

```tsx
type IconName = 'arrow' | 'calendar' | 'check' | 'chevron' | 'heart' | 'menu' | 'sparkle' | 'user' | 'users' | 'vote';

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, string> = {
    arrow: 'M4 12h15m-6-6 6 6-6 6',
    calendar: 'M5 4h14v16H5zM8 2v4m8-4v4M8 10h8M8 14h5',
    check: 'm5 12 4 4L19 6',
    chevron: 'm7 10 5 5 5-5',
    heart: 'M20 8.8c0 5.4-8 10.2-8 10.2S4 14.2 4 8.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8 2.8Z',
    menu: 'M4 7h16M4 12h16M4 17h16',
    sparkle: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0',
    users: 'M16 20a5 5 0 0 0-10 0m5-8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm4-6a3 3 0 0 1 0 6m1 8a4.5 4.5 0 0 0-2-3.7',
    vote: 'M4 17.5 13.5 8l3 3L7 20H4v-2.5Zm10-10 2-2 3 3-2 2',
  };
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
```

Create `src/components/BrandMark.tsx`:

```tsx
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark${compact ? ' brand-mark--compact' : ''}`}>
      <span className="brand-mark__crest">✦</span>
      <span><strong>BUGLASAN</strong><small>{compact ? '2026' : 'Gandang Negresense · 2026'}</small></span>
    </div>
  );
}
```

- [ ] **Step 2: Implement candidate and countdown cards**

Create `src/components/CandidateCard.tsx`:

```tsx
import type { Candidate } from '../data/pageant';
import { Icon } from './Icon';

type CandidateCardProps = {
  candidate: Candidate;
  voteCount: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

export function CandidateCard({ candidate, voteCount, selected, disabled, onSelect }: CandidateCardProps) {
  return (
    <button className={`candidate-card candidate-card--${candidate.accent}${selected ? ' is-selected' : ''}`} disabled={disabled} onClick={onSelect} type="button">
      <span className="candidate-card__number">{candidate.number}</span>
      <span className="candidate-card__portrait"><span>{candidate.initials}</span></span>
      <span className="candidate-card__copy"><small>{candidate.location}</small><strong>{candidate.name}</strong><span><Icon name="heart" size={13} /> {voteCount.toLocaleString()} votes</span></span>
      <span className="candidate-card__action">{selected ? 'Selected' : 'Vote'} <Icon name={selected ? 'check' : 'heart'} size={16} /></span>
    </button>
  );
}
```

Create `src/components/CountdownCard.tsx`:

```tsx
import { Icon } from './Icon';

export function CountdownCard({ values }: { values: { days: string; hours: string; minutes: string } }) {
  return (
    <div className="countdown-card">
      <div className="eyebrow"><Icon name="calendar" size={16} /> Voting ends in</div>
      <div className="countdown-card__values"><strong>{values.days}</strong><span>days</span><strong>{values.hours}</strong><span>hrs</span><strong>{values.minutes}</strong><span>mins</span></div>
      <p>June 10, 2026 · 11:59 PM</p>
    </div>
  );
}
```

Create `src/components/SectionHeading.tsx`:

```tsx
export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: string }) {
  return <div className="section-heading">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{action && <button className="text-button" type="button">{action} <span>↗</span></button>}</div>;
}
```

- [ ] **Step 3: Compose the landing page**

Create `src/components/LandingPage.tsx` with a header, hero, stats, candidate grid, voting guide, and announcements. Wire every `Vote now` or candidate action to `dispatch({ type: 'navigate', view: 'login' })` so the public page leads into the voter flow.

The component must expose these semantic labels:

```tsx
<button type="button">Vote now</button>
<a href="#candidates">Meet the candidates</a>
<section aria-labelledby="candidates-title">...</section>
<section aria-labelledby="how-to-vote-title">...</section>
```

Use `pageantContent`, `candidates`, and `announcements` from `src/data/pageant.ts`. Render the first six candidates in a responsive grid and show the first three announcements in the landing announcement block.

- [ ] **Step 4: Replace the temporary App with the landing view**

Update `src/App.tsx` to initialize the reducer and render the landing page:

```tsx
import { useReducer } from 'react';
import { LandingPage } from './components/LandingPage';
import { initialVoterState, voterReducer } from './state/voterState';

export default function App() {
  const [state, dispatch] = useReducer(voterReducer, initialVoterState);
  return <LandingPage state={state} dispatch={dispatch} />;
}
```

- [ ] **Step 5: Add the initial visual tokens and landing layout CSS**

Start `src/styles.css` with these tokens and layout rules, then extend them as later tasks add classes:

```css
:root {
  color: #f8f1dc;
  background: #041e16;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-synthesis: none;
  --ink: #f8f1dc;
  --ink-muted: #b5c4b6;
  --green-950: #031b13;
  --green-900: #052c20;
  --green-800: #0b432f;
  --green-700: #14563a;
  --gold: #e7b85f;
  --gold-soft: #b9914e;
  --mint: #a7e879;
  --line: rgba(230, 188, 105, 0.27);
  --panel: rgba(9, 56, 38, 0.76);
  --radius-lg: 28px;
  --radius-md: 18px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; background: var(--green-950); }
button, input { font: inherit; }
button { cursor: pointer; }
a { color: inherit; text-decoration: none; }
```

Add a `body::before` radial glow, a `.page-shell` max-width, `.panel`, `.button`, `.eyebrow`, `.brand-mark`, `.hero`, `.candidate-grid`, `.candidate-card`, `.voting-steps`, and `.announcement-list` layout. Use CSS background gradients for the pageant glow and portrait tiles so no external image request is required.

- [ ] **Step 6: Build and smoke-test the landing page**

Run:

```bash
npm run build
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173` and confirm the page has a visible hero, candidate cards, voting guide, and clickable `Vote now` actions before continuing.

- [ ] **Step 7: Commit the landing surface**

Run:

```bash
git add src/App.tsx src/components src/styles.css
git -c user.name='Codex' -c user.email='codex@local' commit -m "feat: add Buglasan landing page"
```

### Task 3: Add login, dashboard, and simulated vote confirmation

**Files:**
- Create: `src/components/LoginScreen.tsx`
- Create: `src/components/DashboardNav.tsx`
- Create: `src/components/StatCard.tsx`
- Create: `src/components/AnnouncementList.tsx`
- Create: `src/components/VotePanel.tsx`
- Create: `src/components/DashboardPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `LoginScreen` receives `state: VoterState` and `dispatch: Dispatch<VoterAction>`.
- `DashboardPage` receives `state: VoterState` and `dispatch: Dispatch<VoterAction>`.
- `VotePanel` reads `selectedCandidateId`, `voteConfirmed`, `votesRemaining`, and `votesByCandidate` and dispatches `selectCandidate` or `confirmVote`.
- Dashboard nav dispatches `setSection` and visibly marks the active item.

- [ ] **Step 1: Implement the login screen**

Create `src/components/LoginScreen.tsx` with controlled identifier/password fields and a submit handler:

```tsx
import { FormEvent, useState } from 'react';
import type { Dispatch } from 'react';
import type { VoterAction, VoterState } from '../state/voterState';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';

export function LoginScreen({ state, dispatch }: { state: VoterState; dispatch: Dispatch<VoterAction> }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch({ type: 'login', identifier, password });
  };

  return (
    <main className="auth-page">
      <a className="auth-back" href="#home" onClick={() => dispatch({ type: 'navigate', view: 'landing' })}>← Back to pageant</a>
      <div className="auth-card panel">
        <BrandMark />
        <span className="eyebrow">Your vote carries the story</span>
        <h1>Welcome back,<br /><em>pageant supporter.</em></h1>
        <p className="lede">Log in to choose your candidate and make today’s vote count.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="identifier">Email or mobile number</label>
          <input id="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="you@example.com" autoComplete="username" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" />
          {state.loginError && <p className="form-error" role="alert">{state.loginError}</p>}
          <label className="checkbox-row"><input type="checkbox" /> <span>Remember me on this device</span></label>
          <button className="button button--primary button--full" type="submit"><Icon name="user" size={17} /> Login to vote</button>
        </form>
        <p className="form-note">Demo mode: use any non-empty email or mobile number and password.</p>
        <button className="text-button text-button--center" type="button">Create an account <span>↗</span></button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build the dashboard shell and navigation**

Create `src/components/DashboardNav.tsx` with the seven sections from the spec. Each button must dispatch `setSection`, and the mobile menu must expose `aria-expanded` and `aria-controls`.

Use this nav item contract:

```tsx
const items = [
  ['dashboard', 'Dashboard', 'sparkle'],
  ['vote', 'Vote', 'heart'],
  ['contestants', 'Contestants', 'users'],
  ['rankings', 'Rankings', 'vote'],
  ['mechanics', 'Mechanics', 'check'],
  ['faqs', 'FAQs', 'sparkle'],
  ['announcements', 'Announcements', 'calendar'],
] as const;
```

Create `src/components/StatCard.tsx`:

```tsx
export function StatCard({ label, value, detail, accent = '' }: { label: string; value: string; detail: string; accent?: string }) {
  return <div className={`stat-card${accent ? ` stat-card--${accent}` : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
```

- [ ] **Step 3: Implement the announcement list and vote panel**

Create `src/components/AnnouncementList.tsx` to render each `Announcement` with its date badge, title, description, and type label.

Create `src/components/VotePanel.tsx` with this behavior:

```tsx
const canVote = state.isAuthenticated && !state.voteConfirmed && state.votesRemaining > 0;
const selected = candidates.find((candidate) => candidate.id === state.selectedCandidateId);

if (state.voteConfirmed && selected) {
  return <div className="vote-confirmed" role="status"><span className="success-mark">✓</span><strong>Your vote is in.</strong><p>You voted for {selected.name} of {selected.location}. Come back tomorrow for another vote.</p></div>;
}

return <section aria-labelledby="vote-title">
  <SectionHeading eyebrow="Make it count" title="Choose your candidate" />
  <div className="candidate-grid">{candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} voteCount={state.votesByCandidate[candidate.id]} selected={candidate.id === state.selectedCandidateId} disabled={!canVote} onSelect={() => dispatch({ type: 'selectCandidate', candidateId: candidate.id })} />)}</div>
  <button className="button button--primary button--full" disabled={!state.selectedCandidateId || !canVote} onClick={() => dispatch({ type: 'confirmVote' })} type="button">{state.selectedCandidateId ? 'Confirm my vote' : 'Select a candidate first'} <Icon name="arrow" size={17} /></button>
</section>;
```

When the voter has no votes remaining, render a neutral message with the `0 votes left today` status and keep the candidate cards visible but disabled.

- [ ] **Step 4: Compose the dashboard**

Create `src/components/DashboardPage.tsx` with:

- A top mobile bar with the brand and menu control.
- Desktop navigation rail.
- Welcome heading that uses the identifier from state.
- Stat cards for total votes, candidates, voting deadline, and votes remaining.
- A top-contestants strip sorted by `votesByCandidate` descending.
- The `VotePanel` as the primary main-column section.
- A `CountdownCard`, `AnnouncementList`, and pageant quote in the status rail.
- Active-section labels from `state.activeSection` for `Vote`, `Contestants`, `Rankings`, `Mechanics`, `FAQs`, and `Announcements`. These can render the same dashboard content with a compact section-specific heading; they must not become dead links.

- [ ] **Step 5: Wire App view switching and authentication**

Update `src/App.tsx`:

```tsx
import { useReducer } from 'react';
import { DashboardPage } from './components/DashboardPage';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { initialVoterState, voterReducer } from './state/voterState';

export default function App() {
  const [state, dispatch] = useReducer(voterReducer, initialVoterState);
  if (state.view === 'login') return <LoginScreen state={state} dispatch={dispatch} />;
  if (state.view === 'dashboard') return <DashboardPage state={state} dispatch={dispatch} />;
  return <LandingPage state={state} dispatch={dispatch} />;
}
```

- [ ] **Step 6: Add dashboard and auth CSS**

Extend `src/styles.css` with `.auth-page`, `.auth-card`, `.dashboard-shell`, `.dashboard-nav`, `.dashboard-main`, `.dashboard-rail`, `.stat-grid`, `.vote-panel`, `.vote-confirmed`, `.success-mark`, `.mobile-bar`, `.menu-button`, `.section-heading`, `.text-button`, `.form-error`, and the disabled/selected card states.

Use these state rules as the minimum contract:

```css
.candidate-card.is-selected { border-color: var(--mint); box-shadow: 0 0 0 1px var(--mint), 0 16px 30px rgba(167, 232, 121, .12); }
.candidate-card:disabled { cursor: not-allowed; opacity: .72; }
.button:disabled { cursor: not-allowed; opacity: .45; }
.form-error { color: #ffd08a; margin: .7rem 0 0; }
.vote-confirmed { border: 1px solid rgba(167, 232, 121, .44); background: rgba(82, 152, 84, .15); padding: 1.2rem; border-radius: var(--radius-md); }
```

- [ ] **Step 7: Run the reducer tests and production build**

Run:

```bash
npm test
npm run build
```

Expected result: the reducer tests pass and the production build completes without TypeScript errors.

- [ ] **Step 8: Commit the signed-in flow**

Run:

```bash
git add src/App.tsx src/components src/styles.css
git -c user.name='Codex' -c user.email='codex@local' commit -m "feat: add voter login and dashboard flow"
```

### Task 4: Finish responsive polish, accessibility, and browser verification

**Files:**
- Modify: `src/styles.css`
- Modify: `index.html`
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/LoginScreen.tsx`
- Modify: `src/components/DashboardNav.tsx`
- Modify: `src/components/DashboardPage.tsx`
- Modify: `src/components/CandidateCard.tsx`

**Interfaces:**
- Preserve the reducer and component props from Tasks 1–3.
- Do not add new product scope; this task only hardens the approved surfaces.

- [ ] **Step 1: Add responsive breakpoints and overflow protection**

Add mobile rules at `max-width: 980px` and `max-width: 680px`:

```css
@media (max-width: 980px) {
  .dashboard-shell { grid-template-columns: 1fr; }
  .dashboard-nav { display: none; }
  .dashboard-rail { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mobile-bar { display: flex; }
  .hero { grid-template-columns: 1fr; }
}

@media (max-width: 680px) {
  body { overflow-x: hidden; }
  .page-shell, .dashboard-main, .dashboard-rail, .auth-page { padding-left: 1rem; padding-right: 1rem; }
  .hero h1 { font-size: clamp(3.2rem, 15vw, 5rem); }
  .candidate-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dashboard-rail { grid-template-columns: 1fr; }
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .button--full { width: 100%; }
}
```

Ensure long titles, candidate names, and stat values wrap or truncate without increasing the viewport width.

- [ ] **Step 2: Harden keyboard and screen-reader behavior**

Verify that:

- All interactive controls are real `button` or `a` elements.
- Candidate cards expose their selected state with `aria-pressed`.
- The mobile menu exposes `aria-expanded` and a stable `aria-controls` target.
- Login errors use `role="alert"` and vote confirmations use `role="status"`.
- Inputs have explicit labels and autocomplete hints.
- Decorative SVGs remain `aria-hidden`.
- Gold, mint, and ornament never serve as the only indicator of selection or success.

- [ ] **Step 3: Run final automated checks**

Run:

```bash
npm test
npm run build
git diff --check HEAD~3..HEAD
```

Expected result: all tests pass, the build succeeds, and Git reports no whitespace errors.

- [ ] **Step 4: Verify the main browser journey**

Start the app:

```bash
npm run dev -- --host 127.0.0.1
```

Use the browser verification workflow at `http://127.0.0.1:5173`:

1. Confirm the landing page hero, candidate grid, voting guide, and announcement block render.
2. Select `Vote now` and confirm the login screen appears.
3. Submit the empty login form and confirm the inline error appears.
4. Enter `juan@example.com` and `secret`, then confirm the dashboard appears.
5. Select candidate `02` and confirm the active card and `Confirm my vote` action appear.
6. Confirm the vote and verify the success state, `0` votes remaining, and candidate 02 count changing from `1,980` to `1,981`.
7. Attempt to select another candidate and confirm a second vote cannot be submitted.
8. Resize to a narrow mobile viewport and confirm there is no horizontal scrollbar, the menu control is usable, and primary actions remain visible.
9. Inspect the browser console and confirm there are no errors.

- [ ] **Step 5: Commit the verified polish**

Run:

```bash
git add index.html src/components src/styles.css
git -c user.name='Codex' -c user.email='codex@local' commit -m "chore: polish responsive pageant experience"
```

## Self-review checklist

- The plan covers the public landing page, login, dashboard, candidate selection, vote confirmation, announcements, rankings snapshot, mechanics/FAQ navigation, responsive behavior, and verification from the approved spec.
- The reducer contract is defined before any component consumes it.
- The plan contains no unresolved `TBD`, `TODO`, or implementation placeholders.
- Candidate counts and the c-02 confirmation expectation are consistent between the sample data, reducer test, and browser verification steps.
- Every task has explicit files, interfaces, commands, expected results, and a commit boundary.
