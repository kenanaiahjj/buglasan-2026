export type ShareEntryPayload = {
  title: string;
  text: string;
  url: string;
};

export type ShareEntryOutcome = 'shared' | 'copied' | 'manual' | 'cancelled';

export type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export async function shareEntryPage(
  payload: ShareEntryPayload,
  navigatorLike: ShareNavigator = navigator,
): Promise<ShareEntryOutcome> {
  if (navigatorLike.share) {
    try {
      await navigatorLike.share(payload);
      return 'shared';
    } catch (error) {
      if ((error as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
    }
  }

  if (!navigatorLike.clipboard) return 'manual';

  try {
    await navigatorLike.clipboard.writeText(payload.url);
    return 'copied';
  } catch {
    return 'manual';
  }
}
