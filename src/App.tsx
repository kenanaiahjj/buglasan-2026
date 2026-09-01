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
import { initialVoterState, voterReducer } from './state/voterState';

export default function App() {
  const [state, dispatch] = useReducer(voterReducer, initialVoterState);
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
