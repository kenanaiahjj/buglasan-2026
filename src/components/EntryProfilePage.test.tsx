import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { contestArenas } from '../data/pageant';
import { entriesForArena } from '../lib/arenaEntries';
import { EntryProfilePage } from './EntryProfilePage';

const hara = contestArenas.find((arena) => arena.id === 'hara')!;
const festival = contestArenas.find((arena) => arena.id === 'festival')!;

describe('EntryProfilePage', () => {
  it('renders the routed entry identity, category, metadata, and live tally', () => {
    const entry = entriesForArena('festival')[0];
    const html = renderToStaticMarkup(
      <EntryProfilePage
        arena={festival}
        dispatch={() => undefined}
        entry={entry}
        onBackToHome={() => undefined}
        onBackToProgram={() => undefined}
        tally={3192}
      />,
    );

    expect(html).toContain('<h1');
    expect(html).toContain(entry.name);
    expect(html).toContain(entry.origin);
    expect(html).toContain('Festival of Festivals');
    /* The tally is a numeral and a unit in separate elements now, not one
       "3,192 votes" string — it is the only number on the page and is set
       like it. */
    expect(html).toContain('3,192');
    expect(html).toContain('votes so far');
    for (const fact of entry.meta) {
      expect(html).toContain(fact.label);
      expect(html).toContain(fact.value);
    }
    expect(html).toContain(`Vote for ${entry.name}`);
    expect(html).toContain('Share');
    expect(html).toMatch(/<nav[^>]*>[\s\S]*?<button[^>]*><svg[\s\S]*?<span>Back to Festival of Festivals<\/span>/);
  });

  it('renders a recoverable not-found state for an unknown entry', () => {
    const html = renderToStaticMarkup(
      <EntryProfilePage
        arena={hara}
        dispatch={() => undefined}
        entry={null}
        onBackToHome={() => undefined}
        onBackToProgram={() => undefined}
        tally={undefined}
      />,
    );

    expect(html).toContain('Entry not found');
    expect(html).toContain('Back to Hara sa Negros Oriental');
    expect(html).toContain('Home');
  });

  it('opens the existing vote flow with the profile entry selected', async () => {
    const entry = entriesForArena('hara')[0];
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await act(async () => {
        root.render(
          <EntryProfilePage
            arena={hara}
            dispatch={() => undefined}
            entry={entry}
            onBackToHome={() => undefined}
            onBackToProgram={() => undefined}
            tally={entry.votes}
          />,
        );
      });

      const vote = container.querySelector<HTMLButtonElement>('.entry-profile__vote');
      await act(async () => vote?.click());

      const dialog = document.body.querySelector('.vote-flow');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain(entry.name);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  });

  it('announces clipboard sharing and exposes the URL for manual fallback', async () => {
    const entry = entriesForArena('hara')[0];
    const shareEntry = vi.fn().mockResolvedValueOnce('copied').mockResolvedValueOnce('manual');
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await act(async () => {
        root.render(
          <EntryProfilePage
            arena={hara}
            dispatch={() => undefined}
            entry={entry}
            onBackToHome={() => undefined}
            onBackToProgram={() => undefined}
            shareEntry={shareEntry}
            tally={entry.votes}
          />,
        );
      });

      const share = container.querySelector<HTMLButtonElement>('.entry-profile__share');
      await act(async () => share?.click());
      expect(container.querySelector('[role="status"]')?.textContent).toContain('Link copied');

      await act(async () => share?.click());
      expect(container.querySelector<HTMLInputElement>('.entry-profile__share-url')?.readOnly).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  });
});
