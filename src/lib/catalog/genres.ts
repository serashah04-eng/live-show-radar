export interface GenreDef {
  slug: string;
  name: string;
}

/** Extensible genre list. New genres can be added here and seeded with scripts/seed-catalog.mjs. */
export const GENRES: GenreDef[] = [
  { slug: "indie", name: "Indie" },
  { slug: "indie-folk", name: "Indie Folk" },
  { slug: "indie-rock", name: "Indie Rock" },
  { slug: "indie-pop", name: "Indie Pop" },
  { slug: "alternative", name: "Alternative" },
  { slug: "singer-songwriter", name: "Singer-Songwriter" },
  { slug: "bollywood", name: "Bollywood" },
  { slug: "south-indian-film", name: "South Indian Film" },
  { slug: "punjabi-pop", name: "Punjabi Pop" },
  { slug: "hip-hop", name: "Hip-Hop" },
  { slug: "electronic", name: "Electronic" },
  { slug: "edm", name: "EDM" },
  { slug: "techno-house", name: "Techno and House" },
  { slug: "rock", name: "Rock" },
  { slug: "hard-rock", name: "Hard Rock" },
  { slug: "punk", name: "Punk" },
  { slug: "metal", name: "Metal" },
  { slug: "psychedelic", name: "Psychedelic" },
  { slug: "pop", name: "Pop" },
  { slug: "rnb", name: "R&B" },
  { slug: "funk-soul", name: "Funk and Soul" },
  { slug: "jazz", name: "Jazz" },
  { slug: "blues", name: "Blues" },
  { slug: "reggae", name: "Reggae" },
  { slug: "latin", name: "Latin" },
  { slug: "kpop", name: "K-Pop" },
  { slug: "ambient", name: "Ambient" },
  { slug: "folk-fusion", name: "Folk Fusion" },
  { slug: "sufi-ghazal", name: "Sufi and Ghazal" },
  { slug: "hindustani-classical", name: "Hindustani Classical" },
  { slug: "carnatic", name: "Carnatic" },
  { slug: "classical-fusion", name: "Classical Fusion" },
  { slug: "international", name: "International" },
];
