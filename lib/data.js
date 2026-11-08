// Load cached TMDB data
import TMDB_DATA from "./tmdb_titles.json";
export * from "./constants";

export function deriveTitleStatus(t) {
  if (!t) return "released";
  if (t.releaseDate) {
    const d = new Date(t.releaseDate).getTime();
    if (!Number.isNaN(d)) {
      if (d > Date.now()) return "upcoming";
      if (t.type === "series" || t.type === "anime") {
        if (t.status === "airing" || t.inProduction) return "airing";
      }
      return "released";
    }
  }
  if (t.status === "upcoming" && t.year && t.year < new Date().getFullYear()) {
    return "released";
  }
  return t.status || "released";
}

export const TITLES = TMDB_DATA;
TITLES.forEach((t) => {
  t.status = deriveTitleStatus(t);
});

// Extra titles referenced in live feeds/notifications
const EXTRA_TITLES = [
  {
    id: "overacting",
    tmdbId: 1630420,
    title: "Overacting",
    type: "movie",
    year: 2026,
    rating: 6.8,
    backdrop: "https://image.tmdb.org/t/p/w780/5pMZA0EdgE66jcSCkfDCAtWiizk.jpg",
    poster: "https://image.tmdb.org/t/p/w500/rve2a7JXJbXivl0JakEWgc9Fhwh.jpg",
    genres: ["Comedy", "Action", "Adventure"],
    quality: "HD",
    status: "released",
  },
];

const byId = new Map();

function registerTitle(t) {
  if (!t || !t.id) return;
  const slug = t.id.toLowerCase();
  byId.set(slug, t);

  if (t.tmdbId) {
    const tid = String(t.tmdbId);
    byId.set(tid, t);
    if (t.type) {
      byId.set(`${t.type}-${tid}`, t);
    }
    byId.set(`movie-${tid}`, t);
    byId.set(`tv-${tid}`, t);
    byId.set(`series-${tid}`, t);
    byId.set(`anime-${tid}`, t);
    byId.set(`${slug}-${tid}`, t);
  }

  if (t.title) {
    const titleSlug = String(t.title)
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    byId.set(titleSlug, t);
    if (t.tmdbId) {
      byId.set(`${titleSlug}-${t.tmdbId}`, t);
    }
  }
}

TITLES.forEach(registerTitle);
EXTRA_TITLES.forEach(registerTitle);

export const getTitle = (id) => {
  if (!id) return null;
  const str = String(id).toLowerCase().trim();
  if (byId.has(str)) return byId.get(str);

  // Strip prefixes like movie-, tv-, series-, anime-
  const stripped = str.replace(/^(movie|tv|series|anime)-/, "");
  if (byId.has(stripped)) return byId.get(stripped);

  // Check for trailing numeric TMDB id (e.g. "invincible-95557" -> "95557")
  const numMatch = str.match(/(?:^|-)(\d{2,})$/);
  if (numMatch && byId.has(numMatch[1])) {
    return byId.get(numMatch[1]);
  }

  for (const [k, v] of byId.entries()) {
    if (k === str || String(v.tmdbId) === str || v.id === str) return v;
    if (v.title && v.title.toLowerCase() === str) return v;
  }
  return null;
};


// Hero banner titles for each section
export const HERO_IDS = [
  "spider-man-brand-new-day",
  "dune-part-two",
  "arcane",
  "heart-of-the-beast",
  "oppenheimer",
  "frieren-beyond-journeys-end",
  "spider-man-across-the-spider-verse",
  "interstellar",
];

export const MOVIE_HERO_IDS = [
  "spider-man-brand-new-day",
  "dune-part-two",
  "heart-of-the-beast",
  "oppenheimer",
  "gladiator-ii",
  "spider-man-across-the-spider-verse",
  "interstellar",
];

export const SERIES_HERO_IDS = [
  "arcane",
  "black-doves",
  "visionquest",
  "the-last-of-us",
  "lanterns",
  "shogun",
  "stranger-things",
  "severance",
];

export const ANIME_HERO_IDS = [
  "frieren-beyond-journeys-end",
  "attack-on-titan",
  "jujutsu-kaisen",
  "demon-slayer",
  "cyberpunk-edgerunners",
  "solo-leveling",
  "your-name",
];

// Media filtering strictly by type
export const released = TITLES.filter((t) => t.status !== "upcoming");
export const ofType = (type) => TITLES.filter((t) => t.type === type);

// Homepage lists matching reference screenshot
export const topToday = [
  "heart-of-the-beast",
  "possible-love",
  "model-citizen",
  "resident-evil",
  "the-mongoose",
  "godzilla-minus-zero",
  "black-doves",
  "spider-man-across-the-spider-verse",
  "dune-part-two",
  "arcane",
]
  .map(getTitle)
  .filter(Boolean);

export const popular = [
  "spider-man-brand-new-day",
  "south-park",
  "lanterns",
  "resident-evil",
  "visionquest",
  "dune-part-two",
  "the-dark-knight",
  "oppenheimer",
  "arcane",
  "interstellar",
  "frieren-beyond-journeys-end",
  "severance",
  "the-last-of-us",
  "deadpool-wolverine",
  "stranger-things",
  "parasite",
]
  .map(getTitle)
  .filter(Boolean);

export const trending = [
  "gladiator-ii",
  "alien-romulus",
  "the-wild-robot",
  "moana-2",
  "anora",
  "deadpool-wolverine",
  "venom-the-last-dance",
  "the-bear",
  "house-of-the-dragon",
  "fallout",
  "jujutsu-kaisen",
  "demon-slayer",
  "cyberpunk-edgerunners",
]
  .map(getTitle)
  .filter(Boolean);

// Movie-specific lists (Strictly movies matching reference screenshot)
export const trendingMovies = [
  "heart-of-the-beast",
  "resident-evil",
  "possible-love",
  "primetime",
  "the-mongoose",
  "godzilla-minus-zero",
  "model-citizen",
  "ramayana-rise-of-a-legend",
  "apocalypse-z",
  "a-dogs-perfect-christmas",
  "gladiator-ii",
  "alien-romulus",
  "the-wild-robot",
  "spider-man-brand-new-day",
  "spider-man-across-the-spider-verse",
  "dune-part-two",
  "oppenheimer",
  "the-dark-knight",
]
  .map(getTitle)
  .filter((t) => t && t.type === "movie");

export const topMovies = [
  "the-dark-knight",
  "oppenheimer",
  "interstellar",
  "inception",
  "the-shawshank-redemption",
  "the-godfather",
  "spider-man-across-the-spider-verse",
  "dune-part-two",
  "parasite",
  "whiplash",
]
  .map(getTitle)
  .filter((t) => t && t.type === "movie");

export const popularMovies = [
  "spider-man-brand-new-day",
  "dune-part-two",
  "the-dark-knight",
  "oppenheimer",
  "interstellar",
  "inception",
  "deadpool-wolverine",
  "the-batman",
  "everything-everywhere-all-at-once",
  "gladiator-ii",
]
  .map(getTitle)
  .filter((t) => t && t.type === "movie");

// Series-specific lists (Strictly series matching reference screenshot)
export const trendingSeries = [
  "black-doves",
  "campus-drivers",
  "dead-end-job",
  "visionquest",
  "dexter-resurrection",
  "mobland",
  "the-remarried-empress",
  "nocturne",
  "the-greatest",
  "lupin",
  "arcane",
  "the-last-of-us",
  "shogun",
  "squid-game",
  "stranger-things",
  "severance",
]
  .map(getTitle)
  .filter((t) => t && t.type === "series");

export const topSeries = [
  "breaking-bad",
  "arcane",
  "chernobyl",
  "the-last-of-us",
  "shogun",
  "severance",
  "stranger-things",
  "visionquest",
  "the-boys",
  "silo",
]
  .map(getTitle)
  .filter((t) => t && t.type === "series");

export const popularSeries = [
  "visionquest",
  "black-doves",
  "south-park",
  "lanterns",
  "arcane",
  "the-last-of-us",
  "shogun",
  "breaking-bad",
  "stranger-things",
  "house-of-the-dragon",
]
  .map(getTitle)
  .filter((t) => t && t.type === "series");

// Anime-specific lists (Strictly anime matching reference screenshot)
export const topAnime = [
  "steel-ball-run-jojos-bizarre-adventure",
  "the-exiled-heavy-knight",
  "one-piece",
  "the-ramparts-of-ice-season-2",
  "frieren-beyond-journeys-end",
  "attack-on-titan",
  "jujutsu-kaisen",
  "demon-slayer",
  "death-note",
  "solo-leveling",
]
  .map(getTitle)
  .filter((t) => t && t.type === "anime");

export const trendingAnime = [
  "chainsaw-man",
  "demon-slayer",
  "solo-leveling",
  "jujutsu-kaisen",
  "frieren-beyond-journeys-end",
  "cyberpunk-edgerunners",
  "attack-on-titan",
  "your-name",
]
  .map(getTitle)
  .filter((t) => t && t.type === "anime");

export const popularAnime = [
  "one-piece",
  "frieren-beyond-journeys-end",
  "attack-on-titan",
  "jujutsu-kaisen",
  "demon-slayer",
  "death-note",
  "chainsaw-man",
  "solo-leveling",
]
  .map(getTitle)
  .filter((t) => t && t.type === "anime");

export const topAiringAnime = [
  {
    id: "the-apothecary-diaries",
    title: "The Apothecary Diaries Season 3",
    typeLabel: "TV",
    year: 2026,
    rating: 8.5,
    schedule: "Episode 6 · Nov 6 at 19:30",
    poster: "https://image.tmdb.org/t/p/w500/yZ0E5g8c1wZq4aW2T7E5q8gZ3.jpg",
  },
  {
    id: "black-clover-season-2",
    title: "Black Clover Season 2",
    typeLabel: "TV",
    year: 2026,
    rating: 8.7,
    schedule: "Episode 6 · Nov 7 at 19:30",
    poster: "https://image.tmdb.org/t/p/w500/vQ9p8X7r2B5Y6Z9r8K2T5Q1p8X7.jpg",
  },
  {
    id: "overgeared",
    title: "Overgeared",
    typeLabel: "ONA",
    year: 2026,
    rating: 7.6,
    schedule: "Episode 7 · Nov 8 at 20:00",
    poster: "https://image.tmdb.org/t/p/w500/wQ9p8X7r2B5Y6Z9r8K2T5Q1p8X7.jpg",
  },
  {
    id: "reincarnated-as-a-sword-season-2",
    title: "Reincarnated as a Sword Season 2",
    typeLabel: "ONA",
    year: 2026,
    rating: 7.5,
    schedule: "Episode 7 · Nov 11 at 21:00",
    poster: "https://image.tmdb.org/t/p/w500/xQ9p8X7r2B5Y6Z9r8K2T5Q1p8X7.jpg",
  },
  {
    id: "blue-box-season-2",
    title: "Blue Box Season 2",
    typeLabel: "TV",
    year: 2026,
    rating: 8.1,
    schedule: "Episode 5 · Nov 8 at 13:00",
    poster: "https://image.tmdb.org/t/p/w500/yQ9p8X7r2B5Y6Z9r8K2T5Q1p8X7.jpg",
  },
];

export const comingSoon = TITLES.filter((t) => t.status === "upcoming").sort((a, b) =>
  (a.releaseDate || "").localeCompare(b.releaseDate || "")
);

export const airing = TITLES.filter((t) => t.status === "airing");

export function searchTitles(q, limit = 10) {
  const s = String(q || "").trim().toLowerCase();
  if (!s) return [];
  return TITLES.filter(
    (t) =>
      t.title.toLowerCase().includes(s) ||
      (t.genres || []).some((g) => g.toLowerCase().includes(s)) ||
      String(t.year) === s ||
      (Array.isArray(t.cast) && t.cast.some((c) => (c.name || "").toLowerCase().includes(s)))
  ).slice(0, limit);
}

export function getCollection(id) {
  if (!id) return null;
  const str = String(id).toLowerCase().trim();
  for (const t of TITLES) {
    if (t.collection) {
      const col = t.collection;
      const slug = (col.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (String(col.id) === str || slug === str || slug.replace(/-collection$/, "") === str) {
        return col;
      }
    }
  }
  return null;
}

export function getAllCollections() {
  const map = new Map();
  for (const t of TITLES) {
    if (t.collection && !map.has(t.collection.id)) {
      map.set(t.collection.id, t.collection);
    }
  }
  return Array.from(map.values());
}
