// Shared UI Constants and Metadata Maps
// Lightweight module with zero JSON payload - safe for all client components

export const BRAND = {
  name: "Vivarium",
  tagline: "Watch what is next.",
  discord: process.env.NEXT_PUBLIC_DISCORD_INVITE || null,
};

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
    const mins = title.runtime || 120;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  const s = title.seasons || 1;
  return `${s} Season${s === 1 ? "" : "s"}`;
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
