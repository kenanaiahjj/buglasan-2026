/**
 * A ticking `Date.now()`.
 *
 * Three screens count down to the same deadline — the wall board every
 * second, the dashboard card and its stat tile every half minute — and each
 * had grown, or was about to grow, its own copy of this. One hook, an
 * interval each caller picks.
 *
 * The interval is the *display* granularity, not the precision: a card that
 * shows minutes gains nothing from waking up every second, and on a phone
 * that is a wakeup a minute against the battery for a digit that did not
 * change.
 */
import { useEffect, useState } from 'react';

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
