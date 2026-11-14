// Server-only data access layer for DIVINE
// Never imported by client modules - keeps the 2.5 MB catalogue JSON out of client bundles

import TMDB_DATA from "./tmdb_titles.json" with { type: "json" };
import { STUDIOS, deriveTitleStatus, KNOWN_SEASONS, TMDB_IMDB_MAP } from "./constants.js";
import {
  fetchTrending,
  fetchPopular,
  fetchTopRated,
  fetchUpcoming,
  fetchAiringToday,
  fetchBollywood,
  fetchTollywood,
} from "./tmdb.js";

// Sanitize and derive status for all titles
const TITLES = (TMDB_DATA || []).map((t) => {
  const isSeries = t.type === "series" || t.type === "anime";
  const knownSeason =
    (t.id && KNOWN_SEASONS[t.id.toLowerCase()]) ||
    (t.tmdbId && KNOWN_SEASONS[String(t.tmdbId)]) ||
    null;

  let seasonsList = Array.isArray(t.seasonsList) ? t.seasonsList : null;
  let arraySeasonCount = null;
  if (Array.isArray(t.seasons)) {
    seasonsList = seasonsList || t.seasons;
    const valid = t.seasons.filter((s) => s && s.seasonNumber !== 0 && s.season_number !== 0);
    arraySeasonCount = valid.length || t.seasons.length || null;
  } else if (seasonsList) {
    arraySeasonCount = seasonsList.length || null;
  }

  const numSeasons =
    typeof t.seasons === "number"
      ? t.seasons
      : typeof t.numberOfSeasons === "number"
      ? t.numberOfSeasons
      : typeof t.number_of_seasons === "number"
      ? t.number_of_seasons
      : arraySeasonCount;

  const realSeasons = isSeries
    ? knownSeason || numSeasons || 1
    : null;

  if (isSeries && realSeasons > 1) {
    const expandedList = [];
    const existingMap = new Map();
    if (Array.isArray(seasonsList)) {
      seasonsList.forEach((s) => {
        if (s && s.seasonNumber) existingMap.set(s.seasonNumber, s);
      });
    }
    for (let s = 1; s <= realSeasons; s++) {
      if (existingMap.has(s)) {
        expandedList.push(existingMap.get(s));
      } else {
        expandedList.push({
          seasonNumber: s,
          name: `Season ${s}`,
          episodeCount: 12,
          airDate: t.releaseDate || "",
          year: t.year ? String(t.year) : null,
          poster: t.poster || null,
          episodes: [],
        });
      }
    }
    seasonsList = expandedList;
  }

  const imdbId =
    t.imdbId ||
    t.imdb_id ||
    (t.tmdbId && TMDB_IMDB_MAP[String(t.tmdbId)]) ||
    (t.id && TMDB_IMDB_MAP[t.id.toLowerCase()]) ||
    null;

  return {
    ...t,
    imdbId,
    numberOfSeasons: realSeasons,
    seasons: realSeasons,
    seasonsList: seasonsList || t.seasonsList || null,
    status: deriveTitleStatus(t),
    quality: t.quality || null,
    badge: t.badge || null,
  };
});

// Trim title object to minimal card fields for client props
export function toHeroTitle(t) {
  if (!t) return null;
  const s = Array.isArray(t.seasons)
    ? t.seasons.filter((season) => season && season.season_number !== 0).length || t.seasons.length || null
    : typeof t.seasons === "number"
    ? t.seasons
    : typeof t.numberOfSeasons === "number"
    ? t.numberOfSeasons
    : typeof t.number_of_seasons === "number"
    ? t.number_of_seasons
    : null;

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
    seasons: s,
    cert: t.cert || null,
    quality: t.quality || null,
    badge: t.badge || null,
    overview: t.overview ? t.overview.slice(0, 240) : "",
    service: t.service || null,
    genres: t.genres || [],
  };
}

export function toCardTitle(t) {
  if (!t) return null;
  const s = Array.isArray(t.seasons)
    ? t.seasons.filter((season) => season && season.season_number !== 0).length || t.seasons.length || null
    : typeof t.seasons === "number"
    ? t.seasons
    : typeof t.numberOfSeasons === "number"
    ? t.numberOfSeasons
    : typeof t.number_of_seasons === "number"
    ? t.number_of_seasons
    : null;

  return {
    id: t.id,
    tmdbId: t.tmdbId || null,
    title: t.title,
    type: t.type,
    year: t.year || null,
    rating: typeof t.rating === "number" ? Number(t.rating.toFixed(1)) : t.rating || null,
    poster: t.poster || null,
    backdrop: t.backdrop || null,
    logo: t.logo || null,
    quality: t.quality || null,
    badge: t.badge || null,
    service: t.service || null,
    studio: t.studio || null,
    releaseDate: t.releaseDate || null,
    airDay: t.airDay || null,
    country: t.country || null,
    language: t.language || null,
    genres: t.genres || [],
    cert: t.cert || null,
    seasons: s,
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

export async function getHomePageData() {
  let heroItems = [];
  let topToday = [];
  let trendingMovies = [];
  let trendingSeries = [];
  let popular = [];
  let comingSoon = [];
  let airing = [];
  let bollywood = [];
  let tollywood = [];

  const hasApiKey = Boolean(process.env.TMDB_API_KEY);

  if (hasApiKey) {
    try {
      const [trendAll, trendMWeek, trendS, popM, upcM, airS, bollyM, tollyM] = await Promise.all([
        fetchTrending("all", "day").catch(() => []),
        fetchTrending("movie", "week").catch(() => []),
        fetchTrending("tv", "day").catch(() => []),
        fetchPopular("movie", 1).catch(() => []),
        fetchUpcoming(1).catch(() => []),
        fetchAiringToday(1).catch(() => []),
        fetchBollywood(1).catch(() => []),
        fetchTollywood(1).catch(() => []),
      ]);

      if (trendAll && trendAll.length > 0) {
        // Platform-wide Top 10 Today across all movies and series
        topToday = trendAll.slice(0, 10).map(toCardTitle).filter(Boolean);
      }

      if (trendMWeek && trendMWeek.length > 0) {
        heroItems = trendMWeek.slice(0, 6).map(toHeroTitle).filter(Boolean);

        // Deduplicate Trending Movies against Top 10 so they NEVER repeat the same titles!
        const topIds = new Set(topToday.map((t) => String(t.id || t.tmdbId)));
        const distinctTrending = trendMWeek.filter((t) => !topIds.has(String(t.id || t.tmdbId)));
        trendingMovies = (distinctTrending.length >= 8 ? distinctTrending : trendMWeek)
          .slice(0, 16)
          .map(toCardTitle)
          .filter(Boolean);
      }
      if (trendS && trendS.length > 0) {
        trendingSeries = trendS.slice(0, 16).map(toCardTitle).filter(Boolean);
      }
      if (popM && popM.length > 0) {
        popular = popM.slice(0, 16).map(toCardTitle).filter(Boolean);
      }
      if (upcM && upcM.length > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const futureOnly = upcM.filter((t) => t.releaseDate && t.releaseDate >= todayStr);
        comingSoon = (futureOnly.length > 0 ? futureOnly : upcM)
          .slice(0, 12)
          .map(toCardTitle)
          .filter(Boolean);
      }
      if (airS && airS.length > 0) {
        airing = airS.slice(0, 12).map(toCardTitle).filter(Boolean);
      }
      if (bollyM && bollyM.length > 0) {
        bollywood = bollyM.slice(0, 16).map(toCardTitle).filter(Boolean);
      }
      if (tollyM && tollyM.length > 0) {
        tollywood = tollyM.slice(0, 16).map(toCardTitle).filter(Boolean);
      }
    } catch (e) {
      console.warn("Failed to fetch live home page data from TMDB:", e);
    }
  }

  // Fallback to static catalogue if live fetch was empty or failed
  if (!heroItems.length) {
    heroItems = HERO_IDS.map((id) => toHeroTitle(titleMap.get(id))).filter(Boolean);
  }
  const released = TITLES.filter((t) => t.status !== "upcoming");
  const releasedMovies = released.filter((t) => t.type === "movie");
  const releasedSeries = released.filter((t) => t.type === "series" || t.type === "anime");

  if (!topToday.length) {
    topToday = releasedMovies.slice(0, 10).map(toCardTitle);
  }
  if (!trendingMovies.length) {
    trendingMovies = releasedMovies.slice(0, 14).map(toCardTitle);
  }
  if (!trendingSeries.length) {
    trendingSeries = releasedSeries.slice(0, 14).map(toCardTitle);
  }
  if (!popular.length) {
    popular = releasedMovies.slice(10, 24).map(toCardTitle);
  }
  if (!comingSoon.length) {
    const todayStr = new Date().toISOString().split("T")[0];
    comingSoon = TITLES.filter(
      (t) =>
        (t.status === "upcoming" || (t.releaseDate && t.releaseDate >= todayStr)) &&
        t.releaseDate &&
        t.releaseDate >= todayStr
    )
      .sort((a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || ""))
      .slice(0, 10)
      .map(toCardTitle);
  }
  if (!airing.length) {
    airing = TITLES.filter((t) => t.status === "airing" || t.type === "series" || t.type === "anime")
      .slice(0, 10)
      .map(toCardTitle);
  }

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
        runtime: t.runtime || null,
        year: t.year || null,
      };
    }
  });

  return {
    heroItems,
    topToday,
    trendingMovies,
    trendingSeries,
    popular,
    bollywood,
    tollywood,
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
  const topAiring = TITLES
    .filter((title) => title.type === "anime" && title.status === "airing" && title.nextEpisodeToAir?.airDate)
    .map((title) => ({
      id: title.id,
      title: title.title,
      typeLabel: "TV",
      year: title.year || null,
      rating: title.rating || null,
      schedule: title.nextEpisodeToAir.name || title.nextEpisodeToAir.airDate,
      poster: title.poster || null,
    }));
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
        quality: t.quality || null,
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
