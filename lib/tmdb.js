// TMDB API integration for DIVINE
import TMDB_DATA from "./tmdb_titles.json" with { type: "json" };

const TMDB_CATALOG_BY_ID = new Map();
const LOGO_CACHE = new Map();
(TMDB_DATA || []).forEach((t) => {
  if (t.tmdbId) {
    TMDB_CATALOG_BY_ID.set(t.tmdbId, t.id);
    if (t.logo) {
      LOGO_CACHE.set(String(t.tmdbId), t.logo);
      if (t.type) LOGO_CACHE.set(`${t.type}-${t.tmdbId}`, t.logo);
      if (t.id) LOGO_CACHE.set(t.id.toLowerCase(), t.logo);
    }
  }
});

function getTmdbApiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is missing. Please configure TMDB_API_KEY in your server environment.");
  }
  return key;
}

const TMDB_BASE = "https://api.themoviedb.org/3";

import { SERVICES, STUDIOS, GENRE_MAP, KNOWN_SEASONS } from "./constants.js";
export { SERVICES, STUDIOS, GENRE_MAP, KNOWN_SEASONS };

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function computeHues(id, title = "") {
  let hash = 0;
  const s = String(id) + String(title);
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) % 360;
  }
  return [hash, (hash + 140) % 360];
}

export function normalizeTmdbItem(raw, defaultType = "movie", collectionData = null, seasonData = null) {
  if (!raw || !raw.id) return null;
  const isMovie =
    raw.media_type === "movie" ||
    (raw.media_type === "tv"
      ? false
      : raw.first_air_date
      ? false
      : raw.release_date
      ? true
      : defaultType === "movie");
  const tmdbId = raw.id;
  const title = raw.title || raw.name || raw.original_title || raw.original_name || "Untitled";

  const isAnime =
    raw.original_language === "ja" &&
    (raw.genres?.some((g) => g.id === 16 || g.name === "Animation") ||
      raw.genre_ids?.includes(16));

  const type = isAnime ? "anime" : isMovie ? "movie" : "series";
  const slug = slugify(title);
  const knownId = TMDB_CATALOG_BY_ID.get(tmdbId);
  const id = knownId || (slug ? `${type}-${slug}-${tmdbId}` : `${type}-${tmdbId}`);

  const releaseDate = raw.release_date || raw.first_air_date || "";
  const year = parseInt(releaseDate.slice(0, 4)) || null;

  const runtime = isMovie
    ? raw.runtime || null
    : (raw.episode_run_time && raw.episode_run_time[0]) || null;

  const knownSeason =
    (tmdbId && KNOWN_SEASONS[String(tmdbId)]) ||
    (slug && KNOWN_SEASONS[slug]) ||
    (knownId && KNOWN_SEASONS[knownId.toLowerCase()]) ||
    null;

  const seasons = isMovie
    ? null
    : typeof raw.number_of_seasons === "number"
    ? raw.number_of_seasons
    : knownSeason ||
      (Array.isArray(raw.seasons)
        ? raw.seasons.filter((s) => s && s.season_number !== 0).length || null
        : null);

  let cert = null;
  if (isMovie && raw.release_dates?.results) {
    const us = raw.release_dates.results.find((r) => r.iso_3166_1 === "US" || r.iso_3166_1 === "GB");
    if (us?.release_dates) {
      for (const d of us.release_dates) {
        if (d.certification) {
          cert = d.certification;
          break;
        }
      }
    }
  } else if (!isMovie && raw.content_ratings?.results) {
    const us = raw.content_ratings.results.find((r) => r.iso_3166_1 === "US" || r.iso_3166_1 === "GB");
    if (us?.rating) cert = us.rating;
  }

  const rating = Number((raw.vote_average || 0).toFixed(1));
  const overview = raw.overview || "No synopsis available.";

  const genres = raw.genres
    ? raw.genres.map((g) => GENRE_MAP[g.id] || g.name).filter(Boolean)
    : (raw.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean);

  // Logo
  const logoObj =
    raw.images?.logos?.find((l) => l.iso_639_1 === "en") || raw.images?.logos?.[0];
  const logo = logoObj ? `https://image.tmdb.org/t/p/w500${logoObj.file_path}` : null;

  // Videos
  const videos = (raw.videos?.results || [])
    .filter((v) => v.site === "YouTube")
    .map((v) => ({
      id: v.id,
      name: v.name,
      key: v.key,
      type: v.type,
      thumbnail: `https://img.youtube.com/vi/${v.key}/mqdefault.jpg`,
    }));

  const trailer = raw.videos?.results?.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );
  const trailerKey = trailer
    ? trailer.key
    : videos[0]?.key || null;

  const poster = raw.poster_path
    ? `https://image.tmdb.org/t/p/w500${raw.poster_path}`
    : raw.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${raw.backdrop_path}`
    : null;
  const backdrop = raw.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}`
    : poster
    ? `https://image.tmdb.org/t/p/w1280${raw.poster_path}`
    : null;

  const cast = (raw.credits?.cast || []).slice(0, 10).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
  }));

  const director = isMovie
    ? raw.credits?.crew?.find((c) => c.job === "Director")?.name || null
    : raw.created_by?.[0]?.name || null;

  // Collection handling
  let collection = null;
  let upcomingPill = null;
  if (collectionData && collectionData.parts) {
    const parts = collectionData.parts
      .map((p) => ({
        id: slugify(p.title),
        tmdbId: p.id,
        title: p.title,
        year: p.release_date ? p.release_date.slice(0, 4) : "",
        releaseDate: p.release_date || "",
        rating: Number((p.vote_average || 0).toFixed(1)),
        backdrop: p.backdrop_path ? `https://image.tmdb.org/t/p/w780${p.backdrop_path}` : null,
        poster: p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : null,
      }))
      .sort((a, b) => (a.year || "").localeCompare(b.year || ""));

    collection = {
      id: collectionData.id,
      name: collectionData.name,
      backdrop: collectionData.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${collectionData.backdrop_path}`
        : null,
      parts,
    };

    const nextPart = parts.find(
      (p) =>
        p.year > year ||
        !p.releaseDate ||
        new Date(p.releaseDate) > new Date(releaseDate)
    );
    if (nextPart) {
      upcomingPill = `${nextPart.title} coming ${nextPart.year || "2027"}`;
    }
  }

  // Reviews
  const reviews = (raw.reviews?.results || []).slice(0, 6).map((r) => ({
    id: r.id,
    author: r.author,
    rating: r.author_details?.rating || null,
    content: r.content,
    createdAt: r.created_at,
  }));

  // Actual TMDB recommendations & similar items + collection parts
  const rawRecs = [
    ...(collectionData?.parts || []).filter((p) => p.id !== raw.id),
    ...(raw.recommendations?.results || []),
    ...(raw.similar?.results || []),
  ];
  const seenRecs = new Set();
  const recommendations = [];
  for (const r of rawRecs) {
    if (!r || !r.id || seenRecs.has(r.id)) continue;
    seenRecs.add(r.id);
    const recTitle = r.title || r.name;
    if (!recTitle) continue;
    const recYear = (r.release_date || r.first_air_date || "").slice(0, 4) || String(year);
    const recSlug = slugify(recTitle);

    let matchReason = genres?.[0] ? `${genres[0]} · Similar Vibe` : "Similar Vibe";
    let matchType = "genre";
    if (collectionData?.parts?.some((p) => p.id === r.id)) {
      matchReason = collectionData.name || "Same Franchise";
      matchType = "franchise";
    }

    recommendations.push({
      id: recSlug || `${type}-${r.id}`,
      tmdbId: r.id,
      title: recTitle,
      type: isAnime ? "anime" : isMovie ? "movie" : "series",
      year: parseInt(recYear) || year,
      rating: r.vote_average ? Number(r.vote_average.toFixed(1)) : null,
      backdrop: r.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}`
        : r.poster_path
        ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
        : null,
      poster: r.poster_path
        ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
        : null,
      quality: null,
      matchReason,
      matchType,
    });
    if (recommendations.length >= 16) break;
  }

  const about = {
    tagline: raw.tagline || "",
    budget: raw.budget ? `$${raw.budget.toLocaleString()}` : null,
    revenue: raw.revenue ? `$${raw.revenue.toLocaleString()}` : null,
    status: raw.status || "Released",
    originalTitle: raw.original_title || raw.original_name || title,
    originalLanguage:
      raw.spoken_languages?.[0]?.english_name || raw.original_language || "English",
  };

  const isFuture = Boolean(releaseDate && new Date(releaseDate).getTime() > Date.now());
  const status =
    isFuture || raw.status === "In Production" || raw.status === "Planned"
      ? "upcoming"
      : !isMovie && (raw.in_production || raw.status === "Returning Series")
      ? "airing"
      : "released";

  const hues = computeHues(tmdbId, title);

  const airDate = raw.next_episode_to_air?.air_date || "";
  const airDay = airDate
    ? new Date(`${airDate}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
    : null;
  const nextEpisodeToAir = raw.next_episode_to_air
    ? {
        id: raw.next_episode_to_air.id,
        name: raw.next_episode_to_air.name || "",
        airDate,
        seasonNumber: raw.next_episode_to_air.season_number || null,
        episodeNumber: raw.next_episode_to_air.episode_number || null,
      }
    : null;

  const service = null;
  const studio = null;

  const episodesList = seasonData?.episodes
    ? seasonData.episodes.map((ep) => ({
        episodeNumber: ep.episode_number,
        title: ep.name || "",
        airDate: ep.air_date || "",
        runtime: ep.runtime || null,
        still: ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : backdrop,
        overview: ep.overview || "",
      }))
    : null;

  const seasonsList = raw.seasons && raw.seasons.length > 0
    ? raw.seasons
        .filter((s) => s.season_number > 0)
        .map((s) => ({
          seasonNumber: s.season_number,
          name: s.name || `Season ${s.season_number}`,
          episodeCount: s.episode_count || 0,
          airDate: s.air_date || "",
          year: s.air_date ? s.air_date.slice(0, 4) : year ? String(year) : null,
          poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : poster,
          episodes: s.season_number === 1 ? episodesList : null,
        }))
    : episodesList
    ? [
        {
          seasonNumber: 1,
          name: seasonData?.name || "Season 1",
          episodeCount: episodesList.length,
          airDate: releaseDate || "",
          year: year ? String(year) : null,
          poster,
          episodes: episodesList,
        },
      ]
    : null;

  return {
    id,
    tmdbId,
    title,
    logo,
    type,
    year,
    runtime,
    seasons,
    seasonsList,
    episodes: episodesList,
    cert,
    rating,
    overview,
    genres,
    studio,
    service,
    hues,
    motif: tmdbId % 6,
    status,
    releaseDate,
    airDay,
    nextEpisodeToAir,
    poster,
    backdrop,
    backdrops: (raw.images?.backdrops || [])
      .slice(0, 4)
      .map((b) => `https://image.tmdb.org/t/p/w780${b.file_path}`),
    trailerKey,
    videos,
    collection,
    upcomingPill,
    cast,
    director,
    reviews,
    about,
    recommendations,
  };
}

const TMDB_CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 500;

function getCached(key) {
  const entry = TMDB_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL_MS) {
    TMDB_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  if (TMDB_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = TMDB_CACHE.keys().next().value;
    if (oldestKey) TMDB_CACHE.delete(oldestKey);
  }
  TMDB_CACHE.set(key, { data, time: Date.now() });
}

export async function tmdbFetch(endpoint, params = {}, retries = 2) {
  const paramKey = new URLSearchParams(params).toString();
  const cacheKey = `${endpoint}?${paramKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const query = new URLSearchParams({
    api_key: getTmdbApiKey(),
    ...params,
  });
  const url = `${TMDB_BASE}${endpoint}?${query.toString()}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DIVINE/1.0",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`TMDB error 404: Not Found`);
      }
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 250 * (3 - retries)));
        return tmdbFetch(endpoint, params, retries - 1);
      }
      throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    setCached(cacheKey, data);
    return data;
  } catch (err) {
    if (retries > 0 && !err.message?.includes("404")) {
      await new Promise((r) => setTimeout(r, 250 * (3 - retries)));
      return tmdbFetch(endpoint, params, retries - 1);
    }
    throw err;
  }
}

export async function enrichLogos(items, maxToFetch = 12) {
  if (!Array.isArray(items) || items.length === 0) return items;

  // 1. First pass: attach known logos and known seasons
  const needFetch = [];
  for (const item of items) {
    if (!item) continue;

    // Attach known season count if this is a TV series
    if (item.type === "series" || item.type === "anime" || item.type === "tv") {
      const known =
        (item.tmdbId && KNOWN_SEASONS[String(item.tmdbId)]) ||
        (item.id && KNOWN_SEASONS[item.id.toLowerCase()]);
      if (known) item.seasons = known;
    }

    if (item.logo) {
      if (item.tmdbId) {
        LOGO_CACHE.set(String(item.tmdbId), item.logo);
        LOGO_CACHE.set(`${item.type || "movie"}-${item.tmdbId}`, item.logo);
      }
      continue;
    }
    const cachedLogo =
      (item.tmdbId && LOGO_CACHE.get(String(item.tmdbId))) ||
      (item.tmdbId && item.type && LOGO_CACHE.get(`${item.type}-${item.tmdbId}`)) ||
      (item.id && LOGO_CACHE.get(String(item.id).toLowerCase()));
    if (cachedLogo) {
      item.logo = cachedLogo;
    } else if (item.tmdbId && needFetch.length < maxToFetch) {
      needFetch.push(item);
    }
  }

  if (needFetch.length === 0) return items;

  // 2. Fetch in small concurrent chunks to prevent TLS reset / rate limiting
  const chunkSize = 4;
  for (let i = 0; i < needFetch.length; i += chunkSize) {
    const chunk = needFetch.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (item) => {
        try {
          const epType =
            item.type === "series" || item.type === "anime" || item.type === "tv"
              ? "tv"
              : "movie";

          if (epType === "tv") {
            const tvData = await tmdbFetch(`/${epType}/${item.tmdbId}`, {
              append_to_response: "images",
              include_image_language: "en,null",
            });
            if (typeof tvData?.number_of_seasons === "number") {
              item.seasons = tvData.number_of_seasons;
              KNOWN_SEASONS[String(item.tmdbId)] = tvData.number_of_seasons;
              if (item.id) KNOWN_SEASONS[item.id.toLowerCase()] = tvData.number_of_seasons;
            }
            const logo =
              tvData?.images?.logos?.find((l) => l.iso_639_1 === "en") ||
              tvData?.images?.logos?.find((l) => !l.iso_639_1) ||
              tvData?.images?.logos?.[0];
            if (logo?.file_path) {
              const logoUrl = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
              item.logo = logoUrl;
              LOGO_CACHE.set(String(item.tmdbId), logoUrl);
              LOGO_CACHE.set(`${epType}-${item.tmdbId}`, logoUrl);
              if (item.id) LOGO_CACHE.set(String(item.id).toLowerCase(), logoUrl);
            }
          } else {
            const imgData = await tmdbFetch(`/${epType}/${item.tmdbId}/images`, {
              include_image_language: "en,null",
            });
            const logo =
              imgData?.logos?.find((l) => l.iso_639_1 === "en") ||
              imgData?.logos?.find((l) => !l.iso_639_1) ||
              imgData?.logos?.[0];
            if (logo?.file_path) {
              const logoUrl = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
              item.logo = logoUrl;
              LOGO_CACHE.set(String(item.tmdbId), logoUrl);
              LOGO_CACHE.set(`${epType}-${item.tmdbId}`, logoUrl);
              if (item.id) LOGO_CACHE.set(String(item.id).toLowerCase(), logoUrl);
            }
          }
        } catch {
          // Gracefully continue without logo if fetch fails
        }
      })
    );
  }

  return items;
}

export async function fetchLogoForId(tmdbId, type = "movie") {
  if (!tmdbId) return null;
  const tid = String(tmdbId);
  const epType = type === "series" || type === "anime" || type === "tv" ? "tv" : "movie";
  const cached = LOGO_CACHE.get(tid) || LOGO_CACHE.get(`${epType}-${tid}`);
  if (cached) return cached;

  try {
    const imgData = await tmdbFetch(`/${epType}/${tid}/images`, {
      include_image_language: "en,null",
    });
    const logo =
      imgData?.logos?.find((l) => l.iso_639_1 === "en") ||
      imgData?.logos?.find((l) => !l.iso_639_1) ||
      imgData?.logos?.[0];
    if (logo?.file_path) {
      const logoUrl = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
      LOGO_CACHE.set(tid, logoUrl);
      LOGO_CACHE.set(`${epType}-${tid}`, logoUrl);
      return logoUrl;
    }
  } catch {}
  return null;
}

const COMMON_SEARCH_ALIASES = {
  bahubli: "baahubali",
  bahubali: "baahubali",
  spidreman: "spider-man",
  spiderman: "spider-man",
  puspa: "pushpa",
  avtar: "avatar",
  kgf: "k.g.f",
  rma: "ram",
  oppenhimer: "oppenheimer",
  interstelr: "interstellar",
  bramhastra: "brahmastra",
  brahmastra: "brahmāstra",
  kalki: "kalki 2898 ad",
  streee: "stree",
  devara: "devara part 1",
  salaar: "salaar",
  singham: "singham",
  dune2: "dune part two",
  batman: "the batman",
  deadpool: "deadpool & wolverine",
};

export function getSearchTypoCandidates(query) {
  const clean = String(query || "").trim().toLowerCase();
  const set = new Set();

  if (COMMON_SEARCH_ALIASES[clean]) {
    set.add(COMMON_SEARCH_ALIASES[clean]);
  }

  // 1. Repeated letter reduction: streeee -> stree, pushhpa -> pushpa
  const collapsedToDouble = clean.replace(/(.)\1{2,}/g, "$1$1");
  if (collapsedToDouble !== clean && collapsedToDouble.length >= 2) {
    set.add(collapsedToDouble);
  }
  const collapsedToSingle = clean.replace(/(.)\1+/g, "$1");
  if (collapsedToSingle !== clean && collapsedToSingle.length >= 2) {
    set.add(collapsedToSingle);
  }

  // 2. Adjacent character transpositions: rma -> ram, spidreman -> spiderman
  for (let i = 0; i < clean.length - 1; i++) {
    const swapped = clean.slice(0, i) + clean[i + 1] + clean[i] + clean.slice(i + 2);
    set.add(swapped);
  }

  return Array.from(set).slice(0, 5);
}

export async function searchTMDB(query, limit = 20) {
  if (!query || !query.trim()) return [];
  const qClean = query.trim();
  const qLower = qClean.toLowerCase();

  const fetchCandidates = async (searchTerm) => {
    try {
      const [multiRes, discRes] = await Promise.all([
        tmdbFetch("/search/multi", { query: searchTerm }).catch(() => ({ results: [] })),
        tmdbFetch("/discover/movie", {
          with_text_query: searchTerm,
          sort_by: "popularity.desc",
        }).catch(() => ({ results: [] })),
      ]);

      const rawItems = [...(multiRes.results || []), ...(discRes.results || [])];
      const seen = new Set();
      const unique = [];

      for (const r of rawItems) {
        const id = r.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const mediaType = r.media_type || "movie";
        if (mediaType !== "movie" && mediaType !== "tv") continue;
        if (!r.poster_path && !r.backdrop_path) continue;

        const normalized = normalizeTmdbItem(r, mediaType);
        if (normalized) {
          normalized._rawPopularity = Number(r.popularity || 0);
          normalized._voteCount = Number(r.vote_count || 0);
          unique.push(normalized);
        }
      }
      return unique;
    } catch {
      return [];
    }
  };

  try {
    let items = await fetchCandidates(qClean);
    let didYouMean = null;

    // Check known aliases/misspellings proactively if alias results are vastly more popular
    const knownAlias = COMMON_SEARCH_ALIASES[qLower];
    if (knownAlias && knownAlias !== qLower) {
      const aliasItems = await fetchCandidates(knownAlias);
      if (aliasItems.length > 0) {
        const topAliasPop = Math.max(...aliasItems.map((i) => i._rawPopularity || 0));
        const topRawPop = items.length > 0 ? Math.max(...items.map((i) => i._rawPopularity || 0)) : 0;
        if (topAliasPop > topRawPop * 1.5 || items.length === 0) {
          items = aliasItems;
          didYouMean = knownAlias;
        }
      }
    }

    // Typo recovery if direct search returned 0 items
    if (items.length === 0) {
      const candidates = getSearchTypoCandidates(qClean);
      for (const cand of candidates) {
        const candItems = await fetchCandidates(cand);
        if (candItems.length > 0) {
          items = candItems;
          didYouMean = cand;
          break;
        }
      }
    }

    // Google/YouTube style Popularity + Relevance Scoring
    const targetQ = (didYouMean || qClean).toLowerCase();
    const scored = items.map((item) => {
      const titleLower = (item.title || "").toLowerCase();
      let score = Number(item._rawPopularity || item.rating || 0) * 1.5;

      // Exact title match
      if (titleLower === targetQ) {
        score += 250;
      }
      // Starts with query (e.g. "Ramayana" starts with "ram")
      else if (titleLower.startsWith(targetQ)) {
        score += 130;
      }
      // Exact word boundary match (e.g. "Siya Ke Ram")
      else if (new RegExp(`\\b${targetQ}\\b`, "i").test(titleLower)) {
        score += 90;
      }
      // Substring match
      else if (titleLower.includes(targetQ)) {
        score += 40;
      }

      // Vote count boost for widely-watched releases
      if (item._voteCount > 50) {
        score += Math.min(35, item._voteCount / 20);
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const sortedItems = scored.map((s) => s.item);

    const sliced = sortedItems.slice(0, limit);
    if (didYouMean) {
      sliced.didYouMean = didYouMean;
    }
    return enrichLogos(sliced, 6);
  } catch (err) {
    console.error("searchTMDB error:", err);
    return [];
  }
}

export async function searchPeopleTMDB(query, limit = 20) {
  if (!query || !query.trim()) return [];
  try {
    const data = await tmdbFetch("/search/person", { query: query.trim() });
    return (data.results || []).slice(0, limit).map((p) => ({
      id: `person-${p.id}`,
      tmdbId: p.id,
      type: "person",
      title: p.name,
      name: p.name,
      department: p.known_for_department,
      profile: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
      poster: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
      backdrop: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
      knownFor: (p.known_for || []).map((k) => k.title || k.name).filter(Boolean).join(", "),
    }));
  } catch (e) {
    console.error("searchPeopleTMDB error:", e);
    return [];
  }
}

function computeSimilarity(slugA, slugB) {
  if (!slugA || !slugB) return 0;
  if (slugA === slugB) return 1;
  if (slugA.includes(slugB) || slugB.includes(slugA)) return 0.8;
  const wordsA = new Set(slugA.split("-").filter(Boolean));
  const wordsB = new Set(slugB.split("-").filter(Boolean));
  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  return common / Math.max(wordsA.size, wordsB.size);
}

export async function fetchLiveTitle(type = "any", tmdbId) {
  if (!tmdbId) return null;
  try {
    let rawStr = String(tmdbId).trim();
    let detectedType = type && type !== "any" ? type : null;

    if (/^(series|tv)-/i.test(rawStr)) {
      detectedType = "tv";
      rawStr = rawStr.replace(/^(series|tv)-/i, "");
    } else if (/^anime-/i.test(rawStr)) {
      detectedType = "tv";
      rawStr = rawStr.replace(/^anime-/i, "");
    } else if (/^movie-/i.test(rawStr)) {
      detectedType = "movie";
      rawStr = rawStr.replace(/^movie-/i, "");
    }

    const numMatch = rawStr.match(/(?:^|-)(\d{2,})$/);
    const numericId = numMatch ? numMatch[1] : /^\d+$/.test(rawStr) ? rawStr : null;
    const slugPart = numMatch && numMatch.index > 0
      ? rawStr.slice(0, numMatch.index).replace(/-+$/, "")
      : isNaN(Number(rawStr))
      ? rawStr
      : null;

    let endpointType =
      detectedType === "tv" || detectedType === "series" || detectedType === "anime"
        ? "tv"
        : detectedType === "movie"
        ? "movie"
        : null;
    let resolvedId = numericId;

    if (!resolvedId && slugPart) {
      const q = slugPart.replace(/-/g, " ");
      const found = await searchTMDB(q, 8);
      let match = null;
      if (detectedType === "tv" || detectedType === "series" || detectedType === "anime") {
        match = found.find((f) => f.type === "series" || f.type === "anime");
      } else if (detectedType === "movie") {
        match = found.find((f) => f.type === "movie");
      }
      if (!match) match = found[0];
      if (match) {
        resolvedId = String(match.tmdbId);
        endpointType = match.type === "series" || match.type === "anime" ? "tv" : "movie";
      }
    }

    if (resolvedId && !endpointType) {
      // Both movie and TV could exist for this numeric ID. Check slugPart against movie and TV titles
      let movieData = null;
      let tvData = null;
      try {
        movieData = await tmdbFetch(`/movie/${resolvedId}`);
      } catch (e) {}

      try {
        tvData = await tmdbFetch(`/tv/${resolvedId}`);
      } catch (e) {}

      if (movieData && tvData && slugPart) {
        const movieSlug = slugify(movieData.title || movieData.original_title);
        const tvSlug = slugify(tvData.name || tvData.original_name);
        const movieSim = computeSimilarity(slugPart, movieSlug);
        const tvSim = computeSimilarity(slugPart, tvSlug);
        endpointType = tvSim > movieSim ? "tv" : "movie";
      } else if (tvData && !movieData) {
        endpointType = "tv";
      } else if (movieData && !tvData) {
        endpointType = "movie";
      } else if (tvData && movieData) {
        endpointType = "movie";
      }
    }

    if (!resolvedId || !endpointType) return null;

    const append =
      endpointType === "movie"
        ? "videos,credits,release_dates,similar,recommendations,images,reviews"
        : "videos,credits,content_ratings,similar,recommendations,images,reviews";

    let data = null;
    try {
      data = await tmdbFetch(`/${endpointType}/${resolvedId}`, {
        append_to_response: append,
        include_image_language: "en,null",
      });
    } catch (fetchErr) {
      // If 404, flip type
      if (fetchErr.message?.includes("404")) {
        const altType = endpointType === "movie" ? "tv" : "movie";
        const altAppend =
          altType === "movie"
            ? "videos,credits,release_dates,similar,recommendations,images,reviews"
            : "videos,credits,content_ratings,similar,recommendations,images,reviews";
        try {
          data = await tmdbFetch(`/${altType}/${resolvedId}`, {
            append_to_response: altAppend,
            include_image_language: "en,null",
          });
          endpointType = altType;
        } catch {
          return null;
        }
      } else {
        throw fetchErr;
      }
    }

    if (!data) return null;

    let collectionData = null;
    if (data.belongs_to_collection?.id) {
      try {
        collectionData = await tmdbFetch(
          `/collection/${data.belongs_to_collection.id}`
        );
      } catch (e) {}
    }

    let seasonData = null;
    if (endpointType === "tv") {
      try {
        seasonData = await tmdbFetch(`/tv/${resolvedId}/season/1`);
      } catch (e) {}
    }

    const item = normalizeTmdbItem(
      data,
      endpointType,
      collectionData,
      seasonData
    );
    if (!item) return null;

    item.id = String(tmdbId).toLowerCase();
    return item;
  } catch (err) {
    console.error(`fetchLiveTitle error for ${type}/${tmdbId}:`, err);
    return null;
  }
}

export async function fetchLiveCollection(collectionId) {
  if (!collectionId) return null;
  try {
    let resolvedId = String(collectionId).trim();
    if (isNaN(Number(resolvedId))) {
      const q = resolvedId.replace(/-/g, " ");
      const searchRes = await tmdbFetch("/search/collection", { query: q });
      const match = searchRes.results?.[0];
      if (!match || !match.id) return null;
      resolvedId = String(match.id);
    }

    const data = await tmdbFetch(`/collection/${resolvedId}`);
    if (!data || !data.parts) return null;

    const parts = (data.parts || [])
      .map((p) => ({
        id: slugify(p.title),
        tmdbId: p.id,
        title: p.title,
        year: p.release_date ? p.release_date.slice(0, 4) : "",
        releaseDate: p.release_date || "",
        rating: Number((p.vote_average || 0).toFixed(1)),
        backdrop: p.backdrop_path
          ? `https://image.tmdb.org/t/p/w780${p.backdrop_path}`
          : null,
        poster: p.poster_path
          ? `https://image.tmdb.org/t/p/w500${p.poster_path}`
          : null,
      }))
      .sort((a, b) => (a.year || "").localeCompare(b.year || ""));

    return {
      id: String(data.id),
      name: data.name,
      overview: data.overview || "",
      backdrop: data.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : null,
      poster: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null,
      parts,
    };
  } catch (err) {
    console.error(`fetchLiveCollection error for ${collectionId}:`, err);
    return null;
  }
}

export async function fetchTrending(mediaType = "all", timeWindow = "day") {
  try {
    const data = await tmdbFetch(`/trending/${mediaType}/${timeWindow}`);
    const items = (data.results || [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .map((r) => normalizeTmdbItem(r, r.media_type))
      .filter(Boolean);
    return enrichLogos(items);
  } catch (err) {
    console.error("fetchTrending error:", err);
    return [];
  }
}

export async function fetchPopular(type = "movie", page = 1) {
  try {
    const endpoint = type === "series" || type === "anime" || type === "tv" ? "tv" : "movie";
    const data = await tmdbFetch(`/${endpoint}/popular`, { page });
    const items = (data.results || [])
      .map((r) => normalizeTmdbItem(r, endpoint))
      .filter(Boolean);
    return enrichLogos(items);
  } catch (err) {
    console.error(`fetchPopular error for ${type}:`, err);
    return [];
  }
}

export async function fetchTopRated(type = "movie", page = 1) {
  try {
    const endpoint = type === "series" || type === "anime" || type === "tv" ? "tv" : "movie";
    const data = await tmdbFetch(`/${endpoint}/top_rated`, { page });
    const items = (data.results || [])
      .map((r) => normalizeTmdbItem(r, endpoint))
      .filter(Boolean);
    return enrichLogos(items);
  } catch (err) {
    console.error(`fetchTopRated error for ${type}:`, err);
    return [];
  }
}

export async function fetchNowPlaying(page = 1) {
  try {
    const data = await tmdbFetch(`/movie/now_playing`, { page });
    const items = (data.results || [])
      .map((r) => normalizeTmdbItem(r, "movie"))
      .filter(Boolean);
    return enrichLogos(items);
  } catch (err) {
    console.error("fetchNowPlaying error:", err);
    return [];
  }
}

export async function fetchUpcoming(type = "movie", page = 1) {
  try {
    let actualType = "movie";
    let actualPage = 1;
    if (typeof type === "number") {
      actualPage = type;
    } else if (type === "tv" || type === "series") {
      actualType = "tv";
      actualPage = page || 1;
    } else {
      actualType = "movie";
      actualPage = page || 1;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const isTv = actualType === "tv";
    const endpoint = isTv ? "/discover/tv" : "/discover/movie";
    const params = isTv
      ? {
          "first_air_date.gte": todayStr,
          sort_by: "popularity.desc",
          include_adult: "false",
          page: actualPage,
        }
      : {
          "primary_release_date.gte": todayStr,
          sort_by: "popularity.desc",
          include_adult: "false",
          page: actualPage,
        };

    const data = await tmdbFetch(endpoint, params);
    const valid = (data.results || []).filter((r) => {
      const d = isTv ? r.first_air_date : r.release_date;
      return d && d >= todayStr && (r.poster_path || r.backdrop_path);
    });

    valid.sort((a, b) => {
      const dateA = (isTv ? a.first_air_date : a.release_date) || "";
      const dateB = (isTv ? b.first_air_date : b.release_date) || "";
      return dateA.localeCompare(dateB);
    });

    const items = valid
      .map((r) => normalizeTmdbItem(r, isTv ? "tv" : "movie"))
      .filter(Boolean);

    items.forEach((item) => {
      item.status = "upcoming";
    });

    return enrichLogos(items);
  } catch (err) {
    console.error("fetchUpcoming error:", err);
    return [];
  }
}

export async function fetchAiringToday(page = 1) {
  try {
    const data = await tmdbFetch(`/tv/airing_today`, { page });
    const items = (data.results || [])
      .map((r) => normalizeTmdbItem(r, "tv"))
      .filter(Boolean);
    return enrichLogos(items);
  } catch (err) {
    console.error("fetchAiringToday error:", err);
    return [];
  }
}

export async function fetchOnTheAir(page = 1) {
  try {
    const data = await tmdbFetch(`/tv/on_the_air`, { page });
    const items = (data.results || [])
      .map((r) => normalizeTmdbItem(r, "tv"))
      .filter(Boolean);
    return enrichLogos(items);
  } catch (err) {
    console.error("fetchOnTheAir error:", err);
    return [];
  }
}

export async function fetchBollywood(page = 1) {
  try {
    const data = await tmdbFetch("/discover/movie", {
      with_original_language: "hi",
      sort_by: "popularity.desc",
      page,
      include_adult: false,
    });
    const items = (data.results || [])
      .map((r) => normalizeTmdbItem(r, "movie"))
      .filter(Boolean);
    return enrichLogos(items, 6);
  } catch (err) {
    console.error("fetchBollywood error:", err);
    return [];
  }
}

export async function fetchTollywood(page = 1) {
  try {
    const data = await tmdbFetch("/discover/movie", {
      with_original_language: "te",
      sort_by: "popularity.desc",
      page,
      include_adult: false,
    });
    const items = (data.results || [])
      .map((r) => normalizeTmdbItem(r, "movie"))
      .filter(Boolean);
    return enrichLogos(items, 6);
  } catch (err) {
    console.error("fetchTollywood error:", err);
    return [];
  }
}

export async function fetchDiscover(options = {}) {
  const {
    type = "movie",
    genre,
    service,
    studio,
    network,
    company,
    keywords,
    year,
    country,
    region,
    language,
    rating,
    sort_by = "popularity.desc",
    page = 1,
  } = options;

  try {
    const endpointType =
      type === "series" || type === "anime" || type === "tv" ? "tv" : "movie";
    const params = {
      page,
      sort_by,
      include_adult: false,
    };

    const todayStr = new Date().toISOString().split("T")[0];

    // Restrict to released movies/shows (up to today) unless explicit future year is provided
    if (!year || year === "all") {
      if (endpointType === "movie") {
        if (!params["primary_release_date.lte"]) {
          params["primary_release_date.lte"] = todayStr;
        }
      } else {
        if (!params["first_air_date.lte"]) {
          params["first_air_date.lte"] = todayStr;
        }
      }
    }

    // When sorting by newest release date, also enforce minimum vote count so placeholder entries (0 votes) are excluded
    if (sort_by === "primary_release_date.desc" || sort_by === "release_date.desc") {
      if (!params["vote_count.gte"]) {
        params["vote_count.gte"] = 5;
      }
    } else if (sort_by === "first_air_date.desc") {
      if (!params["vote_count.gte"]) {
        params["vote_count.gte"] = 3;
      }
    }

    // Network lookup (e.g. HBO=49, Netflix=213, etc.)
    if (network && network !== "all") {
      params.with_networks = network;
    }

    // Direct company lookup
    if (company && company !== "all") {
      params.with_companies = company;
    }

    // Direct keywords lookup (e.g. Isekai=210024, Mecha=10987, Shounen=256647)
    if (keywords && keywords !== "all") {
      params.with_keywords = keywords;
    }

    // Genre lookup
    if (genre && genre !== "all") {
      const genreEntry = Object.entries(GENRE_MAP).find(
        ([, name]) => name.toLowerCase() === String(genre).toLowerCase()
      );
      if (genreEntry) {
        params.with_genres = genreEntry[0];
      }
    }

    // Special anime genre/origin handling
    if (type === "anime") {
      params.with_genres = params.with_genres ? `${params.with_genres},16` : "16";
      params.with_original_language = "ja";
    }

    // Service (watch provider) lookup
    if (service && service !== "all") {
      const sEntry = SERVICES.find(
        (s) => s.id === service || s.name.toLowerCase() === service.toLowerCase()
      );
      if (sEntry?.tmdbProviderId) {
        params.with_watch_providers = sEntry.tmdbProviderId;
        params.watch_region = (region || country || "US").toUpperCase();
      }
    }

    // Studio (production company) lookup
    if (studio && studio !== "all") {
      const stEntry = STUDIOS.find(
        (s) => s.id === studio || s.name.toLowerCase() === studio.toLowerCase()
      );
      if (stEntry?.tmdbCompanyId) {
        params.with_companies = stEntry.tmdbCompanyId;
      } else if (/^\d+$/.test(String(studio))) {
        params.with_companies = studio;
      }
    }

    // Year
    if (year && year !== "all") {
      if (/^\d{4}$/.test(year)) {
        if (endpointType === "movie") params.primary_release_year = year;
        else params.first_air_date_year = year;
      } else if (year === "2020s") {
        if (endpointType === "movie") params["primary_release_date.gte"] = "2020-01-01";
        else params["first_air_date.gte"] = "2020-01-01";
      } else if (year === "2010s") {
        if (endpointType === "movie") {
          params["primary_release_date.gte"] = "2010-01-01";
          params["primary_release_date.lte"] = "2019-12-31";
        } else {
          params["first_air_date.gte"] = "2010-01-01";
          params["first_air_date.lte"] = "2019-12-31";
        }
      }
    }

    // Language / Country
    if (language && language !== "all") {
      params.with_original_language = language.toLowerCase();
    }
    if (country && country !== "all") {
      params.with_origin_country = country.toUpperCase();
    }

    // Rating
    if (rating && rating !== "all") {
      const minVote = Number(rating);
      if (!isNaN(minVote) && minVote > 0) {
        params["vote_average.gte"] = minVote;
        params["vote_count.gte"] = 20; // Ensure quality sample size
      }
    }

    const data = await tmdbFetch(`/discover/${endpointType}`, params);
    const items = (data.results || [])
      .filter((r) => {
        if (!year || year === "all") {
          const d = endpointType === "movie" ? r.release_date : r.first_air_date;
          if (d && d > todayStr) return false;
        }
        return true;
      })
      .map((r) => normalizeTmdbItem(r, endpointType))
      .filter(Boolean);
    return enrichLogos(items);
  } catch (err) {
    console.error("fetchDiscover error:", err);
    return [];
  }
}

const SMART_REC_CACHE = new Map();

/**
 * Fetch smart recommendations for a movie or series matching:
 * - Same Director(s)
 * - Same Lead Cast members
 * - Same Franchise / Collection
 * - Matching Genre & Vibe (with high popularity/ratings)
 */
export async function fetchSmartRecommendations(type = "movie", tmdbId, limit = 16) {
  if (!tmdbId) return [];
  const endpointType = type === "tv" || type === "series" ? "tv" : "movie";
  const numId = String(tmdbId).replace(/^\D+/, "");
  if (!numId) return [];

  const cacheKey = `${endpointType}:${numId}`;
  const cached = SMART_REC_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.data.slice(0, limit);
  }

  try {
    const raw = await tmdbFetch(`/${endpointType}/${numId}`, {
      append_to_response: "credits,recommendations,similar",
      include_image_language: "en,null",
    });
    if (!raw) return [];

    const isMovie = endpointType === "movie";
    const director = isMovie
      ? raw.credits?.crew?.find((c) => c.job === "Director")
      : raw.created_by?.[0] || raw.credits?.crew?.find((c) => c.job === "Director" || c.job === "Executive Producer");
    const topCast = (raw.credits?.cast || []).slice(0, 3);
    const genres = raw.genres || [];
    const genreIds = genres.map((g) => g.id).slice(0, 2).join(",");
    const origLang = raw.original_language;
    const currentId = Number(numId);

    // Collection parts
    let collectionParts = [];
    if (raw.belongs_to_collection?.id) {
      try {
        const col = await tmdbFetch(`/collection/${raw.belongs_to_collection.id}`);
        if (Array.isArray(col?.parts)) {
          collectionParts = col.parts.filter((p) => p.id !== currentId);
        }
      } catch {}
    }

    // Parallel fetch: Director's filmography, Lead actors' filmography, Genre & Vibe discover
    const [dirCredits, cast1Credits, cast2Credits, genreDiscover] = await Promise.all([
      director?.id
        ? tmdbFetch(`/person/${director.id}/combined_credits`).catch(() => ({ crew: [] }))
        : Promise.resolve({ crew: [] }),
      topCast[0]?.id
        ? tmdbFetch(`/person/${topCast[0].id}/combined_credits`).catch(() => ({ cast: [] }))
        : Promise.resolve({ cast: [] }),
      topCast[1]?.id
        ? tmdbFetch(`/person/${topCast[1].id}/combined_credits`).catch(() => ({ cast: [] }))
        : Promise.resolve({ cast: [] }),
      genreIds
        ? tmdbFetch(`/discover/${endpointType}`, {
            with_genres: genreIds,
            sort_by: "popularity.desc",
            "vote_count.gte": 40,
            with_original_language: origLang && origLang !== "en" ? origLang : undefined,
          }).catch(() => ({ results: [] }))
        : Promise.resolve({ results: [] }),
    ]);

    const candidateMap = new Map();

    const isValidCredit = (c) => {
      if (!c || !c.id || c.id === currentId) return false;
      if (!c.title && !c.name) return false;
      if (!c.poster_path && !c.backdrop_path) return false;
      const char = (c.character || "").toLowerCase();
      if (char.includes("self") || char.includes("guest") || char.includes("host") || char.includes("narrator")) return false;
      const genreIds = c.genre_ids || [];
      // Exclude Talk (10767), News (10763), Reality (10764)
      if (genreIds.some((gid) => [10767, 10763, 10764].includes(gid))) return false;
      // If movie, exclude short TV series cameos (less than 4 episodes)
      if (isMovie && c.media_type === "tv" && (c.episode_count || 0) < 4) return false;
      // Require minimal credibility
      if ((c.vote_count || 0) < 15 && (c.popularity || 0) < 2) return false;
      return true;
    };

    const registerItem = (item, bonus, reason, matchType) => {
      if (!item || !item.id || item.id === currentId) return;
      if (!item.title && !item.name) return;
      if (!item.poster_path && !item.backdrop_path) return;

      const existing = candidateMap.get(item.id) || {
        raw: item,
        score: (Number(item.popularity) || 0) * 0.4 + (Number(item.vote_average) || 0) * 4,
        reasons: [],
        primaryReason: reason,
        matchType,
      };

      existing.score += bonus;
      if (reason && !existing.reasons.includes(reason)) {
        existing.reasons.push(reason);
      }
      if (
        matchType === "franchise" ||
        (matchType === "director" && existing.matchType !== "franchise") ||
        (matchType === "cast" && existing.matchType === "genre")
      ) {
        existing.matchType = matchType;
        existing.primaryReason = reason;
      }
      candidateMap.set(item.id, existing);
    };

    // A. Franchise / Collection (+150)
    for (const part of collectionParts) {
      registerItem(part, 150, raw.belongs_to_collection?.name || "Same Franchise", "franchise");
    }

    // B. Same Director filmography (+110)
    if (director?.name && Array.isArray(dirCredits.crew)) {
      const dirMovies = dirCredits.crew
        .filter((c) => c.job === "Director" && isValidCredit(c))
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 8);
      for (const m of dirMovies) {
        registerItem(m, 110, `Dir. ${director.name}`, "director");
      }
    }

    // C. Lead Actor 1 filmography (+70)
    if (topCast[0]?.name && Array.isArray(cast1Credits.cast)) {
      const actor1Movies = cast1Credits.cast
        .filter(isValidCredit)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 8);
      for (const m of actor1Movies) {
        registerItem(m, 70, `With ${topCast[0].name}`, "cast");
      }
    }

    // D. Lead Actor 2 filmography (+45)
    if (topCast[1]?.name && Array.isArray(cast2Credits.cast)) {
      const actor2Movies = cast2Credits.cast
        .filter(isValidCredit)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 6);
      for (const m of actor2Movies) {
        registerItem(m, 45, `With ${topCast[1].name}`, "cast");
      }
    }

    // E. Matching Vibe & Genre (+35)
    const genreLabel = genres.slice(0, 2).map((g) => g.name).join(" · ") || "Similar Vibe";
    for (const m of genreDiscover.results || []) {
      registerItem(m, 35, genreLabel, "genre");
    }

    // F. TMDB Recommendations & Similar (+30)
    for (const m of raw.recommendations?.results || []) {
      registerItem(m, 30, genreLabel || "Recommended", "genre");
    }
    for (const m of raw.similar?.results || []) {
      registerItem(m, 20, genreLabel || "Similar Vibe", "genre");
    }

    // Sort by score
    const sorted = Array.from(candidateMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);

    const results = sorted.map(({ raw: r, primaryReason, matchType, reasons }) => {
      const rTitle = r.title || r.name;
      const rYear = (r.release_date || r.first_air_date || "").slice(0, 4);
      const rType = r.media_type || (r.first_air_date ? "tv" : isMovie ? "movie" : "series");
      const normalizedType = rType === "tv" ? "series" : rType;
      const slug = slugify(rTitle);

      return {
        id: slug ? (normalizedType === "movie" ? `movie-${slug}-${r.id}` : `series-${slug}-${r.id}`) : `${normalizedType}-${r.id}`,
        tmdbId: r.id,
        title: rTitle,
        type: normalizedType,
        year: parseInt(rYear) || null,
        rating: r.vote_average ? Number(r.vote_average.toFixed(1)) : null,
        backdrop: r.backdrop_path
          ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}`
          : r.poster_path
          ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
          : null,
        poster: r.poster_path
          ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
          : null,
        matchReason: primaryReason,
        matchType,
        allReasons: reasons,
      };
    });

    SMART_REC_CACHE.set(cacheKey, { data: results, timestamp: Date.now() });
    return results.slice(0, limit);
  } catch (err) {
    console.error("fetchSmartRecommendations error:", err.message || err);
    return [];
  }
}
