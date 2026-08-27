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
