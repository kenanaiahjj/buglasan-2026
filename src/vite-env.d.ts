/// <reference types="vite/client" />

/**
 * React's act() environment flag, set by tests that drive the DOM renderer.
 * Without this declaration `tsc -b` fails on every test that assigns it, and
 * that takes `npm run build` down with it.
 *
 * Declared bare rather than inside `declare global`: this file has no imports
 * or exports, so it is a script and already in global scope — `declare global`
 * is only valid inside a module.
 */
declare var IS_REACT_ACT_ENVIRONMENT: boolean;

/**
 * The one switch that points the app at a real backend.
 *
 * Unset, `resolveVotingApi()` hands back the in-memory demo client and the
 * prototype keeps working. Set it and every vote order and tally read goes to
 * that server instead — see VOTING_API.md for the endpoints it must answer.
 */
interface ImportMetaEnv {
  readonly VITE_VOTING_API_URL?: string;
  /** Optional canonical route for hosted checkout returns. */
  readonly VITE_VOTING_RETURN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
