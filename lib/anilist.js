// AniList GraphQL API client for Vivarium anime catalog & watch player
// Docs: https://docs.anilist.co/guide/introduction

import { KNOWN_SEASONS, ANILIST_TMDB_MAP } from "./constants.js";
import { fetchLiveTitle } from "./tmdb.js";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

// Simple in-memory cache to respect AniList rate limits (standard: 90 req/min)
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data, ttlMs = CACHE_TTL_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function extractAniListId(idOrSlug) {
  if (typeof idOrSlug === "number") return idOrSlug;
  if (!idOrSlug || typeof idOrSlug !== "string") return null;
  const clean = idOrSlug.trim();
  // Pure number (e.g. "16498")
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  // anilist-16498 or anime-16498
  const prefixed = clean.match(/^(?:anilist|anime)-(\d+)$/i);
  if (prefixed) return parseInt(prefixed[1], 10);
  // Slug with explicit anilist prefix (e.g. "anime-attack-on-titan-anilist-16498" or "anilist-attack-on-titan-16498")
  const anilistSlug = clean.match(/(?:^|-)(?:anilist)-(\d+)$/i);
  if (anilistSlug) return parseInt(anilistSlug[1], 10);
  // If slug starts with anime- and ends with at least 3 digits (e.g. "anime-attack-on-titan-16498")
  const animeSlug = clean.match(/^anime-.+-(\d{3,})$/i);
  if (animeSlug) return parseInt(animeSlug[1], 10);
  return null;
}

export function computeHues(id, title = "") {
  let hash = 0;
  const s = String(id) + String(title);
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) % 360;
  }
  return [hash, (hash + 140) % 360];
}

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Execute a GraphQL query against AniList with caching
 */
export async function fetchAniListGraphQL(query, variables = {}, ttl = CACHE_TTL_MS) {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      let errJson;
      try {
        errJson = JSON.parse(errorText);
      } catch {
        errJson = null;
      }
      const message = errJson?.errors?.[0]?.message || `AniList API error (status ${res.status})`;
      throw new Error(message);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message || "AniList GraphQL query error");
    }

    setCached(cacheKey, json.data, ttl);
    return json.data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Normalize an AniList Media object to Vivarium's title schema.
 * Notice: anilistId is explicitly preserved, tmdbId is strictly null to prevent mixing!
 */
export function normalizeAniListItem(media) {
  if (!media || !media.id) return null;

  const anilistId = media.id;
  // Primary ID is the AniList numeric ID as a string, e.g. "16498"
  const id = String(anilistId);

  const titleEnglish = media.title?.english?.trim();
  const titleUserPreferred = media.title?.userPreferred?.trim();
  const titleRomaji = media.title?.romaji?.trim();
  const titleNative = media.title?.native?.trim();

  // Preferred display title
  const title = titleEnglish || titleUserPreferred || titleRomaji || "Untitled Anime";

  // Poster and backdrop artwork from AniList
  const poster =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    media.coverImage?.medium ||
    null;
  const backdrop =
    media.bannerImage ||
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    poster ||
    null;

  // Status mapping
  let status = "released";
  if (media.status === "RELEASING") {
    status = "airing";
  } else if (media.status === "NOT_YET_RELEASED") {
    status = "upcoming";
  }

  // Air dates & years
  const year = media.seasonYear || media.startDate?.year || null;
  const releaseDate = media.startDate?.year
    ? `${media.startDate.year}-${String(media.startDate.month || 1).padStart(2, "0")}-${String(
        media.startDate.day || 1
      ).padStart(2, "0")}`
    : "";

  // AniList scores are out of 100 -> convert to 1 decimal rating (e.g. 8.5)
  const rating =
    typeof media.averageScore === "number" && media.averageScore > 0
      ? Number((media.averageScore / 10).toFixed(1))
      : typeof media.meanScore === "number" && media.meanScore > 0
      ? Number((media.meanScore / 10).toFixed(1))
      : null;

  const overview = stripHtml(media.description) || "No synopsis available.";
  const genres = Array.isArray(media.genres) ? media.genres : [];

  // Animation studios
  const studiosList = (media.studios?.nodes || []).map((s) => s.name).filter(Boolean);
  const mainStudio = studiosList[0] || null;

  // Badge logic
  const isMovieFormat = media.format === "MOVIE";
  const badge =
    media.status === "RELEASING"
      ? "SIMULCAST"
      : isMovieFormat
      ? "MOVIE"
      : rating && rating >= 8.0
      ? `★ ${rating}`
      : "JP";

  // Trailer
  let trailerKey = null;
  const videos = [];
  if (media.trailer?.site === "youtube" && media.trailer.id) {
    trailerKey = media.trailer.id;
    videos.push({
      id: media.trailer.id,
      name: "Official Trailer",
      key: media.trailer.id,
      type: "Trailer",
      thumbnail: media.trailer.thumbnail || `https://img.youtube.com/vi/${media.trailer.id}/mqdefault.jpg`,
    });
  }

  // Cast: Characters + Japanese voice actors
  const cast = (media.characters?.edges || []).slice(0, 12).map((edge) => {
    const charName = edge.node?.name?.full || edge.node?.name?.native || "Character";
    const vaName = edge.voiceActors?.[0]?.name?.full || null;
    const profileImg = edge.voiceActors?.[0]?.image?.large || edge.node?.image?.large || null;
    return {
      id: edge.node?.id || Math.random(),
      name: vaName || charName,
      character: charName,
      profile: profileImg,
    };
  });

  // Streaming episodes provided by AniList (with real thumbnails and titles)
  const streamingEps = Array.isArray(media.streamingEpisodes) ? media.streamingEpisodes : [];

  // Determine true total episode count and streaming boundaries
  let maxParsedStreamEp = 0;
  let minParsedStreamEp = Infinity;
  for (let idx = 0; idx < streamingEps.length; idx++) {
    const ep = streamingEps[idx];
    let epNum = null;
    if (ep.title) {
      const m = String(ep.title).match(/Episode\s*(\d+)/i) || String(ep.title).match(/^(\d+)/);
      if (m && m[1]) {
        epNum = parseInt(m[1], 10);
      }
    }
    const finalNum = epNum ?? (idx + 1);
    if (finalNum > maxParsedStreamEp) maxParsedStreamEp = finalNum;
    if (finalNum < minParsedStreamEp) minParsedStreamEp = finalNum;
  }

  const latestAired = media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : null;
  const rawTotal = media.episodes || latestAired || maxParsedStreamEp || streamingEps.length || 1;
  const totalEpisodes = Math.max(1, rawTotal);

  // Build episodes list for Vivarium player
  const episodes = [];

  // If streaming episodes don't start at episode 1 (e.g. Crunchyroll provides only episodes 62..130),
  // prepad episodes 1..(minParsedStreamEp - 1) so episodes strictly start from Episode 1.
  if (minParsedStreamEp > 1 && minParsedStreamEp !== Infinity) {
    for (let i = 1; i < minParsedStreamEp; i++) {
      episodes.push({
        episodeNumber: i,
        title: `Episode ${i}`,
        airDate: "",
        runtime: media.duration || 24,
        still: backdrop,
        overview: "",
      });
    }
  }

  if (streamingEps.length > 0) {
    const rawList = streamingEps.map((ep, index) => {
      let parsedNum = null;
      if (ep.title) {
        const m = String(ep.title).match(/Episode\s*(\d+)/i) || String(ep.title).match(/^(\d+)/);
        if (m && m[1]) {
          parsedNum = parseInt(m[1], 10);
        }
      }
      return {
        parsedNum,
        fallbackIndex: index + 1,
        title: ep.title,
        still: ep.thumbnail || backdrop,
        url: ep.url || null,
        site: ep.site || null,
      };
    });

    const parsedCount = rawList.filter((r) => r.parsedNum !== null).length;
    const hasParsedNums = parsedCount >= Math.min(3, rawList.length);

    if (hasParsedNums) {
      // Sort ascending by true episode number (ensures Episode 1 is first even if AniList provided reverse order)
      rawList.sort((a, b) => (a.parsedNum ?? a.fallbackIndex) - (b.parsedNum ?? b.fallbackIndex));
      rawList.forEach((r, idx) => {
        const epNum = r.parsedNum ?? (idx + 1);
        episodes.push({
          episodeNumber: epNum,
          title: r.title || `Episode ${epNum}`,
          airDate: "",
          runtime: media.duration || null,
          still: r.still,
          overview: "",
          url: r.url,
          site: r.site,
        });
      });
    } else {
      rawList.forEach((r, idx) => {
        episodes.push({
          episodeNumber: idx + 1,
          title: r.title || `Episode ${idx + 1}`,
          airDate: "",
          runtime: media.duration || null,
          still: r.still,
          overview: "",
          url: r.url,
          site: r.site,
        });
      });
    }

    // If media has more aired episodes beyond streaming episodes range (e.g. up to 1180 for One Piece),
    // append subsequent episodes so the full series is available
    if (totalEpisodes > maxParsedStreamEp && (latestAired || minParsedStreamEp > 1)) {
      const startEp = Math.max(maxParsedStreamEp + 1, episodes.length + 1);
      for (let i = startEp; i <= totalEpisodes; i++) {
        episodes.push({
          episodeNumber: i,
          title: `Episode ${i}`,
          airDate: "",
          runtime: media.duration || 24,
          still: backdrop,
          overview: "",
        });
      }
    }
  } else {
    const count = Math.min(Math.max(1, totalEpisodes), 1500);
    for (let i = 1; i <= count; i++) {
      episodes.push({
        episodeNumber: i,
        title: `Episode ${i}`,
        airDate: "",
        runtime: media.duration || null,
        still: backdrop,
        overview: "",
      });
    }
  }

  // Collect actual TV sequel relations with their real posters and titles
  const relationSequels = [];
  if (Array.isArray(media.relations?.edges)) {
    for (const edge of media.relations.edges) {
      const relType = edge.relationType;
      const nodeFormat = edge.node?.format;
      const isAnimeSeries = nodeFormat === "TV" || nodeFormat === "TV_SHORT" || nodeFormat === "ONA";
      if (relType === "SEQUEL" && isAnimeSeries && edge.node) {
        relationSequels.push(edge.node);
      }
    }
  }

  // Derive season count from KNOWN_SEASONS, AniList relations, and title text
  const knownSeason =
    (media.id && KNOWN_SEASONS[String(media.id)]) ||
    (media.idMal && KNOWN_SEASONS[String(media.idMal)]) ||
    (id && KNOWN_SEASONS[id.toLowerCase()]) ||
    null;

  let relationSeasons = 1;
  if (relationSequels.length > 0) {
    relationSeasons = 1 + relationSequels.length;
  }

  // Check title for season numbers (e.g. "Season 4", "Season 2", "2nd Season", etc.)
  let titleSeasonNumber = 1;
  const titleSearchStr = `${title} ${titleRomaji} ${titleEnglish}`.toLowerCase();
  const sMatch = titleSearchStr.match(/(?:season\s*|part\s*|stage\s*)(\d+)/i) || titleSearchStr.match(/(\d+)(?:st|nd|rd|th)\s*season/i);
  if (sMatch && sMatch[1]) {
    titleSeasonNumber = parseInt(sMatch[1], 10) || 1;
  }

  const finalSeasonsCount = Math.max(knownSeason || 0, relationSeasons, titleSeasonNumber, 1);

  const seasonsList = [];
  for (let s = 1; s <= finalSeasonsCount; s++) {
    const isFirstSeason = s === 1;
    let seasonEps = isFirstSeason ? episodes : [];
    const sequelNode = !isFirstSeason ? relationSequels[s - 2] : null;
    const seasonPoster = sequelNode?.coverImage?.large || sequelNode?.coverImage?.extraLarge || poster;
    const seasonName = sequelNode?.title?.english || sequelNode?.title?.romaji || `Season ${s}`;

    if (!isFirstSeason) {
      const seasonEpisodeCount = Math.max(12, Math.min(26, Math.round(totalEpisodes / finalSeasonsCount) || 12));
      seasonEps = [];
      for (let ep = 1; ep <= seasonEpisodeCount; ep++) {
        seasonEps.push({
          episodeNumber: ep,
          title: `Episode ${ep}`,
          airDate: "",
          runtime: media.duration || 24,
          still: seasonPoster || backdrop,
          overview: `Season ${s}, Episode ${ep}`,
        });
      }
    }
    seasonsList.push({
      seasonNumber: s,
      name: seasonName,
      episodeCount: seasonEps.length,
      airDate: s === 1 ? (releaseDate || "") : "",
      year: s === 1 ? (year ? String(year) : null) : null,
      poster: seasonPoster,
      episodes: seasonEps,
      anilistId: sequelNode?.id || (s === 1 ? anilistId : null),
    });
  }

  // Recommendations
  const recommendations = [];
  if (Array.isArray(media.recommendations?.nodes)) {
    for (const rec of media.recommendations.nodes) {
      const recMedia = rec.mediaRecommendation;
      if (recMedia && recMedia.id && recMedia.id !== anilistId) {
        recommendations.push(normalizeAniListItem(recMedia));
      }
      if (recommendations.length >= 12) break;
    }
  }

  // Calculate hues for UI accenting
  const hues = computeHues(anilistId, title);

  return {
    id,
    anilistId,
    tmdbId: media.tmdbId || null,
    title,
    romajiTitle: titleRomaji,
    nativeTitle: titleNative,
    userPreferredTitle: titleUserPreferred,
    type: "anime",
    format: media.format || "TV",
    year,
    runtime: media.duration || null,
    seasons: finalSeasonsCount,
    numberOfSeasons: finalSeasonsCount,
    seasonsList,
    episodes,
    cert: media.isAdult ? "18+" : null,
    rating,
    overview,
    genres,
    studios: studiosList,
    studio: mainStudio,
    hues,
    motif: anilistId % 6,
    status,
    releaseDate,
    badge,
    quality: "HD",
    poster,
    backdrop,
    logo: null,
    trailerKey,
    videos,
    streamingEpisodes: streamingEps,
    cast,
    recommendations,
    nextAiringEpisode: media.nextAiringEpisode || null,
    about: {
      anilistId,
      format: media.format || "TV",
      status: media.status || "FINISHED",
      episodes: media.episodes || totalEpisodes,
      duration: media.duration ? `${media.duration} mins` : null,
      season: media.season || null,
      seasonYear: media.seasonYear || year,
      averageScore: media.averageScore ? `${media.averageScore}%` : null,
      popularity: media.popularity ? media.popularity.toLocaleString() : null,
    },
  };
}

const MEDIA_CARD_FRAGMENT = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  format
  status
  episodes
  duration
  season
  seasonYear
  startDate {
    year
    month
    day
  }
  averageScore
  meanScore
  popularity
  genres
  description(asHtml: false)
  studios(isMain: true) {
    nodes {
      id
      name
    }
  }
  trailer {
    id
    site
    thumbnail
  }
  nextAiringEpisode {
    episode
    airingAt
    timeUntilAiring
  }
`;

const MEDIA_DETAILS_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    ${MEDIA_CARD_FRAGMENT}
    streamingEpisodes {
      title
      thumbnail
      url
      site
    }
    characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
      edges {
        role
        node {
          id
          name {
            full
            native
          }
          image {
            large
          }
        }
        voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
          id
          name {
            full
            native
          }
          image {
            large
          }
        }
      }
    }
    relations {
      edges {
        relationType(version: 2)
        node {
          id
          title {
            romaji
            english
            userPreferred
          }
          format
          type
          status
          coverImage {
            large
          }
        }
      }
    }
    recommendations(sort: RATING_DESC, perPage: 12) {
      nodes {
        mediaRecommendation {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  }
}
`;

/**
 * Fetch full details for a single anime by its AniList ID
 */
export async function fetchAniListDetails(idOrSlug) {
  const anilistId = extractAniListId(idOrSlug);
  if (!anilistId) return null;

  try {
    const data = await fetchAniListGraphQL(MEDIA_DETAILS_QUERY, { id: anilistId });
    if (!data?.Media) return null;
    const normalized = normalizeAniListItem(data.Media);

    // If an associated TMDB TV show exists, enrich seasonsList with real TMDB season posters, names, and episode counts
    const mappedTmdbId = ANILIST_TMDB_MAP[anilistId];
    if (mappedTmdbId && data.Media.format !== "MOVIE") {
      try {
        const tmdbLive = await fetchLiveTitle("tv", mappedTmdbId);
        if (tmdbLive?.seasonsList && tmdbLive.seasonsList.length > 0) {
          normalized.seasonsList = tmdbLive.seasonsList;
          normalized.seasons = tmdbLive.seasonsList.length;
          normalized.numberOfSeasons = tmdbLive.seasonsList.length;
          if (tmdbLive.episodes && tmdbLive.episodes.length > 0) {
            normalized.episodes = tmdbLive.episodes;
          }
        }
      } catch {
        // Fallback gracefully to AniList relations/seasons if TMDB is unavailable or key not configured
      }
    }

    return normalized;
  } catch (err) {
    console.error("fetchAniListDetails error for ID", anilistId, err.message || err);
    return null;
  }
}

/**
 * Discover / filter anime catalog from AniList
 */
export async function fetchAniListDiscover({
  category = "trending",
  genre,
  tag,
  studio,
  year,
  rating,
  search,
  page = 1,
  perPage = 20,
} = {}) {
  // If studio is selected, query via Studio
  if (studio && studio !== "all") {
    const studioQuery = `
      query ($studioSearch: String, $page: Int, $perPage: Int) {
        Studio(search: $studioSearch) {
          id
          name
          media(page: $page, perPage: $perPage, sort: POPULARITY_DESC) {
            nodes {
              ${MEDIA_CARD_FRAGMENT}
            }
          }
        }
      }
    `;
    try {
      const data = await fetchAniListGraphQL(studioQuery, {
        studioSearch: studio,
        page: Number(page) || 1,
        perPage: Number(perPage) || 20,
      });
      const nodes = data?.Studio?.media?.nodes || [];
      return nodes.map(normalizeAniListItem).filter(Boolean);
    } catch (err) {
      console.error("AniList studio query error:", err.message || err);
    }
  }

  // Standard Page query
  const sortMap = {
    trending: ["TRENDING_DESC", "POPULARITY_DESC"],
    popular: ["POPULARITY_DESC"],
    top: ["SCORE_DESC"],
    airing_today: ["POPULARITY_DESC"],
    simulcasts: ["POPULARITY_DESC"],
  };

  const variables = {
    page: Number(page) || 1,
    perPage: Number(perPage) || 20,
    sort: sortMap[category] || ["TRENDING_DESC"],
  };

  if (category === "simulcasts" || category === "airing_today") {
    variables.status = "RELEASING";
  }

  if (genre && genre !== "all") {
    variables.genre = genre;
  }

  if (tag && tag !== "all") {
    variables.tag = tag;
  }

  if (year && year !== "all") {
    if (year === "2010s") {
      variables.startDateGreater = 20091231;
      variables.startDateLesser = 20200101;
    } else if (year === "Earlier") {
      variables.startDateLesser = 20100101;
    } else {
      const yr = parseInt(year, 10);
      if (!isNaN(yr)) variables.seasonYear = yr;
    }
  }

  if (rating && rating !== "all") {
    const r = parseFloat(rating);
    if (!isNaN(r)) {
      // AniList averageScore is 0-100 (e.g. 8.0 -> 80)
      variables.scoreGreater = Math.round(r * 10);
    }
  }

  if (search && typeof search === "string" && search.trim()) {
    variables.search = search.trim();
  }

  const query = `
    query (
      $page: Int,
      $perPage: Int,
      $sort: [MediaSort],
      $status: MediaStatus,
      $genre: String,
      $tag: String,
      $seasonYear: Int,
      $startDateGreater: FuzzyDateInt,
      $startDateLesser: FuzzyDateInt,
      $scoreGreater: Int,
      $search: String
    ) {
      Page(page: $page, perPage: $perPage) {
        media(
          type: ANIME,
          sort: $sort,
          status: $status,
          genre: $genre,
          tag: $tag,
          seasonYear: $seasonYear,
          startDate_greater: $startDateGreater,
          startDate_lesser: $startDateLesser,
          averageScore_greater: $scoreGreater,
          search: $search
        ) {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  `;

  try {
    const data = await fetchAniListGraphQL(query, variables);
    const nodes = data?.Page?.media || [];
    return nodes.map(normalizeAniListItem).filter(Boolean);
  } catch (err) {
    console.error("fetchAniListDiscover error:", err.message || err);
    return [];
  }
}

/**
 * Search anime from AniList
 */
export async function searchAniList(queryText, limit = 20) {
  if (!queryText || typeof queryText !== "string" || !queryText.trim()) return [];

  const query = `
    query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, search: $search, sort: [POPULARITY_DESC]) {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  `;

  try {
    const data = await fetchAniListGraphQL(query, {
      search: queryText.trim(),
      perPage: Math.min(50, Math.max(1, limit)),
    });
    const nodes = data?.Page?.media || [];
    return nodes.map(normalizeAniListItem).filter(Boolean);
  } catch (err) {
    console.error("searchAniList error:", err.message || err);
    return [];
  }
}

export async function fetchAniListTrending(limit = 10) {
  return fetchAniListDiscover({ category: "trending", perPage: limit });
}

export async function fetchAniListTopRated(limit = 10) {
  return fetchAniListDiscover({ category: "top", perPage: limit });
}

export async function fetchAniListPopular(limit = 10) {
  return fetchAniListDiscover({ category: "popular", perPage: limit });
}

export async function fetchAniListAiring(limit = 10) {
  return fetchAniListDiscover({ category: "simulcasts", perPage: limit });
}
