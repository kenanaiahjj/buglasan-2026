/**
 * Every environment read the voting stack makes, in one place.
 *
 * `import.meta.env` was being consulted from three call sites across two
 * modules, which is how a deployment ends up with the ballot talking to a
 * server while the standings board is still simulating. One module, one
 * answer, and `isLiveVoting()` is the single question the rest of the code
 * asks.
 *
 * Reads are not memoised on purpose: Vite inlines these at build time, so a
 * read is a constant, and keeping it live is what lets tests stub the env.
 */

/** Base URL of the voting service, or '' while the prototype runs on the demo client. */
export function votingApiBaseUrl(): string {
  return import.meta.env?.VITE_VOTING_API_URL?.trim() ?? '';
}

/**
 * True once a real backend is configured.
 *
 * This is the switch. With it false the app settles orders in memory and the
 * standings board runs its simulation; with it true both read the server.
 */
export function isLiveVoting(): boolean {
  return votingApiBaseUrl() !== '';
}

/**
 * Canonical route for returning from hosted checkout, if the deployment has
 * one. Empty means "send them back where they started".
 *
 * The backend must allowlist whatever it receives before handing it to a
 * payment provider — an arbitrary client-supplied redirect is an open door.
 */
export function votingReturnUrl(): string {
  return import.meta.env?.VITE_VOTING_RETURN_URL?.trim() ?? '';
}
