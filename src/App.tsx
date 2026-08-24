import { useReducer } from 'react';
import { DashboardPage } from './components/DashboardPage';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { initialVoterState, voterReducer } from './state/voterState';

export default function App() {
  const [state, dispatch] = useReducer(voterReducer, initialVoterState);
  if (state.view === 'login') return <LoginScreen state={state} dispatch={dispatch} />;
  if (state.view === 'dashboard') return <DashboardPage state={state} dispatch={dispatch} />;
  return <LandingPage dispatch={dispatch} />;
}
