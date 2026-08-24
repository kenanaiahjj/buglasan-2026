import { useState, type Dispatch, type FormEvent } from 'react';
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
      <div className="auth-page__ornament" aria-hidden="true"><span>✦</span><span>✧</span><span>·</span></div>
      <button className="auth-back" onClick={() => dispatch({ type: 'navigate', view: 'landing' })} type="button">← Back to pageant</button>
      <div className="auth-card panel">
        <BrandMark />
        <span className="eyebrow">Your vote carries the story</span>
        <h1>Welcome back,<br /><em>pageant supporter.</em></h1>
        <p className="lede">Log in to choose your candidate and make today’s vote count.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="identifier">Email or mobile number</label>
          <input
            aria-describedby={state.loginError ? 'login-error' : undefined}
            aria-invalid={state.loginError ? 'true' : undefined}
            autoComplete="username"
            id="identifier"
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com"
            value={identifier}
          />
          <label htmlFor="password">Password</label>
          <input
            aria-describedby={state.loginError ? 'login-error' : undefined}
            aria-invalid={state.loginError ? 'true' : undefined}
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            type="password"
            value={password}
          />
          {state.loginError && <p className="form-error" id="login-error" role="alert">{state.loginError}</p>}
          <label className="checkbox-row" htmlFor="remember-me"><input id="remember-me" type="checkbox" /> <span>Remember me on this device</span></label>
          <button className="button button--primary button--full" type="submit"><Icon name="user" size={17} /> Login to vote</button>
        </form>
        <p className="form-note">Demo mode: use any non-empty email or mobile number and password.</p>
        <button className="text-button text-button--center" type="button">Create an account <span aria-hidden="true">↗</span></button>
      </div>
      <p className="auth-footer-note">Buglasan Festival 2026 · Negros Oriental</p>
    </main>
  );
}
