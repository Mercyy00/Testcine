const fs = require("fs");

const filePath = "./lib/tmdb_titles.json";
const titles = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const animeTitles = [
  {
    id: "steel-ball-run-jojos-bizarre-adventure",
    tmdbId: 993001,
    title: "STEEL BALL RUN JoJo's Bizarre Adventure 2nd - 3rd STAGE",
    type: "anime",
    year: 2012,
    rating: 8.6,
    badge: "E8 in 6d",
    genres: ["Animation", "Action", "Adventure"],
    country: "Japan",
    language: "Japanese",
    service: "crunchyroll",
    studio: "ghibli",
    backdrop: "https://image.tmdb.org/t/p/w780/jojos_sbr_backdrop.jpg",
    poster: "https://image.tmdb.org/t/p/w500/jojos_sbr_poster.jpg",
    overview: "Follow the intergenerational feud between the Joestar Family and various forces of evil, the most prominent of which is Dio Brando and his followers."
  },
  {
    id: "the-exiled-heavy-knight",
    tmdbId: 993002,
    title: "The Exiled Heavy Knight Knows How to Game the System",
    type: "anime",
    year: 2026,
    rating: 8.2,
    badge: "E20 in 6d",
    genres: ["Animation", "Fantasy", "Action"],
    country: "Japan",
    language: "Japanese",
    service: "crunchyroll",
    studio: "ghibli",
    backdrop: "https://image.tmdb.org/t/p/w780/heavy_knight_backdrop.jpg",
    poster: "https://image.tmdb.org/t/p/w500/heavy_knight_poster.jpg",
    overview: "Reincarnated into the world of an MMORPG he once mastered, an exiled young noble weaponizes the most undervalued class in the game."
  },
  {
    id: "the-ramparts-of-ice-season-2",
    tmdbId: 993003,
    title: "The Ramparts of Ice Season 2",
    type: "anime",
    year: 2026,
    rating: 8.5,
    badge: "E7 in 6d",
    genres: ["Animation", "Drama", "Romance"],
    country: "Japan",
    language: "Japanese",
    service: "crunchyroll",
    studio: "ghibli",
    backdrop: "https://image.tmdb.org/t/p/w780/ramparts_backdrop.jpg",
    poster: "https://image.tmdb.org/t/p/w500/ramparts_poster.jpg",
    overview: "Koyuki Hikawa struggles with social anxiety while navigating delicate budding friendships and romance in high school."
  },
  {
    id: "the-apothecary-diaries",
    tmdbId: 993004,
    title: "The Apothecary Diaries Season 3",
    type: "anime",
    year: 2026,
    rating: 8.5,
    badge: "Episode 6",
    genres: ["Animation", "Mystery", "Drama"],
    country: "Japan",
    language: "Japanese",
    service: "crunchyroll",
    studio: "toho",
    backdrop: "https://image.tmdb.org/t/p/w780/apothecary_backdrop.jpg",
    poster: "https://image.tmdb.org/t/p/w500/apothecary_poster.jpg",
    overview: "Maomao continues unraveling intricate medical mysteries, court intrigues, and poisons within the imperial palace."
  },
  {
    id: "black-clover-season-2",
    tmdbId: 993005,
    title: "Black Clover Season 2",
    type: "anime",
    year: 2026,
    rating: 8.7,
    badge: "Episode 6",
    genres: ["Animation", "Action", "Fantasy"],
    country: "Japan",
    language: "Japanese",
    service: "crunchyroll",
    studio: "toho",
    backdrop: "https://image.tmdb.org/t/p/w780/black_clover_backdrop.jpg",
    poster: "https://image.tmdb.org/t/p/w500/black_clover_poster.jpg",
    overview: "Asta and the Black Bulls prepare for the ultimate clash against the Spade Kingdom devils to rescue Captain Yami."
  },
  {
    id: "overgeared",
    tmdbId: 993006,
    title: "Overgeared",
    type: "anime",
    year: 2026,
    rating: 7.6,
    badge: "Episode 7",
    genres: ["Animation", "Action", "Adventure"],
    country: "South Korea",
    language: "Korean",
    service: "crunchyroll",
    studio: "toho",
    backdrop: "https://image.tmdb.org/t/p/w780/overgeared_backdrop.jpg",
    poster: "https://image.tmdb.org/t/p/w500/overgeared_poster.jpg",
    overview: "Shin Youngwoo unlocks the legendary class 'Pagma’s Successor' in virtual reality game Satisfy, crafting unmatched overpowered gear."
  },
  {
    id: "reincarnated-as-a-sword-season-2",
    tmdbId: 993007,
    title: "Reincarnated as a Sword Season 2",
    type: "anime",
    year: 2026,
    rating: 7.5,
    badge: "Episode 7",
    genres: ["Animation", "Action", "Fantasy"],
    country: "Japan",
    language: "Japanese",
    service: "crunchyroll",
    studio: "toho",
    backdrop: "https://image.tmdb.org/t/p/w780/sword_backdrop.jpg",
    poster: "https://image.tmdb.org/t/p/w500/sword_poster.jpg",
    overview: "Fran and Teacher embark toward the sea capital, taking on dungeon bosses and high-rank beastkin trials."
  },
  {
    id: "blue-box-season-2",
    tmdbId: 993008,
    title: "Blue Box Season 2",
    type: "anime",
    year: 2026,
    rating: 8.1,
    badge: "Episode 5",
    genres: ["Animation", "Romance", "Drama"],
    country: "Japan",
    language: "Japanese",
    service: "netflix",
    studio: "toho",
    backdrop: "https://image.tmdb.org/t/p/w780/blue_box_backdrop.jpg",
    poster: "https://image.tmdb.org/t/p/w500/blue_box_poster.jpg",
    overview: "Taiki and Chinatsu navigate the pressures of national sports qualifiers alongside their deepening cohabitation feelings."
  }
];

for (const item of animeTitles) {
  const existingIdx = titles.findIndex((t) => t.id === item.id);
  if (existingIdx >= 0) {
    titles[existingIdx] = { ...titles[existingIdx], ...item };
  } else {
    titles.push(item);
  }
}

// Update One Piece badge to match screenshot: E1181 in 58d
const op = titles.find((t) => t.id === "one-piece");
if (op) {
  op.badge = "E1181 in 58d";
}

fs.writeFileSync(filePath, JSON.stringify(titles, null, 2), "utf-8");
console.log(`Added anime reference titles! Total titles now: ${titles.length}`);
