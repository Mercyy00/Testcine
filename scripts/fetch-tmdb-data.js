const fs = require("fs");
const path = require("path");

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error("Error: TMDB_API_KEY environment variable is required.");
  process.exit(1);
}
const BASE_URL = "https://api.themoviedb.org/3";

const SERVICES = [
  { id: "netflix", name: "Netflix", hues: [350, 10], tmdbProviderId: 8 },
  { id: "prime", name: "Prime Video", hues: [196, 210], tmdbProviderId: 119 },
  { id: "disney", name: "Disney+", hues: [220, 240], tmdbProviderId: 337 },
  { id: "apple", name: "Apple TV+", hues: [210, 160], tmdbProviderId: 350 },
  { id: "max", name: "Max", hues: [240, 280], tmdbProviderId: 1899 },
  { id: "crunchyroll", name: "Crunchyroll", hues: [28, 44], tmdbProviderId: 283 },
];

const STUDIOS = [
  { id: "warner", name: "Warner Bros. Pictures", hues: [210, 230], tmdbCompanyId: 174 },
  { id: "universal", name: "Universal Pictures", hues: [214, 190], tmdbCompanyId: 33 },
  { id: "marvel", name: "Marvel Studios", hues: [355, 10], tmdbCompanyId: 420 },
  { id: "a24", name: "A24", hues: [35, 12], tmdbCompanyId: 41077 },
  { id: "ghibli", name: "Studio Ghibli", hues: [190, 160], tmdbCompanyId: 10342 },
  { id: "paramount", name: "Paramount Pictures", hues: [200, 220], tmdbCompanyId: 4 },
  { id: "sony", name: "Sony Pictures", hues: [222, 252], tmdbCompanyId: 34 },
  { id: "mappa", name: "MAPPA", hues: [10, 30], tmdbCompanyId: 5822 },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action", 10762: "Kids", 10765: "Sci-Fi", 10768: "War"
};

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

async function run() {
  console.log("Fetching curated TMDB data with logos, collections & reviews...");

  const movieIds = [
    569094, // Spider-Man: Across the Spider-Verse
    693134, // Dune: Part Two
    872585, // Oppenheimer
    157336, // Interstellar
    27205,  // Inception
    155,    // The Dark Knight
    533535, // Deadpool & Wolverine
    545611, // Everything Everywhere All at Once
    496243, // Parasite
    912649, // Venom: The Last Dance
    1022789,// Inside Out 2
    945961, // Alien: Romulus
    414906, // The Batman
    76600,  // Avatar: The Way of Water
    372058, // Your Name.
    129,    // Spirited Away
    493529, // Dungeons & Dragons: Honor Among Thieves
    105,    // Back to the Future
    24428,  // The Avengers
    299536, // Avengers: Infinity War
    1241982,// Moana 2
    558449, // Gladiator II
    1184918,// The Wild Robot
  ];

  const tvIds = [
    94605,  // Arcane
    1429,   // Attack on Titan
    209867, // Frieren: Beyond Journey's End
    100088, // The Last of Us
    93405,  // Squid Game
    126308, // Shogun
    1396,   // Breaking Bad
    66732,  // Stranger Things
    95479,  // Jujutsu Kaisen
    85937,  // Demon Slayer
    105248, // Cyberpunk: Edgerunners
    13916,  // Death Note
    87108,  // Chernobyl
    76479,  // The Boys
    106379, // Fallout
    114472, // The Bear
    94997,  // House of the Dragon
    37854,  // One Piece
    124364, // From
  ];

  const upcomingRes = await fetch(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}`).then(r => r.json());
  const upcomingIds = (upcomingRes.results || []).slice(0, 6).map(m => m.id);

  const onAirRes = await fetch(`${BASE_URL}/tv/on_the_air?api_key=${API_KEY}`).then(r => r.json());
  const onAirIds = (onAirRes.results || []).slice(0, 8).map(t => t.id);

  console.log(`Fetching details...`);
  const movies = (await Promise.all(movieIds.map(id => fetchItemDetails("movie", id)))).filter(Boolean);
  const tvs = (await Promise.all(tvIds.map(id => fetchItemDetails("tv", id)))).filter(Boolean);
  const upcomingMovies = (await Promise.all(upcomingIds.map(id => fetchItemDetails("movie", id)))).filter(Boolean);
  const onAirTV = (await Promise.all(onAirIds.map(id => fetchItemDetails("tv", id)))).filter(Boolean);

  const allItems = [];
  const seenIds = new Set();

  async function addItem(raw, type, statusOverride = null) {
    if (!raw || !raw.id) return;
    const isMovie = type === "movie";
    const tmdbId = raw.id;
    const title = raw.title || raw.name || "Untitled";
    const slug = slugify(title);
    const id = slug && !seenIds.has(slug) ? slug : `${type}-${tmdbId}`;
    if (seenIds.has(id)) return;
    seenIds.add(id);

    const isAnime = (raw.original_language === "ja" && (raw.genres?.some(g => g.id === 16 || g.name === "Animation")));
    const mediaType = isAnime ? "anime" : (isMovie ? "movie" : "series");

    let status = statusOverride || (raw.status === "In Production" || raw.status === "Planned" ? "upcoming" : "released");
    if (!statusOverride && !isMovie && (raw.in_production || raw.status === "Returning Series")) {
      status = "airing";
    }

    const releaseDate = raw.release_date || raw.first_air_date || "";
    const year = parseInt(releaseDate.slice(0, 4)) || 2024;
    const runtime = isMovie ? (raw.runtime || 115) : (raw.episode_run_time?.[0] || 48);
    const seasons = isMovie ? 1 : (raw.number_of_seasons || 1);
    const cert = parseCert(raw, isMovie);
    const rating = Number((raw.vote_average || 7.5).toFixed(1));
    const overview = raw.overview || "No overview available.";
    const genres = (raw.genres || []).map(g => GENRE_MAP[g.id] || g.name).filter(Boolean);

    // Logo extraction
    const logoObj = raw.images?.logos?.find(l => l.iso_639_1 === "en") || raw.images?.logos?.[0];
    const logo = logoObj ? `https://image.tmdb.org/t/p/w500${logoObj.file_path}` : null;

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

    // Cast
    const cast = (raw.credits?.cast || []).slice(0, 10).map(c => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    }));

    const director = isMovie
      ? (raw.credits?.crew?.find(c => c.job === "Director")?.name || null)
      : (raw.created_by?.[0]?.name || null);

    // Reviews
    const reviews = (raw.reviews?.results || []).slice(0, 6).map(r => ({
      id: r.id,
      author: r.author,
      rating: r.author_details?.rating || null,
      content: r.content,
      createdAt: r.created_at,
    }));

    // About metadata
    const about = {
      tagline: raw.tagline || "",
      budget: raw.budget ? `$${raw.budget.toLocaleString()}` : null,
      revenue: raw.revenue ? `$${raw.revenue.toLocaleString()}` : null,
      status: raw.status || "Released",
      originalTitle: raw.original_title || raw.original_name || title,
      originalLanguage: raw.spoken_languages?.[0]?.english_name || raw.original_language || "English",
    };

    const idx = allItems.length;
    const service = assignService(raw, isAnime, idx);
    const studio = assignStudio(raw, isAnime, idx);
    const hues = computeHues(tmdbId, title);
    const airDay = DAYS[idx % DAYS.length];

    allItems.push({
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

  for (const m of movies) await addItem(m, "movie", "released");
  for (const t of tvs) await addItem(t, "tv");
  for (const m of upcomingMovies) await addItem(m, "movie", "upcoming");
  for (const t of onAirTV) await addItem(t, "tv", "airing");

  console.log(`Successfully compiled ${allItems.length} rich titles from TMDB!`);
  fs.writeFileSync(path.join(__dirname, "tmdb_titles.json"), JSON.stringify(allItems, null, 2));
  fs.writeFileSync(path.join(__dirname, "../lib/tmdb_titles.json"), JSON.stringify(allItems, null, 2));
}

run().catch(console.error);
