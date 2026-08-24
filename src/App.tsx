import { useReducer } from 'react';
import { LandingPage } from './components/LandingPage';
import { initialVoterState, voterReducer } from './state/voterState';

export default function App() {
  const [, dispatch] = useReducer(voterReducer, initialVoterState);
  return <LandingPage dispatch={dispatch} />;
}
