// Server-only data access layer for Vivarium
// Never imported by client modules - keeps the 2.5 MB catalogue JSON out of client bundles

import TMDB_DATA from "./tmdb_titles.json" with { type: "json" };
import { SERVICES, STUDIOS, deriveTitleStatus } from "./constants.js";

// Sanitize and derive status for all titles
const TITLES = (TMDB_DATA || []).map((t) => ({
  ...t,
  status: deriveTitleStatus(t),
  quality: t.quality === "Cam" || t.quality === "CAM" ? "HD" : t.quality || (t.type === "movie" ? "HD" : null),
  badge: t.badge === "Cam" || t.badge === "CAM" ? "HD" : t.badge || null,
}));

// Trim title object to minimal card fields for client props
export function toHeroTitle(t) {
  if (!t) return null;
  return {
    id: t.id,
    title: t.title,
    type: t.type,
    year: t.year || null,
    rating: typeof t.rating === "number" ? Number(t.rating.toFixed(1)) : t.rating || null,
    poster: t.poster || null,
    backdrop: t.backdrop || null,
    logo: t.logo || null,
    runtime: t.runtime || null,
    seasons: t.seasons || 1,
    cert: t.cert || "PG-13",
    quality: t.quality || "HD",
    badge: t.badge || null,
    overview: t.overview ? t.overview.slice(0, 240) : "",
    service: t.service || null,
    genres: t.genres || [],
  };
}

export function toCardTitle(t) {
  if (!t) return null;
  return {
    id: t.id,
    tmdbId: t.tmdbId || null,
    title: t.title,
    type: t.type,
    year: t.year || null,
    rating: typeof t.rating === "number" ? Number(t.rating.toFixed(1)) : t.rating || null,
    poster: t.poster || null,
    quality: t.quality || "HD",
    badge: t.badge || null,
    service: t.service || null,
    studio: t.studio || null,
    releaseDate: t.releaseDate || null,
    airDay: t.airDay || null,
    country: t.country || null,
    language: t.language || null,
    genres: t.genres || [],
    cert: t.cert || "PG-13",
  };
}

const HERO_IDS = [
  "ramayana-rise-of-a-legend",
  "visionquest",
  "heart-of-the-beast",
  "spider-man-brand-new-day",
  "natsamrat",
];

const titleMap = new Map();
TITLES.forEach((t) => {
  titleMap.set(t.id.toLowerCase(), t);
  if (t.tmdbId) titleMap.set(String(t.tmdbId), t);
});

export function getServerTitle(id) {
  if (!id) return null;
  return titleMap.get(String(id).toLowerCase().trim()) || null;
}

export function getHomePageData() {
  const heroItems = HERO_IDS.map((id) => toHeroTitle(titleMap.get(id))).filter(Boolean);

  const released = TITLES.filter((t) => t.status !== "upcoming");
  const topToday = released.slice(0, 10).map(toCardTitle);
  const popular = released.slice(10, 22).map(toCardTitle);
  const trending = released.slice(22, 34).map(toCardTitle);

  // Group by service (cap at 10 per service)
  const serviceItemsMap = {};
  SERVICES.forEach((s) => {
    serviceItemsMap[s.id] = released
      .filter((t) => t.service === s.id)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
      .map(toCardTitle);
  });

  const comingSoon = TITLES.filter((t) => t.status === "upcoming")
    .sort((a, b) => new Date(a.releaseDate || 0) - new Date(b.releaseDate || 0))
    .slice(0, 10)
    .map(toCardTitle);

  const airing = TITLES.filter((t) => t.status === "airing" || t.type === "series" || t.type === "anime")
    .slice(0, 10)
    .map(toCardTitle);

  // Compact lookup map for continue-watching hydration
  const titleCardMap = {};
  TITLES.forEach((t) => {
    if (t.id) {
      titleCardMap[t.id] = {
        id: t.id,
        title: t.title,
        type: t.type,
        poster: t.poster || null,
        rating: typeof t.rating === "number" ? Number(t.rating.toFixed(1)) : t.rating || null,
        year: t.year || null,
      };
    }
  });

  return {
    heroItems,
    topToday,
    popular,
    trending,
    serviceItemsMap,
    comingSoon,
    airing,
    titleCardMap,
  };
}

export function getMoviesPageData() {
  const allMovies = TITLES.filter((t) => t.type === "movie").map(toCardTitle);
  const heroItems = allMovies.slice(0, 5);
  const top = allMovies.filter((t) => t.status !== "upcoming").slice(0, 10);
  const trending = allMovies.filter((t) => t.status !== "upcoming").slice(10, 24);
  const popular = allMovies.filter((t) => t.status !== "upcoming").slice(24, 38);
  return { allMovies, heroItems, top, trending, popular };
}

export function getSeriesPageData() {
  const allSeries = TITLES.filter((t) => t.type === "series").map(toCardTitle);
  const heroItems = allSeries.slice(0, 5);
  const top = allSeries.filter((t) => t.status !== "upcoming").slice(0, 10);
  const trending = allSeries.filter((t) => t.status !== "upcoming").slice(10, 24);
  const popular = allSeries.filter((t) => t.status !== "upcoming").slice(24, 38);
  return { allSeries, heroItems, top, trending, popular };
}

export function getAnimePageData() {
  const allAnime = TITLES.filter((t) => t.type === "anime").map(toCardTitle);
  const heroItems = allAnime.slice(0, 5);
  const top = allAnime.filter((t) => t.status !== "upcoming").slice(0, 10);
  const trending = allAnime.filter((t) => t.status !== "upcoming").slice(10, 24);
  const popular = allAnime.filter((t) => t.status !== "upcoming").slice(24, 38);
  const topAiring = [
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
  return { allAnime, heroItems, top, trending, popular, topAiring };
}

export function getSchedulePageData() {
  const airing = TITLES.filter((t) => t.status === "airing").map(toCardTitle);
  const comingSoon = TITLES.filter((t) => t.status === "upcoming")
    .sort((a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || ""))
    .map(toCardTitle);
  return { airing, comingSoon };
}

export function getDiscoverPageData() {
  return {
    initialTitles: TITLES.map(toCardTitle),
  };
}

export function getWatchPartyData() {
  const options = TITLES.filter((t) => t.status !== "upcoming").map((t) => ({
    value: t.id,
    label: t.title,
  }));
  return { options };
}

export function getSearchPageData() {
  const fallback = TITLES.filter((t) => t.status !== "upcoming")
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 12)
    .map(toCardTitle);
  return { fallback };
}

export function getCardMap() {
  const cardMap = {};
  for (const t of TITLES) {
    if (t.id) {
      cardMap[t.id.toLowerCase()] = {
        id: t.id,
        title: t.title,
        type: t.type,
        year: t.year || null,
        rating: typeof t.rating === "number" ? Number(t.rating.toFixed(1)) : t.rating || null,
        poster: t.poster || null,
        quality: t.quality || "HD",
        genres: t.genres || [],
      };
    }
  }
  return { cardMap };
}

const byId = new Map();
function registerTitle(t) {
  if (!t || !t.id) return;
  const slug = t.id.toLowerCase();
  byId.set(slug, t);
  if (t.tmdbId) {
    const tid = String(t.tmdbId);
    byId.set(tid, t);
    byId.set(`movie-${tid}`, t);
    byId.set(`tv-${tid}`, t);
    byId.set(`series-${tid}`, t);
    byId.set(`anime-${tid}`, t);
  }
}
TITLES.forEach(registerTitle);

export function getTitle(id) {
  if (!id) return null;
  const str = String(id).toLowerCase().trim();
  if (byId.has(str)) return byId.get(str);
  const stripped = str.replace(/^(movie|tv|series|anime)-/, "");
  if (byId.has(stripped)) return byId.get(stripped);
  const numMatch = str.match(/(\d+)$/);
  if (numMatch && byId.has(numMatch[1])) return byId.get(numMatch[1]);
  return null;
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

export function getAllTitleIds() {
  return TITLES.map((t) => t.id).filter(Boolean);
}

export function getAllCardTitles() {
  return TITLES.map(toCardTitle);
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
