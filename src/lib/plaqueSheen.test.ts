import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackPlaqueSheen } from './plaqueSheen';

/**
 * The drift is the point of this module and it is the one part a screenshot
 * cannot prove: a still frame of a moving highlight looks exactly like a still
 * frame of a parked one. So the clock and the frame loop are both driven by
 * hand here.
 *
 * Frames must arrive on an advancing clock. Idle frames are rate-limited
 * inside the module, so eighty callbacks all stamped with the same timestamp
 * produce exactly one update, not eighty.
 */

const FRAME = 50;

type Harness = {
  row: HTMLElement;
  cards: HTMLElement[];
  /** Run frames on a 50ms clock up to `to`, and return where the clock got. */
  advance: (from: number, to: number) => number;
  restore: () => void;
};

function harness({ hover = true, reduce = false } = {}): Harness {
  const row = document.createElement('div');
  row.className = 'hero-arena-cards';
  const cards = Array.from({ length: 4 }, () => {
    const card = document.createElement('button');
    card.className = 'hero-arena-card';
    row.append(card);
    return card;
  });
  document.body.append(row);

  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : hover,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

  /* jsdom has no IntersectionObserver, and the module treats a missing one as
     "assume the row is on screen" — which is the path under test. */
  vi.stubGlobal('IntersectionObserver', undefined);

  let pending: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    pending = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    pending = null;
  });

  return {
    row,
    cards,
    advance: (from, to) => {
      let now = from;
      for (; now <= to; now += FRAME) {
        const frame = pending;
        pending = null;
        frame?.(now);
      }
      return now;
    },
    restore: () => {
      row.remove();
      vi.unstubAllGlobals();
    },
  };
}

function box(el: HTMLElement, left: number, top: number, width: number, height: number) {
  el.getBoundingClientRect = () =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;
}

function move(clientX: number, clientY: number) {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }));
}

const sheenX = (card: HTMLElement) => Number.parseFloat(card.style.getPropertyValue('--sheen-x'));
const sheenY = (card: HTMLElement) => Number.parseFloat(card.style.getPropertyValue('--sheen-y'));

afterEach(() => vi.unstubAllGlobals());

describe('plaque sheen', () => {
  it('drifts the light with no pointer anywhere near the row', () => {
    const h = harness();
    const stop = trackPlaqueSheen(h.row);

    /* 3550ms and 10650ms are the crest and the trough of the horizontal
       drift — a quarter and three quarters of its period. */
    h.advance(0, 3550);
    const crest = sheenX(h.cards[0]);
    h.advance(3600, 10650);
    const trough = sheenX(h.cards[0]);

    expect(Number.isNaN(crest)).toBe(false);
    expect(crest - trough).toBeGreaterThan(8);

    stop();
    h.restore();
  });

  it('keeps the four out of lockstep so the row is not one moving sheet', () => {
    const h = harness();
    const stop = trackPlaqueSheen(h.row);

    h.advance(0, 3550);
    const positions = h.cards.map((card) => sheenX(card).toFixed(2));

    expect(new Set(positions).size).toBe(4);

    stop();
    h.restore();
  });

  it('stays on the plaque rather than wandering off it', () => {
    const h = harness();
    const stop = trackPlaqueSheen(h.row);

    let now = 0;
    for (let leg = 0; leg < 40; leg += 1) {
      now = h.advance(now, now + 1000);
      for (const card of h.cards) {
        expect(sheenX(card)).toBeGreaterThan(15);
        expect(sheenX(card)).toBeLessThan(45);
        expect(sheenY(card)).toBeGreaterThan(5);
        expect(sheenY(card)).toBeLessThan(24);
      }
    }

    stop();
    h.restore();
  });

  it('hands the stylesheet its rest values back on teardown', () => {
    const h = harness();
    const stop = trackPlaqueSheen(h.row);

    h.advance(0, 900);
    expect(h.cards[0].style.getPropertyValue('--sheen-x')).not.toBe('');

    stop();
    for (const card of h.cards) {
      expect(card.style.getPropertyValue('--sheen-x')).toBe('');
      expect(card.style.getPropertyValue('--sheen-y')).toBe('');
    }

    h.restore();
  });

  it('hands the light to the pointer once it comes near the row', () => {
    const h = harness();
    /* jsdom lays nothing out, so the boxes are supplied. One row, one card
       200x400 at the origin. */
    box(h.row, 0, 0, 200, 400);
    for (const card of h.cards) box(card, 0, 0, 200, 400);

    const stop = trackPlaqueSheen(h.row);

    let now = h.advance(0, 1200);
    move(150, 300);
    now = h.advance(now, now + 1500);

    // 150/200 and 300/400 of the card's own box.
    expect(sheenX(h.cards[0])).toBeGreaterThan(70);
    expect(sheenY(h.cards[0])).toBeGreaterThan(70);

    stop();
    h.restore();
  });

  it('keeps drifting while the pointer is somewhere else on the page', () => {
    const h = harness();
    box(h.row, 0, 0, 200, 400);
    for (const card of h.cards) box(card, 0, 0, 200, 400);

    const stop = trackPlaqueSheen(h.row);

    // Well past the capture radius: a cursor up in the header is not the
    // thing lighting a plaque at the bottom of the hero.
    move(150, 2000);

    let now = h.advance(0, 3550);
    const crest = sheenX(h.cards[0]);
    now = h.advance(now + FRAME, now + 7100);
    const trough = sheenX(h.cards[0]);

    expect(crest - trough).toBeGreaterThan(8);

    stop();
    h.restore();
  });

  it('never attaches under reduced motion or on a coarse pointer', () => {
    for (const options of [{ reduce: true }, { hover: false }]) {
      const h = harness(options);
      const stop = trackPlaqueSheen(h.row);

      h.advance(0, 2000);
      expect(h.cards[0].style.getPropertyValue('--sheen-x')).toBe('');

      stop();
      h.restore();
    }
  });
});
