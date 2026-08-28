import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react/dist/icons/X';
import type { ContestArena } from '../data/pageant';
import { ARENA_VOTING, arenaDisplayName } from '../lib/arenaEntries';
import { ArchNiche } from './ArchNiche';

/**
 * Choose a contest, on a phone.
 *
 * The plaques are the brand — an arched niche with the programme's mark
 * standing in it — and they are what the desktop hero shows. This used to be a
 * bottom sheet of list rows instead, which had nothing to do with any of that.
 * So it is the same cards, laid out as a scroll-snapping rail: one card at a
 * time, the next one peeking, thumb-driven.
 *
 * The markup deliberately reuses `hero-arena-card`, so the arch, the plate and
 * the gold rule cannot drift away from the hero's version.
 */

type ContestPickerModalProps = {
  arenas: readonly ContestArena[];
  onClose: () => void;
  onSelect: (id: ContestArena['id']) => void;
};

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => node.offsetParent !== null || node === document.activeElement);
}

export function ContestPickerModal({ arenas, onClose, onSelect }: ContestPickerModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const ring = focusables(panel);
      if (ring.length === 0) return;

      const first = ring[0];
      const last = ring[ring.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className="contest-picker"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="contest-picker__panel"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="contest-picker__head">
          <div>
            <h2 className="contest-picker__title" id={titleId}>Choose a contest</h2>
            <p className="contest-picker__lede">Select a program to view its participants and voting details.</p>
          </div>
          <button aria-label="Close" className="contest-picker__close" onClick={onClose} type="button">
            <X aria-hidden="true" size={17} weight="bold" />
          </button>
        </header>

        <div className="contest-picker__rail">
          {arenas.map((arena) => (
            <button
              aria-label={`Open ${arenaDisplayName(arena)}`}
              className={`hero-arena-card hero-arena-card--${arena.id} contest-picker__card`}
              key={arena.id}
              onClick={() => onSelect(arena.id)}
              type="button"
            >
              <span className="hero-arena-card__light-leak" aria-hidden="true" />
              <span className="hero-arena-card__ray" aria-hidden="true" />
              <ArchNiche arena={arena} blockClass="hero-arena-card" />
              <span className="hero-arena-card__plate">
                <strong className="hero-arena-card__name">{arenaDisplayName(arena)}</strong>
                <span aria-hidden="true" className="hero-arena-card__rule" />
                <span className="contest-picker__card-count">
                  {arena.totalEntries} {ARENA_VOTING[arena.id].noun}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
