// High quality iconic character avatars across Anime, Series, and Movies
export const AVATAR_CATEGORIES = ["All", "Anime", "Series", "Movies"];

export const PROFILE_AVATARS = [
  // Anime - Iconic OG Characters
  { id: "luffy", name: "Monkey D. Luffy", category: "Anime", subtitle: "One Piece", url: "/avatars/anime-luffy.png" },
  { id: "zoro", name: "Roronoa Zoro", category: "Anime", subtitle: "One Piece", url: "/avatars/anime-zoro.png" },
  { id: "gojo", name: "Satoru Gojo", category: "Anime", subtitle: "Jujutsu Kaisen", url: "/avatars/anime-gojo.png" },
  { id: "levi", name: "Levi Ackerman", category: "Anime", subtitle: "Attack on Titan", url: "/avatars/anime-levi.png" },
  { id: "eren", name: "Eren Yeager", category: "Anime", subtitle: "Attack on Titan", url: "/avatars/anime-eren.jpg" },
  { id: "kakashi", name: "Kakashi Hatake", category: "Anime", subtitle: "Naruto", url: "/avatars/anime-kakashi.png" },
  { id: "spike", name: "Spike Spiegel", category: "Anime", subtitle: "Cowboy Bebop", url: "/avatars/anime-spike.png" },
  { id: "tanjiro", name: "Tanjiro Kamado", category: "Anime", subtitle: "Demon Slayer", url: "/avatars/anime-tanjiro.png" },

  // Series - Iconic OG Characters
  { id: "walter-white", name: "Walter White", category: "Series", subtitle: "Breaking Bad", url: "/avatars/series-walter-white.jpg" },
  { id: "tommy-shelby", name: "Thomas Shelby", category: "Series", subtitle: "Peaky Blinders", url: "/avatars/series-tommy-shelby.jpg" },
  { id: "homelander", name: "Homelander", category: "Series", subtitle: "The Boys", url: "/avatars/series-homelander.jpg" },
  { id: "billy-butcher", name: "Billy Butcher", category: "Series", subtitle: "The Boys", url: "/avatars/series-billy-butcher.jpg" },
  { id: "eleven", name: "Eleven", category: "Series", subtitle: "Stranger Things", url: "/avatars/series-eleven.jpg" },
  { id: "jon-snow", name: "Jon Snow", category: "Series", subtitle: "Game of Thrones", url: "/avatars/series-jon-snow.jpg" },
  { id: "joel", name: "Joel Miller", category: "Series", subtitle: "The Last of Us", url: "/avatars/series-joel.jpg" },
  { id: "jinx", name: "Jinx", category: "Series", subtitle: "Arcane", url: "/avatars/series-jinx.jpg" },

  // Movies - Iconic OG Characters
  { id: "batman", name: "Batman", category: "Movies", subtitle: "The Dark Knight", url: "/avatars/movie-batman.jpg" },
  { id: "joker", name: "The Joker", category: "Movies", subtitle: "The Dark Knight", url: "/avatars/movie-joker.jpg" },
  { id: "tyler-durden", name: "Tyler Durden", category: "Movies", subtitle: "Fight Club", url: "/avatars/movie-tyler-durden.jpg" },
  { id: "patrick-bateman", name: "Patrick Bateman", category: "Movies", subtitle: "American Psycho", url: "/avatars/movie-patrick-bateman.jpg" },
  { id: "neo", name: "Neo", category: "Movies", subtitle: "The Matrix", url: "/avatars/movie-neo.jpg" },
  { id: "john-wick", name: "John Wick", category: "Movies", subtitle: "John Wick", url: "/avatars/movie-john-wick.jpg" },
  { id: "driver", name: "Driver", category: "Movies", subtitle: "Drive", url: "/avatars/movie-driver.jpg" },
  { id: "spiderman", name: "Spider-Man", category: "Movies", subtitle: "Marvel", url: "/avatars/movie-spiderman.jpg" },
];

// Fallback generated initials avatar
const PALETTES = [
  ["#6366f1", "#8b5cf6"], ["#0ea5e9", "#22d3ee"], ["#10b981", "#84cc16"], ["#f59e0b", "#ef4444"],
  ["#ec4899", "#f43f5e"], ["#14b8a6", "#3b82f6"], ["#a855f7", "#ec4899"], ["#64748b", "#334155"],
];

export function makeAvatar(name = "Guest", index = 0) {
  const p = PALETTES[Math.abs(index) % PALETTES.length];
  const letter = (String(name).trim()[0] || "G").toUpperCase().replace(/[<>&"']/g, "G");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="78" font-family="Arial,sans-serif" font-size="56" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Default account avatar: an inline, self-contained user silhouette.
const DEFAULT_USER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#354657"/><stop offset="1" stop-color="#171d28"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#bg)"/><circle cx="60" cy="43" r="21" fill="#dbe3ed"/><path d="M20 108c3-24 18-38 40-38s37 14 40 38" fill="#dbe3ed"/></svg>`;
export const DEFAULT_AVATAR = PROFILE_AVATARS[0].url;
export const DEFAULT_SILHOUETTE = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_USER_SVG)}`;
