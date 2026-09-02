/**
 * Top of the app: one reducer, three views.
 *
 * `voterState.view` picks between the public landing experience, the login
 * wall and the supporter dashboard. Everything below the landing page —
 * programme pages, the wall board, the vote dialog — is hash-routed inside
 * LandingPage rather than routed here, because there is no router library and
 * the hash is the only address the festival hands out.
 */
import { useEffect, useReducer } from 'react';
import { DashboardPage } from './components/DashboardPage';
import { SiteBoot } from './components/SiteBoot';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { loadContent } from './lib/contentStore';
import { initialVoterState, voterReducer } from './state/voterState';

export default function App() {
  const [state, dispatch] = useReducer(voterReducer, initialVoterState);

  /* The one call that makes VITE_CONTENT_API_URL mean anything. Until it
     lands, every screen renders the bundled roster from `contentStore.ts`;
     after it, the server's. Fired once, above the views, because all three of
     them read the same content and none of them should each fetch it.

     Unconditional, including in demo mode where it resolves off the bundle.
     A prototype that only ever runs the synchronous path is a prototype that
     hides every await-shaped bug until deployment day.

     No AbortController, deliberately. This fills a module-level cache rather
     than this component's state, so there is nothing to leak and nothing to
     cancel: App unmounting means the app is gone. Passing one made it worse —
     StrictMode double-invokes effects in development, the cleanup aborted the
     request the first pass had started, and `loadContent` handed the second
     pass that same rejected promise. Content never loaded in dev, and the
     abort surfaced as an unhandled rejection in the console. */
  useEffect(() => {
    void loadContent();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.view]);

  /* Above the views rather than inside one. The loading screen this replaces
     was mounted inside the WebGL stage and so could only ever cover the part
     of the page the stage occupied. It removes itself once lifted. */
  return (
    <>
      <SiteBoot />
      {state.view === 'login' ? (
        <LoginScreen state={state} dispatch={dispatch} />
      ) : state.view === 'dashboard' ? (
        <DashboardPage state={state} dispatch={dispatch} />
      ) : (
        <LandingPage state={state} dispatch={dispatch} />
      )}
    </>
  );
}
