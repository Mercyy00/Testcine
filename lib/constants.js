// Shared UI Constants and Metadata Maps
// Lightweight module with zero JSON payload - safe for all client components

export const BRAND = {
  name: "DIVINE",
  tagline: "Watch what is next.",
  logo: "/logo.png",
  icon: "/favicon.png",
  discord: process.env.NEXT_PUBLIC_DISCORD_INVITE || null,
};

export const SERVICES = [
  { id: "netflix", name: "Netflix", bg: "#0d0d0f", brandColor: "#e50914", logoScale: 1.0, textColor: "#ffffff", hues: [350, 10], tmdbProviderId: 8 },
  { id: "prime", name: "Prime Video", bg: "#ffffff", brandColor: "#00a8e1", logoScale: 1.0, textColor: "#000511", hues: [196, 210], tmdbProviderId: 119 },
  { id: "disney", name: "Disney+", bg: "#041c32", brandColor: "#0063e5", logoScale: 1.0, textColor: "#ffffff", hues: [220, 240], tmdbProviderId: 337 },
  { id: "max", name: "HBO Max", bg: "#101116", brandColor: "#741dff", logoScale: 1.0, textColor: "#ffffff", hues: [240, 280], tmdbProviderId: 1899 },
  { id: "hulu", name: "Hulu", bg: "#1ce783", brandColor: "#1ce783", logoScale: 0.95, textColor: "#052e16", hues: [145, 160], tmdbProviderId: 15 },
  { id: "apple", name: "Apple TV+", bg: "#101012", brandColor: "#ffffff", logoScale: 0.9, textColor: "#ffffff", hues: [210, 160], tmdbProviderId: 350 },
  { id: "paramount", name: "Paramount+", bg: "#0064ff", brandColor: "#0064ff", logoScale: 1.05, textColor: "#ffffff", hues: [215, 230], tmdbProviderId: 531 },
];

export const STUDIOS = [
  { id: "marvel", name: "Marvel", bg: "#f9e3e3", brandColor: "#ed1d24", logoScale: 1.0, textColor: "#111111", hues: [355, 10], tmdbCompanyId: 420 },
  { id: "a24", name: "A24", bg: "#e6e6f5", brandColor: "#e6e6f5", logoScale: 0.95, textColor: "#111111", hues: [35, 12], tmdbCompanyId: 41077 },
  { id: "pixar", name: "Pixar", bg: "#e2eff7", brandColor: "#0072c6", logoScale: 1.2, textColor: "#111111", hues: [205, 220], tmdbCompanyId: 3 },
  { id: "ghibli", name: "Studio Ghibli", bg: "#e1eee1", brandColor: "#10b981", logoScale: 1.05, textColor: "#111111", hues: [190, 160], tmdbCompanyId: 10342 },
  { id: "dc", name: "DC", bg: "#dbe7f2", brandColor: "#0476f2", logoScale: 0.9, textColor: "#111111", hues: [210, 230], tmdbCompanyId: 9993 },
  { id: "warner", name: "Warner Bros.", bg: "#f6e5ce", brandColor: "#f5ae2b", logoScale: 0.9, textColor: "#111111", hues: [38, 45], tmdbCompanyId: 174 },
  { id: "universal", name: "Universal", bg: "#e7ecef", brandColor: "#3b82f6", logoScale: 1.0, textColor: "#111111", hues: [214, 190], tmdbCompanyId: 33 },
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

export const KNOWN_SEASONS = {
  "1396": 5, // Breaking Bad
  "breaking-bad": 5,
  "66732": 5, // Stranger Things
  "stranger-things": 5,
  "76479": 5, // The Boys
  "the-boys": 5,
  "85937": 5, // Demon Slayer
  "demon-slayer": 5,
  "2190": 29, // South Park
  "south-park": 29,
  "37854": 23, // One Piece
  "one-piece": 23,
  "1429": 4, // Attack on Titan
  "attack-on-titan": 4,
  "124364": 4, // From
  "from": 4,
  "125988": 4, // Silo
  "silo": 4,
  "94997": 3, // House of the Dragon
  "house-of-the-dragon": 3,
  "93405": 3, // Squid Game
  "squid-game": 3,
  "95396": 3, // Severance
  "severance": 3,
  "96677": 3, // Lupin
  "lupin": 3,
  "136315": 5, // The Bear
  "the-bear": 5,
  "94605": 2, // Arcane
  "arcane": 2,
  "100088": 2, // The Last of Us
  "the-last-of-us": 2,
  "106379": 2, // Fallout
  "fallout": 2,
  "225385": 2, // Black Doves
  "black-doves": 2,
  "259909": 2, // Dexter: Resurrection
  "dexter-resurrection": 2,
  "105248": 2, // Cyberpunk Edgerunners
  "cyberpunk-edgerunners": 2,
  "73223": 2, // Black Clover
  "black-clover-season-2": 2,
  "black-clover": 2,
  "97940": 2,
  "95479": 2, // Jujutsu Kaisen
  "jujutsu-kaisen": 2,
  "113415": 2,
  "127532": 2, // Solo Leveling
  "solo-leveling": 2,
  "151807": 2,
  "209867": 2, // Frieren: Beyond Journey's End
  "frieren-beyond-journeys-end": 2,
  "154587": 2,
  "220084": 2, // The Apothecary Diaries
  "the-apothecary-diaries": 2,
  "161645": 2,
  "114410": 2, // Chainsaw Man
  "chainsaw-man": 2,
  "127230": 2,
  "197022": 2, // Reincarnated as a Sword
  "reincarnated-as-a-sword-season-2": 2,
  "240411": 2, // Blue Box
  "blue-box-season-2": 2,
  "254191": 2, // The Ramparts of Ice
  "the-ramparts-of-ice-season-2": 2,
  "268685": 2, // Overgeared
  "overgeared": 2,
  "212888": 2,
  "120089": 3, // Spy x Family
  "spy-x-family": 3,
  "spy-family": 3,
  "140960": 3,
  "219714": 4, // Spy x Family Season 4
  "65930": 7, // My Hero Academia
  "my-hero-academia": 7,
  "21459": 7,
  "30984": 17, // Bleach
  "bleach": 17,
  "269": 17,
  "46260": 5, // Naruto
  "naruto": 5,
  "20": 5,
  "31910": 21, // Naruto Shippuden
  "naruto-shippuden": 21,
  "1735": 21,
  "87108": 2, // Vinland Saga
  "vinland-saga": 2,
  "101348": 2,
  "67070": 3, // Mob Psycho 100
  "mob-psycho-100": 3,
  "21507": 3,
  "83549": 3, // Kaguya-sama: Love Is War
  "kaguya-sama": 3,
  "101921": 3,
  "99581": 2, // Mushoku Tensei
  "mushoku-tensei": 2,
  "108465": 2,
  "45782": 4, // Sword Art Online
  "sword-art-online": 4,
  "11757": 4,
  "65948": 3, // KonoSuba
  "konosuba": 3,
  "21202": 3,
  "65942": 3, // Re:Zero
  "re-zero": 3,
  "21355": 3,
  "86031": 3, // Dr. Stone
  "dr-stone": 3,
  "105333": 3,
  "61374": 4, // Tokyo Ghoul
  "tokyo-ghoul": 4,
  "20707": 4,
  "63639": 4, // Overlord
  "overlord": 4,
  "20832": 4,
  "20464": 4, // Haikyuu
  "haikyuu": 4,
  "46850": 6, // Hunter x Hunter
  "hunter-x-hunter": 6,
  "11061": 6,
  "16498": 4, // Attack on Titan AniList
  "20958": 4,
  "99147": 4,
  "104578": 4,
  "110277": 4,
  "101922": 5, // Demon Slayer AniList
  "21": 23, // One Piece AniList
  "120377": 2, // Cyberpunk Edgerunners AniList
  "1877": 5, // Phineas and Ferb
  "5920": 7, // The Mentalist
  "63333": 5, // The Last Kingdom
  "1100": 9, // How I Met Your Mother
  "1421": 11, // Modern Family
  "1695": 8, // Monk
  "48866": 7, // The 100
  "873": 10, // Columbo
  "1399": 8, // Game of Thrones
  "game-of-thrones": 8,
  "60059": 6, // Better Call Saul
  "better-call-saul": 6,
  "70523": 3, // Dark
  "dark": 3,
  "71446": 5, // Money Heist
  "money-heist": 5,
  "1402": 11, // The Walking Dead
  "the-walking-dead": 11,
  "1418": 12, // The Big Bang Theory
  "the-big-bang-theory": 12,
  "1668": 10, // Friends
  "friends": 10,
  "2316": 9, // The Office
  "the-office": 9,
  "4614": 22, // NCIS
  "1416": 21, // Grey's Anatomy
  "60625": 8, // Rick and Morty
  "rick-and-morty": 8,
};

export const TITLE_TMDB_MAP = {
  "ramayana-rise-of-a-legend": 656908,
  "natsamrat": 378227,
  "heart-of-the-beast": 1263337,
  "black-doves": 225385,
  "resident-evil": 1423191,
  "model-citizen": 1792170,
  "the-mongoose": 1294189,
  "spider-man-brand-new-day": 969681,
  "south-park": 2190,
  "lanterns": 95350,
  "visionquest": 213375,
  "spider-man-across-the-spider-verse": 569094,
  "dune-part-two": 693134,
  "oppenheimer": 872585,
  "interstellar": 157336,
  "inception": 27205,
  "the-dark-knight": 155,
  "deadpool-wolverine": 533535,
  "everything-everywhere-all-at-once": 545611,
  "parasite": 496243,
  "venom-the-last-dance": 912649,
  "inside-out-2": 1022789,
  "alien-romulus": 945961,
  "the-batman": 414906,
  "avatar-the-way-of-water": 76600,
  "moana-2": 1241982,
  "gladiator-ii": 558449,
  "the-wild-robot": 1184918,
  "back-to-the-future": 105,
  "the-avengers": 24428,
  "avengers-infinity-war": 299536,
  "anora": 1064213,
  "arcane": 94605,
  "the-last-of-us": 100088,
  "squid-game": 93405,
  "shogun": 126308,
  "breaking-bad": 1396,
  "stranger-things": 66732,
  "invincible": 95557,
  "chernobyl": 87108,
  "the-boys": 76479,
  "fallout": 106379,
  "secret-invasion": 114472,
  "house-of-the-dragon": 94997,
  "from": 124364,
  "silo": 125988,
  "frieren-beyond-journeys-end": 209867,
  "attack-on-titan": 1429,
  "jujutsu-kaisen": 95479,
  "demon-slayer": 85937,
  "cyberpunk-edgerunners": 105248,
  "death-note": 13916,
  "one-piece": 37854,
  "chainsaw-man": 114410,
  "solo-leveling": 127532,
  "your-name": 372058,
  "spirited-away": 129,
  "dune": 438631,
  "the-dark-knight-rises": 49026,
  "batman-begins": 272,
  "avengers-endgame": 299534,
  "spider-man-no-way-home": 634649,
  "spider-man-into-the-spider-verse": 324857,
  "top-gun-maverick": 361743,
  "whiplash": 244786,
  "fight-club": 550,
  "pulp-fiction": 680,
  "the-matrix": 603,
  "the-shawshank-redemption": 278,
  "the-godfather": 238,
  "the-lord-of-the-rings-the-fellowship-of-the-ring": 120,
  "the-lord-of-the-rings-the-return-of-the-king": 122,
  "jurassic-park": 329,
  "kalki-2898-ad": 801688,
  "rrr": 579974,
  "jawan": 872906,
  "dangal": 360814,
  "possible-love": 1047041,
  "primetime": 792293,
  "godzilla-minus-zero": 940721,
  "apocalypse-z": 1184918,
  "a-dogs-perfect-christmas": 1349475,
  "campus-drivers": 303044,
  "dead-end-job": 219766,
  "dexter-resurrection": 259909,
  "mobland": 980489,
  "the-remarried-empress": 260381,
  "nocturne": 75780,
  "the-greatest": 247885,
  "lupin": 96677,
  "steel-ball-run-jojos-bizarre-adventure": 46074,
  "the-exiled-heavy-knight": 271501,
  "the-ramparts-of-ice-season-2": 254191,
  "the-apothecary-diaries": 220084,
  "black-clover-season-2": 73223,
  "overgeared": 268685,
  "reincarnated-as-a-sword-season-2": 197022,
  "blue-box-season-2": 240411,
  "spider-man-homecoming": 315635,
  "spider-man-far-from-home": 429617,
  "spider-man-beyond-the-spider-verse": 911916,
  "dune-part-three": 1170608,
  "deadpool": 293660,
  "deadpool-2": 383498,
  "venom": 335983,
  "venom-let-there-be-carnage": 580489,
  "inside-out": 150540,
  "untitled-alien-romulus-sequel": 1434936,
  "the-batman-part-ii": 806704,
  "avatar": 19995,
  "avatar-fire-and-ash": 83533,
  "avatar-4": 216527,
  "avatar-5": 393209,
  "moana-3": 1647287,
  "moana": 277834,
  "gladiator-iii": 1359289,
  "gladiator": 98,
  "the-wild-robot-escapes": 1370190,
  "back-to-the-future-part-ii": 165,
  "back-to-the-future-part-iii": 196,
  "avengers-age-of-ultron": 99861,
  "avengers-doomsday": 1003596,
  "avengers-secret-wars": 1003598,
  "severance": 95396,
  "the-bear": 136315
};

export const ANIME_ANILIST_MAP = {
  "attack-on-titan": 16498,
  "demon-slayer": 101922,
  "one-piece": 21,
  "jujutsu-kaisen": 113415,
  "cyberpunk-edgerunners": 120377,
  "death-note": 1535,
  "chainsaw-man": 127230,
  "solo-leveling": 151807,
  "frieren-beyond-journeys-end": 154587,
  "the-apothecary-diaries": 161645,
  "black-clover-season-2": 97940,
  "overgeared": 212888,
  "reincarnated-as-a-sword-season-2": 152795,
  "blue-box-season-2": 173828,
  "the-ramparts-of-ice-season-2": 178712,
  "steel-ball-run-jojos-bizarre-adventure": 131908,
  "the-exiled-heavy-knight": 182741
};

export const ANILIST_TMDB_MAP = {
  21: 37854, // One Piece
  16498: 1429, // Attack on Titan
  101922: 85937, // Demon Slayer
  113415: 95479, // Jujutsu Kaisen
  1535: 13916, // Death Note
  127230: 114410, // Chainsaw Man
  151807: 213026, // Solo Leveling
  154587: 209867, // Frieren
  120377: 105248, // Cyberpunk Edgerunners
  20: 46260, // Naruto
  1735: 31910, // Naruto Shippuden
  269: 30984, // Bleach
  11061: 46298, // Hunter x Hunter
  21459: 65930, // My Hero Academia
  97940: 73223, // Black Clover
};

export const ANIME_MOVIES_SET = new Set([
  "your-name",
  "spirited-away"
]);

export const CERT_LABEL = {
  U: "U",
  G: "G",
  PG: "PG",
  "TV-PG": "TV-PG",
  "12A": "12A",
  12: "12",
  "PG-13": "PG-13",
  "TV-14": "TV-14",
  15: "15",
  "TV-MA": "TV-MA",
  18: "18",
  R: "R",
  "NC-17": "NC-17",
  R18: "R18",
};

export function certVar(cert) {
  switch (String(cert)) {
    case "U":
    case "G":
    case "TV-G":
    case "TV-Y":
      return "var(--cert-u)";
    case "PG":
    case "TV-PG":
    case "TV-Y7":
      return "var(--cert-pg)";
    case "12A":
    case "12":
    case "PG-13":
    case "TV-14":
      return "var(--cert-12)";
    case "15":
    case "TV-MA":
      return "var(--cert-15)";
    case "18":
    case "R":
    case "NC-17":
      return "var(--cert-18)";
    case "R18":
      return "var(--cert-r18)";
    default:
      return "var(--cert-none)";
  }
}

export const TYPE_LABEL = {
  movie: "Movie",
  series: "Series",
  anime: "Anime",
};

export function runtimeLabel(title) {
  if (!title) return "";
  if (title.type === "movie") {
    const mins = title.runtime;
    if (!Number.isFinite(mins) || mins <= 0) return "";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  let s = null;
  if (Array.isArray(title.seasons)) {
    s = title.seasons.filter((season) => season && season.season_number !== 0).length || title.seasons.length || null;
  } else if (typeof title.numberOfSeasons === "number") {
    s = title.numberOfSeasons;
  } else if (typeof title.number_of_seasons === "number") {
    s = title.number_of_seasons;
  } else if (typeof title.seasons === "number") {
    s = title.seasons;
  } else if (typeof title.seasons === "string" && !isNaN(parseInt(title.seasons, 10))) {
    s = parseInt(title.seasons, 10);
  }
  return s ? `${s} Season${s === 1 ? "" : "s"}` : "";
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const getService = (id) => SERVICES.find((s) => s.id === id) || null;
export const getStudio = (id) => STUDIOS.find((s) => s.id === id) || null;

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
