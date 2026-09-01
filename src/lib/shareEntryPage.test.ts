import { describe, expect, it, vi } from 'vitest';
import { shareEntryPage } from './shareEntryPage';

const payload = {
  title: 'Sandurot Festival · Festival of Festivals',
  text: 'View Sandurot Festival and vote in Festival of Festivals.',
  url: 'https://example.com/#festival/sd-01',
};

describe('shareEntryPage', () => {
  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const clipboard = { writeText: vi.fn() };

    await expect(shareEntryPage(payload, { share, clipboard })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(payload);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('does not copy when the user cancels native sharing', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    const clipboard = { writeText: vi.fn() };

    await expect(shareEntryPage(payload, { share, clipboard })).resolves.toBe('cancelled');
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copies the URL when native sharing is unavailable', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };

    await expect(shareEntryPage(payload, { clipboard })).resolves.toBe('copied');
    expect(clipboard.writeText).toHaveBeenCalledWith(payload.url);
  });

  it('copies the URL when native sharing fails', async () => {
    const share = vi.fn().mockRejectedValue(new Error('Unavailable'));
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };

    await expect(shareEntryPage(payload, { share, clipboard })).resolves.toBe('copied');
    expect(clipboard.writeText).toHaveBeenCalledWith(payload.url);
  });

  it('requests a manual fallback when sharing and clipboard access fail', async () => {
    const share = vi.fn().mockRejectedValue(new Error('Unavailable'));
    const clipboard = { writeText: vi.fn().mockRejectedValue(new Error('Denied')) };

    await expect(shareEntryPage(payload, { share, clipboard })).resolves.toBe('manual');
  });
});
