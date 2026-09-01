export type Candidate = {
  id: string;
  number: string;
  /** Given names. `surname` is separate so compact places can show one and
   *  the profile page can show both. */
  name: string;
  /**
   * PLACEHOLDER SURNAMES. Every one of these is invented — the roster here is
   * demo data (the same six people appear in both Hara and Gandang, on reused
   * portraits), and they are common Filipino surnames chosen so that none of
   * them reads as a particular family. Replace the whole set when the official
   * roster lands; do not treat any of them as a real contestant's name.
   */
  surname?: string;
  location: string;
  votes: number;
  initials: string;
  accent: string;
  image: string;
  advocacy?: string;
  height?: string;
  talent?: string;
};

export type LguBooth = {
  id: string;
  number: string;
  municipality: string;
  district: '1st District' | '2nd District' | '3rd District';
  theme: string;
  materials: string[];
  signatureProducts: string[];
  votes: number;
  highlights: string;
  image: string;
  /** Local stand-in shown if the remote reference photo cannot be loaded. */
  fallbackImage?: string;
  tagline: string;
};

export type FestivalContingent = {
  id: string;
  festivalName: string;
  municipality: string;
  theme: string;
  performersCount: number;
  leadChoreographer: string;
  storyline: string;
  costumeHighlights: string;
  votes: number;
  performanceTime: string;
  image: string;
  /** Local stand-in shown if the remote reference photo cannot be loaded. */
  fallbackImage?: string;
};

export type ContestArena = {
  id: 'hara' | 'booths' | 'festival' | 'gandang';
  title: string;
  shortTitle: string;
  subtitle: string;
  tagline: string;
  icon: string;
  badge: string;
  /** Temporary supplied stand-in; replace this path when the official mark arrives. */
  logo?: string;
  venue: string;
  dateRange: string;
  totalEntries: number;
  votesOpen: boolean;
  accentColor: string;
  description: string;
  criteria: Array<{ name: string; percentage: number; description: string }>;
};

/**
 * The hero wordmark.
 *
 * `src` is the full 3198x1681 original, kept as the last resort for browsers
 * without WebP. It is never what a phone should download: decoded it costs
 * about 21 MB of RAM, it is the first thing fetched on the boot screen, and it
 * renders at `min(54vw, 760px)`. `srcSet` is what the browser actually picks
 * from — `npm run art:logos` regenerates the variants.
 */
export const BUGLASAN_HERO_LOGO = {
  src: '/assets/buglasan-hero-2026-official.png',
  srcSet: [
    '/assets/buglasan-hero-2026-official-640.webp 640w',
    '/assets/buglasan-hero-2026-official-960.webp 960w',
    '/assets/buglasan-hero-2026-official-1440.webp 1440w',
  ].join(', '),
  /** Matches `width: min(54vw, 760px)` on both places it is drawn. */
  sizes: '(min-width: 1408px) 760px, 54vw',
  width: 3198,
  height: 1681,
} as const;

export type Announcement = {
  date: string;
  title: string;
  description: string;
  type: 'live' | 'event' | 'notice';
};

export const pageantContent = {
  title: 'Buglasan Festival 2026',
  edition: 'Gandang NegOrense Queen Size Edition',
  tagline: 'Support your favorite candidate.',
  heroTitle: 'Beauty with purpose.\nA crown with roots.',
  heroDateline: 'Online voting open · Negros Oriental · 2026',
  eventLabel: 'Official online voting is open',
  votingWindow: 'October 1, 2026 — October 24, 2026',
  votingDeadline: 'October 24, 2026 · 11:59 PM PHT',
  /* The machine-readable twin of votingDeadline, in Philippine time. The
     overview board counts down against this; when it passes, the board
     switches itself to final standings. Move both lines together. */
  votingDeadlineISO: '2026-10-24T23:59:00+08:00',
  /* A frozen countdown from before votingDeadlineISO existed. The standings
     board already computes the real one with countdownFrom(); the dashboard
     card still prints this. See VOTING_API.md. */
  countdown: { days: '06', hours: '12', minutes: '45' },
  /* Hardcoded, and rendered on the dashboard as if it were live. Should be a
     sum of the live tallies once a server owns them — see VOTING_API.md,
     "Numbers the server should own". */
  totalVotes: 12846,
  footerHashtags: '#BuglasanFestival2026 #FestivalOfFestivals #GandangNegOrense #DumagueteCity',
};

/**
 * Every city and municipality of Negros Oriental, alphabetically.
 *
 * The vote flow asks where a supporter is from, and a free-text box there is
 * worthless: "Dgte", "dumaguete city" and "DUMAGUETE" are three rows in any
 * report built on it. Six cities and nineteen municipalities — the twenty-five
 * town festivals the hero copy is counting.
 */
export const NEGROS_ORIENTAL_LGUS = [
  'Amlan',
  'Ayungon',
  'Bacong',
  'Bais City',
  'Basay',
  'Bayawan City',
  'Bindoy',
  'Canlaon City',
  'Dauin',
  'Dumaguete City',
  'Guihulngan City',
  'Jimalalud',
  'La Libertad',
  'Mabinay',
  'Manjuyod',
  'Pamplona',
  'San Jose',
  'Santa Catalina',
  'Siaton',
  'Sibulan',
  'Tanjay City',
  'Tayasan',
  'Valencia',
  'Vallehermoso',
  'Zamboanguita',
] as const;

/* Supporters abroad and from other provinces vote too, and dropping them into
   a Negros Oriental town would quietly corrupt the same report. */
export const OUTSIDE_PROVINCE = 'Outside Negros Oriental';

export const contestArenas: ContestArena[] = [
  {
    id: 'hara',
    title: 'Hara sa Dumaguete',
    shortTitle: 'Hara sa Dumaguete',
    subtitle: 'The Premier Festival Queen Pageant',
    tagline: 'Grace, Conviction, and Provincial Sovereignty.',
    icon: 'crown',
    badge: 'Flagship Pageant',
    // Temporary supplied placeholder until the official Hara logo arrives.
    logo: '/assets/program-logos/hara-sa-negros-oriental-2026-transparent.png',
    venue: 'Silliman University Gym & L.F. Macias Sports Complex',
    dateRange: 'October 1 – 24, 2026',
    totalEntries: 22,
    votesOpen: true,
    accentColor: '#f7d377',
    description:
      'The crown of Negros Oriental unites extraordinary women carrying the culture, advocacies, and heritage of their hometowns to the grand coronation stage.',
    criteria: [
      { name: 'Beauty of Face & Poise', percentage: 30, description: 'Elegance, stage projection, charisma, and festival presence.' },
      { name: 'Advocacy & Intelligence', percentage: 25, description: 'Clarity of vision, cultural depth, and question & answer acumen.' },
      { name: 'Festival Costume & Theme', percentage: 25, description: 'Indigenous textile representation and town symbolism.' },
      { name: 'People’s Choice Online Votes', percentage: 20, description: 'Verified daily public votes from citizens and global supporters.' },
    ],
  },
  {
    id: 'booths',
    title: 'LGU Booth Contest',
    shortTitle: 'LGU Booth Contest',
    subtitle: 'Freedom Park Architectural Expo',
    tagline: 'Indigenous Ingenuity & Municipal Harvest.',
    icon: 'buildings',
    badge: 'Architectural Expo',
    venue: 'Freedom Park Provincial Capitol Grounds',
    dateRange: 'October 3 – 24, 2026',
    totalEntries: 23,
    votesOpen: true,
    accentColor: '#c084fc',
    description:
      'Freedom Park transforms into a living architectural wonderland as 23 LGUs craft breathtaking multi-story pavilions from bamboo, nipa, hardwood, and abaca, showcasing local delicacies, organic produce, and craft exports.',
    criteria: [
      { name: 'Indigenous Architecture & Design', percentage: 35, description: 'Use of natural native materials, structural creativity, and cultural motifs.' },
      { name: 'Agri-Tourism & Trade Showcase', percentage: 30, description: 'Diversity and presentation of local agricultural goods, handicrafts, and tourism offerings.' },
      { name: 'Hospitality & Presentation', percentage: 20, description: 'Interactive exhibits, visitor experience, and cultural storytelling.' },
      { name: 'Public Choice Votes', percentage: 15, description: 'Live visitor ratings and official online votes.' },
    ],
  },
  {
    id: 'festival',
    title: 'Festival of Festivals',
    shortTitle: 'Festival of Festivals',
    subtitle: 'Province-Wide Cultural Showdown',
    tagline: 'Many hometowns. One provincial story.',
    icon: 'sparkle',
    badge: 'Province-Wide Showdown',
    // The 2026 emblem: three figures under the guiding star, inside a
    // rainbow ring. Supplied at 2048px square and resized to 512 — decoded,
    // the original cost 16MB of RAM for a mark drawn at ~216px at its
    // largest, on the subpage hero.
    logo: '/assets/program-logos/festival-of-festivals-2026.webp',
    venue: 'Dumaguete City Streets & Lamberto Macias Sports Complex',
    dateRange: 'October 20 – 21, 2026',
    totalEntries: 10,
    votesOpen: true,
    accentColor: '#f97316',
    description:
      'The province’s festival contingents converge in Dumaguete to present the stories, symbols, and traditions that make each hometown distinct.',
    criteria: [
      { name: 'Choreography & Synchronicity', percentage: 35, description: 'Originality of movements, formation transitions, and energy pacing.' },
      { name: 'Cultural Story & Folklore', percentage: 30, description: 'Authentic depiction of municipal history, legends, and festival traditions.' },
      { name: 'Costume, Props & Visual Impact', percentage: 20, description: 'Color harmony, sustainable materials, and prop theatrics.' },
      { name: 'Presentation & Audience Impact', percentage: 15, description: 'Performer presence, crowd connection, and overall clarity of the presentation.' },
    ],
  },
  {
    id: 'gandang',
    title: 'Gandang NegOrense',
    shortTitle: 'Gandang NegOrense',
    subtitle: 'The Queen Size Pageant',
    tagline: 'Beauty, identity, and provincial pride.',
    icon: 'trophy',
    badge: 'Queen Size Pageant',
    // Temporary supplied placeholder until the official Gandang NegOrense logo arrives.
    logo: '/assets/program-logos/gandang-negorense-queen-size.webp',
    venue: 'Official venue to be announced',
    dateRange: 'Official schedule to be announced',
    totalEntries: 16,
    votesOpen: true,
    accentColor: '#38bdf8',
    description:
      'A pageant celebrating the people, confidence, identity, and hometown stories carried by the next Gandang NegOrense titleholder.',
    criteria: [
      { name: 'Presence & Poise', percentage: 30, description: 'Confidence, stage presence, and composure throughout the program.' },
      { name: 'Advocacy & Intelligence', percentage: 25, description: 'Clarity of purpose, cultural understanding, and thoughtful answers.' },
      { name: 'Identity & Expression', percentage: 25, description: 'Authentic self-expression and connection to Negros Oriental.' },
      { name: 'People’s Choice Online Votes', percentage: 20, description: 'Verified daily public votes from citizens and supporters.' },
    ],
  },
];

export const candidates: Candidate[] = [
  {
    id: 'c-01',
    number: '01',
    name: 'Maria Angela',
    surname: 'Santos',
    location: 'Ayungon',
    votes: 1245,
    initials: 'MA',
    accent: 'rose',
    image: '/assets/candidates/candidate-01.webp',
    advocacy: 'Coastal Mangrove Conservation & Youth Eco-Tourism',
    height: "5'8\"",
    talent: 'Contemporary Dance with Native Bamboo Flute',
  },
  {
    id: 'c-02',
    number: '02',
    name: 'Jessa Mae',
    surname: 'Reyes',
    location: 'Dumaguete City',
    votes: 1980,
    initials: 'JM',
    accent: 'teal',
    image: '/assets/candidates/candidate-02.webp',
    advocacy: 'Preserving Heritage Silimanian Literature & Marine Sanctuaries',
    height: "5'9\"",
    talent: 'Spoken Word Poetry & Classical Violin Solo',
  },
  {
    id: 'c-03',
    number: '03',
    name: 'Charmine',
    surname: 'Cruz',
    location: 'Tanjay City',
    votes: 1102,
    initials: 'C',
    accent: 'amber',
    image: '/assets/candidates/candidate-03.webp',
    advocacy: 'Sustaining Sugarcane Artisans & Indigenous Hablon Weaving',
    height: "5'7\"",
    talent: 'Saulog Folk Dance & Live Percussion',
  },
  {
    id: 'c-04',
    number: '04',
    name: 'Shaira',
    surname: 'Bautista',
    location: 'Bayawan City',
    votes: 967,
    initials: 'S',
    accent: 'gold',
    image: '/assets/candidates/candidate-04.webp',
    advocacy: 'Agricultural Food Security & Rural Women Leadership',
    height: "5'8\"",
    talent: 'Theatrical Tawo-Tawo Monologue & Song',
  },
  {
    id: 'c-05',
    number: '05',
    name: 'Nicole',
    surname: 'Ocampo',
    location: 'Guihulngan City',
    votes: 834,
    initials: 'N',
    accent: 'plum',
    image: '/assets/candidates/candidate-05.webp',
    advocacy: 'Highland Tribal Education & Forest Reforestation',
    height: "5'7.5\"",
    talent: 'Lumad Chants & Kulintang Ensemble',
  },
  {
    id: 'c-06',
    number: '06',
    name: 'Joanne',
    surname: 'Garcia',
    location: 'Bais City',
    votes: 732,
    initials: 'J',
    accent: 'mint',
    image: '/assets/candidates/candidate-06.webp',
    advocacy: 'Tañon Strait Dolphin Habitat Protection',
    height: "5'8.5\"",
    talent: 'Acoustic Harana & Marine Themed Visual Art',
  },
];

/** Temporary Hara expansion; additional entries reuse supplied portrait placeholders until photos arrive. */
export const haraCandidates: Candidate[] = [
  ...candidates,
  {
    id: 'c-07',
    number: '07',
    name: 'Aira Mae',
    surname: 'Mendoza',
    location: 'Valencia',
    votes: 689,
    initials: 'AM',
    accent: 'mint',
    image: '/assets/candidates/candidate-01.webp',
    advocacy: 'Highland Livelihoods & Community-Based Eco-Tourism',
    height: "5'7\"",
    talent: 'Bamboo percussion with native storytelling',
  },
  {
    id: 'c-08',
    number: '08',
    name: 'Kaye Nicole',
    surname: 'Torres',
    location: 'Manjuyod',
    votes: 614,
    initials: 'KN',
    accent: 'teal',
    image: '/assets/candidates/candidate-02.webp',
    advocacy: 'Sustainable Fishing Families & White Sandbar Stewardship',
    height: "5'8\"",
    talent: 'Acoustic guitar and coastal folk song',
  },
  {
    id: 'c-09',
    number: '09',
    name: 'Shaina Rose',
    surname: 'Flores',
    location: 'Mabinay',
    votes: 572,
    initials: 'SR',
    accent: 'amber',
    image: '/assets/candidates/candidate-03.webp',
    advocacy: 'Cave Heritage Protection & Rural Youth Literacy',
    height: "5'7.5\"",
    talent: 'Contemporary dance inspired by the Mabinay caves',
  },
  {
    id: 'c-10',
    number: '10',
    name: 'Rhea Camille',
    surname: 'Ramos',
    location: 'Sibulan',
    votes: 528,
    initials: 'RC',
    accent: 'gold',
    image: '/assets/candidates/candidate-04.webp',
    advocacy: 'Watershed Renewal & Safe Water Access',
    height: "5'8.5\"",
    talent: 'Spoken word with kulintang accompaniment',
  },
  {
    id: 'c-11',
    number: '11',
    name: 'Anne Patrice',
    surname: 'Aquino',
    location: 'Dauin',
    votes: 491,
    initials: 'AP',
    accent: 'plum',
    image: '/assets/candidates/candidate-05.webp',
    advocacy: 'Marine Sanctuary Education & Women-Led Tourism',
    height: "5'7\"",
    talent: 'Underwater-inspired visual performance',
  },
  {
    id: 'c-12',
    number: '12',
    name: 'Beatrice Joy',
    surname: 'Castillo',
    location: 'Santa Catalina',
    votes: 458,
    initials: 'BJ',
    accent: 'rose',
    image: '/assets/candidates/candidate-06.webp',
    advocacy: 'Mangrove Restoration & Coastal Women’s Enterprise',
    height: "5'8\"",
    talent: 'Harana and handwoven textile presentation',
  },
  {
    id: 'c-13',
    number: '13',
    name: 'Arianne Mae',
    surname: 'Navarro',
    location: 'Bacong',
    votes: 438,
    initials: 'AM',
    accent: 'teal',
    image: '/assets/candidates/candidate-01.webp',
    advocacy: 'Heritage Architecture & Youth Cultural Mapping',
    height: "5'7.5\"",
    talent: 'Bamboo percussion and spoken-word storytelling',
  },
  {
    id: 'c-14',
    number: '14',
    name: 'Clarisse Joy',
    surname: 'Salazar',
    location: 'Basay',
    votes: 412,
    initials: 'CJ',
    accent: 'amber',
    image: '/assets/candidates/candidate-02.webp',
    advocacy: 'Coastal Livelihoods & Women-Led Fisheries',
    height: "5'8\"",
    talent: 'Contemporary dance with a sea-song vocal line',
  },
  {
    id: 'c-15',
    number: '15',
    name: 'Dana Faye',
    surname: 'Villanueva',
    location: 'Bindoy',
    votes: 386,
    initials: 'DF',
    accent: 'gold',
    image: '/assets/candidates/candidate-03.webp',
    advocacy: 'Mangrove Stewardship & Climate-Ready Farms',
    height: "5'7\"",
    talent: 'Folk dance and native flute ensemble',
  },
  {
    id: 'c-16',
    number: '16',
    name: 'Elisha Mae',
    surname: 'Domingo',
    location: 'Canlaon City',
    votes: 364,
    initials: 'EM',
    accent: 'mint',
    image: '/assets/candidates/candidate-04.webp',
    advocacy: 'Volcanic Highland Farming & Disaster Preparedness',
    height: "5'9\"",
    talent: 'Theatrical monologue with hand percussion',
  },
  {
    id: 'c-17',
    number: '17',
    name: 'Faye Nicole',
    surname: 'Espinosa',
    location: 'Jimalalud',
    votes: 338,
    initials: 'FN',
    accent: 'plum',
    image: '/assets/candidates/candidate-05.webp',
    advocacy: 'River Conservation & Rural Student Mentorship',
    height: "5'8.5\"",
    talent: 'Acoustic ballad with woven-rhythm movement',
  },
  {
    id: 'c-18',
    number: '18',
    name: 'Grace Anne',
    surname: 'Fernandez',
    location: 'La Libertad',
    votes: 312,
    initials: 'GA',
    accent: 'rose',
    image: '/assets/candidates/candidate-06.webp',
    advocacy: 'Forest Corridor Protection & Community Tourism',
    height: "5'7.5\"",
    talent: 'Modern interpretive dance with bamboo props',
  },
  {
    id: 'c-19',
    number: '19',
    name: 'Hannah Rose',
    surname: 'Guevarra',
    location: 'Pamplona',
    votes: 286,
    initials: 'HR',
    accent: 'teal',
    image: '/assets/candidates/candidate-01.webp',
    advocacy: 'Food Security & Women Farmers’ Cooperatives',
    height: "5'8\"",
    talent: 'Harana vocal performance with guitar',
  },
  {
    id: 'c-20',
    number: '20',
    name: 'Isabelle Mae',
    surname: 'Herrera',
    location: 'Siaton',
    votes: 265,
    initials: 'IM',
    accent: 'amber',
    image: '/assets/candidates/candidate-02.webp',
    advocacy: 'Marine Sanctuary Education & Coastal Safety',
    height: "5'7\"",
    talent: 'Festival jazz with a traditional drum break',
  },
  {
    id: 'c-21',
    number: '21',
    name: 'Juliana Mae',
    surname: 'Ibanez',
    location: 'Tayasan',
    votes: 241,
    initials: 'JM',
    accent: 'gold',
    image: '/assets/candidates/candidate-03.webp',
    advocacy: 'Watershed Renewal & Indigenous Craft Training',
    height: "5'8.5\"",
    talent: 'Kulintang-inspired movement and chant',
  },
  {
    id: 'c-22',
    number: '22',
    name: 'Kristine Joy',
    surname: 'Lopez',
    location: 'Zamboanguita',
    votes: 218,
    initials: 'KJ',
    accent: 'mint',
    image: '/assets/candidates/candidate-04.webp',
    advocacy: 'Sustainable Tourism & Small-Island Livelihoods',
    height: "5'7.5\"",
    talent: 'Contemporary dance with coastal field recordings',
  },
];

/** Temporary Gandang NegOrense expansion; replace these stand-ins when the
 * official candidate roster and portraits arrive. */
export const gandangCandidates: Candidate[] = [
  ...candidates,
  {
    id: 'g-07',
    number: '07',
    name: 'Mariel Grace',
    surname: 'Maranan',
    location: 'Bacong',
    votes: 1188,
    initials: 'MG',
    accent: 'mint',
    image: '/assets/candidates/candidate-01.webp',
    advocacy: 'Heritage Architecture & Youth Cultural Mapping',
    height: "5'7.5\"",
    talent: 'Bamboo percussion and spoken-word storytelling',
  },
  {
    id: 'g-08',
    number: '08',
    name: 'Kim Andrea',
    surname: 'Nieves',
    location: 'Basay',
    votes: 1094,
    initials: 'KA',
    accent: 'teal',
    image: '/assets/candidates/candidate-02.webp',
    advocacy: 'Coastal Livelihoods & Women-Led Fisheries',
    height: "5'8\"",
    talent: 'Contemporary dance with a sea-song vocal line',
  },
  {
    id: 'g-09',
    number: '09',
    name: 'Liana Mae',
    surname: 'Olivar',
    location: 'Bindoy',
    votes: 1016,
    initials: 'LM',
    accent: 'amber',
    image: '/assets/candidates/candidate-03.webp',
    advocacy: 'Mangrove Stewardship & Climate-Ready Farms',
    height: "5'7\"",
    talent: 'Folk dance and native flute ensemble',
  },
  {
    id: 'g-10',
    number: '10',
    name: 'Princess Anne',
    surname: 'Padilla',
    location: 'Canlaon City',
    votes: 944,
    initials: 'PA',
    accent: 'gold',
    image: '/assets/candidates/candidate-04.webp',
    advocacy: 'Volcanic Highland Farming & Disaster Preparedness',
    height: "5'9\"",
    talent: 'Theatrical monologue with hand percussion',
  },
  {
    id: 'g-11',
    number: '11',
    name: 'Rizza Claire',
    surname: 'Quintos',
    location: 'Jimalalud',
    votes: 871,
    initials: 'RC',
    accent: 'plum',
    image: '/assets/candidates/candidate-05.webp',
    advocacy: 'River Conservation & Rural Student Mentorship',
    height: "5'8.5\"",
    talent: 'Acoustic ballad with woven-rhythm movement',
  },
  {
    id: 'g-12',
    number: '12',
    name: 'Alyssa Joy',
    surname: 'Rivera',
    location: 'La Libertad',
    votes: 806,
    initials: 'AJ',
    accent: 'rose',
    image: '/assets/candidates/candidate-06.webp',
    advocacy: 'Forest Corridor Protection & Community Tourism',
    height: "5'7.5\"",
    talent: 'Modern interpretive dance with bamboo props',
  },
  {
    id: 'g-13',
    number: '13',
    name: 'Danica Rose',
    surname: 'Sarmiento',
    location: 'Pamplona',
    votes: 742,
    initials: 'DR',
    accent: 'mint',
    image: '/assets/candidates/candidate-01.webp',
    advocacy: 'Food Security & Women Farmers’ Cooperatives',
    height: "5'8\"",
    talent: 'Harana vocal performance with guitar',
  },
  {
    id: 'g-14',
    number: '14',
    name: 'Krizia Mae',
    surname: 'Tolentino',
    location: 'Siaton',
    votes: 698,
    initials: 'KM',
    accent: 'teal',
    image: '/assets/candidates/candidate-02.webp',
    advocacy: 'Marine Sanctuary Education & Coastal Safety',
    height: "5'7\"",
    talent: 'Festival jazz with a traditional drum break',
  },
  {
    id: 'g-15',
    number: '15',
    name: 'Sheena Mae',
    surname: 'Ubaldo',
    location: 'Tayasan',
    votes: 641,
    initials: 'SM',
    accent: 'amber',
    image: '/assets/candidates/candidate-03.webp',
    advocacy: 'Watershed Renewal & Indigenous Craft Training',
    height: "5'8.5\"",
    talent: 'Kulintang-inspired movement and chant',
  },
  {
    id: 'g-16',
    number: '16',
    name: 'Janelle Faith',
    surname: 'Verzosa',
    location: 'Zamboanguita',
    votes: 593,
    initials: 'JF',
    accent: 'gold',
    image: '/assets/candidates/candidate-04.webp',
    advocacy: 'Sustainable Tourism & Small-Island Livelihoods',
    height: "5'7.5\"",
    talent: 'Contemporary dance with coastal field recordings',
  },
];

/**
 * Remote reference photography from past Buglasan coverage.
 *
 * These images are intentionally shared across the mock roster until the
 * participating LGU list and final booth photography arrive. Keep the image
 * source in the data layer so replacing the references later does not change
 * the gallery component.
 *
 * Sources:
 * - https://outoftownblog.com/negros-oriental-sizzles-with-44th-buglasan-festival/
 * - https://marineconservationphilippines.org/marine-conservation-and-virtual-reality-buglasan-festival/
 */
const PAST_BUGLASAN_BOOTH_IMAGES = [
  'https://outoftownblog.com/wp-content/uploads/2024/10/Manjuyod-municipal-booth-700x467.jpg',
  'https://marineconservationphilippines.org/wp-content/uploads/2023/10/buglasan-mcp-zamboanguita-booth-2023.jpg',
  'https://marineconservationphilippines.org/wp-content/uploads/2023/10/buglasan-2023-virtual-reality-mcp.jpg',
] as const;

/**
 * Past-event contingent photography for the Festival of Festivals mock
 * roster. These are illustrative references, not photos of the named mock
 * entries.
 *
 * Sources:
 * - https://jontotheworld.com/buglasan-festival-dumaguete/
 * - https://outoftownblog.com/negros-oriental-sizzles-with-44th-buglasan-festival/
 * - https://dumaguete.com/buglasan-festival-2025-street-dancing-showdown/
 */
const PAST_BUGLASAN_FESTIVAL_IMAGES = [
  'https://jontotheworld.com/wp-content/uploads/2024/08/Buglasan-Festival-2.jpg',
  'https://outoftownblog.com/wp-content/uploads/2024/10/Buglasan-Festival-Street-Dancing.jpg',
  'https://outoftownblog.com/wp-content/uploads/2024/10/Buglasan-Festival-Street-Dancing-Contingents-700x510.jpg',
  'https://dumaguete.com/wp-content/uploads/2025/10/Buglasan-Festival-2025-Street-Dancing-26-copy-495x400.jpg',
] as const;

const boothReferenceImage = (index: number) => PAST_BUGLASAN_BOOTH_IMAGES[index % PAST_BUGLASAN_BOOTH_IMAGES.length];
const festivalReferenceImage = (index: number) => PAST_BUGLASAN_FESTIVAL_IMAGES[index % PAST_BUGLASAN_FESTIVAL_IMAGES.length];
const boothFallbackImage = (index: number) => `/assets/entries/booth-${String((index % 6) + 1).padStart(2, '0')}.svg`;
const festivalFallbackImage = (index: number) => `/assets/entries/festival-${String((index % 4) + 1).padStart(2, '0')}.svg`;

/** Temporary booth records to fill the 23-slot presentation until the
 * participating LGU list and final booth photography arrive. */
const mockBoothDetails: Array<Omit<LguBooth, 'id' | 'number' | 'materials' | 'image'>> = [
  {
    municipality: 'Ayungon',
    district: '1st District',
    theme: 'Mangrove Coast and Mountain Trails',
    signatureProducts: ['Native cacao tablea', 'Handwoven baskets'],
    votes: 1486,
    highlights: 'A shaded bamboo walkway links a mangrove nursery to a compact highland produce display.',
    tagline: 'Where the forest meets the sea.',
  },
  {
    municipality: 'Bacong',
    district: '1st District',
    theme: 'Heritage Homes by the Water',
    signatureProducts: ['Coconut sugar', 'Shell craft'],
    votes: 1428,
    highlights: 'A heritage-house façade frames a coastal market of coconut products and local craft.',
    tagline: 'Old stories, new horizons.',
  },
  {
    municipality: 'Basay',
    district: '3rd District',
    theme: 'The Living Shoreline',
    signatureProducts: ['Dried fish', 'Sea-salt crackers'],
    votes: 1364,
    highlights: 'Layered woven panels trace the shoreline while a working salt-making table welcomes visitors.',
    tagline: 'Crafted by the coast.',
  },
  {
    municipality: 'Bindoy',
    district: '2nd District',
    theme: 'Green Valleys and Open Seas',
    signatureProducts: ['Rambutan preserves', 'Bamboo homeware'],
    votes: 1318,
    highlights: 'A green valley relief rises behind a tasting counter for fruit preserves and bamboo goods.',
    tagline: 'A greener way home.',
  },
  {
    municipality: 'Canlaon City',
    district: '1st District',
    theme: 'Volcanic Soil, Abundant Harvest',
    signatureProducts: ['Mountain coffee', 'Fresh vegetables'],
    votes: 1276,
    highlights: 'Dark volcanic stone anchors a stepped farm display with a highland coffee tasting nook.',
    tagline: 'From fertile ground, a bright future.',
  },
  {
    municipality: 'Guihulngan City',
    district: '1st District',
    theme: 'Rivers, Roots, and Resilience',
    signatureProducts: ['Banana chips', 'Hand-dyed textiles'],
    votes: 1218,
    highlights: 'River-line graphics and dyed textile canopies turn the pavilion into a walk-through city story.',
    tagline: 'Made strong by the river.',
  },
  {
    municipality: 'Jimalalud',
    district: '1st District',
    theme: 'The Community Garden',
    signatureProducts: ['Root-crop delicacies', 'Native herbal tea'],
    votes: 1169,
    highlights: 'A central edible garden gives visitors a close look at local crops and everyday food traditions.',
    tagline: 'A table grown together.',
  },
  {
    municipality: 'La Libertad',
    district: '1st District',
    theme: 'Forest Paths to the Sea',
    signatureProducts: ['Wild honey', 'Rattan craft'],
    votes: 1114,
    highlights: 'Rattan arches and layered leaf panels create a forest path toward a small coastal product bar.',
    tagline: 'Follow the path to freedom.',
  },
  {
    municipality: 'Mabinay',
    district: '3rd District',
    theme: 'Caves of Light',
    signatureProducts: ['Cave-grown coffee', 'Hand-carved keepsakes'],
    votes: 1078,
    highlights: 'A low-lit limestone passage opens into a bright showcase of cave-country food and craft.',
    tagline: 'Discover what the dark reveals.',
  },
  {
    municipality: 'Manjuyod',
    district: '2nd District',
    theme: 'White Sandbar, Wide Horizons',
    signatureProducts: ['Seaweed snacks', 'Woven beach mats'],
    votes: 1036,
    highlights: 'A raised sandbar form and woven shade sails make room for coastal enterprise demonstrations.',
    tagline: 'A horizon worth sharing.',
  },
  {
    municipality: 'Pamplona',
    district: '3rd District',
    theme: 'Harvest of the Hills',
    signatureProducts: ['Muscovado sweets', 'Upland vegetables'],
    votes: 984,
    highlights: 'Terraced platforms lead to a harvest wall stocked with upland produce and small-farm products.',
    tagline: 'Every hill has a harvest.',
  },
  {
    municipality: 'San Jose',
    district: '3rd District',
    theme: 'The Gentle Craft of the Coast',
    signatureProducts: ['Coconut treats', 'Abaca accessories'],
    votes: 942,
    highlights: 'Abaca screens soften a small coastal market where visitors can see craft techniques up close.',
    tagline: 'Handmade with a gentle touch.',
  },
  {
    municipality: 'Santa Catalina',
    district: '3rd District',
    theme: 'Fields, Faith, and Festival',
    signatureProducts: ['Rice cakes', 'Handmade rosaries'],
    votes: 908,
    highlights: 'A harvest tableau sits beneath a festival canopy filled with local food and devotional craft.',
    tagline: 'A hometown with heart.',
  },
  {
    municipality: 'Siaton',
    district: '3rd District',
    theme: 'Apo Waters and Open Skies',
    signatureProducts: ['Sea-salt blends', 'Dried mango'],
    votes: 872,
    highlights: 'Blue-green panels map the coast and introduce visitors to marine stewardship and local flavors.',
    tagline: 'Guardians of the open water.',
  },
  {
    municipality: 'Sibulan',
    district: '2nd District',
    theme: 'Crab Coast and River Country',
    signatureProducts: ['Crab paste', 'Banana fiber craft'],
    votes: 836,
    highlights: 'A winding river form connects a shoreline story to a tasting bar for crab and banana products.',
    tagline: 'Follow the current home.',
  },
  {
    municipality: 'Tayasan',
    district: '2nd District',
    theme: 'Waterfalls in the Highlands',
    signatureProducts: ['Mountain rice', 'Handwoven cloth'],
    votes: 798,
    highlights: 'A vertical waterfall wall frames a quiet highland lounge for rice, textiles, and storytelling.',
    tagline: 'High ground, deep roots.',
  },
  {
    municipality: 'Zamboanguita',
    district: '3rd District',
    theme: 'Southern Shores, Shared Stories',
    signatureProducts: ['Coconut jam', 'Recycled sail bags'],
    votes: 764,
    highlights: 'Sailcloth canopies and a circular shoreline map create a welcoming southern-coast pavilion.',
    tagline: 'A warm welcome from the south.',
  },
];

export const lguBooths: LguBooth[] = [
  {
    id: 'booth-01',
    number: '01',
    municipality: 'Dumaguete City',
    district: '2nd District',
    theme: 'Gentle Bay: City of Gentle People & Coral Pavilions',
    materials: ['Polished Marine Driftwood', 'Abaca Rope Weaves', 'Seashell Tile Inlays', 'Recycled Bamboo Slats'],
    signatureProducts: ['Dumaguete Silvanas', 'Budbud Kabog', 'Artisan Pottery', 'Roasted Arabica Coffee'],
    votes: 2430,
    highlights: 'Multi-level pavilion inspired by the historic Dumaguete Watchtower (Campanario) with a functioning café counter.',
    image: boothReferenceImage(0),
    fallbackImage: boothFallbackImage(0),
    tagline: 'Where Heritage Meets the Gentle Breeze.',
  },
  {
    id: 'booth-02',
    number: '02',
    municipality: 'Valencia',
    district: '3rd District',
    theme: 'Highland Haven: Mount Talinis Geothermal Echoes',
    materials: ['Smoked Bamboo Poles', 'Highland Pine Bark', 'Natural River Stone', 'Lanzones Wood'],
    signatureProducts: ['Sweet Highland Lanzones', 'Organic Robusta Coffee', 'Wild Raw Honey', 'Cut Orchids'],
    votes: 2185,
    highlights: 'Features a cascading micro-waterfall mimicking Casaroro Falls with ambient mist and cold-brew tasting lounge.',
    image: boothReferenceImage(1),
    fallbackImage: boothFallbackImage(1),
    tagline: 'Negros Oriental’s Cool Mountain Crown.',
  },
  {
    id: 'booth-03',
    number: '03',
    municipality: 'Bais City',
    district: '2nd District',
    theme: 'Sugarlandia & Dolphin Sanctuaries',
    materials: ['Sugarcane Fiber Panels', 'Nipa Palm Thatch', 'Hardwood Beams', 'Handwoven Fishing Nets'],
    signatureProducts: ['Raw Muscovado Sugar', 'Crispy Dried Squid', 'Crab Paste (Taba ng Talangka)', 'Heritage Rum'],
    votes: 1890,
    highlights: 'Detailed replica of the Manjuyod White Sandbar stilt cottages with interactive marine sanctuary screens.',
    image: boothReferenceImage(2),
    fallbackImage: boothFallbackImage(2),
    tagline: 'Sweet Waters and Playful Depths.',
  },
  {
    id: 'booth-04',
    number: '04',
    municipality: 'Tanjay City',
    district: '2nd District',
    theme: 'Regal Soul of the Sinulog de Tanjay',
    materials: ['Burnished Mahogany', 'Golden Rice Straw', 'Braided Hablon Mats', 'Terracotta Tile Insets'],
    signatureProducts: ['Authentic Tanjay Budbud Pilit', 'Budbud Moron', 'Caramelized Yema', 'Native Woven Baskets'],
    votes: 1740,
    highlights: 'Towering golden archway with live budbud wrapping demonstrations and historic Spanish-era photo gallery.',
    image: boothReferenceImage(0),
    fallbackImage: boothFallbackImage(3),
    tagline: 'The Heartland of Festivity and Flavors.',
  },
  {
    id: 'booth-05',
    number: '05',
    municipality: 'Bayawan City',
    district: '3rd District',
    theme: 'The Agriopolis: Guardians of the Golden Fields',
    materials: ['Woven Rice Stalks', 'Treated Giant Bamboo', 'Handcrafted Scarecrow Idols', 'River Silt Bricks'],
    signatureProducts: ['Organic Black Rice', 'Bayawan Buko Pie', 'Freshwater Tilapia Crackers', 'Carabao Milk Cheese'],
    votes: 1610,
    highlights: 'Sculptural giant Tawo-Tawo scarecrows flanking an automated mini-rice mill display with fresh grain samples.',
    image: boothReferenceImage(1),
    fallbackImage: boothFallbackImage(4),
    tagline: 'Negros Oriental’s Agricultural Capital.',
  },
  {
    id: 'booth-06',
    number: '06',
    municipality: 'Dauin',
    district: '3rd District',
    theme: 'Apo Island Sanctuary: Subic Marine Sanctuary',
    materials: ['Volcanic Basalt Stone', 'Reclaimed Sea-Vessel Timber', 'Hemp Netting', 'Coral-Safe Lime Plaster'],
    signatureProducts: ['Smoked Sea Salt', 'Fresh Tuna Loin', 'Artisanal Shell Jewellery', 'Hand-dyed Dive Towels'],
    votes: 1540,
    highlights: 'Luminous underwater-themed dome with projection mapping of sea turtles grazing across coral reefs.',
    image: boothReferenceImage(2),
    fallbackImage: boothFallbackImage(5),
    tagline: 'World-Class Diving and Marine Guardianship.',
  },
  ...mockBoothDetails.map((booth, index) => ({
    ...booth,
    id: `booth-${String(index + 7).padStart(2, '0')}`,
    number: String(index + 7).padStart(2, '0'),
    materials: ['Treated bamboo', 'Nipa palm', 'Abaca weave'],
    image: boothReferenceImage(index + 6),
    fallbackImage: boothFallbackImage(index + 6),
  })),
];

/** Temporary Festival of Festivals participants to fill the announced
 * ten-contingent presentation until the official lineup arrives. */
const mockFestivalDetails: Array<Omit<FestivalContingent, 'id' | 'image'>> = [
  {
    festivalName: 'Dauin Coastal Festival',
    municipality: 'Dauin',
    theme: 'Tides of Protection: A community guarding its marine sanctuaries',
    performersCount: 84,
    leadChoreographer: 'Mara Villareal',
    storyline: 'Follows coastal families as they protect reefs, welcome visitors, and pass their stewardship traditions to a new generation.',
    costumeHighlights: 'Sea-glass blues, woven pandan panels, and hand-painted reef creatures.',
    votes: 2180,
    performanceTime: 'June 08 · 5:00 PM (Perdices St.)',
  },
  {
    festivalName: 'Valencia Highland Festival',
    municipality: 'Valencia',
    theme: 'Mountain Mist: The harvest stories of Talinis country',
    performersCount: 102,
    leadChoreographer: 'Rafael Teves',
    storyline: 'Celebrates the farmers, springs, and forest paths that sustain the highland communities around Mount Talinis.',
    costumeHighlights: 'Layered greens, woven mountain textures, and cloud-inspired movement props.',
    votes: 2040,
    performanceTime: 'June 08 · 5:45 PM (Perdices St.)',
  },
  {
    festivalName: 'Mabinay Cave Festival',
    municipality: 'Mabinay',
    theme: 'Echoes Below: A journey through the living limestone country',
    performersCount: 90,
    leadChoreographer: 'Nina Alarcon',
    storyline: 'Turns cave formations, underground rivers, and local guides into a theatrical journey from darkness into light.',
    costumeHighlights: 'Reflective mineral textures, sculpted cave forms, and lantern-like hand props.',
    votes: 1965,
    performanceTime: 'June 08 · 6:30 PM (Perdices St.)',
  },
  {
    festivalName: 'Siaton Heritage Festival',
    municipality: 'Siaton',
    theme: 'From Field to Shore: The many hands behind a hometown table',
    performersCount: 76,
    leadChoreographer: 'Joel Estrella',
    storyline: 'Connects inland farms and coastal livelihoods through a shared harvest celebration led by three generations of families.',
    costumeHighlights: 'Warm harvest tones, woven shoulder cloths, and oversized grain sheaves.',
    votes: 1830,
    performanceTime: 'June 08 · 7:15 PM (Perdices St.)',
  },
  {
    festivalName: 'Tayasan River Festival',
    municipality: 'Tayasan',
    theme: 'The River Remembers: Water, craft, and community resilience',
    performersCount: 81,
    leadChoreographer: 'Carla Montecillo',
    storyline: 'Uses the movement of a river to tell a story about craft families, shared watersheds, and rebuilding together.',
    costumeHighlights: 'Indigo streamers, handwoven bands, and flowing bamboo river forms.',
    votes: 1760,
    performanceTime: 'June 08 · 8:00 PM (Perdices St.)',
  },
  {
    festivalName: 'Zamboanguita Sea and Shore Festival',
    municipality: 'Zamboanguita',
    theme: 'Southern Welcome: A shoreline open to every story',
    performersCount: 72,
    leadChoreographer: 'Luis Mariano',
    storyline: 'Builds a celebratory shoreline gathering from fishing traditions, coconut craft, and the welcome shared with every guest.',
    costumeHighlights: 'Sunset gradients, sailcloth capes, and bright shell-inspired accessories.',
    votes: 1625,
    performanceTime: 'June 08 · 8:45 PM (Perdices St.)',
  },
];

export const festivalContingents: FestivalContingent[] = [
  {
    id: 'sd-01',
    festivalName: 'Sandurot Festival',
    municipality: 'Dumaguete City',
    theme: 'The Welcome of Nations: Convergence along the Gentle Shores',
    performersCount: 96,
    leadChoreographer: 'Mestro Ramon Teves',
    storyline: 'Portrays the historic meeting of Spanish, Chinese, Japanese, and indigenous Tagalog merchants welcoming one another to Dumaguete with gift-giving and celebratory street rhythms.',
    costumeHighlights: 'Silk-embroidered mantones, bamboo headdresses with mother-of-pearl accents, and flowing marine fabrics.',
    votes: 3120,
    performanceTime: 'June 08 · 2:00 PM (Perdices St.)',
    image: festivalReferenceImage(0),
    fallbackImage: festivalFallbackImage(0),
  },
  {
    id: 'sd-02',
    festivalName: 'Yagyag Festival',
    municipality: 'Sibulan',
    theme: 'Spawning of the Seas: The Mystery of the Crabs',
    performersCount: 110,
    leadChoreographer: 'Elena Villanueva',
    storyline: 'Depicts the phenomenal mass migration and spawning of shoreline crabs (Cagang) along Sibulan shores, demonstrating ancestral wisdom and environmental harmony.',
    costumeHighlights: 'Vibrant crimson carapace armor, movable claw props with kinetic joints, and glowing mangrove leaf backdrops.',
    votes: 2840,
    performanceTime: 'June 08 · 2:45 PM (Perdices St.)',
    image: festivalReferenceImage(1),
    fallbackImage: festivalFallbackImage(1),
  },
  {
    id: 'sd-03',
    festivalName: 'Tawo-Tawo Festival',
    municipality: 'Bayawan City',
    theme: 'Guardians of the Golden Harvest',
    performersCount: 120,
    leadChoreographer: 'Carlos Mendoza',
    storyline: 'A joyful dance of scarecrows coming alive at night to defend the ripest golden rice fields from swarming maya birds, leading into an exuberant thanksgiving fiesta.',
    costumeHighlights: 'Straw-woven helmets, golden burlap smocks lined with LED-infused golden grain fronds, and giant kinetic scarecrow towers.',
    votes: 2690,
    performanceTime: 'June 08 · 3:30 PM (Perdices St.)',
    image: festivalReferenceImage(2),
    fallbackImage: festivalFallbackImage(2),
  },
  {
    id: 'sd-04',
    festivalName: 'Sinulog de Tanjay',
    municipality: 'Tanjay City',
    theme: 'Faith, Armor, and the Historic Mock Battle of Christians & Moors',
    performersCount: 88,
    leadChoreographer: 'Joaquin Gomez',
    storyline: 'One of the oldest religious-cultural dances in the Visayas, honoring Señor Santiago with dynamic fencing swordplay, shield formations, and rhythmic drum cadence.',
    costumeHighlights: 'Velvet tunics with brass breastplates, ornate morion helmets, and red-and-gold battle capes.',
    votes: 2310,
    performanceTime: 'June 08 · 4:15 PM (Perdices St.)',
    image: festivalReferenceImage(3),
    fallbackImage: festivalFallbackImage(3),
  },
  ...mockFestivalDetails.map((festival, index) => ({
    ...festival,
    id: `sd-${String(index + 5).padStart(2, '0')}`,
    image: festivalReferenceImage(index + 4),
    fallbackImage: festivalFallbackImage(index + 4),
  })),
];

export const announcements: Announcement[] = [
  {
    date: 'OCT 01',
    title: 'Official online voting is now live across all 4 programs',
    description: 'Cast your daily verified vote for Hara, LGU Booths, Festival of Festivals, and Gandang NegOrense.',
    type: 'live',
  },
  {
    date: 'OCT 03',
    title: 'Freedom Park LGU Booth Expo opens to the public',
    description: 'Explore 23 municipal pavilions featuring native architecture, crafts, and farm harvest.',
    type: 'event',
  },
  {
    date: 'OCT 20',
    title: 'Festival of Festivals program begins',
    description: 'Festival contingents gather in Dumaguete for the province-wide presentation.',
    type: 'event',
  },
  {
    date: 'OCT 24',
    title: 'Gandang NegOrense Pageant Night',
    description: 'The Queen Size pageant celebrates identity, confidence, and provincial pride.',
    type: 'notice',
  },
];
