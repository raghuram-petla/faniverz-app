export interface OTTPlatform {
  id: string;
  name: string;
  logo: string;
  color: string;
}

export interface Movie {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  releaseDate: string;
  runtime: number;
  genres: string[];
  certification: 'U' | 'UA' | 'A';
  trailerUrl: string;
  synopsis: string;
  cast: { name: string; role: string; photo: string }[];
  director: string;
  releaseType: 'theatrical' | 'ott' | 'upcoming';
  ottPlatforms?: string[];
  rating: number;
  reviewCount: number;
}

export const ottPlatforms: OTTPlatform[] = [
  { id: 'aha', name: 'Aha', logo: '🎬', color: '#FF6B00' },
  { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914' },
  { id: 'prime', name: 'Prime Video', logo: 'P', color: '#00A8E1' },
  { id: 'hotstar', name: 'Disney+ Hotstar', logo: 'D+', color: '#0F1014' },
  { id: 'zee5', name: 'ZEE5', logo: 'Z5', color: '#8E3ED6' },
  { id: 'sunnxt', name: 'SunNXT', logo: 'SN', color: '#FF6600' },
  { id: 'sonyliv', name: 'SonyLIV', logo: 'SL', color: '#0078FF' },
  { id: 'etvwin', name: 'ETV Win', logo: 'ETV', color: '#FF0000' },
];

export const movies: Movie[] = [
  {
    id: '1',
    title: 'Pushpa 2: The Rule',
    poster:
      'https://images.unsplash.com/photo-1751662314800-f68119320ccb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY3Rpb24lMjBtb3ZpZSUyMGludGVuc2UlMjBmb3Jlc3R8ZW58MXx8fHwxNzcxODA4MDYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1751662314800-f68119320ccb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY3Rpb24lMjBtb3ZpZSUyMGludGVuc2UlMjBmb3Jlc3R8ZW58MXx8fHwxNzcxODA4MDYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2024-12-05',
    runtime: 180,
    genres: ['Action', 'Thriller', 'Drama'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis:
      'The Rule continues the story of a red sandalwood smuggler who sets out to dominate the smuggling syndicate.',
    cast: [
      {
        name: 'Allu Arjun',
        role: 'Pushpa Raj',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Rashmika Mandanna',
        role: 'Srivalli',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Fahadh Faasil',
        role: 'Bhanwar Singh',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Sukumar',
    releaseType: 'ott',
    ottPlatforms: ['netflix'],
    rating: 4.5,
    reviewCount: 12847,
  },
  {
    id: '2',
    title: 'Kalki 2898 AD',
    poster:
      'https://images.unsplash.com/photo-1715614176939-f5c46ae99d04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwY2l0eSUyMG5lb24lMjBsaWdodHN8ZW58MXx8fHwxNzcxNzg2ODUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1715614176939-f5c46ae99d04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwY2l0eSUyMG5lb24lMjBsaWdodHN8ZW58MXx8fHwxNzcxNzg2ODUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2024-06-27',
    runtime: 180,
    genres: ['Sci-Fi', 'Action', 'Fantasy'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis:
      'A modern-day avatar of Vishnu, a Hindu god, is said to have descended to Earth to protect the world from evil forces.',
    cast: [
      {
        name: 'Prabhas',
        role: 'Bhairava',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Deepika Padukone',
        role: 'Padma',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Amitabh Bachchan',
        role: 'Ashwatthama',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Nag Ashwin',
    releaseType: 'ott',
    ottPlatforms: ['netflix', 'prime'],
    rating: 4.3,
    reviewCount: 9543,
  },
  {
    id: '3',
    title: 'Thandel',
    poster:
      'https://images.unsplash.com/photo-1621797005674-48e0150206da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb21hbnRpYyUyMGNvdXBsZSUyMGJlYWNoJTIwc3Vuc2V0fGVufDF8fHx8MTc3MTgwODA2MXww&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1621797005674-48e0150206da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb21hbnRpYyUyMGNvdXBsZSUyMGJlYWNoJTIwc3Vuc2V0fGVufDF8fHx8MTc3MTgwODA2MXww&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2025-02-07',
    runtime: 150,
    genres: ['Romance', 'Drama', 'Action'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis:
      'Based on true events, this is the story of a fisherman who was captured by the Pakistani forces and his journey back home.',
    cast: [
      {
        name: 'Nani',
        role: 'Raju',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Sai Pallavi',
        role: 'Satya',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Chandoo Mondeti',
    releaseType: 'theatrical',
    rating: 4.7,
    reviewCount: 6234,
  },
  {
    id: '4',
    title: 'Akhanda 2',
    poster:
      'https://images.unsplash.com/photo-1715704170964-fbd0a6ff3e2a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3dlcmZ1bCUyMHdhcnJpb3IlMjBhbmNpZW50JTIwdGVtcGxlfGVufDF8fHx8MTc3MTgwODA2Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1715704170964-fbd0a6ff3e2a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3dlcmZ1bCUyMHdhcnJpb3IlMjBhbmNpZW50JTIwdGVtcGxlfGVufDF8fHx8MTc3MTgwODA2Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2025-05-15',
    runtime: 165,
    genres: ['Action', 'Drama', 'Mythology'],
    certification: 'A',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis:
      'The powerful sequel continues the saga of a fierce devotee of Lord Shiva who fights against evil forces.',
    cast: [
      {
        name: 'Nandamuri Balakrishna',
        role: 'Akhanda',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Pragya Jaiswal',
        role: 'Saranya',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Boyapati Srinu',
    releaseType: 'upcoming',
    rating: 0,
    reviewCount: 0,
  },
  {
    id: '5',
    title: 'Vishwambhara',
    poster:
      'https://images.unsplash.com/photo-1588231055738-da5e3a717644?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlcGljJTIwZmFudGFzeSUyMG1vdW50YWlucyUyMGNsb3Vkc3xlbnwxfHx8fDE3NzE4MDgwNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1588231055738-da5e3a717644?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlcGljJTIwZmFudGFzeSUyMG1vdW50YWlucyUyMGNsb3Vkc3xlbnwxfHx8fDE3NzE4MDgwNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2025-08-20',
    runtime: 170,
    genres: ['Fantasy', 'Adventure', 'Action'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis:
      'A socio-fantasy adventure that explores the journey of a hero across different realms to save humanity.',
    cast: [
      {
        name: 'Chiranjeevi',
        role: 'Vishwambhara',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Trisha',
        role: 'Maya',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Vassishta',
    releaseType: 'upcoming',
    rating: 0,
    reviewCount: 0,
  },
  {
    id: '6',
    title: 'NTR 31',
    poster:
      'https://images.unsplash.com/photo-1635931225069-4968458f04f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY3Rpb24lMjB0aHJpbGxlciUyMHVyYmFuJTIwbmlnaHR8ZW58MXx8fHwxNzcxODA4MDYyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1635931225069-4968458f04f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY3Rpb24lMjB0aHJpbGxlciUyMHVyYmFuJTIwbmlnaHR8ZW58MXx8fHwxNzcxODA4MDYyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2025-09-28',
    runtime: 0,
    genres: ['Action', 'Thriller'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis:
      'An intense action thriller directed by Prashanth Neel featuring Jr. NTR in a powerful role.',
    cast: [
      {
        name: 'Jr. NTR',
        role: 'TBA',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Prashanth Neel',
    releaseType: 'upcoming',
    rating: 0,
    reviewCount: 0,
  },
  {
    id: '7',
    title: 'Lucky Bhaskar',
    poster:
      'https://images.unsplash.com/photo-1653610336250-7346f50df9a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwY2FzaW5vJTIwbW9uZXl8ZW58MXx8fHwxNzcxODA4MDYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1653610336250-7346f50df9a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwY2FzaW5vJTIwbW9uZXl8ZW58MXx8fHwxNzcxODA4MDYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2024-10-31',
    runtime: 145,
    genres: ['Thriller', 'Crime', 'Drama'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis:
      'A common man gets entangled in a financial scam and must navigate through a world of deception and greed.',
    cast: [
      {
        name: 'Dulquer Salmaan',
        role: 'Bhaskar',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Meenakshi Chaudhary',
        role: 'Sumathi',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Venky Atluri',
    releaseType: 'ott',
    ottPlatforms: ['netflix'],
    rating: 4.4,
    reviewCount: 5621,
  },
  {
    id: '8',
    title: 'HanuMan',
    poster:
      'https://images.unsplash.com/photo-1763315371253-ce4d195ba6d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXBlcmhlcm8lMjBmbHlpbmclMjBza3l8ZW58MXx8fHwxNzcxODA4MDU3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1763315371253-ce4d195ba6d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXBlcmhlcm8lMjBmbHlpbmclMjBza3l8ZW58MXx8fHwxNzcxODA4MDU3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2024-01-12',
    runtime: 158,
    genres: ['Superhero', 'Action', 'Fantasy'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis:
      'An ordinary man gains superpowers and becomes a superhero inspired by Lord Hanuman to protect his village.',
    cast: [
      {
        name: 'Teja Sajja',
        role: 'Hanumanthu',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Amritha Aiyer',
        role: 'Meenakshi',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Prasanth Varma',
    releaseType: 'ott',
    ottPlatforms: ['aha'],
    rating: 4.6,
    reviewCount: 8234,
  },
  {
    id: '9',
    title: 'Devara: Part 1',
    poster:
      'https://images.unsplash.com/photo-1693503169726-511c4cdbe42f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2FzdGFsJTIwdmlsbGFnZSUyMHNlYXxlbnwxfHx8fDE3NzE4MDgwNjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1693503169726-511c4cdbe42f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2FzdGFsJTIwdmlsbGFnZSUyMHNlYXxlbnwxfHx8fDE3NzE4MDgwNjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2025-03-15',
    runtime: 0,
    genres: ['Action', 'Thriller', 'Drama'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis: 'A coastal village saga about fear, power, and the secrets of the sea.',
    cast: [
      {
        name: 'Jr. NTR',
        role: 'Devara',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Janhvi Kapoor',
        role: 'Thangam',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Saif Ali Khan',
        role: 'Bhaira',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Koratala Siva',
    releaseType: 'upcoming',
    ottPlatforms: ['netflix'],
    rating: 0,
    reviewCount: 0,
  },
  {
    id: '10',
    title: 'Game Changer',
    poster:
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2xpdGljYWwlMjBsZWFkZXIlMjBjcm93ZHxlbnwxfHx8fDE3NzE4MDgwNjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2xpdGljYWwlMjBsZWFkZXIlMjBjcm93ZHxlbnwxfHx8fDE3NzE4MDgwNjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2025-04-20',
    runtime: 0,
    genres: ['Action', 'Political', 'Thriller'],
    certification: 'UA',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis: 'An IAS officer takes on the corrupt political system to bring change to society.',
    cast: [
      {
        name: 'Ram Charan',
        role: 'IAS Officer',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Kiara Advani',
        role: 'Lead Role',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Shankar',
    releaseType: 'upcoming',
    ottPlatforms: ['prime'],
    rating: 0,
    reviewCount: 0,
  },
  {
    id: '11',
    title: 'OG: The Gangster',
    poster:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZ2FuZ3N0ZXIlMjBjaXR5fGVufDF8fHx8MTc3MTgwODA2M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZ2FuZ3N0ZXIlMjBjaXR5fGVufDF8fHx8MTc3MTgwODA2M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2025-06-12',
    runtime: 0,
    genres: ['Action', 'Crime', 'Thriller'],
    certification: 'A',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis: 'A powerful gangster rises from the streets to rule the underworld.',
    cast: [
      {
        name: 'Pawan Kalyan',
        role: 'OG',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Priyanka Mohan',
        role: 'Lead Role',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Sujeeth',
    releaseType: 'upcoming',
    ottPlatforms: ['netflix', 'aha'],
    rating: 0,
    reviewCount: 0,
  },
  {
    id: '12',
    title: 'Salaar: Part 2',
    poster:
      'https://images.unsplash.com/photo-1574643156929-51fa6f8b2c65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXIlMjBmaWdodGVyJTIwZGFya3xlbnwxfHx8fDE3NzE4MDgwNjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    backdrop:
      'https://images.unsplash.com/photo-1574643156929-51fa6f8b2c65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXIlMjBmaWdodGVyJTIwZGFya3xlbnwxfHx8fDE3NzE4MDgwNjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    releaseDate: '2025-07-25',
    runtime: 0,
    genres: ['Action', 'Drama', 'Thriller'],
    certification: 'A',
    trailerUrl: 'https://youtube.com/watch?v=example',
    synopsis: 'The continuation of the epic saga of friendship, loyalty, and violence.',
    cast: [
      {
        name: 'Prabhas',
        role: 'Salaar',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
      {
        name: 'Prithviraj Sukumaran',
        role: 'Vardha',
        photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
      },
    ],
    director: 'Prashanth Neel',
    releaseType: 'upcoming',
    ottPlatforms: ['hotstar'],
    rating: 0,
    reviewCount: 0,
  },
];

export const reviews: Review[] = [
  {
    id: '1',
    movieId: '1',
    userId: '1',
    userName: 'Rajesh Kumar',
    userPhoto: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=100',
    rating: 5,
    title: 'Allu Arjun at his best!',
    body: "Pushpa 2 takes the franchise to the next level. The action sequences are breathtaking and Allu Arjun's performance is outstanding. Sukumar's direction is top-notch.",
    spoiler: false,
    date: '2024-12-10',
    helpful: 234,
  },
  {
    id: '2',
    movieId: '1',
    userId: '2',
    userName: 'Priya Reddy',
    userPhoto: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=100',
    rating: 4,
    title: 'Worth the wait',
    body: 'The movie lives up to the hype. Great performances by the entire cast. The climax could have been better but overall a fantastic watch.',
    spoiler: false,
    date: '2024-12-08',
    helpful: 187,
  },
  {
    id: '3',
    movieId: '3',
    userId: '3',
    userName: 'Vikram Sai',
    userPhoto: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=100',
    rating: 5,
    title: 'Emotional masterpiece',
    body: "Thandel is a beautiful blend of romance and patriotism. Nani and Sai Pallavi's chemistry is magical. The music elevates every scene.",
    spoiler: false,
    date: '2025-02-15',
    helpful: 412,
  },
  {
    id: '4',
    movieId: '7',
    userId: '4',
    userName: 'Ananya Das',
    userPhoto: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=100',
    rating: 4,
    title: 'Gripping thriller',
    body: 'Lucky Bhaskar keeps you on the edge of your seat. Dulquer delivers a nuanced performance. The screenplay is tight and engaging.',
    spoiler: false,
    date: '2024-11-05',
    helpful: 156,
  },
  {
    id: '5',
    movieId: '8',
    userId: '5',
    userName: 'Karthik Reddy',
    userPhoto: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=100',
    rating: 5,
    title: "India's first true superhero film!",
    body: 'HanuMan is a game-changer for Telugu cinema. Amazing VFX, heartwarming story, and Teja Sajja is phenomenal. A must-watch for the entire family.',
    spoiler: false,
    date: '2024-01-20',
    helpful: 523,
  },
];
