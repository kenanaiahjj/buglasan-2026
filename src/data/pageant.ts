export type Candidate = {
  id: string;
  number: string;
  name: string;
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

export const BUGLASAN_HERO_LOGO = {
  src: '/assets/buglasan-hero-2026-official.png',
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
  heroLede:
    'Twenty-five town festivals converge on Dumaguete for the Festival of Festivals. Four programs, one province, one shared celebration — and one verified vote from you each day.',
  eventLabel: 'Official online voting is open',
  votingWindow: 'May 20, 2026 — June 10, 2026',
  votingDeadline: 'June 10, 2026 · 11:59 PM PHT',
  countdown: { days: '06', hours: '12', minutes: '45' },
  totalVotes: 12846,
  footerHashtags: '#BuglasanFestival2026 #FestivalOfFestivals #GandangNegOrense #DumagueteCity',
};

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
    dateRange: 'May 20 – June 10, 2026',
    totalEntries: 12,
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
    dateRange: 'May 22 – June 10, 2026',
    totalEntries: 8,
    votesOpen: true,
    accentColor: '#4ade80',
    description:
      'Freedom Park transforms into a living architectural wonderland as 25 LGUs craft breathtaking multi-story pavilions from bamboo, nipa, hardwood, and abaca, showcasing local delicacies, organic produce, and craft exports.',
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
    venue: 'Dumaguete City Streets & Lamberto Macias Sports Complex',
    dateRange: 'June 08 – June 09, 2026',
    totalEntries: 4,
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
    totalEntries: 6,
    votesOpen: true,
    accentColor: '#c084fc',
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
    location: 'Santa Catalina',
    votes: 458,
    initials: 'BJ',
    accent: 'rose',
    image: '/assets/candidates/candidate-06.webp',
    advocacy: 'Mangrove Restoration & Coastal Women’s Enterprise',
    height: "5'8\"",
    talent: 'Harana and handwoven textile presentation',
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
    image: '/assets/candidates/candidate-02.webp',
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
    image: '/assets/candidates/candidate-01.webp',
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
    image: '/assets/candidates/candidate-06.webp',
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
    image: '/assets/candidates/candidate-03.webp',
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
    image: '/assets/candidates/candidate-04.webp',
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
    image: '/assets/candidates/candidate-05.webp',
    tagline: 'World-Class Diving and Marine Guardianship.',
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
    image: '/assets/candidates/candidate-02.webp',
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
    image: '/assets/candidates/candidate-01.webp',
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
    image: '/assets/candidates/candidate-04.webp',
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
    image: '/assets/candidates/candidate-03.webp',
  },
];

export const announcements: Announcement[] = [
  {
    date: 'MAY 20',
    title: 'Official online voting is now live across all 4 programs',
    description: 'Cast your daily verified vote for Hara, LGU Booths, Festival of Festivals, and Gandang NegOrense.',
    type: 'live',
  },
  {
    date: 'MAY 22',
    title: 'Freedom Park LGU Booth Expo opens to the public',
    description: 'Explore 25 municipal pavilions featuring native architecture, crafts, and farm harvest.',
    type: 'event',
  },
  {
    date: 'JUN 08',
    title: 'Festival of Festivals program begins',
    description: 'Festival contingents gather in Dumaguete for the province-wide presentation.',
    type: 'event',
  },
  {
    date: 'JUN 10',
    title: 'Gandang NegOrense Pageant Night',
    description: 'The Queen Size pageant celebrates identity, confidence, and provincial pride.',
    type: 'notice',
  },
];
