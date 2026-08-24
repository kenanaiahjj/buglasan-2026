export type IconName =
  | 'arrow'
  | 'calendar'
  | 'check'
  | 'chevron'
  | 'facebook'
  | 'heart'
  | 'instagram'
  | 'menu'
  | 'play'
  | 'quote'
  | 'sparkle'
  | 'ticket'
  | 'user'
  | 'users'
  | 'vote'
  | 'x';

const paths: Record<IconName, string> = {
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  calendar: 'M5 4h14v16H5zM8 2v4m8-4v4M8 10h8M8 14h5',
  check: 'm5 12 4 4L19 6',
  chevron: 'm7 10 5 5 5-5',
  facebook: 'M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v5h3v-5h2.5l.5-3H13V9c0-.6.4-1 1-1Z',
  heart: 'M20 8.8c0 5.4-8 10.2-8 10.2S4 14.2 4 8.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8 2.8Z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-.5h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  play: 'm9 6 8 6-8 6V6Z',
  quote: 'M6 18H3v-5c0-3.9 2.1-6.3 6-7v2.1c-1.7.6-2.7 1.6-3 3H9v6H6Zm9 0h-3v-5c0-3.9 2.1-6.3 6-7v2.1c-1.7.6-2.7 1.6-3 3h3v6h-3Z',
  sparkle: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  ticket: 'M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Zm6 0v12',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0',
  users: 'M16 20a5 5 0 0 0-10 0m5-8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm4-6a3 3 0 0 1 0 6m1 8a4.5 4.5 0 0 0-2-3.7',
  vote: 'M4 17.5 13.5 8l3 3L7 20H4v-2.5Zm10-10 2-2 3 3-2 2',
  x: 'm6 6 12 12M18 6 6 18',
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
