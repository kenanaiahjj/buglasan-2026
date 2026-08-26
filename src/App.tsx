import { useEffect, useReducer } from 'react';
import { DashboardPage } from './components/DashboardPage';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { initialVoterState, voterReducer } from './state/voterState';

export default function App() {
  const [state, dispatch] = useReducer(voterReducer, initialVoterState);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.view]);

  if (state.view === 'login') return <LoginScreen state={state} dispatch={dispatch} />;
  if (state.view === 'dashboard') return <DashboardPage state={state} dispatch={dispatch} />;
  return <LandingPage state={state} dispatch={dispatch} />;
}
