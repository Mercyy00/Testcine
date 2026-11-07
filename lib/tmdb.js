// TMDB API integration for Vivarium
import TMDB_DATA from "./tmdb_titles.json" with { type: "json" };

const TMDB_CATALOG_BY_ID = new Map();
(TMDB_DATA || []).forEach((t) => {
  if (t.tmdbId) TMDB_CATALOG_BY_ID.set(t.tmdbId, t.id);
});

const TMDB_API_KEY =
  process.env.TMDB_API_KEY ||
  process.env.NEXT_PUBLIC_TMDB_API_KEY ||
  "2dca580c2a14b55200e784d157207b4d";

const TMDB_BASE = "https://api.themoviedb.org/3";

export const SERVICES = [
  { id: "netflix", name: "Netflix", bg: "#0d0d0f", textColor: "#ffffff", hues: [350, 10], tmdbProviderId: 8 },
  { id: "prime", name: "Prime Video", bg: "#ffffff", textColor: "#000511", hues: [196, 210], tmdbProviderId: 119 },
  { id: "disney", name: "Disney+", bg: "#041c32", textColor: "#ffffff", hues: [220, 240], tmdbProviderId: 337 },
  { id: "max", name: "HBO Max", bg: "#101116", textColor: "#ffffff", hues: [240, 280], tmdbProviderId: 1899 },
  { id: "hulu", name: "Hulu", bg: "#1ce783", textColor: "#052e16", hues: [145, 160], tmdbProviderId: 15 },
  { id: "apple", name: "Apple TV+", bg: "#101012", textColor: "#ffffff", hues: [210, 160], tmdbProviderId: 350 },
  { id: "paramount", name: "Paramount+", bg: "#0064ff", textColor: "#ffffff", hues: [215, 230], tmdbProviderId: 531 },
];

export const STUDIOS = [
  { id: "marvel", name: "Marvel", bg: "#f9e3e3", textColor: "#111111", hues: [355, 10], tmdbCompanyId: 420 },
  { id: "a24", name: "A24", bg: "#e6e6f5", textColor: "#111111", hues: [35, 12], tmdbCompanyId: 41077 },
  { id: "pixar", name: "Pixar", bg: "#e2eff7", textColor: "#111111", hues: [205, 220], tmdbCompanyId: 3 },
  { id: "ghibli", name: "Studio Ghibli", bg: "#e1eee1", textColor: "#111111", hues: [190, 160], tmdbCompanyId: 10342 },
  { id: "dc", name: "DC", bg: "#dbe7f2", textColor: "#111111", hues: [210, 230], tmdbCompanyId: 9993 },
  { id: "warner", name: "Warner Bros.", bg: "#f6e5ce", textColor: "#111111", hues: [38, 45], tmdbCompanyId: 174 },
  { id: "universal", name: "Universal", bg: "#e7ecef", textColor: "#111111", hues: [214, 190], tmdbCompanyId: 33 },
];

export const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action",
  10762: "Kids",
  10765: "Sci-Fi",
  10768: "War",
};

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
  const id = knownId || (slug ? `${slug}-${tmdbId}` : `${type}-${tmdbId}`);

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
    ? `https://image.tmdb.org/t/p/original${raw.backdrop_path}`
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

  const seasonsList = episodesList
    ? [
        {
          seasonNumber: 1,
          name: seasonData?.name || "Season 1",
          episodeCount: episodesList.length,
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

export async function tmdbFetch(endpoint, params = {}, retries = 3) {
  const query = new URLSearchParams({
    api_key: TMDB_API_KEY,
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
        await new Promise((r) => setTimeout(r, 600 * (4 - retries)));
        return tmdbFetch(endpoint, params, retries - 1);
      }
      throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  } catch (err) {
    if (retries > 0 && !err.message?.includes("404")) {
      await new Promise((r) => setTimeout(r, 600 * (4 - retries)));
      return tmdbFetch(endpoint, params, retries - 1);
    }
    throw err;
  }
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
    return items.slice(0, limit);
  } catch (err) {
    console.error("searchTMDB error:", err);
    return [];
  }
}

export async function fetchLiveTitle(type = "any", tmdbId) {
  if (!tmdbId) return null;
  try {
    let resolvedId = String(tmdbId).trim();
    let endpointType =
      type === "series" || type === "anime" || type === "tv"
        ? "tv"
        : type === "movie"
        ? "movie"
        : "movie";

    // If ID has numeric suffix (e.g. "avengers-endgame-299534", "movie-299534") or is pure number
    const numMatch = resolvedId.match(/(?:^|-)(\d{2,})$/);
    if (numMatch && numMatch[1]) {
      resolvedId = numMatch[1];
    } else if (isNaN(Number(resolvedId))) {
      const q = resolvedId
        .replace(/^(movie|tv|series|anime)-/, "")
        .replace(/-/g, " ");
      const found = await searchTMDB(q, 8);
      let match = null;
      if (type === "series" || type === "anime" || type === "tv") {
        match = found.find((f) => f.type === "series" || f.type === "anime");
      } else if (type === "movie") {
        match = found.find((f) => f.type === "movie");
      }
      if (!match) match = found[0];

      if (!match || !match.tmdbId) return null;
      resolvedId = String(match.tmdbId);
      endpointType =
        match.type === "series" || match.type === "anime" ? "tv" : "movie";
    }

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
      // If 404, flip type (e.g., asked for movie but it's a TV series)
      if (fetchErr.message?.includes("404")) {
        const altType = endpointType === "movie" ? "tv" : "movie";
        const altAppend =
          altType === "movie"
            ? "videos,credits,release_dates,similar,recommendations,images,reviews"
            : "videos,credits,content_ratings,similar,recommendations,images,reviews";
        data = await tmdbFetch(`/${altType}/${resolvedId}`, {
          append_to_response: altAppend,
          include_image_language: "en,null",
        });
        endpointType = altType;
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
        seasonData = await tmdbFetch(`/${endpointType}/${resolvedId}/season/1`);
      } catch (e) {}
    }

    const item = normalizeTmdbItem(
      data,
      endpointType,
      collectionData,
      seasonData
    );
    if (!item) return null;

    // Ensure the original requested id also maps if passed as slug
    if (isNaN(Number(tmdbId))) {
      item.id = String(tmdbId).toLowerCase();
    }
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
    return (data.results || [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .map((r) => normalizeTmdbItem(r, r.media_type))
      .filter(Boolean);
  } catch (err) {
    console.error("fetchTrending error:", err);
    return [];
  }
}

export async function fetchPopular(type = "movie", page = 1) {
  try {
    const endpoint = type === "series" || type === "anime" || type === "tv" ? "tv" : "movie";
    const data = await tmdbFetch(`/${endpoint}/popular`, { page });
    return (data.results || [])
      .map((r) => normalizeTmdbItem(r, endpoint))
      .filter(Boolean);
  } catch (err) {
    console.error(`fetchPopular error for ${type}:`, err);
    return [];
  }
}

export async function fetchTopRated(type = "movie", page = 1) {
  try {
    const endpoint = type === "series" || type === "anime" || type === "tv" ? "tv" : "movie";
    const data = await tmdbFetch(`/${endpoint}/top_rated`, { page });
    return (data.results || [])
      .map((r) => normalizeTmdbItem(r, endpoint))
      .filter(Boolean);
  } catch (err) {
    console.error(`fetchTopRated error for ${type}:`, err);
    return [];
  }
}

export async function fetchNowPlaying(page = 1) {
  try {
    const data = await tmdbFetch(`/movie/now_playing`, { page });
    return (data.results || [])
      .map((r) => normalizeTmdbItem(r, "movie"))
      .filter(Boolean);
  } catch (err) {
    console.error("fetchNowPlaying error:", err);
    return [];
  }
}

export async function fetchUpcoming(page = 1) {
  try {
    const data = await tmdbFetch(`/movie/upcoming`, { page });
    return (data.results || [])
      .map((r) => normalizeTmdbItem(r, "movie"))
      .filter(Boolean);
  } catch (err) {
    console.error("fetchUpcoming error:", err);
    return [];
  }
}

export async function fetchAiringToday(page = 1) {
  try {
    const data = await tmdbFetch(`/tv/airing_today`, { page });
    return (data.results || [])
      .map((r) => normalizeTmdbItem(r, "tv"))
      .filter(Boolean);
  } catch (err) {
    console.error("fetchAiringToday error:", err);
    return [];
  }
}

export async function fetchOnTheAir(page = 1) {
  try {
    const data = await tmdbFetch(`/tv/on_the_air`, { page });
    return (data.results || [])
      .map((r) => normalizeTmdbItem(r, "tv"))
      .filter(Boolean);
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
        params.watch_region = "US";
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
    return (data.results || [])
      .map((r) => normalizeTmdbItem(r, endpointType))
      .filter(Boolean);
  } catch (err) {
    console.error("fetchDiscover error:", err);
    return [];
  }
}
