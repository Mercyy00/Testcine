// TMDB API integration for Vivarium
import TMDB_DATA from "./tmdb_titles.json" with { type: "json" };
import { getServerEnv } from "./env";

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
  const key = getServerEnv().TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is missing. Please configure TMDB_API_KEY in your server environment.");
  }
  return key;
}

const TMDB_BASE = "https://api.themoviedb.org/3";

import { SERVICES, STUDIOS, GENRE_MAP } from "./constants.js";
export { SERVICES, STUDIOS, GENRE_MAP };

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
  const year = parseInt(releaseDate.slice(0, 4)) || new Date().getFullYear();

  const runtime = isMovie
    ? raw.runtime || 115
    : (raw.episode_run_time && raw.episode_run_time[0]) || 45;

  const seasons = isMovie ? 1 : raw.number_of_seasons || 1;

  let cert = "12A";
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

  // Actual TMDB recommendations & similar items
  const rawRecs = [
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
    recommendations.push({
      id: recSlug || `${type}-${r.id}`,
      tmdbId: r.id,
      title: recTitle,
      type: isAnime ? "anime" : isMovie ? "movie" : "series",
      year: parseInt(recYear) || year,
      rating: Number((r.vote_average || 7.0).toFixed(1)),
      backdrop: r.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}`
        : r.poster_path
        ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
        : null,
      poster: r.poster_path
        ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
        : null,
      quality: isMovie ? "HD" : null,
    });
    if (recommendations.length >= 12) break;
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

  const status =
    raw.status === "In Production" || raw.status === "Planned"
      ? "upcoming"
      : !isMovie && (raw.in_production || raw.status === "Returning Series")
      ? "airing"
      : "released";

  const hues = computeHues(tmdbId, title);

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const airDay = DAYS[tmdbId % DAYS.length];

  const service = isAnime
    ? "crunchyroll"
    : SERVICES[tmdbId % (SERVICES.length - 1)].id;
  const studio = isAnime ? "ghibli" : STUDIOS[tmdbId % STUDIOS.length].id;

  const episodesList = seasonData?.episodes
    ? seasonData.episodes.map((ep) => ({
        episodeNumber: ep.episode_number,
        title: ep.name || `Episode ${ep.episode_number}`,
        airDate: ep.air_date || "",
        runtime: ep.runtime || 50,
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
          episodeCount: s.episode_count || 10,
          airDate: s.air_date || "",
          year: s.air_date ? s.air_date.slice(0, 4) : String(year),
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
          year: String(year),
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
    genres: genres.length ? genres : [isMovie ? "Drama" : "Series"],
    studio,
    service,
    hues,
    motif: tmdbId % 6,
    status,
    releaseDate,
    airDay,
    poster,
    backdrop,
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
        "User-Agent": "Vivarium/1.0",
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

  // 1. First pass: attach known logos from items or LOGO_CACHE
  const needFetch = [];
  for (const item of items) {
    if (!item) continue;
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

export async function searchTMDB(query, limit = 20) {
  if (!query || !query.trim()) return [];
  try {
    const data = await tmdbFetch("/search/multi", { query: query.trim() });
    const items = (data.results || [])
      .filter(
        (r) =>
          (r.media_type === "movie" || r.media_type === "tv") &&
          (r.poster_path || r.backdrop_path)
      )
      .map((r) => normalizeTmdbItem(r, r.media_type))
      .filter(Boolean);
    const sliced = items.slice(0, limit);
    return enrichLogos(sliced, 6);
  } catch (err) {
    console.error("searchTMDB error:", err);
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

export async function fetchUpcoming(page = 1) {
  try {
    const data = await tmdbFetch(`/movie/upcoming`, { page });
    const items = (data.results || [])
      .map((r) => normalizeTmdbItem(r, "movie"))
      .filter(Boolean);
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

export async function fetchDiscover(options = {}) {
  const {
    type = "movie",
    genre,
    service,
    studio,
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
      .map((r) => normalizeTmdbItem(r, endpointType))
      .filter(Boolean);
    return enrichLogos(items);
  } catch (err) {
    console.error("fetchDiscover error:", err);
    return [];
  }
}
