export type Candidate = {
  id: string;
  number: string;
  name: string;
  location: string;
  votes: number;
  initials: string;
  accent: string;
};

export type Announcement = {
  date: string;
  title: string;
  description: string;
  type: 'live' | 'event' | 'notice';
};

export const pageantContent = {
  title: 'Buglasan Festival 2026',
  edition: 'Gandang Negresense Queen Size Edition',
  tagline: 'Support your favorite candidate.',
  heroTitle: 'Beauty with purpose.\nA crown with roots.',
  eventLabel: 'Online voting is open',
  votingWindow: 'May 20, 2026 — June 10, 2026',
  countdown: { days: '06', hours: '12', minutes: '45' },
  totalVotes: 12846,
  footerHashtags: '#BuglasanFestival2026 #GandangNegresense',
};

export const candidates: Candidate[] = [
  { id: 'c-01', number: '01', name: 'Maria Angela', location: 'Ayungon', votes: 1245, initials: 'MA', accent: 'rose' },
  { id: 'c-02', number: '02', name: 'Jessa Mae', location: 'Dumaguete City', votes: 1980, initials: 'JM', accent: 'teal' },
  { id: 'c-03', number: '03', name: 'Charmine', location: 'Tanjay City', votes: 1102, initials: 'C', accent: 'amber' },
  { id: 'c-04', number: '04', name: 'Shaira', location: 'Bayawan City', votes: 967, initials: 'S', accent: 'gold' },
  { id: 'c-05', number: '05', name: 'Nicole', location: 'Guihulngan City', votes: 834, initials: 'N', accent: 'plum' },
  { id: 'c-06', number: '06', name: 'Joanne', location: 'Bais City', votes: 732, initials: 'J', accent: 'mint' },
];

export const announcements: Announcement[] = [
  { date: 'MAY 18', title: 'Online voting is now open', description: 'Vote daily for your favorite candidate.', type: 'live' },
  { date: 'MAY 15', title: 'Meet the official candidates', description: 'Get to know the women carrying their hometowns.', type: 'event' },
  { date: 'JUN 10', title: 'Pageant night', description: 'Silliman University Gym · 7:00 PM', type: 'notice' },
];
