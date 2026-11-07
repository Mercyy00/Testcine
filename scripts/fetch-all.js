const fs = require("fs");
const path = require("path");

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error("Error: TMDB_API_KEY environment variable is required.");
  process.exit(1);
}
const BASE_URL = "https://api.themoviedb.org/3";

const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action", 10762: "Kids", 10765: "Sci-Fi", 10768: "War"
};

const SERVICES = [
  { id: "netflix", name: "Netflix" },
  { id: "prime", name: "Prime Video" },
  { id: "disney", name: "Disney+" },
  { id: "apple", name: "Apple TV+" },
  { id: "max", name: "Max" },
  { id: "crunchyroll", name: "Crunchyroll" },
];

const STUDIOS = [
  { id: "warner", name: "Warner Bros. Pictures" },
  { id: "universal", name: "Universal Pictures" },
  { id: "marvel", name: "Marvel Studios" },
  { id: "a24", name: "A24" },
  { id: "ghibli", name: "Studio Ghibli" },
  { id: "paramount", name: "Paramount Pictures" },
  { id: "sony", name: "Sony Pictures" },
  { id: "mappa", name: "MAPPA" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function parseCert(data, isMovie) {
  if (isMovie && data.release_dates?.results) {
    const us = data.release_dates.results.find(r => r.iso_3166_1 === "US" || r.iso_3166_1 === "GB");
    if (us?.release_dates) {
      for (const d of us.release_dates) {
        if (d.certification) return d.certification;
      }
    }
  } else if (!isMovie && data.content_ratings?.results) {
    const us = data.content_ratings.results.find(r => r.iso_3166_1 === "US" || r.iso_3166_1 === "GB");
    if (us?.rating) return us.rating;
  }
  return isMovie ? "PG-13" : "15";
}

function assignService(data, isAnime, index) {
  if (isAnime) return "crunchyroll";
  const str = JSON.stringify(data).toLowerCase();
  if (str.includes("netflix")) return "netflix";
  if (str.includes("disney") || str.includes("marvel")) return "disney";
  if (str.includes("apple")) return "apple";
  if (str.includes("max") || str.includes("hbo")) return "max";
  if (str.includes("amazon") || str.includes("prime")) return "prime";
  return SERVICES[index % (SERVICES.length - 1)].id;
}

function assignStudio(data, isAnime, index) {
  if (isAnime) {
    const str = JSON.stringify(data).toLowerCase();
    if (str.includes("ghibli") || str.includes("miyazaki")) return "ghibli";
    return "mappa";
  }
  const str = JSON.stringify(data.production_companies || []).toLowerCase();
  for (const s of STUDIOS) {
    if (str.includes(s.id) || str.includes(s.name.toLowerCase().split(" ")[0])) return s.id;
  }
  return STUDIOS[index % STUDIOS.length].id;
}

function computeHues(id, title) {
  let hash = 0;
  const s = String(id) + String(title);
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 360;
  return [hash, (hash + 140) % 360];
}

async function fetchItemDetails(type, id) {
  try {
    const append = type === "movie"
      ? "videos,credits,release_dates,images,reviews,recommendations"
      : "videos,credits,content_ratings,images,reviews,recommendations";
    const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&append_to_response=${append}&include_image_language=en,null`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log("Fetching and compiling updated TMDB catalogue...");

  // Specific targets from reference screenshot and core catalog
  const targets = [
    // --- Screenshot row 1: Top 10 Today ---
    { type: "movie", id: 1263337, quality: "HD", rating: 7.3, slug: "heart-of-the-beast" },
    { type: "tv", id: 225385, rating: 7.0, slug: "black-doves" },
    { type: "movie", id: 1423191, quality: "HD", badge: "HD", rating: 7.5, slug: "resident-evil" },
    { type: "movie", id: 1792170, quality: "HD", rating: 7.7, slug: "model-citizen" },
    { type: "movie", id: 1294189, quality: "HD", rating: 6.1, slug: "the-mongoose" },

    // --- Screenshot row 2: Popular on Vivarium ---
    { type: "movie", id: 969681, quality: "HD", badge: "HD", rating: 8.5, slug: "spider-man-brand-new-day" },
    { type: "tv", id: 2190, rating: 8.3, slug: "south-park" },
    { type: "tv", id: 95350, rating: 8.2, slug: "lanterns" },
    { type: "tv", id: 213375, badge: "New episode", rating: 8.6, status: "airing", slug: "visionquest" },

    // --- Core Movies ---
    { type: "movie", id: 569094, quality: "HD", slug: "spider-man-across-the-spider-verse" },
    { type: "movie", id: 693134, quality: "HD", slug: "dune-part-two" },
    { type: "movie", id: 872585, quality: "HD", slug: "oppenheimer" },
    { type: "movie", id: 157336, quality: "HD", slug: "interstellar" },
    { type: "movie", id: 27205, quality: "HD", slug: "inception" },
    { type: "movie", id: 155, quality: "HD", slug: "the-dark-knight" },
    { type: "movie", id: 533535, quality: "HD", slug: "deadpool-wolverine" },
    { type: "movie", id: 545611, quality: "HD", slug: "everything-everywhere-all-at-once" },
    { type: "movie", id: 496243, quality: "HD", slug: "parasite" },
    { type: "movie", id: 912649, quality: "HD", slug: "venom-the-last-dance" },
    { type: "movie", id: 1022789, quality: "HD", slug: "inside-out-2" },
    { type: "movie", id: 945961, quality: "HD", slug: "alien-romulus" },
    { type: "movie", id: 414906, quality: "HD", slug: "the-batman" },
    { type: "movie", id: 76600, quality: "HD", slug: "avatar-the-way-of-water" },
    { type: "movie", id: 1241982, quality: "HD", slug: "moana-2" },
    { type: "movie", id: 558449, quality: "HD", slug: "gladiator-ii" },
    { type: "movie", id: 1184918, quality: "HD", slug: "the-wild-robot" },
    { type: "movie", id: 105, quality: "HD", slug: "back-to-the-future" },
    { type: "movie", id: 24428, quality: "HD", slug: "the-avengers" },
    { type: "movie", id: 299536, quality: "HD", slug: "avengers-infinity-war" },
    // CAM badge example
    { type: "movie", id: 1064213, quality: "CAM", badge: "CAM", slug: "anora" },

    // --- Core Series ---
    { type: "tv", id: 94605, slug: "arcane" },
    { type: "tv", id: 100088, status: "airing", badge: "New episode", slug: "the-last-of-us" },
    { type: "tv", id: 93405, status: "airing", badge: "New episode", slug: "squid-game" },
    { type: "tv", id: 126308, slug: "shogun" },
    { type: "tv", id: 1396, slug: "breaking-bad" },
    { type: "tv", id: 66732, slug: "stranger-things" },
    { type: "tv", id: 95557, status: "airing", badge: "New episode", slug: "severance" },
    { type: "tv", id: 87108, slug: "chernobyl" },
    { type: "tv", id: 76479, status: "airing", badge: "New episode", slug: "the-boys" },
    { type: "tv", id: 106379, slug: "fallout" },
    { type: "tv", id: 114472, slug: "the-bear" },
    { type: "tv", id: 94997, status: "airing", badge: "New episode", slug: "house-of-the-dragon" },
    { type: "tv", id: 124364, status: "airing", badge: "New episode", slug: "from" },
    { type: "tv", id: 125988, status: "airing", badge: "New episode", slug: "silo" },

    // --- Core Anime ---
    { type: "tv", id: 209867, isAnime: true, slug: "frieren-beyond-journeys-end" },
    { type: "tv", id: 1429, isAnime: true, slug: "attack-on-titan" },
    { type: "tv", id: 95479, isAnime: true, status: "airing", badge: "New episode", slug: "jujutsu-kaisen" },
    { type: "tv", id: 85937, isAnime: true, status: "airing", badge: "New episode", slug: "demon-slayer" },
    { type: "tv", id: 105248, isAnime: true, slug: "cyberpunk-edgerunners" },
    { type: "tv", id: 13916, isAnime: true, slug: "death-note" },
    { type: "tv", id: 37854, isAnime: true, status: "airing", badge: "New episode", slug: "one-piece" },
    { type: "tv", id: 114410, isAnime: true, slug: "chainsaw-man" },
    { type: "tv", id: 213026, isAnime: true, status: "airing", badge: "New episode", slug: "solo-leveling" },
    { type: "movie", id: 372058, isAnime: true, quality: "HD", slug: "your-name" },
    { type: "movie", id: 129, isAnime: true, quality: "HD", slug: "spirited-away" },
  ];

  const results = [];
  const seenIds = new Set();

  for (const t of targets) {
    console.log(`Fetching ${t.type} ${t.id} (${t.slug})...`);
    const raw = await fetchItemDetails(t.type, t.id);
    if (!raw) {
      console.warn(`Failed to fetch ${t.type} ${t.id}`);
      continue;
    }

    const isMovie = t.type === "movie";
    const tmdbId = raw.id;
    const title = raw.title || raw.name || "Untitled";
    const id = t.slug || slugify(title);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const isAnime = t.isAnime || (raw.original_language === "ja" && (raw.genres?.some(g => g.id === 16 || g.name === "Animation")));
    const mediaType = isAnime ? "anime" : (isMovie ? "movie" : "series");

    let status = t.status || (raw.status === "In Production" || raw.status === "Planned" ? "upcoming" : "released");
    if (!t.status && !isMovie && (raw.in_production || raw.status === "Returning Series")) {
      status = "airing";
    }

    const releaseDate = raw.release_date || raw.first_air_date || "";
    const year = parseInt(releaseDate.slice(0, 4)) || 2026;
    const runtime = isMovie ? (raw.runtime || 115) : (raw.episode_run_time?.[0] || 48);
    const seasons = isMovie ? 1 : (raw.number_of_seasons || 1);
    const cert = parseCert(raw, isMovie);
    const rating = t.rating !== undefined ? t.rating : Number((raw.vote_average || 7.5).toFixed(1));
    const overview = raw.overview || "No overview available.";
    const genres = (raw.genres || []).map(g => GENRE_MAP[g.id] || g.name).filter(Boolean);

    // Official transparent logo
    const logoObj = raw.images?.logos?.find(l => l.iso_639_1 === "en") || raw.images?.logos?.[0];
    const logo = logoObj ? `https://image.tmdb.org/t/p/w500${logoObj.file_path}` : null;

    // Quality and badge
    const quality = t.quality !== undefined ? t.quality : (mediaType === "movie" ? "HD" : null);
    let badge = t.badge !== undefined ? t.badge : null;
    if (!badge && mediaType === "series" && status === "airing") {
      badge = "New episode";
    }

    // Collection handling
    let collection = null;
    let upcomingPill = null;
    if (raw.belongs_to_collection?.id) {
      try {
        const cRes = await fetch(`${BASE_URL}/collection/${raw.belongs_to_collection.id}?api_key=${API_KEY}`);
        const c = await cRes.json();
        if (c && c.parts) {
          const parts = c.parts.map(p => ({
            id: slugify(p.title),
            tmdbId: p.id,
            title: p.title,
            year: p.release_date ? p.release_date.slice(0, 4) : "",
            releaseDate: p.release_date || "",
            rating: Number((p.vote_average || 0).toFixed(1)),
            backdrop: p.backdrop_path ? `https://image.tmdb.org/t/p/w780${p.backdrop_path}` : null,
            poster: p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : null,
          })).sort((a, b) => (a.year || "").localeCompare(b.year || ""));

          collection = {
            id: c.id,
            name: c.name,
            backdrop: c.backdrop_path ? `https://image.tmdb.org/t/p/w1280${c.backdrop_path}` : null,
            parts,
          };

          const nextPart = parts.find(p => p.year > year || !p.releaseDate || new Date(p.releaseDate) > new Date(releaseDate));
          if (nextPart) {
            upcomingPill = `${nextPart.title} coming ${nextPart.year || "2027"}`;
          }
        }
      } catch (err) {}
    }

    // Videos / Trailers
    const videos = (raw.videos?.results || []).filter(v => v.site === "YouTube").map(v => ({
      id: v.id,
      name: v.name,
      key: v.key,
      type: v.type,
      thumbnail: `https://img.youtube.com/vi/${v.key}/mqdefault.jpg`,
    }));

    const trailer = raw.videos?.results?.find(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
    const trailerKey = trailer ? trailer.key : (videos[0]?.key || null);

    const poster = raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null;
    const backdrop = raw.backdrop_path ? `https://image.tmdb.org/t/p/original${raw.backdrop_path}` : (poster ? `https://image.tmdb.org/t/p/w1280${raw.poster_path}` : null);

    const cast = (raw.credits?.cast || []).slice(0, 10).map(c => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    }));

    const director = isMovie
      ? (raw.credits?.crew?.find(c => c.job === "Director")?.name || null)
      : (raw.created_by?.[0]?.name || null);

    const reviews = (raw.reviews?.results || []).slice(0, 6).map(r => ({
      id: r.id,
      author: r.author,
      rating: r.author_details?.rating || null,
      content: r.content,
      createdAt: r.created_at,
    }));

    const about = {
      tagline: raw.tagline || "",
      budget: raw.budget ? `$${raw.budget.toLocaleString()}` : null,
      revenue: raw.revenue ? `$${raw.revenue.toLocaleString()}` : null,
      status: raw.status || "Released",
      originalTitle: raw.original_title || raw.original_name || title,
      originalLanguage: raw.spoken_languages?.[0]?.english_name || raw.original_language || "English",
    };

    const idx = results.length;
    const service = assignService(raw, isAnime, idx);
    const studio = assignStudio(raw, isAnime, idx);
    const hues = computeHues(tmdbId, title);
    const airDay = DAYS[idx % DAYS.length];

    results.push({
      id,
      tmdbId,
      title,
      logo,
      type: mediaType,
      year,
      runtime,
      seasons,
      cert,
      rating,
      quality,
      badge,
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
    });
  }

  console.log(`Writing ${results.length} titles to json files...`);
  fs.writeFileSync(path.join(__dirname, "../lib/tmdb_titles.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(__dirname, "tmdb_titles.json"), JSON.stringify(results, null, 2));
  console.log("Successfully compiled accurate TMDB data!");
}

main().catch(console.error);
